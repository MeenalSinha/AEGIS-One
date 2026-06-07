from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, update, func
from pydantic import BaseModel, validator
from typing import Optional
from datetime import datetime, timezone
import uuid

from app.core.database import get_db
from app.models.incident import Incident, IncidentSeverity, IncidentStatus
from app.models.audit import AuditLog

router = APIRouter()


class IncidentCreate(BaseModel):
    title: str
    description: Optional[str] = None
    severity: str
    threat_id: Optional[str] = None
    agent_id: Optional[str] = None
    affected_agents: list = []

    @validator("severity")
    def valid_severity(cls, v):
        valid = [s.value for s in IncidentSeverity]
        if v not in valid:
            raise ValueError(f"severity must be one of: {valid}")
        return v

    @validator("title")
    def title_not_empty(cls, v):
        if not v or not v.strip():
            raise ValueError("title must not be empty")
        return v.strip()[:512]


class IncidentResponse(BaseModel):
    id: str
    title: str
    description: Optional[str]
    severity: str
    status: str
    affected_agents: list
    timeline: list
    actions_taken: list
    opened_at: datetime
    resolved_at: Optional[datetime]

    class Config:
        from_attributes = True


@router.post("/", response_model=IncidentResponse)
async def create_incident(payload: IncidentCreate, db: AsyncSession = Depends(get_db)):
    threat_uuid = None
    agent_uuid = None
    if payload.threat_id:
        try:
            threat_uuid = uuid.UUID(payload.threat_id)
        except ValueError:
            raise HTTPException(status_code=422, detail="Invalid threat_id UUID")
    if payload.agent_id:
        try:
            agent_uuid = uuid.UUID(payload.agent_id)
        except ValueError:
            raise HTTPException(status_code=422, detail="Invalid agent_id UUID")

    now = datetime.now(timezone.utc).isoformat()
    inc = Incident(
        id=uuid.uuid4(),
        title=payload.title,
        description=payload.description,
        severity=IncidentSeverity(payload.severity),
        threat_id=threat_uuid,
        agent_id=agent_uuid,
        affected_agents=payload.affected_agents,
        timeline=[
            {"event": "Incident created", "timestamp": now, "actor": "system"},
        ],
        actions_taken=[],
    )
    db.add(inc)

    log = AuditLog(
        id=uuid.uuid4(),
        action="incident_created",
        resource=f"incidents/{inc.id}",
        details={"title": payload.title, "severity": payload.severity},
        outcome="success",
    )
    db.add(log)

    await db.flush()
    await db.refresh(inc)
    return _to_response(inc)


@router.get("/", response_model=list[IncidentResponse])
async def list_incidents(
    status: Optional[str] = None,
    severity: Optional[str] = None,
    limit: int = Query(100, le=500),
    offset: int = Query(0, ge=0),
    db: AsyncSession = Depends(get_db),
):
    q = select(Incident).order_by(Incident.opened_at.desc()).limit(limit).offset(offset)
    if status:
        try:
            q = q.where(Incident.status == IncidentStatus(status))
        except ValueError:
            raise HTTPException(status_code=422, detail=f"Invalid status: {status}")
    if severity:
        try:
            q = q.where(Incident.severity == IncidentSeverity(severity))
        except ValueError:
            raise HTTPException(status_code=422, detail=f"Invalid severity: {severity}")
    result = await db.execute(q)
    return [_to_response(i) for i in result.scalars().all()]


@router.get("/stats")
async def incident_stats(db: AsyncSession = Depends(get_db)):
    total = await db.scalar(select(func.count(Incident.id))) or 0
    open_count = await db.scalar(
        select(func.count(Incident.id)).where(Incident.status == IncidentStatus.OPEN)
    ) or 0
    resolved = await db.scalar(
        select(func.count(Incident.id)).where(Incident.status == IncidentStatus.RESOLVED)
    ) or 0
    critical = await db.scalar(
        select(func.count(Incident.id)).where(Incident.severity == IncidentSeverity.CRITICAL)
    ) or 0
    return {"total": total, "open": open_count, "resolved": resolved, "critical": critical}


@router.post("/{incident_id}/resolve")
async def resolve_incident(incident_id: str, db: AsyncSession = Depends(get_db)):
    try:
        uid = uuid.UUID(incident_id)
    except ValueError:
        raise HTTPException(status_code=422, detail="Invalid incident_id UUID")

    result = await db.execute(select(Incident).where(Incident.id == uid))
    inc = result.scalar_one_or_none()
    if not inc:
        raise HTTPException(status_code=404, detail="Incident not found")

    now = datetime.now(timezone.utc)
    # Append to timeline
    timeline = list(inc.timeline or [])
    timeline.append({"event": "Incident resolved", "timestamp": now.isoformat(), "actor": "operator"})

    await db.execute(
        update(Incident)
        .where(Incident.id == uid)
        .values(
            status=IncidentStatus.RESOLVED,
            resolved_at=now,
            timeline=timeline,
        )
    )

    log = AuditLog(
        id=uuid.uuid4(),
        action="incident_resolved",
        resource=f"incidents/{incident_id}",
        details={"incident_id": incident_id},
        outcome="success",
    )
    db.add(log)

    return {
        "status": "resolved",
        "incident_id": incident_id,
        "resolved_at": now.isoformat(),
    }


def _to_response(i: Incident) -> IncidentResponse:
    return IncidentResponse(
        id=str(i.id),
        title=i.title,
        description=i.description,
        severity=i.severity.value,
        status=i.status.value,
        affected_agents=i.affected_agents or [],
        timeline=i.timeline or [],
        actions_taken=i.actions_taken or [],
        opened_at=i.opened_at,
        resolved_at=i.resolved_at,
    )
