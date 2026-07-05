from dotenv import load_dotenv
import os
from llama_index import SimpleDirectoryReader
from llama_index.node_parser import SimpleNodeParser
from llama_index.llms import OpenAI
from llama_index.embeddings.openai import OpenAIEmbedding
from llama_index import (
    download_loader,
    ServiceContext,
    VectorStoreIndex,
    StorageContext,
    Document
)
from llama_index.vector_stores import PineconeVectorStore
from pathlib import Path
from llama_hub.file.unstructured import UnstructuredReader
import pinecone

load_dotenv()
pinecone.init(
    api_key=os.environ["PINECONE_API_KEY"],
    environment=os.environ["PINECONE_ENVIRONMENT"],
)

def ingest_document(document_content):
    print("Starting ingestion process...")

    # Create a document object from the string content
    document = Document(text=document_content)

    # Initialize the reader (if necessary)
    loader = UnstructuredReader()

    # Parse the document into nodes
    node_parser = SimpleNodeParser.from_defaults(chunk_size=500, chunk_overlap=20)
    nodes = node_parser.get_nodes_from_documents(documents=[document])

    # Initialize the models and service context
    llm = OpenAI(model="gpt-3.5-turbo", temperature=0)
    embed_model = OpenAIEmbedding(model="text-embedding-ada-002", embed_batch_size=100)
    service_context = ServiceContext.from_defaults(
        llm=llm, embed_model=embed_model, node_parser=node_parser
    )

    # Set up Pinecone index and vector store
    index_name = "llamaindex-doc"
    pinecone_index = pinecone.Index(index_name=index_name)
    vectorstore = PineconeVectorStore(pinecone_index=pinecone_index)
    storage_context = StorageContext.from_defaults(vector_store=vectorstore)

    # Create the index from documents
    index = VectorStoreIndex.from_documents(
        documents=[document],
        storage_context=storage_context,
        service_context=service_context,
        show_progress=True,
    )

    print("Ingestion process finished.")


# if __name__ == "__main__":
#     print("hello")
#     loader = UnstructuredReader()
#
#     dir_reader = SimpleDirectoryReader(
#         input_dir="./llamaindex-docs-temp",
#         file_extractor={".pfd": UnstructuredReader()},
#     )
#     documents = dir_reader.load_data()
#     print(len(documents))
#     node_parser = SimpleNodeParser.from_defaults(chunk_size=500, chunk_overlap=20)
#     nodes = node_parser.get_nodes_from_documents(documents=documents)
#
#     llm = OpenAI(model="gpt-3.5-turbo", temperature=0)
#     embed_model = OpenAIEmbedding(model="text-embedding-ada-002", embed_batch_size=100)
#     service_context = ServiceContext.from_defaults(
#         llm=llm, embed_model=embed_model, node_parser=node_parser
#     )
#
#     index_name = "llamaindex-doc"
#     pinecone_index = pinecone.Index(index_name=index_name)
#     vectorstore = PineconeVectorStore(pinecone_index=pinecone_index)
#     storage_context = StorageContext.from_defaults(vector_store=vectorstore)
#
#     index = VectorStoreIndex.from_documents(
#         documents=documents,
#         storage_context=storage_context,
#         service_context=service_context,
#         show_progress=True,
#     )
#
#     print("finish ingestion")
