from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, update
from pydantic import BaseModel, validator
from typing import Optional
from datetime import datetime, timezone
import uuid
import hashlib

from app.core.database import get_db
from app.models.agent import Agent, AgentStatus, AgentRole
from app.models.audit import AuditLog

router = APIRouter()


class AgentCreate(BaseModel):
    name: str
    role: str = "assistant"
    description: Optional[str] = None
    permissions: list = []
    endpoint: Optional[str] = None
    version: Optional[str] = "1.0.0"

    @validator("name")
    def name_must_not_be_empty(cls, v):
        if not v or not v.strip():
            raise ValueError("Agent name must not be empty")
        if len(v) > 255:
            raise ValueError("Agent name must be under 255 characters")
        return v.strip()

    @validator("role")
    def role_must_be_valid(cls, v):
        valid = [r.value for r in AgentRole]
        if v not in valid:
            raise ValueError(f"Role must be one of: {valid}")
        return v


class AgentResponse(BaseModel):
    id: str
    name: str
    role: str
    status: str
    trust_score: float
    threat_score: float
    health_score: float
    permissions: list
    cryptographic_identity: Optional[str]
    description: Optional[str]
    is_protected: bool
    created_at: Optional[datetime]

    class Config:
        from_attributes = True


def _generate_crypto_identity(agent_id: str, name: str) -> str:
    """Deterministic cryptographic identity — SHA-256 of agent_id + name + salt."""
    data = f"{agent_id}:{name}:aegis-one-v1"
    return hashlib.sha256(data.encode()).hexdigest()


def _parse_uuid(agent_id: str) -> uuid.UUID:
    try:
        return uuid.UUID(agent_id)
    except (ValueError, AttributeError):
        raise HTTPException(status_code=422, detail=f"Invalid agent ID format: {agent_id!r}")


async def _write_audit(db: AsyncSession, agent_id: str, action: str, outcome: str = "success"):
    log = AuditLog(
        id=uuid.uuid4(),
        agent_id=agent_id,
        action=action,
        resource="agent_registry",
        details={"agent_id": agent_id},
        outcome=outcome,
    )
    db.add(log)


@router.post("/", response_model=AgentResponse)
async def create_agent(payload: AgentCreate, db: AsyncSession = Depends(get_db)):
    agent_id = uuid.uuid4()
    crypto_id = _generate_crypto_identity(str(agent_id), payload.name)

    agent = Agent(
        id=agent_id,
        name=payload.name,
        role=AgentRole(payload.role),
        description=payload.description,
        permissions=payload.permissions,
        endpoint=payload.endpoint,
        version=payload.version,
        cryptographic_identity=crypto_id,
        security_profile={"created_by": "aegis-one", "verified": True, "version": "1.0"},
    )
    db.add(agent)
    await _write_audit(db, str(agent_id), "agent_registered")
    await db.flush()
    await db.refresh(agent)
    return _to_response(agent)


@router.get("/", response_model=list[AgentResponse])
async def list_agents(
    status: Optional[str] = None,
    role: Optional[str] = None,
    search: Optional[str] = Query(None, max_length=100),
    limit: int = Query(100, le=500),
    offset: int = Query(0, ge=0),
    db: AsyncSession = Depends(get_db),
):
    q = select(Agent).order_by(Agent.created_at.desc()).limit(limit).offset(offset)
    if status:
        try:
            q = q.where(Agent.status == AgentStatus(status))
        except ValueError:
            raise HTTPException(status_code=422, detail=f"Invalid status: {status}")
    if role:
        try:
            q = q.where(Agent.role == AgentRole(role))
        except ValueError:
            raise HTTPException(status_code=422, detail=f"Invalid role: {role}")
    if search:
        q = q.where(Agent.name.ilike(f"%{search}%"))

    result = await db.execute(q)
    return [_to_response(a) for a in result.scalars().all()]


@router.get("/{agent_id}", response_model=AgentResponse)
async def get_agent(agent_id: str, db: AsyncSession = Depends(get_db)):
    uid = _parse_uuid(agent_id)
    result = await db.execute(select(Agent).where(Agent.id == uid))
    agent = result.scalar_one_or_none()
    if not agent:
        raise HTTPException(status_code=404, detail="Agent not found")
    return _to_response(agent)


@router.post("/{agent_id}/quarantine")
async def quarantine_agent(agent_id: str, db: AsyncSession = Depends(get_db)):
    uid = _parse_uuid(agent_id)
    result = await db.execute(select(Agent).where(Agent.id == uid))
    agent = result.scalar_one_or_none()
    if not agent:
        raise HTTPException(status_code=404, detail="Agent not found")

    await db.execute(
        update(Agent)
        .where(Agent.id == uid)
        .values(status=AgentStatus.QUARANTINED, trust_score=0.0, threat_score=100.0)
    )
    await _write_audit(db, agent_id, "agent_quarantined")
    return {
        "status": "quarantined",
        "agent_id": agent_id,
        "agent_name": agent.name,
        "timestamp": datetime.now(timezone.utc).isoformat(),
    }


@router.post("/{agent_id}/restore")
async def restore_agent(agent_id: str, db: AsyncSession = Depends(get_db)):
    uid = _parse_uuid(agent_id)
    result = await db.execute(select(Agent).where(Agent.id == uid))
    agent = result.scalar_one_or_none()
    if not agent:
        raise HTTPException(status_code=404, detail="Agent not found")

    await db.execute(
        update(Agent)
        .where(Agent.id == uid)
        .values(status=AgentStatus.ACTIVE, trust_score=75.0, threat_score=10.0, health_score=75.0)
    )
    await _write_audit(db, agent_id, "agent_restored")
    return {
        "status": "restored",
        "agent_id": agent_id,
        "agent_name": agent.name,
        "timestamp": datetime.now(timezone.utc).isoformat(),
    }


@router.patch("/{agent_id}/scores")
async def update_agent_scores(
    agent_id: str,
    trust_score: Optional[float] = None,
    threat_score: Optional[float] = None,
    health_score: Optional[float] = None,
    db: AsyncSession = Depends(get_db),
):
    """Internal endpoint for behavioral engine to update agent scores."""
    uid = _parse_uuid(agent_id)
    values = {}
    if trust_score is not None:
        values["trust_score"] = max(0.0, min(100.0, trust_score))
    if threat_score is not None:
        values["threat_score"] = max(0.0, min(100.0, threat_score))
    if health_score is not None:
        values["health_score"] = max(0.0, min(100.0, health_score))
    if values:
        await db.execute(update(Agent).where(Agent.id == uid).values(**values))
        await _write_audit(db, agent_id, "scores_updated")
    return {"updated": list(values.keys())}


def _to_response(agent: Agent) -> AgentResponse:
    return AgentResponse(
        id=str(agent.id),
        name=agent.name,
        role=agent.role.value,
        status=agent.status.value,
        trust_score=round(agent.trust_score, 1),
        threat_score=round(agent.threat_score, 1),
        health_score=round(agent.health_score, 1),
        permissions=agent.permissions or [],
        cryptographic_identity=agent.cryptographic_identity,
        description=agent.description,
        is_protected=agent.is_protected,
        created_at=agent.created_at,
    )
