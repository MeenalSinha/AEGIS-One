from fastapi import APIRouter, Request, HTTPException, Query
from pydantic import BaseModel
from typing import Optional

from app.services.redteam.engine import run_red_team_sweep, _generate_ai_payload
from app.core.rate_limit import rate_limit
from app.core.config import settings

router = APIRouter()

VALID_ATTACK_TYPES = [
    "prompt_injection", "jailbreak", "memory_poisoning",
    "role_confusion", "tool_abuse", "indirect_injection",
    "context_poisoning", "multi_agent_attack",
]


class RedTeamRequest(BaseModel):
    target_agent_id: Optional[str] = None


@router.post("/sweep")
async def red_team_sweep(payload: RedTeamRequest, request: Request):
    """Layer 5 — Full autonomous red team sweep (rate-limited: expensive)."""
    await rate_limit(request, limit=settings.RATE_LIMIT_REDTEAM, window_seconds=60)
    report = await run_red_team_sweep(payload.target_agent_id)
    return {
        "total_attacks":        report.total_attacks,
        "vulnerabilities_found":report.vulnerabilities_found,
        "critical_count":       report.critical_count,
        "high_count":           report.high_count,
        "medium_count":         report.medium_count,
        "low_count":            report.low_count,
        "findings": [
            {
                "attack_type":              f.attack_type,
                "severity":                 f.severity,
                "vulnerability_description":f.vulnerability_description,
                "proof_of_concept":         f.proof_of_concept,
                "remediation":              f.remediation,
                "cvss_score":               f.cvss_score,
            }
            for f in report.findings
        ],
        "executive_summary": report.executive_summary,
        "remediation_plan":  report.remediation_plan,
    }


@router.post("/generate-payload")
async def generate_payload(
    request: Request,
    attack_type: str = Query(...),
    context: Optional[str] = Query(None, max_length=500),
):
    await rate_limit(request, limit=30, window_seconds=60)
    if attack_type not in VALID_ATTACK_TYPES:
        raise HTTPException(status_code=422, detail=f"attack_type must be one of: {VALID_ATTACK_TYPES}")
    payload = await _generate_ai_payload(attack_type, context)
    return {"attack_type": attack_type, "payload": payload}


@router.get("/attack-types")
async def list_attack_types():
    return {
        "attack_types": VALID_ATTACK_TYPES,
        "descriptions": {
            "prompt_injection":    "Direct instruction override attacks",
            "jailbreak":           "Safety constraint bypass attempts",
            "memory_poisoning":    "Persistent context manipulation",
            "role_confusion":      "Agent identity impersonation",
            "tool_abuse":          "Unauthorized tool invocation",
            "indirect_injection":  "Hypothetical/fictional injection vectors",
            "context_poisoning":   "Multi-turn attack chains",
            "multi_agent_attack":  "Coordinated cross-agent attacks",
        },
    }
