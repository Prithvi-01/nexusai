import json
import logging
import numpy as np
from sqlalchemy.orm import Session
from app.config import settings
from app.embeddings.encoder import encoder
from app.models import CachedPrompt

logger = logging.getLogger("nexusai.cache")

class SemanticCacheManager:
    def normalize_text(self, text: str) -> str:
        """Standardizes prompt text by cleaning up whitespace and symbols."""
        text = text.lower().strip()
        # Remove extra whitespace and newline feeds
        text = " ".join(text.split())
        return text

    def cosine_similarity(self, v1: list[float], v2: list[float]) -> float:
        """Calculates cosine similarity between two dense vectors."""
        arr1 = np.array(v1)
        arr2 = np.array(v2)
        norm1 = np.linalg.norm(arr1)
        norm2 = np.linalg.norm(arr2)
        if norm1 == 0 or norm2 == 0:
            return 0.0
        return float(np.dot(arr1, arr2) / (norm1 * norm2))

    def get(self, db: Session, prompt: str) -> tuple[str | None, float]:
        """Checks cache for a semantically similar prompt. Returns (response, score)."""
        normalized = self.normalize_text(prompt)
        try:
            # Query all cache database records
            records = db.query(CachedPrompt).all()
            if not records:
                return None, 0.0

            # Encode query
            query_vector = encoder.encode(normalized)
            
            best_score = 0.0
            best_response = None
            
            # Linear scan for optimal semantic similarity
            for record in records:
                cache_vector = json.loads(record.embedding_json)
                similarity = self.cosine_similarity(query_vector, cache_vector)
                
                if similarity > best_score:
                    best_score = similarity
                    best_response = record.response
            
            # If hit threshold, return cached response
            if best_score >= settings.CACHE_THRESHOLD:
                logger.info(f"Semantic cache hit! Similarity: {best_score:.4f} (Threshold: {settings.CACHE_THRESHOLD})")
                return best_response, best_score
                
            return None, best_score
        except Exception as e:
            logger.error(f"Semantic Cache retrieval failed: {str(e)}")
            return None, 0.0

    def set(self, db: Session, prompt: str, response: str):
        """Saves a new prompt-response embedding record into semantic cache table."""
        normalized = self.normalize_text(prompt)
        try:
            # Generate embedding vector
            vector = encoder.encode(normalized)
            
            cache_entry = CachedPrompt(
                prompt=prompt,
                normalized_prompt=normalized,
                response=response,
                embedding_json=json.dumps(vector)
            )
            
            db.add(cache_entry)
            db.commit()
            logger.info("Saved new completion response to Semantic Cache.")
        except Exception as e:
            logger.error(f"Failed to write to Semantic Cache: {str(e)}")
            db.rollback()

# Singleton cache manager instance
semantic_cache = SemanticCacheManager()
