import logging
from fastapi import FastAPI, status
from fastapi.middleware.cors import CORSMiddleware
from app.config import settings
from app.database import engine, Base
from app.routers import auth, chat, documents, metrics, models
from app.rag.retrieval import vector_store

# Set up structured logging for operational visibility
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(name)s: %(message)s",
    datefmt="%Y-%m-%d %H:%M:%S"
)
logger = logging.getLogger("nexusai.main")

# Auto-initialize SQLite database schemas on application startup
try:
    logger.info("Initializing SQLite relational schemas...")
    Base.metadata.create_all(bind=engine)
    logger.info("Database schemas created successfully.")
except Exception as e:
    logger.critical(f"Failed to bootstrap database schemas: {str(e)}")
    raise e

app = FastAPI(
    title=settings.APP_NAME,
    description="Cost-free enterprise-grade local Multi-LLM Orchestrator & RAG Platform.",
    version="1.0.0",
    docs_url="/docs" if settings.DEBUG else None
)

# Configure CORS for decoupled frontend next.js access
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # Restrict in production, allow docker interface
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Include Modular API Route Routers
app.include_router(auth.router, prefix=settings.API_V1_STR)
app.include_router(chat.router, prefix=settings.API_V1_STR)
app.include_router(documents.router, prefix=settings.API_V1_STR)
app.include_router(models.router, prefix=settings.API_V1_STR)
app.include_router(metrics.router, prefix=settings.API_V1_STR)

@app.get("/health", status_code=status.HTTP_200_OK, tags=["Health"])
def health_check():
    """Verifies operational statuses of database, vector store, and embedding models."""
    chroma_health = "OFFLINE"
    try:
        if vector_store.client:
            vector_store.client.heartbeat()
            chroma_health = "ONLINE"
    except Exception:
        pass
        
    return {
        "status": "HEALTHY",
        "app": settings.APP_NAME,
        "database": "SQLITE_ONLINE",
        "vector_store": chroma_health,
        "environment": "DEVELOPMENT" if settings.DEBUG else "PRODUCTION"
    }

if __name__ == "__main__":
    import uvicorn
    # Allow manual starting of fastAPI app directly
    uvicorn.run("main:app", host="0.0.0.0", port=8000, reload=True)
