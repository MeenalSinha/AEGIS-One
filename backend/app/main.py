from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.middleware.gzip import GZipMiddleware
from fastapi.responses import JSONResponse
from contextlib import asynccontextmanager
import structlog
import time
import asyncio

from app.core.config import settings
from app.core.database import init_db
from app.api.v1.router import api_router
from app.middleware.logging import LoggingMiddleware
from app.middleware.telemetry import setup_telemetry

logger = structlog.get_logger()


@asynccontextmanager
async def lifespan(app: FastAPI):
    logger.info("AEGIS One starting", version="1.0.0", env=settings.NODE_ENV)
    await init_db()
    logger.info("AEGIS One ready — all 5 security layers active")
    yield
    logger.info("AEGIS One shutting down")


def create_app() -> FastAPI:
    app = FastAPI(
        title="AEGIS One API",
        description="""
## Autonomous Enterprise Governance & Intelligent Security

**5 Security Layers:**
- Layer 1: Sentinel Mesh Firewall — Bypass-resistant prompt/tool/content inspection
- Layer 2: AgentGuard Behavioral Defense — Statistical + AI anomaly detection
- Layer 3: AgentShield SOC — 6-agent security swarm with inter-agent messaging
- Layer 4: Agent Identity & Trust — Cryptographic identity + RBAC
- Layer 5: Autonomous Red Team — 8-vector concurrent offensive testing
        """,
        version="1.0.0",
        lifespan=lifespan,
        docs_url="/docs",
        redoc_url="/redoc",
    )

    @app.exception_handler(Exception)
    async def global_exception_handler(request: Request, exc: Exception):
        logger.error("Unhandled exception", path=request.url.path, error=str(exc), exc_type=type(exc).__name__)
        return JSONResponse(
            status_code=500,
            content={"detail": "Internal server error", "service": "aegis-one"},
        )

    app.add_middleware(GZipMiddleware, minimum_size=1000)
    app.add_middleware(LoggingMiddleware)
    app.add_middleware(
        CORSMiddleware,
        allow_origins=settings.ALLOWED_ORIGINS,
        allow_credentials=True,
        allow_methods=["*"],
        allow_headers=["*"],
    )

    setup_telemetry(app)
    app.include_router(api_router, prefix="/api/v1")

    @app.get("/health", tags=["Health"])
    async def health():
        """Deep health check including DB and Redis connectivity."""
        checks: dict[str, str] = {}

        # DB check
        try:
            from app.core.database import AsyncSessionLocal
            from sqlalchemy import text
            async with AsyncSessionLocal() as db:
                await db.execute(text("SELECT 1"))
            checks["database"] = "ok"
        except Exception as e:
            checks["database"] = f"error: {str(e)[:50]}"

        # Redis check
        try:
            import redis.asyncio as aioredis
            r = aioredis.from_url(settings.REDIS_URL, socket_connect_timeout=2)
            await r.ping()
            await r.aclose()
            checks["redis"] = "ok"
        except Exception as e:
            checks["redis"] = f"unavailable: {str(e)[:30]}"

        all_ok = all(v == "ok" for v in checks.values())
        return {
            "status":    "ok" if all_ok else "degraded",
            "service":   "aegis-one",
            "version":   "1.0.0",
            "timestamp": time.time(),
            "checks":    checks,
            "layers":    5,
        }

    return app


app = create_app()
