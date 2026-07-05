# NutriChat — Asistent nutrițional inteligent bazat pe RAG

**Autor:** Petcu Bogdan-Florin  
**Universitate:** Universitatea de Vest din Timișoara, 2026

---

## Contribuție

Aplicația NutriChat oferă asistență nutrițională personalizată printr-o arhitectură pe trei niveluri: frontend React, backend Node.js și un motor AI în Python.

Contribuțiile principale:

1. **Chatbot nutrițional bazat pe RAG** — utilizatorul poate pune întrebări despre alimente și nutriție, iar răspunsurile sunt fundamentate pe o bază de cunoștințe medicale și științifice, nu doar pe cunoștințele generale ale modelului.
2. **Generare de meniu săptămânal personalizat** — sistemul creează meniuri adaptate preferințelor, restricțiilor alimentare și obiectivelor calorice ale fiecărui utilizator.
3. **Interpretarea analizelor medicale** — utilizatorul poate încărca analize medicale (text sau PDF), iar aplicația extrage valorile relevante și oferă recomandări nutriționale personalizate.
4. **Sugestii de rețete pe baza alimentelor disponibile** — utilizatorul indică alimentele pe care le are, iar aplicația generează rețete sănătoase cu informații nutriționale.
5. **Gestionarea istoricului conversațiilor și meniurilor** — conversațiile și meniurile generate sunt salvate per utilizator, permițând revenirea și compararea în timp.

---

## Cerințe prealabile

- **Node.js** v20+
- **Python** 3.11+
- **pipenv** (`pip install pipenv`)
- Conturi active pentru: **OpenAI**, **Pinecone** (index `nutrirag`, dimensiune 1536, metric cosine)
- **MongoDB** (URI în `.env`)

---

## 0. Indexare bază de cunoștințe (o singură dată)

```bash
cd AI-API/LicentaAPI-AI
pipenv install
pipenv run python ingestion.py
```

Populează Pinecone și generează cache-ul BM25 local. Se rulează o singură dată înainte de primul start.

---

## 1. Configurare variabile de mediu

### `MedChatAPI/.env`
```
MONGO_URI=mongodb+srv://<user>:<password>@cluster.mongodb.net/chatLicenta
JWT_SECRET=<secret>
```

### `AI-API/LicentaAPI-AI/.env`
```
OPENAI_API_KEY=sk-...
PINECONE_API_KEY=...
PINECONE_ENVIRONMENT=...
PINECONE_INDEX=nutrirag
```

---

## 2. Pornire Backend Node.js

```bash
cd MedChatAPI
nvm use
npm install
npm start
```

Serverul pornește pe **http://localhost:8080**

---

## 3. Pornire API Python (RAG + AI)

```bash
cd AI-API/LicentaAPI-AI
pipenv install
pipenv run python main.py
```

Serverul pornește pe **http://localhost:8001**

---

## 4. Pornire Frontend React

```bash
cd UI
nvm use
npm install
npm start
```

Aplicația se deschide automat pe **http://localhost:3000**

---

## Ordine de pornire recomandată

1. `MedChatAPI` — backend Node.js
2. `AI-API/LicentaAPI-AI` — API Python
3. `UI` — frontend React
