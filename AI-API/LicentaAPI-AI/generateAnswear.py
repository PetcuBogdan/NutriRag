import asyncio
import time

from dotenv import load_dotenv
import os
import pinecone
from llama_index import VectorStoreIndex, ServiceContext, Prompt
from llama_index.chat_engine.types import ChatMode
from llama_index.postprocessor import SentenceEmbeddingOptimizer
from llama_index.vector_stores import PineconeVectorStore
from llama_index.callbacks import LlamaDebugHandler, CallbackManager
from llama_index.memory import ChatMemoryBuffer

from node_postprocessors.duplicate_postprocessing import DuplicateBaseNodePostprocessor

from flask import Flask, request, session, jsonify, Response
from flask_session import Session
from flask_cors import CORS

app = Flask(__name__)
CORS(app)
load_dotenv()

memory = ChatMemoryBuffer.from_defaults(token_limit=3900)

llama_debug = LlamaDebugHandler(print_trace_on_end=True)
callback_manager = CallbackManager(handlers=[llama_debug])
service_context = ServiceContext.from_defaults(callback_manager=callback_manager)


def get_index() -> VectorStoreIndex:
    pinecone.init(
        api_key=os.environ["PINECONE_API_KEY"],
        environment=os.environ["PINECONE_ENVIRONMENT"],
    )
    index_name = "llamaindex-doc"
    pinecone_index = pinecone.Index(index_name=index_name)
    vector_store = PineconeVectorStore(pinecone_index=pinecone_index)

    return VectorStoreIndex.from_vector_store(
        vector_store=vector_store, service_context=service_context
    )


index = get_index()

postprocessor = SentenceEmbeddingOptimizer(
    embed_model=service_context.embed_model, percentile_cutoff=0.5, threshold_cutoff=0.7
)

chat_engine = index.as_chat_engine(
    chat_mode=ChatMode.CONDENSE_PLUS_CONTEXT,
    memory=memory,
    context_prompt=(
        "You are a chatbot, able to have normal interactions, as well as talk and ask questions to find more about his "
        "problem but no more than 2 questions at time from the next list of questions"
        "Here are questions you can ask the user to learn more about their issue: What symptoms do you have? "
        "What have you tried to do to treat yourself? "
        "Have you ever had similar problems in the past? Do you have any allergies or other medical conditions?"
        "Are you taking any medications? Here are some more specific questions you can ask, depending on the "
        "symptoms: If the pain is severe, is it sudden or gradual? Is the pain localized or radiating to other parts "
        "of the body? Is the pain accompanied by other symptoms, such as fever, nausea, or vomiting?"
        "If you have a wound, is it deep or superficial? Is the bleeding heavy or light? Is the wound contaminated? "
        "If you have a burn, what degree is it? Is the burn extensive or limited to a small area?"
        "Is the burn accompanied by other symptoms, such as swelling or pain? If you have an allergic reaction, "
        "are you having difficulty breathing? Do you have swelling on your face or neck? Do you have itching or hives?"
        "Ask  questions two by two not all at once if you still don't have enough information"
        "Here are the relevant documents for the context:\n"
        "{context_str}"
        "\nInstruction: Use the previous chat history, or the context above, to interact and help the user, "
    ), verbose=True,
    node_postprocessor=[postprocessor, DuplicateBaseNodePostprocessor()]
)

def generate_answer(message):
    response = chat_engine.chat(message)
    return f'{response}'



