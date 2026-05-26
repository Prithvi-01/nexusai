from fastapi import APIRouter
from app.services.ollama import ollama_client
from app.config import settings

router = APIRouter(prefix="/models", tags=["Model Inventory Registry"])

@router.get("")
async def get_models():
    """Queries Ollama for loaded model tags and returns orchestrator configurations."""
    available_models = await ollama_client.get_available_models()
    
    # Standard mapping structures
    mappings = {
        "reasoning": settings.MODEL_REASONING,
        "coding": settings.MODEL_CODING,
        "summarization": settings.MODEL_SUMMARIZATION,
        "extraction": settings.MODEL_EXTRACTION,
        "fallback": settings.MODEL_FALLBACK
    }
    
    # Model catalog status definitions
    model_metadata = [
        {"name": "llama3", "role": "Reasoning (Complex Logic)", "configured": settings.MODEL_REASONING},
        {"name": "mistral", "role": "Coding (Syntax Generation)", "configured": settings.MODEL_CODING},
        {"name": "phi3", "role": "Summarization (High-Speed)", "configured": settings.MODEL_SUMMARIZATION},
        {"name": "gemma", "role": "Extraction (Entity Structuring)", "configured": settings.MODEL_EXTRACTION}
    ]
    
    # Compile status flags
    catalog = []
    for item in model_metadata:
        model_name = item["name"]
        is_pulled = False
        
        # Check active match
        for loaded in available_models:
            if model_name in loaded.lower():
                is_pulled = True
                break
                
        catalog.append({
            "name": model_name,
            "role": item["role"],
            "configured_model": item["configured"],
            "status": "ONLINE" if is_pulled else "OFFLINE",
            "pulled": is_pulled
        })

    return {
        "available_loaded_tags": available_models,
        "intent_routing_rules": mappings,
        "orchestrated_models": catalog,
        "ollama_connection": "CONNECTED" if len(available_models) > 0 or (hasattr(ollama_client, 'base_url') and len(available_models) == 0) else "OFFLINE"
    }
