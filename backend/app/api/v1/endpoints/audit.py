from fastapi import APIRouter, Depends, Query
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from pydantic import BaseModel, validator
from typing import Optional
from datetime import datetime, timezone
import uuid

from app.core.database import get_db
from app.models.audit import AuditLog

router = APIRouter()


class AuditCreate(BaseModel):
    agent_id: Optional[str] = None
    action: str
    resource: Optional[str] = None
    details: dict = {}
    outcome: str = "success"
    ip_address: Optional[str] = None

    @validator("outcome")
    def valid_outcome(cls, v):
        if v not in ("success", "failure", "blocked", "warning"):
            raise ValueError("outcome must be success|failure|blocked|warning")
        return v


class AuditResponse(BaseModel):
    id: str
    agent_id: Optional[str]
    action: str
    resource: Optional[str]
    outcome: str
    details: dict
    created_at: Optional[datetime]


@router.post("/", response_model=AuditResponse)
async def create_audit_log(payload: AuditCreate, db: AsyncSession = Depends(get_db)):
    log = AuditLog(
        id=uuid.uuid4(),
        agent_id=payload.agent_id,
        action=payload.action,
        resource=payload.resource,
        details=payload.details,
        outcome=payload.outcome,
        ip_address=payload.ip_address,
    )
    db.add(log)
    await db.flush()
    return AuditResponse(
        id=str(log.id),
        agent_id=log.agent_id,
        action=log.action,
        resource=log.resource,
        outcome=log.outcome,
        details=log.details or {},
        created_at=log.created_at,
    )


@router.get("/", response_model=list[AuditResponse])
async def list_audit_logs(
    agent_id: Optional[str] = None,
    action: Optional[str] = None,
    outcome: Optional[str] = None,
    limit: int = Query(100, le=500),
    offset: int = Query(0, ge=0),
    db: AsyncSession = Depends(get_db),
):
    q = select(AuditLog).order_by(AuditLog.created_at.desc()).limit(limit).offset(offset)
    if agent_id:
        q = q.where(AuditLog.agent_id == agent_id)
    if action:
        q = q.where(AuditLog.action.ilike(f"%{action}%"))
    if outcome:
        q = q.where(AuditLog.outcome == outcome)

    result = await db.execute(q)
    logs = result.scalars().all()
    return [
        AuditResponse(
            id=str(l.id),
            agent_id=l.agent_id,
            action=l.action,
            resource=l.resource,
            outcome=l.outcome,
            details=l.details or {},
            created_at=l.created_at,
        )
        for l in logs
    ]


@router.get("/stats")
async def audit_stats(db: AsyncSession = Depends(get_db)):
    from sqlalchemy import func
    total = await db.scalar(select(func.count(AuditLog.id))) or 0
    blocked = await db.scalar(
        select(func.count(AuditLog.id)).where(AuditLog.outcome == "blocked")
    ) or 0
    failures = await db.scalar(
        select(func.count(AuditLog.id)).where(AuditLog.outcome == "failure")
    ) or 0
    return {"total": total, "blocked": blocked, "failures": failures}
