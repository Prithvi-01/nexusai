import os
import logging
from pypdf import PdfReader
from docx import Document as DocxReader
from sqlalchemy.orm import Session
from app.database import SessionLocal
from app.models import Document as DBDocument
from app.rag.retrieval import vector_store

logger = logging.getLogger("nexusai.pipeline")

class RecursiveTextSplitter:
    def __init__(self, chunk_size: int = 800, chunk_overlap: int = 150):
        self.chunk_size = chunk_size
        self.chunk_overlap = chunk_overlap
        self.separators = ["\n\n", "\n", " ", ""]

    def split_text(self, text: str) -> list[str]:
        """Splits text recursively into chunks of max chunk_size with overlap."""
        if not text:
            return []
            
        chunks = []
        words = text.split(" ")
        current_chunk = []
        current_length = 0
        
        for word in words:
            # Simple length heuristic (character-based)
            word_len = len(word) + 1  # count the space
            if current_length + word_len > self.chunk_size:
                if current_chunk:
                    chunks.append(" ".join(current_chunk))
                # Handle overlap: take a slice of the end of current chunk
                overlap_words = []
                overlap_len = 0
                for w in reversed(current_chunk):
                    if overlap_len + len(w) + 1 <= self.chunk_overlap:
                        overlap_words.insert(0, w)
                        overlap_len += len(w) + 1
                    else:
                        break
                current_chunk = overlap_words + [word]
                current_length = sum(len(w) + 1 for w in current_chunk)
            else:
                current_chunk.append(word)
                current_length += word_len
                
        if current_chunk:
            chunks.append(" ".join(current_chunk))
            
        return chunks

def extract_text_from_file(file_path: str) -> str:
    """Parses PDF, DOCX, and TXT files and returns raw text content."""
    ext = os.path.splitext(file_path)[1].lower()
    text = ""
    
    if ext == ".pdf":
        logger.info(f"Extracting PDF text from {file_path}...")
        reader = PdfReader(file_path)
        for page_idx, page in enumerate(reader.pages):
            page_text = page.extract_text()
            if page_text:
                text += page_text + "\n"
                
    elif ext == ".docx":
        logger.info(f"Extracting DOCX text from {file_path}...")
        doc = DocxReader(file_path)
        for para in doc.paragraphs:
            if para.text:
                text += para.text + "\n"
        for table in doc.tables:
            for row in table.rows:
                for cell in row.cells:
                    text += cell.text + "\n"
                    
    elif ext in [".txt", ".md", ".json"]:
        logger.info(f"Extracting plain text from {file_path}...")
        with open(file_path, "r", encoding="utf-8", errors="ignore") as f:
            text = f.read()
            
    else:
        raise ValueError(f"Unsupported file format: {ext}")
        
    return text.strip()

def process_document_background(document_id: int, file_path: str, chunk_size: int, chunk_overlap: int):
    """FastAPI Background task running pipeline steps asynchronously."""
    db: Session = SessionLocal()
    db_doc = db.query(DBDocument).filter(DBDocument.id == document_id).first()
    
    if not db_doc:
        logger.error(f"Document ID {document_id} not found in database. Aborting ingestion.")
        db.close()
        return

    try:
        # Extract text
        raw_text = extract_text_from_file(file_path)
        if not raw_text:
            raise ValueError("No extractable text found in document.")
            
        # Split text into chunks
        splitter = RecursiveTextSplitter(chunk_size=chunk_size, chunk_overlap=chunk_overlap)
        chunks = splitter.split_text(raw_text)
        
        if not chunks:
            raise ValueError("Document yielded 0 chunks after splitting.")
            
        # Format Chroma inputs
        ids = [f"doc_{document_id}_chunk_{i}" for i in range(len(chunks))]
        metadatas = [
            {
                "document_id": document_id,
                "filename": db_doc.filename,
                "chunk_index": i,
                "text_length": len(chunk)
            }
            for i, chunk in enumerate(chunks)
        ]
        
        # Load chunks to vector DB
        vector_store.add_documents(texts=chunks, metadatas=metadatas, ids=ids)
        
        # Update SQLite Metadata
        db_doc.status = "COMPLETED"
        db_doc.chunk_count = len(chunks)
        db.commit()
        logger.info(f"Successfully processed document '{db_doc.filename}' (ID: {document_id}) into {len(chunks)} chunks.")
        
    except Exception as e:
        logger.error(f"Background parsing failed for document {db_doc.filename}: {str(e)}")
        db_doc.status = "FAILED"
        db.commit()
        
    finally:
        # Clean up temporary uploaded files to avoid disk leaks
        if os.path.exists(file_path):
            try:
                os.remove(file_path)
                logger.info(f"Cleaned up temp upload file: {file_path}")
            except Exception as clean_err:
                logger.warning(f"Could not delete temp file {file_path}: {str(clean_err)}")
        db.close()
