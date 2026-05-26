import os
import shutil
import logging
from fastapi import APIRouter, Depends, UploadFile, File, Form, HTTPException, BackgroundTasks, status
from sqlalchemy.orm import Session
from app.database import get_db
from app.models import Document as DBDocument
from app.config import settings
from app.rag.pipeline import process_document_background
from app.rag.retrieval import vector_store

logger = logging.getLogger("nexusai.documents")

router = APIRouter(prefix="/documents", tags=["RAG Documents Manager"])

UPLOAD_DIR = "uploads"
os.makedirs(UPLOAD_DIR, exist_ok=True)

@router.post("/upload", status_code=status.HTTP_201_CREATED)
async def upload_document(
    background_tasks: BackgroundTasks,
    file: UploadFile = File(...),
    chunk_size: int = Form(settings.DEFAULT_CHUNK_SIZE),
    chunk_overlap: int = Form(settings.DEFAULT_CHUNK_OVERLAP),
    db: Session = Depends(get_db)
):
    """Receives a file upload, creates a DB entry, and delegates parsing to background worker."""
    filename = file.filename
    ext = os.path.splitext(filename)[1].lower()
    
    if ext not in [".pdf", ".docx", ".txt", ".md", ".json"]:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Unsupported file format '{ext}'. We accept PDF, DOCX, TXT, MD, and JSON."
        )
        
    # Save the file temporarily
    temp_path = os.path.join(UPLOAD_DIR, f"temp_{int(os.time() if hasattr(os, 'time') else 12345678)}_{filename}")
    try:
        with open(temp_path, "wb") as buffer:
            shutil.copyfileobj(file.file, buffer)
    except Exception as e:
        logger.error(f"Failed to write uploaded file to temp path: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to save uploaded file on local disk."
        )
        
    # Read size
    file_size = os.path.getsize(temp_path)
    
    # Register document metadata in SQLite
    db_doc = DBDocument(
        filename=filename,
        file_size=file_size,
        status="PROCESSING",
        chunk_count=0
    )
    db.add(db_doc)
    db.commit()
    db.refresh(db_doc)
    
    # Dispatch parser background job
    background_tasks.add_task(
        process_document_background,
        document_id=db_doc.id,
        file_path=temp_path,
        chunk_size=chunk_size,
        chunk_overlap=chunk_overlap
    )
    
    logger.info(f"Queued background processing for file: {filename} (Doc ID: {db_doc.id})")
    
    return {
        "message": "File uploaded successfully. Ingestion pipeline started.",
        "document_id": db_doc.id,
        "filename": filename,
        "status": "PROCESSING"
    }

@router.get("")
def list_documents(db: Session = Depends(get_db)):
    """Lists metadata for all uploaded documents."""
    docs = db.query(DBDocument).order_by(DBDocument.created_at.desc()).all()
    return [
        {
            "id": doc.id,
            "filename": doc.filename,
            "file_size": doc.file_size,
            "status": doc.status,
            "chunk_count": doc.chunk_count,
            "created_at": doc.created_at.isoformat()
        }
        for doc in docs
    ]

@router.delete("/{document_id}")
def delete_document(document_id: int, db: Session = Depends(get_db)):
    """Deletes document from SQLite metadata and purges associated vector chunks from ChromaDB."""
    db_doc = db.query(DBDocument).filter(DBDocument.id == document_id).first()
    if not db_doc:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Document not found."
        )
        
    try:
        # 1. Purge from Chroma vector DB
        vector_store.delete_by_document(document_id)
        
        # 2. Delete SQLite record
        db.delete(db_doc)
        db.commit()
        
        logger.info(f"Successfully deleted document ID {document_id} and all related vectors.")
        return {"message": "Document and matching vector chunks successfully purged."}
    except Exception as e:
        logger.error(f"Failed to complete cascading deletion: {str(e)}")
        db.rollback()
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Deletion failed: {str(e)}"
        )
