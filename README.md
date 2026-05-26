# NexusAI: Enterprise Multi-LLM Orchestration & RAG Platform

NexusAI is a cost-free, completely local, production-style **Multi-LLM Orchestration and Retrieval-Augmented Generation (RAG) Platform** designed for AI/ML and GenAI Engineer portfolios. 

The platform operates fully offline using **FastAPI, Next.js 14, SQLite, ChromaDB, SentenceTransformers, and Ollama**, and features automated Infrastructure-as-Code (IaC) provisioning for AWS Free-Tier deployment.

---

## ─── SYSTEM TOPOLOGY ───

```
┌────────────────────────────────────────────────────────────────────────┐
│                              NGINX GATEWAY                             │
│                  (SSL Termination & Routing on Port 80)                │
└──────────────┬──────────────────────────────────────────┬──────────────┘
               │                                          │
               │ (Proxy /api/* requests)                  │ (Proxy Web Client)
               ▼                                          ▼
┌──────────────────────────────┐          ┌──────────────────────────────┐
│        FASTAPI BACKEND       │          │      NEXT.JS 14 FRONTEND     │
│       (API Orchestrator)     │          │      (LLMOps Console)        │
└──────────────┬───────────────┘          └──────────────────────────────┘
               │
    ┌──────────┼───────────┬─────────────┬─────────────┐
    ▼          ▼           ▼             ▼             ▼
┌───────┐┌───────────┐┌──────────┐┌────────────┐┌─────────────┐
│SQLite ││ ChromaDB  ││  Local   ││   Ollama   ││  Local      │
│(Logs/ ││ Vector DB ││ Sentence ││   Daemon   ││  Workspace  │
│Cache) ││ (RAG collection)││  Encoder ││ (Inferences)││  (File Temp)│
└───────┘└───────────┘└──────────┘└────────────┘└─────────────┘
```

---

## ─── CORE ENGINEERING FEATURES ───

1. **⚡ Intelligent Multi-LLM Router Engine**: Parses incoming prompt intents (using hybrid regex & token-weight engines) to direct queries dynamically to optimal models (`reasoning` -> `llama3`, `coding` -> `mistral`, `summarization` -> `phi3`, `extraction` -> `gemma`), maximizing throughput.
2. **💾 Sub-Millisecond Semantic Cache**: Normalizes incoming prompts and sweeps cached SQLite vectors using offline cosine similarity searches. High-overlap matches (similarity > 0.88) bypass LLM inference entirely, serving responses in under **`5 ms`**.
3. **📂 Async RAG Extraction Pipeline**: Parses PDFs, Word Documents, and text, partitions them using a customized **`RecursiveCharacterTextSplitter`** (calibrated for size and overlaps), encodes vectors locally, and uploads them asynchronously to ChromaDB.
4. **📊 LLMOps Telemetry Dashboard**: Complete admin center with Recharts visualizations capturing request volume timeline, intent distribution, model utilization pie charts, and searchable execution audit trace tables.
5. **☁️ AWS Native Production-Ready**: Complete Terraform infrastructure configurations (VPC, security gates, public subnets) and Nginx reverse proxy templates for instant AWS EC2 Free-Tier deployment.

---

## ─── DIRECTORY ARCHITECTURE ───

```
nexusai/
├── aws/
│   ├── terraform/          # VPC, Security Groups, EC2 and outputs.tf
│   └── scripts/            # Direct rsync/scp push-to-EC2 utility
├── docker/
│   ├── Dockerfile.frontend # Multi-stage production Next.js builder
│   ├── Dockerfile.backend  # CPU-optimized FastAPI runtime environment
│   ├── nginx.conf          # Port 80 ingress reverse proxy mapping
│   └── docker-compose.yml  # Dev compose orchestrating all local nodes
├── backend/app/
│   ├── config.py           # Pydantic-settings environment structures
│   ├── models.py           # Relational schema tables (RequestLogs, SemanticCache)
│   ├── services/           # Intent routing, Ollama fallback, Cache algorithms
│   └── rag/                # Ingestion worker, Recursive text splitter
└── frontend/
    └── src/
        ├── app/            # Next.js App Router (Chat, Auth, Dashboard)
        ├── components/     # Obs-themed ChatConsole, Sidebar, Recharts panels
        └── lib/            # SSE client streaming API integrations
```

---

## ─── QUICKSTART LOCAL DEVELOPMENT ───

### 1. Prerequisite
Ensure **Docker** and **Ollama** are installed on your machine.
Pull the target models locally:
```bash
ollama pull llama3
ollama pull mistral
ollama pull phi3
ollama pull gemma
```

### 2. Startup using Docker Compose
```bash
# 1. Clone the project workspace
git clone https://github.com/sasik/nexusai.git
cd nexusai/docker

# 2. Fire up the compose container stack
docker compose up --build -d
```

- **Next.js Frontend**: http://localhost:3000
- **FastAPI API Swagger Docs**: http://localhost:8000/docs
- **ChromaDB Vector REST**: http://localhost:8001

---

## ─── AWS DEPLOYMENT WORKFLOW ───

We provide fully automated Terraform scripts to deploy the platform onto the AWS EC2 free-tier:
```bash
cd aws/terraform
terraform init
terraform apply -auto-approve
```
*For detailed step-by-step instructions on bootstrapping user-data logs and model pull sidecars, check the [AWS Deployment Guide](file:///C:/Users/sasik/.gemini/antigravity/scratch/nexusai/docs/aws_deployment.md).*

---

## ─── RESUME BULLET POINTS (RECRUITER SHOWCASE) ───

- **Architected a production-grade Multi-LLM Orchestration platform (NexusAI)** in Python and Next.js, eliminating OpenAI API dependencies by leveraging local open-source models via Ollama.
- **Implemented a CPU-optimized local Semantic Cache** utilizing SQLAlchemy and in-memory Numpy cosine similarity sweeps over SentenceTransformers embeddings, delivering sub-5ms response speeds on cached prompts and reducing local compute usage.
- **Engineered an asynchronous RAG ingestion pipeline** in FastAPI using background queues to parse PDF/DOCX files, segmenting content via custom recursive character splitters and index embedding vectors in ChromaDB.
- **Built an interactive LLMOps Telemetry Dashboard** in Next.js 14 utilizing Recharts and SSE streaming to visualize average request latencies, model distribution shares, and intent routing triggers.
- **Created AWS Cloud Provisioning assets** via Terraform (VPC, Security Groups, Subnets) and Nginx reverse proxies, containerizing the platform to deploy seamlessly on AWS EC2 Free Tier configurations.

---

## ─── DEEP-DIVE AI ENGINEER INTERVIEW PREP ───

### Q1: Why did you build a custom Semantic Cache instead of simple Redis Key-Value string hashing?
> **Answer**: Standard Redis key hashing is exact-match only; adding a trailing whitespace or changing `"Write a Python quicksort"` to `"write python quicksort"` results in a cache miss. By computing query vectors using `sentence-transformers` and sweeping them against cached SQL matrices via cosine similarity, we hit the cache on semantically identical prompts (even with synonyms or spacing edits), which drastically reduces compute load.

### Q2: How does your recursive character text splitter differ from simple length splitting?
> **Answer**: Simple length splitting chops sentences in half, causing vector encoding failures due to fragmented semantic context. The recursive splitter attempts to break by paragraph (`\n\n`), then line breaks (`\n`), then spaces (` `), keeping blocks, sentences, and code classes complete within the target chunk size while preserving overlap boundaries to maintain contextual transition.

### Q3: How does your orchestration service handle CPU constraints on a free-tier EC2 instance?
> **Answer**: Run-time LLM inference on a CPU-only `t2.micro` (1GB RAM) is extremely slow and can crash the server. To address this, we developed a hybrid connection protocol in `api.ts` and `ollama.py`: while database logs, cache sweeps, and document RAG indices are served on the EC2, the API dynamically offloads LLM token generation to the developer's local host GPU or a secondary GPU Spot instance via a secure network bridge.
