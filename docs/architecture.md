# NexusAI Platform System Architecture

This document describes the design concepts, data flows, and technology decisions of the **NexusAI Orchestration and RAG Platform**.

---

## 1. High-Level Architecture Topology

```
                  ┌─────────────────────────────────────┐
                  │          USER CLIENT BROWSER        │
                  └──────────────────┬──────────────────┘
                                     │ (HTTP / Port 80)
                                     ▼
                  ┌─────────────────────────────────────┐
                  │        NGINX REVERSE PROXY          │
                  └─────────┬─────────────────┬─────────┘
                            │                 │
            (API / Route)   │                 │ (Web / Default Route)
            /api/*          ▼                 ▼
     ┌────────────────────────────┐    ┌────────────────────────────┐
     │      FASTAPI BACKEND       │    │     NEXT.JS 14 FRONTEND    │
     └──────────────┬─────────────┘    └────────────────────────────┘
                    │
   ┌────────────────┼──────────────────────────────┬──────────────────┐
   ▼                ▼                              ▼                  ▼
┌───────┐     ┌───────────┐                  ┌───────────┐      ┌───────────┐
│SQLite │     │ ChromaDB  │                  │  Local    │      │  Ollama   │
│(Logs/ │     │ Vector DB │                  │  Sentence │      │  Models   │
│Cache) │     │ (RAG text │                  │  Encoder  │      │  Daemon   │
│       │     │  chunks)  │                  │  (MiniLM) │      │ (Inference)
└───────┘     └───────────┘                  └───────────┘      └───────────┘
```

---

## 2. In-Depth Operational Component Design

### 2.1 API & Orchestration Gateway (FastAPI)
FastAPI functions as our multi-threaded orchestration driver. We prioritize asynchronous request parsing (`async`/`await`) to prevent streaming channels from blocking while running heavy tasks (like local SQL database inserts and semantic embedding comparisons).

### 2.2 Local SentenceTransformer Embedding Singleton (`all-MiniLM-L6-v2`)
Rather than relying on paid third-party web APIs (like OpenAI `text-embedding-3-small`), NexusAI uses a self-contained, CPU-optimized SentenceTransformer encoder. The model is initiated as a singleton to avoid multiple thread loads, returning 384-dimensional floating vectors at sub-50ms speed on standard CPU environments.

### 2.3 Local Semantic Cache Sweeper
When a prompt is received, the cache manager normalizes text spaces, generates query vectors, and checks SQLite for previously cached embeddings. A dot-product cosine similarity scan is run in-memory:
$$\text{Similarity}(q, c) = \frac{q \cdot c}{\|q\| \|c\|}$$
If similarity exceeds `0.88`, NexusAI bypasses the LLM execution entirely, returning a cache-hit completion in under `5 ms`, saving massive inference compute.

### 2.4 Document Parsing & Hybrid Vector Ingestions (RAG Pipeline)
To ensure long-running document parses don't cause client timeouts, the parser acts as an async background task:
1. Validates files and writes to safe local workspaces.
2. Extracts text based on format (PDF parsing with `pypdf`, Microsoft Word tables and texts with `python-docx`).
3. Chunks text using a custom `RecursiveCharacterTextSplitter`.
4. Feeds batches into `sentence-transformers` to obtain vector matrices.
5. Ingests embeddings, raw text strings, and offset indices into a local ChromaDB collection mapped with `cosine` similarity hnsw models.

### 2.5 Dynamic Prompt Routing & Fallbacks Engine
The orchestration service evaluates prompt structures against intent matrices (`reasoning`, `coding`, `summarization`, `extraction`, or `general`).
If the designated target model is not pulled natively within Ollama, the model resolver queries the live daemon tags, automatically redirects the prompt to a pulled model, and flags `fallback_used = True` for dashboard monitoring.

---

## 3. Future-Ready Architecture Paths

NexusAI is engineered with strict separation of concerns, facilitating seamless transitions to enterprise cloud infrastructures:
- **Relational Storage**: SQLite can be swapped to Amazon RDS PostgreSQL simply by editing the database engine URL in `database.py`.
- **Vector Space**: ChromaDB's HTTP Client configuration easily transitions to standalone cloud clusters or Amazon OpenSearch.
- **Queue Task Pipelines**: The FastAPI native `BackgroundTasks` wrapper can be replaced with Celery and Redis/RabbitMQ/Kafka as indexing workloads scale.
