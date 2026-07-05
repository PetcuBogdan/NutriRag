"""
FooDB ingestion pipeline.

FooDB does not have a public REST API. You must download the CSV dump from:
  https://foodb.ca/downloads  →  "FooDB Data (CSV)"

Expected files in data/foodb/:
  - Food.csv        (food_name, description, food_group, food_subgroup)
  - Compound.csv    (name, description, moldb_smiles, moldb_formula, moldb_mw)
  - Content.csv     (food_id, compound_id, orig_content, orig_unit, citation)

Run this script once to ingest FooDB into Pinecone:
  python -m ingestion.foodb_ingestion
"""

import csv
import json
import os
import statistics
from dotenv import load_dotenv
from llama_index.core import VectorStoreIndex, StorageContext, Settings
from llama_index.core.schema import TextNode
from llama_index.vector_stores.pinecone import PineconeVectorStore
from llama_index.llms.openai import OpenAI
from llama_index.embeddings.openai import OpenAIEmbedding
from pinecone import Pinecone

load_dotenv()

import sys
sys.path.insert(0, os.path.join(os.path.dirname(__file__), ".."))
from food_aliases import FOOD_ALIASES

FOODB_DATA_DIR = os.path.join(os.path.dirname(__file__), "..", "data", "foodb")
BM25_CACHE = os.path.join(os.path.dirname(__file__), "bm25_nodes_cache.jsonl")
BATCH_SIZE = 100


PRIORITY_NUTRIENTS = {
    # Macronutrients — FooDB uses USDA full names, so include both short and long forms
    "protein", "fat", "total fat", "total lipid (fat)", "total lipid",
    "carbohydrate", "carbohydrates", "total carbohydrate",
    "total carbohydrate, by difference", "carbohydrate, by difference",
    "fiber", "dietary fiber", "total dietary fiber",
    "total dietary fiber (tdf)", "fiber, total dietary",
    "cholesterol", "energy", "water",
    # Fatty acid subtypes (for when total fat is missing)
    "fatty acids, total saturated", "fatty acids, total monounsaturated",
    "fatty acids, total polyunsaturated", "fatty acids, total trans",
    "saturated fat", "monounsaturated fat", "polyunsaturated fat",
    # Minerals — short and USDA long names
    "iron", "iron, fe", "zinc", "zinc, zn",
    "calcium", "calcium, ca", "magnesium", "magnesium, mg",
    "potassium", "potassium, k", "sodium", "sodium, na",
    "phosphorus", "phosphorus, p", "selenium", "selenium, se",
    "copper", "copper, cu", "manganese", "manganese, mn",
    "iodine", "chromium", "fluoride", "fluoride, f",
    # Fat-soluble vitamins
    "vitamin a", "vitamin a, rae", "vitamin a, iu",
    "vitamin d", "vitamin d (d2 + d3)", "vitamin d2", "vitamin d3",
    "vitamin e", "vitamin e (alpha-tocopherol)", "alpha-tocopherol",
    "vitamin k", "vitamin k (phylloquinone)", "phylloquinone",
    "retinol", "beta-carotene",
    # Water-soluble vitamins
    "vitamin c", "vitamin c, total ascorbic acid", "ascorbic acid",
    "vitamin b1", "vitamin b2", "vitamin b3", "vitamin b5", "vitamin b6", "vitamin b12",
    "folate", "folate, total", "folate, dfe", "folic acid", "biotin", "choline",
    "thiamine", "riboflavin", "niacin", "pantothenic acid",
    "vitamin b-6", "vitamin b-12", "niacin equivalent",
    # Fatty acids
    "omega-3", "omega-6", "alpha-linolenic acid", "ala",
    "eicosapentaenoic acid", "epa",
    "docosahexaenoic acid", "dha",
    "linoleic acid", "arachidonic acid",
    # Phytonutrients
    "lycopene", "lutein", "zeaxanthin", "resveratrol",
    "lutein + zeaxanthin",
}


def _load_csv_as_dict(path: str, key: str) -> dict:
    with open(path, encoding="utf-8") as f:
        return {row[key]: row for row in csv.DictReader(f)}


def _build_food_compounds(contents_path: str, compounds: dict) -> dict:
    # Aggregate by (food_id, nutrient_name) → list of values for averaging
    raw: dict = {}
    with open(contents_path, encoding="utf-8") as f:
        for row in csv.DictReader(f):
            fid = row.get("food_id", "")
            content = row.get("orig_content", "")
            unit = row.get("orig_unit", "mg/100g")
            if not content or not fid:
                continue
            try:
                val = float(content)
            except ValueError:
                continue

            if row.get("source_type") == "Nutrient":
                name = row.get("orig_source_name", "").strip()
            else:
                comp = compounds.get(row.get("source_id", ""))
                name = comp.get("name", "").strip() if comp else row.get("orig_source_name", "").strip()

            if not name:
                continue

            key = (fid, name, unit)
            raw.setdefault(key, []).append(val)

    food_compounds: dict = {}
    for (fid, name, unit), vals in raw.items():
        # Use median to resist outliers (e.g. DUKE entries with wrong units)
        value = statistics.median(vals)
        food_compounds.setdefault(fid, []).append({
            "name": name,
            "content": f"{value:.4g}",
            "unit": unit,
        })
    return food_compounds


def _select_compound_lines(fid: str, food_compounds: dict) -> list[str]:
    all_comps = [c for c in food_compounds.get(fid, []) if c["name"]]
    priority = [c for c in all_comps if c["name"].lower() in PRIORITY_NUTRIENTS]
    others = [c for c in all_comps if c["name"].lower() not in PRIORITY_NUTRIENTS]
    return [f"  - {c['name']}: {c['content']} {c['unit']}" for c in (priority + others)[:50]]


def _build_node(fid: str, food: dict, comp_lines: list[str]) -> TextNode:
    food_name = food.get("name", "")
    food_scientific = food.get("name_scientific", "")
    aliases = FOOD_ALIASES.get(food_name, [])

    if aliases:
        alias_line = f"Also known as: {', '.join(aliases)}\n"
    elif food_scientific:
        alias_line = f"Scientific name: {food_scientific}\n"
    else:
        alias_line = ""

    # Truncate description to 300 chars so nutrients always fit in the same node
    raw_desc = food.get("description", "")
    desc = (raw_desc[:300] + "...") if len(raw_desc) > 300 else raw_desc

    text = (
        f"Food: {food_name}\n"
        f"{alias_line}"
        f"Group: {food.get('food_group', '')} / {food.get('food_subgroup', '')}\n"
    )
    if comp_lines:
        text += "Nutritional compounds (FooDB):\n" + "\n".join(comp_lines) + "\n"
    if desc:
        text += f"Description: {desc}\n"

    return TextNode(
        text=text,
        metadata={
            "source": "FooDB",
            "food_name": food_name,
            "food_name_scientific": food_scientific,
            "common_names": ", ".join(aliases) if aliases else food_name.lower(),
            "food_group": food.get("food_group", ""),
            "foodb_id": fid,
        }
    )


def load_foodb_nodes() -> list[TextNode]:
    foods = _load_csv_as_dict(os.path.join(FOODB_DATA_DIR, "Food.csv"), "id")
    compounds = _load_csv_as_dict(os.path.join(FOODB_DATA_DIR, "Compound.csv"), "id")
    food_compounds = _build_food_compounds(os.path.join(FOODB_DATA_DIR, "Content.csv"), compounds)

    nodes = [
        _build_node(fid, food, _select_compound_lines(fid, food_compounds))
        for fid, food in foods.items()
    ]

    print(f"[FooDB] Built {len(nodes)} nodes (1 per food row, no chunking).")
    return nodes


def _append_to_bm25_cache(nodes) -> None:
    with open(BM25_CACHE, "a", encoding="utf-8") as f:
        for node in nodes:
            f.write(json.dumps({
                "id": node.node_id,
                "text": node.get_content(),
                "metadata": node.metadata,
            }, ensure_ascii=False) + "\n")


def ingest_foodb():
    pc = Pinecone(api_key=os.environ["PINECONE_API_KEY"])
    pinecone_index = pc.Index(os.environ.get("PINECONE_INDEX", "nutrirag"))

    Settings.llm = OpenAI(model="gpt-4o", temperature=0)
    Settings.embed_model = OpenAIEmbedding(model="text-embedding-3-small")

    vector_store = PineconeVectorStore(pinecone_index=pinecone_index)
    storage_context = StorageContext.from_defaults(vector_store=vector_store)

    nodes = load_foodb_nodes()

    for i in range(0, len(nodes), BATCH_SIZE):
        batch = nodes[i:i + BATCH_SIZE]
        VectorStoreIndex(nodes=batch, storage_context=storage_context)
        print(f"[FooDB] Batch {i // BATCH_SIZE + 1}/{(len(nodes) - 1) // BATCH_SIZE + 1} ingested.")

    _append_to_bm25_cache(nodes)
    print(f"[FooDB] {len(nodes)} noduri salvate în BM25 cache.")
    print("[FooDB] Ingestion complete.")


if __name__ == "__main__":
    ingest_foodb()
