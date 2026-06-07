"""
Simple in-process rate limiter using sliding window.
For production, swap for Redis-backed slowapi.
"""
import time
import asyncio
from collections import defaultdict
from fastapi import HTTPException, Request

_windows: dict[str, list[float]] = defaultdict(list)
_lock = asyncio.Lock()


async def rate_limit(request: Request, limit: int, window_seconds: int = 60):
    """Sliding window rate limiter keyed by client IP."""
    ip = request.client.host if request.client else "unknown"
    key = f"{request.url.path}:{ip}"
    now = time.monotonic()
    cutoff = now - window_seconds

    async with _lock:
        timestamps = _windows[key]
        # Remove expired entries
        _windows[key] = [t for t in timestamps if t > cutoff]
        if len(_windows[key]) >= limit:
            raise HTTPException(
                status_code=429,
                detail=f"Rate limit exceeded: {limit} requests per {window_seconds}s",
                headers={"Retry-After": str(window_seconds)},
            )
        _windows[key].append(now)
