"""
HuggingFace foods-nutrition-dataset ingestion.

Dataset: adarshzolekar/foods-nutrition-dataset
1028 food items with: Energy, Carbs, Protein, Fat, Freesugar, Fibre, Cholesterol, Calcium

Run from AI-API/LicentaAPI-AI:
    pipenv run python -m ingestion.hf_nutrition_ingestion
"""

import json
import os
from dotenv import load_dotenv
from datasets import load_dataset
from llama_index.core import VectorStoreIndex, StorageContext, Settings
from llama_index.core.schema import TextNode
from llama_index.vector_stores.pinecone import PineconeVectorStore
from llama_index.llms.openai import OpenAI
from llama_index.embeddings.openai import OpenAIEmbedding
from pinecone import Pinecone

load_dotenv()

BATCH_SIZE = 100
BM25_CACHE = os.path.join(os.path.dirname(__file__), "bm25_nodes_cache.jsonl")
_G = "g/100g"
_MG = "mg/100g"
_KCAL = "kcal/100g"


def _fmt(val, unit: str = "") -> str | None:
    if val is None:
        return None
    try:
        return f"{float(val):.2f} {unit}".strip()
    except (TypeError, ValueError):
        return None


def _build_node(row: dict) -> TextNode | None:
    food_name = str(row.get("Food Items", "")).strip()
    if not food_name:
        return None

    fields = [
        ("Energy",      row.get("Energy kcal"),   _KCAL),
        ("Carbs",       row.get("Carbs"),          _G),
        ("Protein",     row.get("Protein(g)"),     _G),
        ("Fat",         row.get("Fat(g)"),          _G),
        ("Free Sugar",  row.get("Freesugar(g)"),   _G),
        ("Fibre",       row.get("Fibre(g)"),        _G),
        ("Cholesterol", row.get("Cholestrol(mg)"), _MG),
        ("Calcium",     row.get("Calcium(mg)"),    _MG),
    ]

    lines = [f"  - {label}: {v}" for label, val, unit in fields if (v := _fmt(val, unit))]

    text = (
        f"Food: {food_name}\n"
        f"Source: HuggingFace foods-nutrition-dataset\n"
        f"Nutritional values per 100g:\n"
        + ("\n".join(lines) if lines else "  No values available.")
    )

    return TextNode(
        text=text,
        metadata={
            "source": "HF-foods-nutrition",
            "food_name": food_name,
            "food_group": "",
        }
    )


def ingest_hf_nutrition():
    print("[HF] Loading dataset adarshzolekar/foods-nutrition-dataset ...")
    ds = load_dataset("adarshzolekar/foods-nutrition-dataset")
    rows = list(ds["train"])
    print(f"[HF] {len(rows)} rows loaded.")

    nodes = [n for row in rows if (n := _build_node(row))]
    print(f"[HF] {len(nodes)} nodes built (1 per row, no chunking).")

    pc = Pinecone(api_key=os.environ["PINECONE_API_KEY"])
    pinecone_index = pc.Index(os.environ.get("PINECONE_INDEX", "nutrirag"))

    Settings.llm = OpenAI(model="gpt-4o", temperature=0)
    Settings.embed_model = OpenAIEmbedding(model="text-embedding-3-small")

    vector_store = PineconeVectorStore(pinecone_index=pinecone_index)
    storage_context = StorageContext.from_defaults(vector_store=vector_store)

    for i in range(0, len(nodes), BATCH_SIZE):
        batch = nodes[i:i + BATCH_SIZE]
        VectorStoreIndex(nodes=batch, storage_context=storage_context)
        print(f"[HF] Batch {i // BATCH_SIZE + 1}/{(len(nodes) - 1) // BATCH_SIZE + 1} ingested.")

    # Cache noduri pentru BM25 hybrid retrieval
    with open(BM25_CACHE, "a", encoding="utf-8") as f:
        for node in nodes:
            f.write(json.dumps({
                "id": node.node_id,
                "text": node.get_content(),
                "metadata": node.metadata,
            }, ensure_ascii=False) + "\n")
    print(f"[HF] {len(nodes)} noduri salvate în BM25 cache.")
    print("[HF] Ingestion complete.")


if __name__ == "__main__":
    ingest_hf_nutrition()
