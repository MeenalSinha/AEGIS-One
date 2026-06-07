from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, update, func, case
from pydantic import BaseModel, validator
from typing import Optional
from datetime import datetime, timezone
import uuid

from app.core.database import get_db
from app.models.threat import Threat, ThreatType, ThreatSeverity, ThreatStatus
from app.models.audit import AuditLog

router = APIRouter()

MAX_CONTENT_LENGTH = 32_000  # 32KB limit on raw content


class ThreatCreate(BaseModel):
    agent_id: Optional[str] = None
    threat_type: str
    severity: str
    title: str
    description: Optional[str] = None
    evidence: dict = {}
    raw_content: Optional[str] = None
    risk_score: float = 0.0
    confidence: float = 0.0
    explanation: Optional[str] = None
    recommended_action: Optional[str] = None

    @validator("threat_type")
    def valid_threat_type(cls, v):
        valid = [t.value for t in ThreatType]
        if v not in valid:
            raise ValueError(f"threat_type must be one of: {valid}")
        return v

    @validator("severity")
    def valid_severity(cls, v):
        valid = [s.value for s in ThreatSeverity]
        if v not in valid:
            raise ValueError(f"severity must be one of: {valid}")
        return v

    @validator("risk_score", "confidence")
    def score_in_range(cls, v):
        if not (0.0 <= v <= 1.0):
            raise ValueError("Score must be between 0.0 and 1.0")
        return round(v, 4)

    @validator("raw_content")
    def truncate_raw_content(cls, v):
        if v and len(v) > MAX_CONTENT_LENGTH:
            return v[:MAX_CONTENT_LENGTH] + "... [truncated]"
        return v


class ThreatResponse(BaseModel):
    id: str
    agent_id: Optional[str]
    threat_type: str
    severity: str
    status: str
    title: str
    description: Optional[str]
    evidence: dict
    risk_score: float
    confidence: float
    explanation: Optional[str]
    recommended_action: Optional[str]
    detected_at: datetime

    class Config:
        from_attributes = True


@router.post("/", response_model=ThreatResponse)
async def create_threat(payload: ThreatCreate, db: AsyncSession = Depends(get_db)):
    agent_uuid = None
    if payload.agent_id:
        try:
            agent_uuid = uuid.UUID(payload.agent_id)
        except ValueError:
            raise HTTPException(status_code=422, detail="Invalid agent_id UUID")

    threat = Threat(
        id=uuid.uuid4(),
        agent_id=agent_uuid,
        threat_type=ThreatType(payload.threat_type),
        severity=ThreatSeverity(payload.severity),
        title=payload.title,
        description=payload.description,
        evidence=payload.evidence,
        raw_content=payload.raw_content,
        risk_score=payload.risk_score,
        confidence=payload.confidence,
        explanation=payload.explanation,
        recommended_action=payload.recommended_action,
    )
    db.add(threat)

    # Auto-set status to BLOCKED for high-confidence threats
    if payload.risk_score >= 0.7 and payload.confidence >= 0.7:
        threat.status = ThreatStatus.BLOCKED

    # Audit log
    log = AuditLog(
        id=uuid.uuid4(),
        agent_id=payload.agent_id,
        action="threat_detected",
        resource=f"threats/{threat.id}",
        details={
            "threat_type": payload.threat_type,
            "severity": payload.severity,
            "risk_score": payload.risk_score,
        },
        outcome="success",
    )
    db.add(log)

    await db.flush()
    await db.refresh(threat)
    return _to_response(threat)


@router.get("/", response_model=list[ThreatResponse])
async def list_threats(
    severity: Optional[str] = None,
    status: Optional[str] = None,
    threat_type: Optional[str] = None,
    search: Optional[str] = Query(None, max_length=100),
    limit: int = Query(50, le=200),
    offset: int = Query(0, ge=0),
    db: AsyncSession = Depends(get_db),
):
    q = select(Threat).order_by(Threat.detected_at.desc()).limit(limit).offset(offset)

    if severity:
        try:
            q = q.where(Threat.severity == ThreatSeverity(severity))
        except ValueError:
            raise HTTPException(status_code=422, detail=f"Invalid severity: {severity}")
    if status:
        try:
            q = q.where(Threat.status == ThreatStatus(status))
        except ValueError:
            raise HTTPException(status_code=422, detail=f"Invalid status: {status}")
    if threat_type:
        try:
            q = q.where(Threat.threat_type == ThreatType(threat_type))
        except ValueError:
            raise HTTPException(status_code=422, detail=f"Invalid threat_type: {threat_type}")
    if search:
        q = q.where(Threat.title.ilike(f"%{search}%"))

    result = await db.execute(q)
    return [_to_response(t) for t in result.scalars().all()]


@router.get("/stats")
async def threat_stats(db: AsyncSession = Depends(get_db)):
    total = await db.scalar(select(func.count(Threat.id))) or 0
    active = await db.scalar(
        select(func.count(Threat.id)).where(Threat.status == ThreatStatus.ACTIVE)
    ) or 0
    blocked = await db.scalar(
        select(func.count(Threat.id)).where(Threat.status == ThreatStatus.BLOCKED)
    ) or 0
    resolved = await db.scalar(
        select(func.count(Threat.id)).where(Threat.status == ThreatStatus.RESOLVED)
    ) or 0
    critical = await db.scalar(
        select(func.count(Threat.id)).where(Threat.severity == ThreatSeverity.CRITICAL)
    ) or 0
    high = await db.scalar(
        select(func.count(Threat.id)).where(Threat.severity == ThreatSeverity.HIGH)
    ) or 0

    # Type breakdown
    type_rows = await db.execute(
        select(Threat.threat_type, func.count(Threat.id).label("count"))
        .group_by(Threat.threat_type)
        .order_by(func.count(Threat.id).desc())
    )
    by_type = [{"type": r.threat_type.value, "count": r.count} for r in type_rows]

    return {
        "total": total,
        "active": active,
        "blocked": blocked,
        "resolved": resolved,
        "critical": critical,
        "high": high,
        "by_type": by_type,
    }


@router.post("/{threat_id}/resolve")
async def resolve_threat(threat_id: str, db: AsyncSession = Depends(get_db)):
    try:
        uid = uuid.UUID(threat_id)
    except ValueError:
        raise HTTPException(status_code=422, detail="Invalid threat_id UUID")

    result = await db.execute(select(Threat).where(Threat.id == uid))
    threat = result.scalar_one_or_none()
    if not threat:
        raise HTTPException(status_code=404, detail="Threat not found")

    await db.execute(
        update(Threat)
        .where(Threat.id == uid)
        .values(status=ThreatStatus.RESOLVED, resolved_at=func.now())
    )

    log = AuditLog(
        id=uuid.uuid4(),
        action="threat_resolved",
        resource=f"threats/{threat_id}",
        details={"threat_type": threat.threat_type.value, "severity": threat.severity.value},
        outcome="success",
    )
    db.add(log)
    return {"status": "resolved", "threat_id": threat_id}


def _to_response(t: Threat) -> ThreatResponse:
    return ThreatResponse(
        id=str(t.id),
        agent_id=str(t.agent_id) if t.agent_id else None,
        threat_type=t.threat_type.value,
        severity=t.severity.value,
        status=t.status.value,
        title=t.title,
        description=t.description,
        evidence=t.evidence or {},
        risk_score=round(t.risk_score, 4),
        confidence=round(t.confidence, 4),
        explanation=t.explanation,
        recommended_action=t.recommended_action,
        detected_at=t.detected_at,
    )
