from fastapi import APIRouter, HTTPException
from pydantic import BaseModel, validator
from typing import Optional

from app.services.behavioral.engine import analyze_behavior

router = APIRouter()


class BehaviorRequest(BaseModel):
    agent_id: str
    action: dict
    metadata: Optional[dict] = None

    @validator("agent_id")
    def agent_id_not_empty(cls, v):
        if not v or not v.strip():
            raise ValueError("agent_id must not be empty")
        return v.strip()

    @validator("action")
    def action_not_empty(cls, v):
        if not v:
            raise ValueError("action must not be empty")
        return v


@router.post("/analyze")
async def analyze(payload: BehaviorRequest):
    """Run behavioral analysis on an agent action (Layer 2 — AgentGuard)."""
    result = await analyze_behavior(
        payload.agent_id,
        payload.action,
        payload.metadata,
    )
    return {
        "agent_id": result.agent_id,
        "trust_score": result.trust_score,
        "threat_score": result.threat_score,
        "health_score": result.health_score,
        "anomalies": result.anomalies,
        "anomaly_count": len(result.anomalies),
        "explanation": result.explanation,
        "action_required": result.action_required,
        "recommended_action": result.recommended_action,
    }
