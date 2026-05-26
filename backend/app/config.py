import os
from pydantic_settings import BaseSettings
from pydantic import Field

class Settings(BaseSettings):
    # App General Settings
    APP_NAME: str = "NexusAI Orchestration Platform"
    DEBUG: bool = True
    
    # API endpoints
    API_V1_STR: str = "/api"
    
    # Database
    SQLITE_DB_PATH: str = Field(default="nexusai.db", validation_alias="SQLITE_DB_PATH")
    
    # RAG vector storage
    CHROMADB_HOST: str = Field(default="localhost", validation_alias="CHROMADB_HOST")
    CHROMADB_PORT: int = Field(default=8000, validation_alias="CHROMADB_PORT")
    CHROMA_COLLECTION_NAME: str = "nexusai_rag"
    
    # Model runtime endpoints
    OLLAMA_BASE_URL: str = Field(default="http://localhost:11434", validation_alias="OLLAMA_BASE_URL")
    
    # Local SentenceTransformer embeddings model
    EMBEDDING_MODEL_NAME: str = "all-MiniLM-L6-v2"
    
    # Retrieval Tuning
    DEFAULT_CHUNK_SIZE: int = 800
    DEFAULT_CHUNK_OVERLAP: int = 150
    DEFAULT_TOP_K: int = 4
    
    # Semantic Cache Setting
    CACHE_THRESHOLD: float = 0.88
    
    # Model Mappings for Intents
    MODEL_REASONING: str = "llama3"
    MODEL_CODING: str = "mistral"
    MODEL_SUMMARIZATION: str = "phi3"
    MODEL_EXTRACTION: str = "gemma"
    MODEL_FALLBACK: str = "phi3"  # Standard small model to fallback to

    class Config:
        env_file = ".env"
        env_file_encoding = "utf-8"
        extra = "ignore"

settings = Settings()
