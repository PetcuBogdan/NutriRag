"""
Manual corrections for foods where FooDB aggregation is inaccurate.

FooDB aggregates all preparations of a genus into one food entry, which skews
values when seeds/kernels (high zinc) are averaged with the whole fruit (low zinc).
This script adds targeted, accurate documents for such cases.

Run from AI-API/LicentaAPI-AI:
    pipenv run python -m ingestion.manual_corrections
"""

import os
from dotenv import load_dotenv
from llama_index.core import Document, VectorStoreIndex, StorageContext, Settings
from llama_index.core.node_parser import SimpleNodeParser
from llama_index.vector_stores.pinecone import PineconeVectorStore
from llama_index.llms.openai import OpenAI
from llama_index.embeddings.openai import OpenAIEmbedding
from pinecone import Pinecone

load_dotenv()

# Foods where FooDB aggregation produces incorrect values.
# Values sourced from USDA FoodData Central / FooDB raw per-preparation entries.
MANUAL_DOCUMENTS = [
    Document(
        text=(
            "Food: Pumpkin seeds (semințe de dovleac)\n"
            "Also known as: pepitas, pumpkin seed kernels, squash seeds, seminte de dovleac\n"
            "Source: FooDB (USDA FoodData Central, per-preparation entries)\n"
            "Note: values below are specifically for the SEEDS/KERNELS, not the pumpkin fruit.\n"
            "Nutritional values per 100g (dried kernels):\n"
            "  - Zinc: 7.81 mg/100g  (roasted kernels: 7.64 mg/100g)\n"
            "  - Iron: 8.82 mg/100g\n"
            "  - Magnesium: 550 mg/100g\n"
            "  - Phosphorus: 1233 mg/100g\n"
            "  - Potassium: 809 mg/100g\n"
            "  - Protein: 30.2 g/100g\n"
            "  - Fat: 49.1 g/100g\n"
            "  - Fiber: 6.0 g/100g\n"
            "  - Energy: 559 kcal/100g\n"
            "  - Vitamin K: 7.3 µg/100g\n"
            "  - Copper: 1.39 mg/100g\n"
            "  - Manganese: 4.54 mg/100g\n"
        ),
        metadata={
            "source": "FooDB-manual-correction",
            "food_name": "Pumpkin seeds",
            "food_group": "Nuts and seeds",
        }
    ),
    Document(
        text=(
            "Food: Red bell pepper raw (ardei roșu crud)\n"
            "Also known as: red pepper, sweet red pepper, capsicum annuum red, ardei rosu, pimento\n"
            "Source: FooDB (DTU + USDA FoodData Central entries for Peppers sweet red raw)\n"
            "Nutritional values per 100g (raw):\n"
            "  - Vitamin C: 159 mg/100g  (range: 128–191 mg/100g depending on source)\n"
            "  - Vitamin A: 157 µg RAE/100g\n"
            "  - Vitamin B6: 0.29 mg/100g\n"
            "  - Vitamin E: 1.58 mg/100g\n"
            "  - Vitamin K: 4.9 µg/100g\n"
            "  - Folate: 46 µg/100g\n"
            "  - Potassium: 211 mg/100g\n"
            "  - Iron: 0.43 mg/100g\n"
            "  - Calcium: 7 mg/100g\n"
            "  - Fiber: 2.1 g/100g\n"
            "  - Carbohydrates: 6.0 g/100g\n"
            "  - Protein: 0.99 g/100g\n"
            "  - Energy: 31 kcal/100g\n"
        ),
        metadata={
            "source": "FooDB-manual-correction",
            "food_name": "Red bell pepper",
            "food_group": "Vegetables",
        }
    ),
]


def ingest_manual_corrections():
    pc = Pinecone(api_key=os.environ["PINECONE_API_KEY"])
    pinecone_index = pc.Index(os.environ.get("PINECONE_INDEX", "nutrirag"))

    Settings.llm = OpenAI(model="gpt-4o", temperature=0)
    Settings.embed_model = OpenAIEmbedding(model="text-embedding-3-small")

    vector_store = PineconeVectorStore(pinecone_index=pinecone_index)
    storage_context = StorageContext.from_defaults(vector_store=vector_store)
    node_parser = SimpleNodeParser.from_defaults(chunk_size=2048, chunk_overlap=0)

    VectorStoreIndex.from_documents(
        documents=MANUAL_DOCUMENTS,
        storage_context=storage_context,
        transformations=[node_parser],
        show_progress=True,
    )
    print(f"[Manual] {len(MANUAL_DOCUMENTS)} documents ingested.")


if __name__ == "__main__":
    ingest_manual_corrections()
