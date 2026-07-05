"""
Delete vectors from Pinecone index.

Options:
  --all          Delete all vectors (full re-ingestion needed)
  --source NAME  Delete only vectors with metadata source == NAME
                 (e.g., FooDB, HF-foods-nutrition, PubChem)

Examples:
  pipenv run python -m ingestion.delete_vectors --all
  pipenv run python -m ingestion.delete_vectors --source FooDB
  pipenv run python -m ingestion.delete_vectors --source HF-foods-nutrition
"""

import os
import sys
from dotenv import load_dotenv
from pinecone import Pinecone

load_dotenv()


def delete_all(index):
    print("[Delete] Ștergere TOȚI vectorii din index...")
    index.delete(delete_all=True)
    stats = index.describe_index_stats()
    print(f"[Delete] Done. Vectori rămași: {stats.total_vector_count}")


def delete_by_source(index, source: str):
    print(f"[Delete] Ștergere vectori cu source='{source}'...")
    index.delete(filter={"source": {"$eq": source}})
    stats = index.describe_index_stats()
    print(f"[Delete] Done. Vectori rămași: {stats.total_vector_count}")


if __name__ == "__main__":
    pc = Pinecone(api_key=os.environ["PINECONE_API_KEY"])
    idx = pc.Index(os.environ.get("PINECONE_INDEX", "nutrirag"))

    if "--all" in sys.argv:
        confirm = input("Sigur vrei să ștergi TOȚI vectorii? (da/nu): ").strip().lower()
        if confirm == "da":
            delete_all(idx)
        else:
            print("Anulat.")
    elif "--source" in sys.argv:
        i = sys.argv.index("--source")
        source = sys.argv[i + 1]
        delete_by_source(idx, source)
    else:
        print(__doc__)
        stats = idx.describe_index_stats()
        print(f"\nIndex actual: {stats.total_vector_count} vectori")
