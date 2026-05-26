from sqlalchemy import Column, Integer, String, Float, Boolean, Text, DateTime
from datetime import datetime
from app.database import Base
import json

class User(Base):
    __tablename__ = "users"

    id = Column(Integer, primary_key=True, index=True)
    username = Column(String, unique=True, index=True, nullable=False)
    password_hash = Column(String, nullable=False)
    created_at = Column(DateTime, default=datetime.utcnow)

class Document(Base):
    __tablename__ = "documents"

    id = Column(Integer, primary_key=True, index=True)
    filename = Column(String, index=True, nullable=False)
    file_size = Column(Integer, nullable=False)
    status = Column(String, default="PROCESSING")  # PROCESSING, COMPLETED, FAILED
    chunk_count = Column(Integer, default=0)
    created_at = Column(DateTime, default=datetime.utcnow)

class RequestLog(Base):
    __tablename__ = "request_logs"

    id = Column(Integer, primary_key=True, index=True)
    prompt = Column(Text, nullable=False)
    response_preview = Column(Text, nullable=True)
    intent = Column(String, nullable=False)  # reasoning, coding, summarization, extraction, general
    model_used = Column(String, nullable=False)
    latency_ms = Column(Integer, nullable=False)
    tokens_estimate = Column(Integer, default=0)
    cache_hit = Column(Boolean, default=False)
    fallback_used = Column(Boolean, default=False)
    timestamp = Column(DateTime, default=datetime.utcnow)

class CachedPrompt(Base):
    __tablename__ = "semantic_cache"

    id = Column(Integer, primary_key=True, index=True)
    prompt = Column(Text, nullable=False)
    normalized_prompt = Column(Text, nullable=False, index=True)
    response = Column(Text, nullable=False)
    embedding_json = Column(Text, nullable=False)  # JSON-serialized list of floats
    created_at = Column(DateTime, default=datetime.utcnow)
