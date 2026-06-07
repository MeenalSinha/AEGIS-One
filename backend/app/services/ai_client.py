"""
Thread-safe AI client factory with fallback support.
Uses asyncio lock to safely initialize singleton under concurrent requests.
"""
import asyncio
from typing import Optional
from openai import AsyncOpenAI, AsyncAzureOpenAI
from app.core.config import settings
import structlog

logger = structlog.get_logger()

_client: Optional[AsyncOpenAI] = None
_lock = asyncio.Lock()


async def get_ai_client_async() -> AsyncOpenAI:
    """Get or create AI client (async-safe)."""
    global _client
    if _client is not None:
        return _client
    async with _lock:
        if _client is not None:
            return _client
        if settings.USE_AZURE_OPENAI and settings.AZURE_OPENAI_API_KEY:
            _client = AsyncAzureOpenAI(
                api_key=settings.AZURE_OPENAI_API_KEY,
                azure_endpoint=settings.AZURE_OPENAI_ENDPOINT,
                api_version=settings.AZURE_OPENAI_API_VERSION,
            )
            logger.info("AI client: Azure OpenAI")
        elif settings.OPENAI_API_KEY:
            _client = AsyncOpenAI(api_key=settings.OPENAI_API_KEY)
            logger.info("AI client: OpenAI")
        else:
            raise RuntimeError(
                "No AI API key configured. Set OPENAI_API_KEY or AZURE_OPENAI_API_KEY in .env"
            )
        return _client


def get_ai_client() -> AsyncOpenAI:
    """Synchronous accessor — only safe after first async initialization."""
    global _client
    if _client is None:
        # Fallback sync init for non-async contexts
        if settings.USE_AZURE_OPENAI and settings.AZURE_OPENAI_API_KEY:
            _client = AsyncAzureOpenAI(
                api_key=settings.AZURE_OPENAI_API_KEY,
                azure_endpoint=settings.AZURE_OPENAI_ENDPOINT,
                api_version=settings.AZURE_OPENAI_API_VERSION,
            )
        elif settings.OPENAI_API_KEY:
            _client = AsyncOpenAI(api_key=settings.OPENAI_API_KEY)
        else:
            raise RuntimeError("No AI API key configured")
    return _client


def get_model_name() -> str:
    """Return the correct model name for the current AI backend."""
    if settings.USE_AZURE_OPENAI:
        return settings.AZURE_OPENAI_DEPLOYMENT
    return "gpt-4o"
