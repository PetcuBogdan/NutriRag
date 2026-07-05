"""
PubChem ingestion pipeline — uses the free PubChem PUG REST API.
No API key required.

Fetches molecular data for a curated list of nutritional compounds
and ingests them into Pinecone.

Run once:
  python -m ingestion.pubchem_ingestion
"""

import os
import time
import requests
from dotenv import load_dotenv
from llama_index.core import Document, VectorStoreIndex, StorageContext, Settings
from llama_index.core.node_parser import SimpleNodeParser
from llama_index.vector_stores.pinecone import PineconeVectorStore
from llama_index.llms.openai import OpenAI
from llama_index.embeddings.openai import OpenAIEmbedding
from pinecone import Pinecone

load_dotenv()

PUBCHEM_BASE = "https://pubchem.ncbi.nlm.nih.gov/rest/pug"

# Curated list of nutritionally relevant compounds
NUTRITIONAL_COMPOUNDS = [
    # Vitamins
    "ascorbic acid", "retinol", "cholecalciferol", "tocopherol", "phylloquinone",
    "thiamine", "riboflavin", "niacin", "pantothenic acid", "pyridoxine",
    "biotin", "folic acid", "cyanocobalamin",
    # Minerals (chelated forms)
    "ferrous sulfate", "ferrous gluconate", "ferric citrate",
    "calcium carbonate", "calcium citrate",
    "magnesium glycinate", "zinc gluconate", "potassium chloride",
    # Polyphenols
    "resveratrol", "quercetin", "curcumin", "epigallocatechin gallate",
    "ellagic acid", "anthocyanin", "kaempferol", "apigenin",
    # Fatty acids
    "docosahexaenoic acid", "eicosapentaenoic acid", "alpha-linolenic acid",
    "oleic acid", "linoleic acid",
    # Amino acids
    "tryptophan", "leucine", "lysine", "methionine", "phenylalanine",
    # Other bioactive
    "beta-carotene", "lycopene", "lutein", "zeaxanthin", "coenzyme Q10",
    "inositol", "choline", "betaine",
]

BATCH_SIZE = 50
REQUEST_DELAY = 0.3


def fetch_compound(name: str) -> dict | None:
    url = f"{PUBCHEM_BASE}/compound/name/{requests.utils.quote(name)}/JSON"
    try:
        resp = requests.get(url, timeout=15)
        if resp.status_code != 200:
            return None
        data = resp.json()
        props = data["PC_Compounds"][0].get("props", [])

        result = {"name": name, "cid": data["PC_Compounds"][0]["id"]["id"]["cid"]}
        for p in props:
            label = p.get("urn", {}).get("label", "")
            name_key = p.get("urn", {}).get("name", "")
            val = p.get("value", {})
            v = val.get("sval") or val.get("fval") or val.get("ival") or ""
            if label == "Molecular Formula":
                result["formula"] = v
            elif label == "Molecular Weight":
                result["molecular_weight"] = v
            elif label == "IUPAC Name" and name_key == "Preferred":
                result["iupac_name"] = v
            elif label == "InChIKey":
                result["inchikey"] = v
        return result
    except Exception as e:
        print(f"[PubChem] Error fetching {name}: {e}")
        return None


def build_document(compound: dict) -> Document:
    text = (
        f"Compound: {compound['name']}\n"
        f"PubChem CID: {compound.get('cid', 'N/A')}\n"
        f"Molecular Formula: {compound.get('formula', 'N/A')}\n"
        f"Molecular Weight: {compound.get('molecular_weight', 'N/A')} g/mol\n"
        f"IUPAC Name: {compound.get('iupac_name', 'N/A')}\n"
        f"Source: PubChem (pubchem.ncbi.nlm.nih.gov)\n"
        f"Usage in nutrition: This compound is a nutritionally relevant molecule. "
        f"Molecular identity verified via PubChem database (NIH)."
    )
    return Document(
        text=text,
        metadata={
            "source": "PubChem",
            "compound_name": compound["name"],
            "pubchem_cid": str(compound.get("cid", "")),
        }
    )


def ingest_pubchem():
    pc = Pinecone(api_key=os.environ["PINECONE_API_KEY"])
    pinecone_index = pc.Index(os.environ.get("PINECONE_INDEX", "nutrirag"))

    llm = OpenAI(model="gpt-4o", temperature=0)
    embed_model = OpenAIEmbedding(model="text-embedding-3-small")
    Settings.llm = llm
    Settings.embed_model = embed_model

    vector_store = PineconeVectorStore(pinecone_index=pinecone_index)
    storage_context = StorageContext.from_defaults(vector_store=vector_store)
    node_parser = SimpleNodeParser.from_defaults(chunk_size=512, chunk_overlap=32)

    documents = []
    for compound_name in NUTRITIONAL_COMPOUNDS:
        data = fetch_compound(compound_name)
        if data:
            documents.append(build_document(data))
            print(f"[PubChem] Fetched: {compound_name} (CID {data.get('cid')})")
        time.sleep(REQUEST_DELAY)

    for i in range(0, len(documents), BATCH_SIZE):
        batch = documents[i:i + BATCH_SIZE]
        VectorStoreIndex.from_documents(
            documents=batch,
            storage_context=storage_context,
            transformations=[node_parser],
            show_progress=True,
        )

    print(f"[PubChem] Ingested {len(documents)} compounds.")


if __name__ == "__main__":
    ingest_pubchem()
