"""
Books ingestion — PDF-uri de specialitate din data/books/.

Strategia de chunking (2 niveluri):
  - Fine   (256 tokens, overlap 32)  → retrieval precis pentru valori exacte, tabele DRI/FAO
  - Standard (512 tokens, overlap 64) → retrieval cu context (mecanisme, protocoale clinice)

Ambele niveluri se duc în Pinecone. Nodurile sunt salvate și în
ingestion/bm25_nodes_cache.jsonl pentru BM25 hybrid retrieval la query time.

Pune PDF-urile în: AI-API/LicentaAPI-AI/data/books/
Rulează din folderul AI-API/LicentaAPI-AI/:
  python -m ingestion.books_ingestion

Progresul e salvat în ingestion/books_ingested.json.
"""

import json
import os
from pathlib import Path

import fitz
from dotenv import load_dotenv
from llama_index.core import Document, VectorStoreIndex, StorageContext, Settings
from llama_index.core.node_parser import SentenceSplitter
from llama_index.vector_stores.pinecone import PineconeVectorStore
from llama_index.llms.openai import OpenAI
from llama_index.embeddings.openai import OpenAIEmbedding
from pinecone import Pinecone

load_dotenv()

BOOKS_DIR = Path(__file__).parent.parent / "data" / "books"
PROGRESS_FILE = Path(__file__).parent / "books_ingested.json"
BM25_CACHE = Path(__file__).parent / "bm25_nodes_cache.jsonl"
BATCH_SIZE = 50

# Două niveluri de granularitate
CHUNK_CONFIGS = [
    {"chunk_size": 256, "chunk_overlap": 32,  "level": "fine"},
    {"chunk_size": 512, "chunk_overlap": 64,  "level": "standard"},
]


def _load_progress() -> set[str]:
    if PROGRESS_FILE.exists():
        return set(json.loads(PROGRESS_FILE.read_text(encoding="utf-8")).get("ingested", []))
    return set()


def _save_progress(ingested: set[str]) -> None:
    PROGRESS_FILE.write_text(
        json.dumps({"ingested": sorted(ingested)}, ensure_ascii=False, indent=2),
        encoding="utf-8",
    )


def _append_to_bm25_cache(nodes) -> None:
    with open(BM25_CACHE, "a", encoding="utf-8") as f:
        for node in nodes:
            f.write(json.dumps({
                "id": node.node_id,
                "text": node.get_content(),
                "metadata": node.metadata,
            }, ensure_ascii=False) + "\n")


def extract_text_from_pdf(pdf_path: Path) -> str:
    try:
        pages = []
        doc = fitz.open(str(pdf_path))
        for page in doc:
            try:
                text = page.get_text("text")
                if text and text.strip():
                    pages.append(text)
            except Exception:
                continue
        doc.close()
        return "\n\n".join(pages)
    except Exception as e:
        print(f"[Books] EROARE la citirea {pdf_path.name}: {e}")
        return ""


def ingest_books():
    pdf_files = list(BOOKS_DIR.glob("*.pdf"))
    if not pdf_files:
        print(f"[Books] Nu am găsit niciun PDF în {BOOKS_DIR}")
        return

    ingested = _load_progress()
    pending = [p for p in pdf_files if p.name not in ingested]

    print(f"[Books] {len(pdf_files)} PDF-uri, {len(ingested)} deja ingested, {len(pending)} rămase.")
    if not pending:
        print("[Books] Nimic de procesat.")
        return

    pc = Pinecone(api_key=os.environ["PINECONE_API_KEY"])
    pinecone_index = pc.Index(os.environ.get("PINECONE_INDEX", "nutrirag"))

    Settings.llm = OpenAI(model="gpt-4o", temperature=0)
    Settings.embed_model = OpenAIEmbedding(model="text-embedding-3-small")

    vector_store = PineconeVectorStore(pinecone_index=pinecone_index)
    storage_context = StorageContext.from_defaults(vector_store=vector_store)

    for pdf_path in pending:
        print(f"\n[Books] Procesez: {pdf_path.name}")
        text = extract_text_from_pdf(pdf_path)

        if not text.strip():
            print(f"[Books] Skipped {pdf_path.name} — nu am putut extrage text.")
            ingested.add(pdf_path.name)
            _save_progress(ingested)
            continue

        total_nodes_this_book = 0
        for cfg in CHUNK_CONFIGS:
            document = Document(
                text=text,
                metadata={
                    "source": pdf_path.stem,
                    "file_name": pdf_path.name,
                    "type": "medical_book",
                    "chunk_level": cfg["level"],
                    "chunk_size": cfg["chunk_size"],
                },
            )
            splitter = SentenceSplitter(
                chunk_size=cfg["chunk_size"],
                chunk_overlap=cfg["chunk_overlap"],
            )
            nodes = splitter.get_nodes_from_documents([document])

            print(f"  [{cfg['level']}] {len(nodes)} noduri (chunk={cfg['chunk_size']})")

            for i in range(0, len(nodes), BATCH_SIZE):
                batch = nodes[i:i + BATCH_SIZE]
                VectorStoreIndex(nodes=batch, storage_context=storage_context)

            _append_to_bm25_cache(nodes)
            total_nodes_this_book += len(nodes)

        ingested.add(pdf_path.name)
        _save_progress(ingested)
        print(f"[Books] {pdf_path.name} ingested: {total_nodes_this_book} noduri totale.")

    print("\n[Books] Ingestion complet.")


if __name__ == "__main__":
    ingest_books()
