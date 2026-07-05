from dotenv import load_dotenv
import os
import json
from pathlib import Path

from llama_index.core import VectorStoreIndex, Settings
from llama_index.core.schema import TextNode
from llama_index.vector_stores.pinecone import PineconeVectorStore
from llama_index.llms.openai import OpenAI
from llama_index.embeddings.openai import OpenAIEmbedding
from sentence_transformers import CrossEncoder
from pinecone import Pinecone
from openai import OpenAI as OpenAIClient

load_dotenv()

BM25_CACHE_PATH = Path(__file__).parent / "ingestion" / "bm25_nodes_cache.jsonl"

AGENT_SYSTEM_PROMPT = """You are NutriRAG, an expert nutrition assistant with access to a scientific knowledge base:
- FooDB: verified food composition data (nutrients per 100g for hundreds of foods)
- Krause's Food & Nutrition Therapy, Present Knowledge in Nutrition, and other medical nutrition books
- PubChem: molecular properties of nutrients and compounds

You answer questions by searching your knowledge base using the available tools.

Search strategy:
- For questions about what a specific food contains → ALWAYS start with get_food_data (food name in English)
- For nutrition science questions (functions, RDA, mechanisms, deficiency, absorption) → call search_knowledge_base
- For "what foods are good sources of X" → call search_knowledge_base with a food sources query
- MANDATORY FALLBACK: After EVERY get_food_data call, check if the specific nutrient requested is present in the result. If the specific nutrient value (e.g. vitamin B12, EPA, DHA, folate, omega-3) is NOT explicitly listed in the tool result, you MUST immediately make a second call to search_knowledge_base with a query like "[food name] [nutrient] mg per 100g nutritional content" to search textbooks (Krause's, Present Knowledge in Nutrition, Modern Nutrition). Textbooks contain food composition appendices with values for organ meats, shellfish, fish oils, etc.
- Example: get_food_data("beef liver") returns no folate → search_knowledge_base("beef liver folate micrograms per 100g food composition")
- Example: get_food_data("mussels") returns no B12 → search_knowledge_base("mussels clams shellfish vitamin B12 content per 100g")
- Example: get_food_data("Atlantic mackerel") returns no DHA → search_knowledge_base("Atlantic mackerel EPA DHA omega-3 fatty acids per 100g")
- FooDB data is authoritative for composition values when present; medical books are authoritative when FooDB is incomplete
- You may call tools up to 4 times total — use all calls if needed to get complete data

Answer rules:
- Give comprehensive, detailed answers — include mechanisms, RDA by age group, deficiency consequences, food sources, interactions
- **STRICT RULE FOR NUTRITIONAL VALUES (mg, µg, g per 100g)**: ONLY report numbers that appear VERBATIM in the tool result text, OR numbers you calculate by summing sub-components that ARE verbatim in the text (e.g. total fat = saturated + monounsaturated + polyunsaturated fatty acids found in the data — state "calculat din componente FooDB" in that case). NEVER recall or estimate specific mg/µg/g values from training knowledge — this counts as fabrication. If a nutrient value was **explicitly requested by the user** in their question and is NOT found in the tool results after all searches (neither directly nor as calculable sub-components), write exactly: "⚠️ Valoarea pentru [nutrient] în [aliment] nu a fost găsită în baza de date." Do NOT write ⚠️ warnings for nutrients the user did NOT ask about.
- For nutrition science (mechanisms, RDA, clinical info): use retrieved context first; if partial, supplement with accurate nutrition knowledge from training
- Always answer in the same language as the user (Romanian if question is in Romanian)
- End every response with a **Surse:** section listing sources found in the context (FooDB, Krause's, Present Knowledge in Nutrition, PubChem). Add "Cunoștințe nutriționale generale" only if you supplemented SCIENCE knowledge (not composition values) beyond the context.
"""

TOOLS = [
    {
        "type": "function",
        "function": {
            "name": "search_knowledge_base",
            "description": (
                "Search across all sources in the knowledge base: medical nutrition books "
                "(Krause's, Present Knowledge in Nutrition), FooDB summaries, and PubChem. "
                "Use for: nutrition science questions, RDA, mechanisms, deficiency, "
                "food sources of a nutrient, personalized advice."
            ),
            "parameters": {
                "type": "object",
                "properties": {
                    "query": {
                        "type": "string",
                        "description": "Search query in English, e.g. 'vitamin D biological functions recommended daily intake deficiency'"
                    }
                },
                "required": ["query"]
            }
        }
    },
    {
        "type": "function",
        "function": {
            "name": "get_food_data",
            "description": (
                "Get detailed nutritional composition for a specific food from FooDB. "
                "Use when user asks what a specific food contains or wants its macro/micronutrient profile."
            ),
            "parameters": {
                "type": "object",
                "properties": {
                    "food_name": {
                        "type": "string",
                        "description": "Food name in English, e.g. 'beef', 'spinach', 'salmon', 'lentils'"
                    }
                },
                "required": ["food_name"]
            }
        }
    }
]

RESPONSE_CLEANER_PROMPT = """You are a text editor. Clean the nutrition assistant response below. Do NOT ask questions, do NOT request clarification, do NOT add new content.

Editing rules:
1. Replace verbose food database identifiers with simple food names (e.g. "Beef, chuck, blade roast, lean, cooked, 3 oz" → "Carne de vită").
2. Convert portion-based FOOD values (per 3 oz, per ½ cup) to approximate per-100g values when obvious. NEVER convert RDA/DRI daily intake values.
3. Keep ALL numerical values (mg, g, %, IU, µg) exactly as-is.
4. ALWAYS keep the "**Surse:**" section unchanged at the end.
5. Remove excessive "Nu am date..." disclaimers if data is already present.
6. Keep the same language as the original.
7. Keep all formatting (bold, lists, headers).

<response>
{response}
</response>

Return only the cleaned text content. Do not include any XML tags, delimiters, or wrapper text in your output."""


# Singletons — construiți o singură dată la primul request
_index = None
_bm25 = None


def _build_index():
    pc = Pinecone(api_key=os.environ["PINECONE_API_KEY"])
    pinecone_index = pc.Index(os.environ.get("PINECONE_INDEX", "nutrirag"))
    Settings.llm = OpenAI(model="gpt-4o", temperature=0.2)
    Settings.embed_model = OpenAIEmbedding(model="text-embedding-3-small")
    vector_store = PineconeVectorStore(pinecone_index=pinecone_index)
    return VectorStoreIndex.from_vector_store(vector_store=vector_store)


def _build_bm25():
    if not BM25_CACHE_PATH.exists():
        print("[BM25] Cache inexistent — se folosește numai retrieval dens.")
        return None
    try:
        from llama_index.retrievers.bm25 import BM25Retriever
        nodes = []
        with open(BM25_CACHE_PATH, encoding="utf-8") as f:
            for line in f:
                d = json.loads(line)
                nodes.append(TextNode(text=d["text"], metadata=d.get("metadata", {}), id_=d["id"]))
        print(f"[BM25] {len(nodes)} noduri încărcate din cache.")
        return BM25Retriever.from_defaults(nodes=nodes, similarity_top_k=RETRIEVAL_TOP_K)
    except Exception as e:
        print(f"[BM25] Nu s-a putut inițializa: {e}")
        return None


def _get_index():
    global _index
    if _index is None:
        _index = _build_index()
    return _index


def _get_bm25():
    global _bm25
    if _bm25 is None:
        _bm25 = _build_bm25()
    return _bm25


# Calibrat pentru chunk-uri mici (256 fine + 512 standard tokens):
#   - Dense retrieval: top 40 din Pinecone
#   - BM25 retrieval: top 40 din cache (keyword-focused, distribuție diferită)
#   - Pool total după dedup: ~60-80 candidați unici
#   - Cross-encoder alege cei mai buni 12
#   - _truncate_context trimite max 18,000 chars la GPT-4o
#     → ~12 fine chunks (1,500 chars) sau ~6 standard chunks (3,000 chars)
MAX_CONTEXT_CHARS = 18_000
RETRIEVAL_TOP_K = 40   # per retriever (dense + BM25 separat)
RERANK_TOP_N = 12      # cross-encoder picks best

_cross_encoder = CrossEncoder("cross-encoder/ms-marco-MiniLM-L-6-v2")

# Traducere automată nume alimente din română → engleză pentru get_food_data
_RO_EN_FOODS = {
    "nuci braziliene": "Brazil nut",
    "nuca braziliana": "Brazil nut",
    "nuci": "walnut",
    "nuca": "walnut",
    "spanac": "spinach",
    "linte": "lentils",
    "năut": "chickpea",
    "naut": "chickpea",
    "hering atlantic": "Atlantic herring",
    "hering": "herring",
    "macrou atlantic": "Atlantic mackerel",
    "macrou": "mackerel",
    "sardine": "sardine",
    "somon": "salmon",
    "ton": "tuna",
    "cod": "cod",
    "tilapia": "tilapia",
    "creveți": "shrimp",
    "oua": "egg",
    "ouă": "egg",
    "lapte": "milk",
    "brânza": "cheese",
    "branza": "cheese",
    "iaurt": "yogurt",
    "pui": "chicken",
    "curcan": "turkey",
    "carne de vita": "beef",
    "carne de vită": "beef",
    "vita": "beef",
    "vită": "beef",
    "vaca": "beef",
    "vacă": "beef",
    "vitel": "veal",
    "vițel": "veal",
    "porc": "pork",
    "miel": "lamb",
    "berbec": "mutton",
    "ficatul": "liver",
    "ficat": "liver",
    "rinichi": "kidney",
    "inima": "heart",
    "inimă": "heart",
    "morcov": "carrot",
    "morcovi": "carrot",
    "broccoli": "broccoli",
    "varza": "kale",
    "kale": "kale",
    "rosii": "tomato",
    "roșii": "tomato",
    "ardei": "bell pepper",
    "avocado": "avocado",
    "banane": "banana",
    "banana": "banana",
    "mere": "apple",
    "mar": "apple",
    "portocale": "orange",
    "afine": "blueberry",
    "capsuni": "strawberry",
    "orez": "rice",
    "paste": "pasta",
    "grau": "wheat",
    "grâu": "wheat",
    "ovaz": "oats",
    "ovăz": "oats",
    "fasole": "beans",
    "mazare": "peas",
    "seminte de dovleac": "pumpkin seeds",
    "seminte de floarea soarelui": "sunflower seeds",
    "seminte de in": "flaxseed",
    "seminte de chia": "chia seeds",
    "natto": "natto",
    "tofu": "tofu",
    "tempeh": "tempeh",
    "migdale": "almonds",
    "caju": "cashew",
    "fistic": "pistachio",
    "arahide": "peanut",
    "ulei de masline": "olive oil",
    "usturoi": "garlic",
    "ceapa": "onion",
    "ciuperci": "mushroom",
    "cartofi": "potato",
}


def _translate_food_name(food_name: str) -> str:
    """Traduce numele alimentului din română în engleză pentru FooDB lookup."""
    name_lower = food_name.lower().strip()
    # Încearcă mai întâi match exact
    if name_lower in _RO_EN_FOODS:
        return _RO_EN_FOODS[name_lower]
    # Apoi match parțial (substring)
    for ro, en in _RO_EN_FOODS.items():
        if ro in name_lower:
            return en
    return food_name  # returnează ca atare dacă e deja în engleză


# Query expansion: termeni nutriționali în română → echivalente engleze pentru retrieval
_RO_EN = {
    "seleniu": "selenium selenoprotein",
    "folat": "folate folic acid folacin",
    "acid folic": "folic acid folate",
    "colina": "choline phosphatidylcholine",
    "calciu": "calcium",
    "fier": "iron ferritin hemoglobin non-heme",
    "zinc": "zinc",
    "magneziu": "magnesium",
    "potasiu": "potassium",
    "sodiu": "sodium",
    "vitamina c": "vitamin C ascorbic acid",
    "vitamina d": "vitamin D cholecalciferol calcitriol",
    "vitamina b12": "vitamin B12 cobalamin cyanocobalamin",
    "vitamina a": "vitamin A retinol beta-carotene retinyl",
    "vitamina k": "vitamin K phylloquinone menaquinone MK-7",
    "vitamina e": "vitamin E tocopherol tocotrienol",
    "vitamina b6": "vitamin B6 pyridoxine pyridoxal",
    "tiamina": "thiamine thiamin vitamin B1",
    "riboflavina": "riboflavin vitamin B2",
    "niacina": "niacin nicotinic acid vitamin B3",
    "grăsimi": "fat lipids fatty acids triglycerides",
    "grasimi": "fat lipids fatty acids triglycerides",
    "grasime": "fat lipid",
    "grăsime": "fat lipid",
    "lipide": "lipids fat",
    "acizi grasi": "fatty acids lipids",
    "acizi grași": "fatty acids lipids",
    "omega-3": "omega-3 EPA DHA ALA eicosapentaenoic docosahexaenoic alpha-linolenic",
    "omega-6": "omega-6 linoleic arachidonic",
    "proteine": "protein amino acids",
    "carbohidrati": "carbohydrate starch glucose sugar",
    "fibre": "fiber dietary fiber soluble insoluble",
    "antioxidanti": "antioxidants polyphenols flavonoids carotenoids",
    "oxalati": "oxalate oxalic acid",
    "fitati": "phytate phytic acid antinutrients",
    "curcumina": "curcumin turmeric Curcuma longa",
    "licopena": "lycopene carotenoid",
    "resveratrol": "resveratrol stilbene polyphenol SIRT1",
    "beta-caroten": "beta-carotene carotenoid provitamin A",
    "coenzima q10": "coenzyme Q10 ubiquinol ubiquinone",
    "sarcina": "pregnancy pregnant gestation",
    "vegetarian": "vegetarian vegan plant-based",
    "refeeding": "refeeding syndrome phosphate electrolyte",
    "bypass": "gastric bypass bariatric surgery Roux-en-Y",
    "parenterala": "parenteral nutrition TPN",
    "enterala": "enteral nutrition EN tube feeding",
    "casexie": "cachexia catabolic cancer wasting",
    "biodisponibilitate": "bioavailability absorption bioavailable",
}


def _expand_query(query: str) -> str:
    """Expandează termeni nutriționali din română cu echivalente engleze."""
    q_lower = query.lower()
    extras = []
    for ro, en in _RO_EN.items():
        if ro in q_lower and en.split()[0] not in q_lower:
            extras.append(en)
    if extras:
        return f"{query} {' '.join(extras)}"
    return query


def _rerank(nodes, query: str):
    if not nodes:
        return nodes
    scores = _cross_encoder.predict([(query, n.get_content()) for n in nodes])
    ranked = sorted(zip(scores, nodes), key=lambda x: x[0], reverse=True)
    return [node for _, node in ranked[:RERANK_TOP_N]]


def _truncate_context(chunks: list[str]) -> str:
    result, total = [], 0
    for chunk in chunks:
        if total + len(chunk) > MAX_CONTEXT_CHARS:
            break
        result.append(chunk)
        total += len(chunk)
    return "\n\n---\n\n".join(result) if result else "No results found."


def _retrieve_hybrid(queries: list[str], rerank_query: str) -> list:
    """Dense (Pinecone) + BM25 retrieval cu deduplicare și cross-encoder reranking."""
    index = _get_index()
    bm25 = _get_bm25()
    dense_retriever = index.as_retriever(similarity_top_k=RETRIEVAL_TOP_K)

    seen_ids, nodes = set(), []

    # Dense retrieval
    for q in queries:
        for node in dense_retriever.retrieve(q):
            if node.node_id not in seen_ids:
                seen_ids.add(node.node_id)
                nodes.append(node)

    # BM25 retrieval (dacă cache-ul există)
    if bm25:
        for node in bm25.retrieve(rerank_query):
            if node.node_id not in seen_ids:
                seen_ids.add(node.node_id)
                nodes.append(node)

    return _rerank(nodes, rerank_query)


def _search_knowledge_base(query: str) -> str:
    expanded = _expand_query(query)
    queries = [expanded, query] if expanded != query else [query]
    reranked = _retrieve_hybrid(queries, rerank_query=query)
    return _truncate_context([n.get_content() for n in reranked])


def _get_food_data(food_name: str) -> str:
    en_name = _translate_food_name(food_name)
    if en_name != food_name:
        print(f"[FoodTranslate] '{food_name}' → '{en_name}'")

    queries = [
        f"{en_name} nutritional composition protein fat carbohydrate vitamins minerals per 100g FooDB",
        f"{en_name} iron zinc calcium sodium potassium vitamin content mg per 100g FooDB",
        f"{en_name} vitamin C vitamin A vitamin B12 folate vitamin D vitamin E per 100g",
        f"{en_name} omega-3 EPA DHA ALA fatty acids lipids polyunsaturated per 100g",
        f"{en_name} selenium choline manganese copper phosphorus magnesium trace minerals per 100g",
    ]
    reranked = _retrieve_hybrid(queries, rerank_query=f"{en_name} nutritional values per 100g")
    if not reranked:
        return f"No data found for '{en_name}'."
    return _truncate_context([n.get_content() for n in reranked])


def _clean_response(raw: str) -> str:
    client = OpenAIClient(api_key=os.environ["OPENAI_API_KEY"])
    result = client.chat.completions.create(
        model="gpt-4o-mini",
        temperature=0,
        messages=[{"role": "user", "content": RESPONSE_CLEANER_PROMPT.format(response=raw)}]
    )
    return result.choices[0].message.content.strip()


def get_nutrition_answer(message: str, history: list = None) -> str:
    history = history or []
    client = OpenAIClient(api_key=os.environ["OPENAI_API_KEY"])

    messages = [
        {"role": "system", "content": AGENT_SYSTEM_PROMPT},
        *[{"role": e.get("role"), "content": e.get("content", "")} for e in history[-6:]],
        {"role": "user", "content": message},
    ]

    # Agent loop: max 4 tool calls before forcing final answer
    for _ in range(4):
        response = client.chat.completions.create(
            model="gpt-4o",
            temperature=0.2,
            tools=TOOLS,
            tool_choice="auto",
            messages=messages,
        )

        agent_msg = response.choices[0].message
        messages.append(agent_msg)

        if not agent_msg.tool_calls:
            break

        for tool_call in agent_msg.tool_calls:
            fn = tool_call.function.name
            args = json.loads(tool_call.function.arguments)

            if fn == "get_food_data":
                result = _get_food_data(args["food_name"])
            elif fn == "search_knowledge_base":
                result = _search_knowledge_base(args["query"])
            else:
                result = "Unknown tool."

            messages.append({
                "role": "tool",
                "tool_call_id": tool_call.id,
                "content": result,
            })

    # If the last agent turn was a tool call (content=None), force a final text response
    if not agent_msg.content:
        final = client.chat.completions.create(
            model="gpt-4o",
            temperature=0.2,
            messages=messages,
        )
        agent_msg = final.choices[0].message

    raw_response = agent_msg.content or "Nu am putut genera un răspuns. Te rog reformulează întrebarea."
    return _clean_response(raw_response)
