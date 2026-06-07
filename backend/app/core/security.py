"""
AEGIS One — Authentication & Security Layer
JWT-based API authentication with demo mode support.
"""
from datetime import datetime, timedelta, timezone
from typing import Optional
from fastapi import HTTPException, Security, Depends, Request
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials, APIKeyHeader
from jose import JWTError, jwt
from passlib.context import CryptContext
import structlog

from app.core.config import settings

logger = structlog.get_logger()

pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")
bearer_scheme = HTTPBearer(auto_error=False)
api_key_header = APIKeyHeader(name="X-API-Key", auto_error=False)

# Demo API key — set via env var AEGIS_DEMO_API_KEY
DEMO_API_KEY = settings.AEGIS_DEMO_API_KEY


def create_access_token(subject: str, expires_delta: Optional[timedelta] = None) -> str:
    expire = datetime.now(timezone.utc) + (expires_delta or timedelta(minutes=settings.JWT_EXPIRE_MINUTES))
    payload = {"sub": subject, "exp": expire, "iat": datetime.now(timezone.utc)}
    return jwt.encode(payload, settings.SECRET_KEY, algorithm=settings.JWT_ALGORITHM)


def verify_token(token: str) -> Optional[dict]:
    try:
        return jwt.decode(token, settings.SECRET_KEY, algorithms=[settings.JWT_ALGORITHM])
    except JWTError:
        return None


async def get_current_user(
    request: Request,
    bearer: Optional[HTTPAuthorizationCredentials] = Security(bearer_scheme),
    api_key: Optional[str] = Security(api_key_header),
) -> dict:
    """
    Flexible auth: accepts JWT Bearer OR API Key.
    In demo mode (NODE_ENV=development), auto-authenticates with demo identity.
    """
    # Demo/development mode — allow all with demo identity
    if settings.NODE_ENV == "development":
        return {"sub": "demo_user", "role": "admin", "mode": "demo"}

    # API Key auth
    if api_key and DEMO_API_KEY and api_key == DEMO_API_KEY:
        return {"sub": "api_key_user", "role": "admin", "mode": "api_key"}

    # JWT Bearer auth
    if bearer:
        payload = verify_token(bearer.credentials)
        if payload:
            return {"sub": payload.get("sub"), "role": payload.get("role", "viewer"), "mode": "jwt"}

    raise HTTPException(
        status_code=401,
        detail="Authentication required",
        headers={"WWW-Authenticate": "Bearer"},
    )


# Optional auth — used on read-only endpoints, does not raise in demo mode
async def optional_auth(
    request: Request,
    bearer: Optional[HTTPAuthorizationCredentials] = Security(bearer_scheme),
    api_key: Optional[str] = Security(api_key_header),
) -> dict:
    try:
        return await get_current_user(request, bearer, api_key)
    except HTTPException:
        return {"sub": "anonymous", "role": "viewer", "mode": "anonymous"}
