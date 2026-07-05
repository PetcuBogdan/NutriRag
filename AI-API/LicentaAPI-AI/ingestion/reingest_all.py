"""
Reingestare completă NutriRAG.

Șterge tot din Pinecone, curăță cache-urile și reingestează:
  1. FooDB (1 nod/aliment)
  2. HF foods-nutrition-dataset
  3. Books (2 niveluri: 256 fine + 512 standard)

Rulează din AI-API/LicentaAPI-AI/:
  pipenv run python -m ingestion.reingest_all

Durată estimată: 45-90 minute (depinde de mărimea cărților).
"""

import os
import sys
from pathlib import Path
from dotenv import load_dotenv
from pinecone import Pinecone

load_dotenv()

INGESTION_DIR = Path(__file__).parent
BM25_CACHE    = INGESTION_DIR / "bm25_nodes_cache.jsonl"
BOOKS_PROGRESS = INGESTION_DIR / "books_ingested.json"


def clear_pinecone():
    pc = Pinecone(api_key=os.environ["PINECONE_API_KEY"])
    idx = pc.Index(os.environ.get("PINECONE_INDEX", "nutrirag"))
    print("[Reingest] Șterg toți vectorii din Pinecone...")
    idx.delete(delete_all=True)
    stats = idx.describe_index_stats()
    print(f"[Reingest] Index gol: {stats.total_vector_count} vectori rămași.")


def clear_caches():
    if BM25_CACHE.exists():
        BM25_CACHE.unlink()
        print(f"[Reingest] Șters {BM25_CACHE.name}")
    if BOOKS_PROGRESS.exists():
        BOOKS_PROGRESS.unlink()
        print(f"[Reingest] Șters {BOOKS_PROGRESS.name}")


def run():
    print("\n" + "=" * 60)
    print("  NutriRAG — Reingestare completă")
    print("=" * 60)

    confirm = input("\nAceasta va șterge TOȚI vectorii din Pinecone și va reingestă totul.\nContinuă? (da/nu): ").strip().lower()
    if confirm != "da":
        print("Anulat.")
        sys.exit(0)

    clear_pinecone()
    clear_caches()

    print("\n[1/3] FooDB ingestion...")
    from ingestion.foodb_ingestion import ingest_foodb
    ingest_foodb()

    print("\n[2/3] HF Nutrition ingestion...")
    from ingestion.hf_nutrition_ingestion import ingest_hf_nutrition
    ingest_hf_nutrition()

    print("\n[3/3] Books ingestion (256 fine + 512 standard chunks)...")
    from ingestion.books_ingestion import ingest_books
    ingest_books()

    print("\n" + "=" * 60)
    print("  Reingestare completă!")

    from pinecone import Pinecone as PC
    pc = PC(api_key=os.environ["PINECONE_API_KEY"])
    idx = pc.Index(os.environ.get("PINECONE_INDEX", "nutrirag"))
    stats = idx.describe_index_stats()
    print(f"  Vectori în Pinecone: {stats.total_vector_count}")

    if BM25_CACHE.exists():
        lines = sum(1 for _ in open(BM25_CACHE))
        print(f"  Noduri în BM25 cache: {lines}")
    print("=" * 60 + "\n")


if __name__ == "__main__":
    run()
