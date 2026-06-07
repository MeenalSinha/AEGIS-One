"""Auth endpoints — login, token, API key management."""
from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from app.core.security import create_access_token, pwd_context
from app.core.config import settings

router = APIRouter()

# Demo credentials — in production, these come from DB
DEMO_USERS = {
    "admin": {"hashed_pw": pwd_context.hash("aegis-admin-2026"), "role": "admin"},
    "analyst": {"hashed_pw": pwd_context.hash("aegis-analyst"), "role": "analyst"},
    "viewer": {"hashed_pw": pwd_context.hash("aegis-viewer"), "role": "viewer"},
}


class LoginRequest(BaseModel):
    username: str
    password: str


class TokenResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"
    role: str
    expires_in: int


@router.post("/login", response_model=TokenResponse)
async def login(payload: LoginRequest):
    user = DEMO_USERS.get(payload.username)
    if not user or not pwd_context.verify(payload.password, user["hashed_pw"]):
        raise HTTPException(status_code=401, detail="Invalid credentials")

    token = create_access_token(payload.username)
    return TokenResponse(
        access_token=token,
        role=user["role"],
        expires_in=settings.JWT_EXPIRE_MINUTES * 60,
    )


@router.get("/me")
async def me():
    """Returns demo user info — in dev mode, always admin."""
    return {"user": "admin", "role": "admin", "mode": settings.NODE_ENV}


@router.get("/demo-key")
async def get_demo_key():
    """Returns the demo API key (dev mode only)."""
    if settings.NODE_ENV != "development":
        raise HTTPException(status_code=403, detail="Not available in production")
    return {"api_key": settings.AEGIS_DEMO_API_KEY, "note": "Demo key — change in production"}
