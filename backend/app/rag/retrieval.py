import logging
import chromadb
from chromadb.config import Settings as ChromaSettings
from app.config import settings
from app.embeddings.encoder import encoder

logger = logging.getLogger("nexusai.rag")

class VectorStoreManager:
    def __init__(self):
        self.client = None
        self.collection = None
        self._init_client()

    def _init_client(self):
        """Initializes ChromaDB client with HttpClient (production) and local Persistent fallback."""
        try:
            logger.info(f"Connecting to ChromaDB at {settings.CHROMADB_HOST}:{settings.CHROMADB_PORT}...")
            # Attempt to connect to external ChromaDB service (Docker Compose)
            self.client = chromadb.HttpClient(
                host=settings.CHROMADB_HOST,
                port=settings.CHROMADB_PORT,
                settings=ChromaSettings(anonymized_telemetry=False)
            )
            # Heartbeat check
            self.client.heartbeat()
            logger.info("Successfully connected to dockerized ChromaDB via HTTP client.")
        except Exception as e:
            logger.warning(f"Could not connect to external ChromaDB: {str(e)}. Falling back to local PersistentClient.")
            try:
                # Fallback to local persistent filesystem ChromaDB
                self.client = chromadb.PersistentClient(
                    path="chroma_storage",
                    settings=ChromaSettings(anonymized_telemetry=False)
                )
                logger.info("Initialized local persistent ChromaDB storage in 'chroma_storage'.")
            except Exception as ex:
                logger.critical(f"Failed to initialize any ChromaDB client: {str(ex)}")
                raise ex
        
        # Initialize or get the default collection
        try:
            self.collection = self.client.get_or_create_collection(
                name=settings.CHROMA_COLLECTION_NAME,
                metadata={"hnsw:space": "cosine"}  # Use cosine similarity for normalization
            )
            logger.info(f"ChromaDB collection '{settings.CHROMA_COLLECTION_NAME}' is ready.")
        except Exception as e:
            logger.error(f"Failed to get/create ChromaDB collection: {str(e)}")
            raise e

    def add_documents(self, texts: list[str], metadatas: list[dict], ids: list[str]):
        """Generates embeddings and inserts document chunks into ChromaDB."""
        if not texts:
            return
        
        logger.info(f"Generating embeddings for {len(texts)} chunks...")
        embeddings = encoder.encode_batch(texts)
        
        logger.info(f"Uploading {len(texts)} chunks to ChromaDB...")
        self.collection.add(
            documents=texts,
            embeddings=embeddings,
            metadatas=metadatas,
            ids=ids
        )
        logger.info("ChromaDB ingestion completed.")

    def query(self, query_text: str, top_k: int = None, filter_doc_id: int = None) -> list[dict]:
        """Queries the collection for the most relevant text chunks."""
        if top_k is None:
            top_k = settings.DEFAULT_TOP_K
            
        query_vector = encoder.encode(query_text)
        
        where_clause = {}
        if filter_doc_id is not None:
            where_clause = {"document_id": filter_doc_id}

        results = self.collection.query(
            query_embeddings=[query_vector],
            n_results=top_k,
            where=where_clause if where_clause else None
        )
        
        formatted_results = []
        if results and results["documents"]:
            # Reformat return payload for application consume
            documents = results["documents"][0]
            metadatas = results["metadatas"][0]
            distances = results["distances"][0]
            ids = results["ids"][0]
            
            for i in range(len(documents)):
                # Chroma returns distance (for cosine space it's 1 - similarity)
                similarity = 1.0 - distances[i]
                formatted_results.append({
                    "id": ids[i],
                    "text": documents[i],
                    "metadata": metadatas[i],
                    "score": round(similarity, 4)
                })
        
        return formatted_results

    def delete_by_document(self, document_id: int):
        """Cleans up index chunks if a document is deleted."""
        try:
            self.collection.delete(where={"document_id": document_id})
            logger.info(f"Deleted vector chunks for document_id {document_id}")
        except Exception as e:
            logger.error(f"Failed to delete vector chunks for document_id {document_id}: {str(e)}")

# Singleton vector store instance
vector_store = VectorStoreManager()
