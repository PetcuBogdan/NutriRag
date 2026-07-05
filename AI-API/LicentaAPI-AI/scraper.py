import re
from Bio import Entrez
from dotenv import load_dotenv
import os
from openai import OpenAI
import spacy
import tiktoken
from flask import Flask, request, jsonify
from flask_cors import CORS
from ingestion import ingest_document

nlp = spacy.load("en_core_web_lg")
load_dotenv()

app = Flask(__name__)
CORS(app)

client = OpenAI(
    api_key=os.environ.get("OPENAI_API_KEY"),
)

def extract_papper_id(data):
    match = re.search(r'PMID-\s(\d+)', data)
    if match:
        return match.group(1)  # Return the PMID value
    else:
        return None  # Return None if no PMID is found
def search_pubmed(query, max_results):
    Entrez.email = "bogdan.petcu02@e-uvt.ro"
    handle = Entrez.esearch(db="pubmed", term=query, sort='relevance', retmax=max_results)
    record = Entrez.read(handle)
    handle.close()

    articles = []
    for pubmed_id in record["IdList"]:
        article_handle = Entrez.efetch(db="pubmed", id=pubmed_id, rettype="medline", retmode="text")
        article_data = article_handle.read()
        article_handle.close()
        articles.append(article_data)
    return articles


def summarize_texts_big_doc(text1, about):
    combined_text = f"""
   You are an expert in writing scientific meta-analyses. I need your help to extract data for a meta-analysis on the topic of {about}. 
   Extract data  like result and conclusions about {about}, in special numeric result that i can user to write my meta-analyses, from this text, dar salveaza si sursa lor.
    {text1}
    """
    enc = tiktoken.encoding_for_model("gpt-3.5-turbo")

    if len(enc.encode(combined_text)) > 16385:
        raise ValueError("The combined texts exceed the maximum context length.")

    response = client.chat.completions.create(
        messages=[
            {
                "role": "user",
                "content": combined_text,
            }
        ],
        model="gpt-3.5-turbo",
    )
    summary = response.choices[0].message.content
    return summary


def generare_doc_with_info(text, about, number, numberOfWords):
    combined_text = f"""
       You are an expert in writing scientific meta-analyses. I need your help to optimize the final result of a meta-analysis on the topic of {about}. I have selected and synthesized information from several relevant articles. Please use the information below to generate a clear, concise, and well-structured meta-analysis.
    Please ensure that the text is coherent and well-structured, avoiding generalities and focusing on specific details and concrete data.
    Thank you!
    I am conducting a rapid meta-analysis on {about}. Write a scientific paper, below are the informations related to this topic, try to write as much as you can with the given information without repeating yourself:
    {text}
    Please write where you took your data from and generate a {numberOfWords} words meta-analyses with information from this number of pappers{number}, 
    write it like a scientific papper with Title, Abstract, Introduction, Results, Discussion, Conclusions, try to focus on result to get numeric data and explain it, i do not need references.
        """
    enc = tiktoken.encoding_for_model("gpt-3.5-turbo")

    if len(enc.encode(combined_text)) > 16385:
        raise ValueError("The combined texts exceed the maximum context length.")

    response = client.chat.completions.create(
        messages=[
            {
                "role": "user",
                "content": combined_text,
            }
        ],
        model="gpt-3.5-turbo",
    )
    summary = response.choices[0].message.content
    return summary


def generate_big_document(title, numberPapers, numberFinalPapers, numberOfWords):
    articles = []
    query = title
    max_results = numberPapers

    print(title)

    results = search_pubmed(query, max_results)

    for i, result in enumerate(results, start=1):
        papperId = extract_papper_id(result)
        articles.append({"text": result, "papperId": papperId, "similarity_index": 0})

    for i, article in enumerate(articles):
        suma = 0
        doc1 = nlp(article["text"])
        for j, article2 in enumerate(articles):
            if i != j:
                doc2 = nlp(article2["text"])
                suma += float(doc1.similarity(doc2))
        articles[i]["similarity_index"] = suma

    articles = sorted(articles, key=lambda x: x["similarity_index"])

    resume = ''
    used_paper_ids = []
    for i in range(0, numberFinalPapers, 1):
        print(articles[i]["papperId"])
        print(articles[i]["text"])
        used_paper_ids.append(articles[i]["papperId"])
        ingest_document(articles[i]["text"])
        resume += summarize_texts_big_doc(articles[i]["text"], query)

    print(resume)
    final_summary = generare_doc_with_info(resume, query, numberFinalPapers, numberOfWords)
    print(final_summary)

    result_object = {
        "final_summary": final_summary,
        "used_paper_ids": used_paper_ids,
        "initial_paper_count": numberPapers,
        "final_paper_count": numberFinalPapers,
        "word_count": numberOfWords
    }

    return result_object


#generate_big_document("heart attack", 5, 2, 2000)