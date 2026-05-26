import httpx
import json
import logging
from typing import Generator, AsyncGenerator
from app.config import settings

logger = logging.getLogger("nexusai.ollama")

class OllamaClient:
    def __init__(self):
        self.base_url = settings.OLLAMA_BASE_URL
        self.timeout = httpx.Timeout(180.0, connect=10.0)

    async def get_available_models(self) -> list[str]:
        """Queries local Ollama tags and returns names of downloaded models."""
        url = f"{self.base_url}/api/tags"
        try:
            async with httpx.AsyncClient(timeout=5.0) as client:
                response = await client.get(url)
                if response.status_code == 200:
                    data = response.json()
                    models = [item["name"].split(":")[0] for item in data.get("models", [])]
                    # Also keep exact tags
                    models_exact = [item["name"] for item in data.get("models", [])]
                    return list(set(models + models_exact))
                return []
        except Exception as e:
            logger.warning(f"Ollama is offline at {self.base_url}: {str(e)}")
            return []

    async def select_model_with_fallback(self, target_model: str) -> tuple[str, bool]:
        """Checks if target_model is loaded. If not, returns fallback model."""
        available = await self.get_available_models()
        if not available:
            logger.error("No local models found loaded in Ollama. Checking offline status.")
            return settings.MODEL_FALLBACK, True

        # Check direct match or tag match
        target_clean = target_model.split(":")[0].lower()
        for model in available:
            if target_clean in model.lower() or model.lower() in target_clean:
                return model, False

        # Target model is missing; perform dynamic fallback routing
        logger.warning(f"Target model '{target_model}' is not pulled in Ollama. Dynamic fallback initiated...")
        
        # Look for our configured fallback
        fallback_clean = settings.MODEL_FALLBACK.split(":")[0].lower()
        for model in available:
            if fallback_clean in model.lower():
                return model, True

        # Otherwise, fall back to the absolute first model in the list
        logger.info(f"Fallback model '{settings.MODEL_FALLBACK}' also unavailable. Selecting first loaded: '{available[0]}'")
        return available[0], True

    async def chat_completion(self, model: str, messages: list[dict], temperature: float = 0.7) -> dict:
        """Standard JSON completion request."""
        # Resolve target model (handles fallback)
        resolved_model, fallback_used = await self.select_model_with_fallback(model)
        
        url = f"{self.base_url}/api/chat"
        payload = {
            "model": resolved_model,
            "messages": messages,
            "stream": False,
            "options": {"temperature": temperature}
        }
        
        try:
            async with httpx.AsyncClient(timeout=self.timeout) as client:
                response = await client.post(url, json=payload)
                if response.status_code != 200:
                    raise Exception(f"Ollama returned HTTP {response.status_code}: {response.text}")
                
                result = response.json()
                content = result.get("message", {}).get("content", "")
                
                return {
                    "content": content,
                    "model_used": resolved_model,
                    "fallback_used": fallback_used,
                    "latency_ms": 0  # To be calculated in router
                }
        except Exception as e:
            logger.error(f"Ollama completion failure: {str(e)}")
            raise e

    async def chat_completion_stream(self, model: str, messages: list[dict], temperature: float = 0.7) -> AsyncGenerator[str, None]:
        """Asynchronous stream generator sending SSE payloads."""
        resolved_model, fallback_used = await self.select_model_with_fallback(model)
        
        url = f"{self.base_url}/api/chat"
        payload = {
            "model": resolved_model,
            "messages": messages,
            "stream": True,
            "options": {"temperature": temperature}
        }

        # We yield headers first to tell the router metadata about fallback and resolved models
        metadata = {
            "model_used": resolved_model,
            "fallback_used": fallback_used
        }
        yield f"__metadata__:{json.dumps(metadata)}\n"

        try:
            async with httpx.AsyncClient(timeout=self.timeout) as client:
                async with client.stream("POST", url, json=payload) as response:
                    if response.status_code != 200:
                        yield f"Error: Ollama HTTP {response.status_code}\n"
                        return

                    async for line in response.aiter_lines():
                        if line:
                            data = json.loads(line)
                            content = data.get("message", {}).get("content", "")
                            if content:
                                yield content
        except Exception as e:
            logger.error(f"Ollama streaming failure: {str(e)}")
            yield f"Error during streaming: {str(e)}"

# Singleton ollama service
ollama_client = OllamaClient()
