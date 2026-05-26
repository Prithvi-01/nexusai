import time
import json
import logging
from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.responses import StreamingResponse
from pydantic import BaseModel
from typing import Optional
from sqlalchemy.orm import Session
from app.database import get_db, SessionLocal
from app.config import settings
from app.models import RequestLog
from app.services.ollama import ollama_client
from app.services.orchestration import orchestrator
from app.services.cache import semantic_cache
from app.rag.retrieval import vector_store

logger = logging.getLogger("nexusai.chat")

router = APIRouter(prefix="/chat", tags=["AI Chat Engine"])

class ChatRequest(BaseModel):
    prompt: str
    stream: bool = True
    document_id: Optional[int] = None
    top_k: Optional[int] = None
    custom_model: Optional[str] = None  # Allows manual model override

# Heuristic token estimator (1 token = ~4 chars)
def estimate_tokens(text: str) -> int:
    return len(text) // 4 + 1

async def stream_generator(
    prompt: str,
    messages: list[dict],
    intent: str,
    target_model: str,
    is_rag: bool,
    retrieved_citations: list[dict],
    start_time: float,
    db_session_factory
):
    """Async generator wrapper to stream outputs and log stats on finalization."""
    accumulated_content = []
    resolved_model = target_model
    fallback_used = False
    
    try:
        async for chunk in ollama_client.chat_completion_stream(target_model, messages):
            if chunk.startswith("__metadata__:"):
                # Parse model resolutions headers
                meta_str = chunk.replace("__metadata__:", "").strip()
                metadata = json.loads(meta_str)
                resolved_model = metadata["model_used"]
                fallback_used = metadata["fallback_used"]
                continue
                
            accumulated_content.append(chunk)
            yield chunk

        # Streaming complete; calculate final transaction metrics
        latency_ms = int((time.time() - start_time) * 1000)
        full_response = "".join(accumulated_content)
        tokens = estimate_tokens(prompt) + estimate_tokens(full_response)
        
        # We need a fresh database session inside the background generator
        db: Session = db_session_factory()
        try:
            # 1. Log request audit to SQLite
            log_entry = RequestLog(
                prompt=prompt,
                response_preview=full_response[:500] + "..." if len(full_response) > 500 else full_response,
                intent=intent,
                model_used=resolved_model,
                latency_ms=latency_ms,
                tokens_estimate=tokens,
                cache_hit=False,
                fallback_used=fallback_used
            )
            db.add(log_entry)
            
            # 2. Add full transaction response to Semantic Cache
            semantic_cache.set(db, prompt, full_response)
            
            db.commit()
            logger.info(f"Stream transaction audited: {resolved_model} in {latency_ms}ms (Intent: {intent})")
        except Exception as e:
            logger.error(f"Failed to log stream stats in DB: {str(e)}")
            db.rollback()
        finally:
            db.close()
            
    except Exception as e:
        logger.error(f"Error occurred during streaming loop: {str(e)}")
        yield f"\n[Streaming Interrupted: {str(e)}]"

@router.post("")
async def chat(request: ChatRequest, db: Session = Depends(get_db)):
    """Main route orchestration chat flow (RAG -> Cache -> Classify -> Route -> Log)."""
    start_time = time.time()
    
    # 1. Look up inside Semantic Cache
    cached_response, similarity = semantic_cache.get(db, request.prompt)
    if cached_response is not None:
        latency_ms = int((time.time() - start_time) * 1000)
        # Log cache-hit instantly
        log_entry = RequestLog(
            prompt=request.prompt,
            response_preview=cached_response[:500] + "..." if len(cached_response) > 500 else cached_response,
            intent="general",
            model_used="SemanticCache",
            latency_ms=latency_ms,
            tokens_estimate=estimate_tokens(request.prompt) + estimate_tokens(cached_response),
            cache_hit=True,
            fallback_used=False
        )
        db.add(log_entry)
        db.commit()
        
        if request.stream:
            # Replicate SSE or basic yield for cache hit streaming
            async def cache_stream():
                # Yield metadata header first
                yield f"__metadata__:{json.dumps({'model_used': 'Semantic Cache', 'fallback_used': False, 'cache_hit': True})}\n"
                # Add citation placeholder
                yield f"__citations__:{json.dumps([])}\n"
                time.sleep(0.05)
                yield cached_response
            return StreamingResponse(cache_stream(), media_type="text/event-stream")
            
        return {
            "content": cached_response,
            "model_used": "Semantic Cache",
            "fallback_used": False,
            "cache_hit": True,
            "latency_ms": latency_ms,
            "citations": []
        }

    # 2. RAG retrieval context (if file specified or general query)
    context_str = ""
    citations = []
    is_rag = False
    
    if request.document_id is not None:
        # Retrieve chunks matching selected document
        chunks = vector_store.query(
            query_text=request.prompt,
            top_k=request.top_k or settings.DEFAULT_TOP_K,
            filter_doc_id=request.document_id
        )
        if chunks:
            is_rag = True
            citations = chunks
            context_str = "\n\n".join([f"[Source: {c['metadata']['filename']}, Chunk: {c['metadata']['chunk_index']}]: {c['text']}" for c in chunks])
    
    # 3. Prompt classification & Model resolution
    intent = orchestrator.classify_prompt(request.prompt)
    target_model = request.custom_model or orchestrator.get_route_model(intent)
    
    # 4. Construct messages payload
    messages = []
    if is_rag:
        system_prompt = (
            "You are NexusAI, an enterprise LLM orchestrator. "
            "You have been provided with relevant context retrieved from uploaded documents. "
            "Use ONLY this context to answer the user request. If the context does not contain the answer, "
            "do your best using general knowledge but mention what is missing. Cite the documents when writing. "
            f"\n\nRetrieved Context:\n{context_str}"
        )
        messages.append({"role": "system", "content": system_prompt})
    else:
        messages.append({"role": "system", "content": "You are NexusAI, an advanced Multi-LLM Orchestration platform."})
        
    messages.append({"role": "user", "content": request.prompt})

    # 5. Execute routing & Response creation
    if request.stream:
        # Generate standard stream headers
        async def response_stream():
            # Send initial structure metadata
            yield f"__metadata__:{json.dumps({'model_used': target_model, 'fallback_used': False, 'cache_hit': False})}\n"
            yield f"__citations__:{json.dumps(citations)}\n"
            
            async for chunk in stream_generator(
                prompt=request.prompt,
                messages=messages,
                intent=intent,
                target_model=target_model,
                is_rag=is_rag,
                retrieved_citations=citations,
                start_time=start_time,
                db_session_factory=SessionLocal  # pass SessionLocal factory to let thread open db
            ):
                yield chunk
                
        return StreamingResponse(response_stream(), media_type="text/event-stream")
        
    else:
        # Blocking JSON response
        result = await ollama_client.chat_completion(target_model, messages)
        latency_ms = int((time.time() - start_time) * 1000)
        
        # Log transactional metrics
        tokens = estimate_tokens(request.prompt) + estimate_tokens(result["content"])
        log_entry = RequestLog(
            prompt=request.prompt,
            response_preview=result["content"][:500] + "..." if len(result["content"]) > 500 else result["content"],
            intent=intent,
            model_used=result["model_used"],
            latency_ms=latency_ms,
            tokens_estimate=tokens,
            cache_hit=False,
            fallback_used=result["fallback_used"]
        )
        db.add(log_entry)
        
        # Save to semantic cache
        semantic_cache.set(db, request.prompt, result["content"])
        db.commit()
        
        return {
            "content": result["content"],
            "model_used": result["model_used"],
            "fallback_used": result["fallback_used"],
            "cache_hit": False,
            "latency_ms": latency_ms,
            "citations": citations
        }
