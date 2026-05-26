import logging
from sentence_transformers import SentenceTransformer
from app.config import settings

logger = logging.getLogger("nexusai.embeddings")

class EmbeddingEncoder:
    _model = None

    @classmethod
    def get_model(cls) -> SentenceTransformer:
        if cls._model is None:
            logger.info(f"Initializing offline SentenceTransformer model: {settings.EMBEDDING_MODEL_NAME}...")
            try:
                # sentence-transformers automatically downloads the model on first call and caches it locally
                cls._model = SentenceTransformer(settings.EMBEDDING_MODEL_NAME)
                logger.info("SentenceTransformer model loaded successfully.")
            except Exception as e:
                logger.error(f"Failed to load local embedding model: {str(e)}")
                raise e
        return cls._model

    def encode(self, text: str) -> list[float]:
        """Generate dense vector embedding for a given text."""
        model = self.get_model()
        embedding = model.encode(text)
        return embedding.tolist()

    def encode_batch(self, texts: list[str]) -> list[list[float]]:
        """Generate dense vector embeddings for a list of texts."""
        if not texts:
            return []
        model = self.get_model()
        embeddings = model.encode(texts)
        return embeddings.tolist()

# Singleton service instance
encoder = EmbeddingEncoder()
