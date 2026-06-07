from fastapi import APIRouter, Request, Depends
from pydantic import BaseModel, validator
from typing import Optional

from app.services.firewall.inspector import inspect_request, ThreatCategory
from app.core.rate_limit import rate_limit
from app.core.config import settings

router = APIRouter()

MAX_CONTENT_BYTES = 32_768


class InspectRequest(BaseModel):
    content: str
    agent_id: Optional[str] = None
    tool_calls: Optional[list] = None
    context: Optional[dict] = None

    @validator("content")
    def content_not_empty(cls, v):
        if not v or not v.strip():
            raise ValueError("content must not be empty")
        if len(v.encode("utf-8")) > MAX_CONTENT_BYTES:
            raise ValueError(f"content exceeds {MAX_CONTENT_BYTES // 1024}KB limit")
        return v

    @validator("tool_calls")
    def limit_tool_calls(cls, v):
        if v and len(v) > 50:
            raise ValueError("Maximum 50 tool_calls per request")
        return v


@router.post("/inspect")
async def inspect(payload: InspectRequest, request: Request):
    """Layer 1 — Sentinel Mesh Firewall inspection."""
    await rate_limit(request, limit=settings.RATE_LIMIT_FIREWALL, window_seconds=60)

    result = await inspect_request(
        content=payload.content,
        agent_id=payload.agent_id,
        tool_calls=payload.tool_calls,
        context=payload.context,
    )
    return {
        "allowed":           result.allowed,
        "threat_category":   result.threat_category.value,
        "risk_score":        round(result.risk_score, 4),
        "risk_percent":      round(result.risk_score * 100, 1),
        "confidence":        round(result.confidence, 4),
        "confidence_percent":round(result.confidence * 100, 1),
        "explanation":       result.explanation,
        "evidence":          result.evidence,
        "recommended_action":result.recommended_action,
        "impact_level":      result.impact_level,
        "detection_layers":  result.detection_layers,
    }


@router.get("/status")
async def firewall_status():
    return {
        "status":              "active",
        "layer":               "sentinel_mesh_firewall",
        "mode":                "enforce",
        "detection_categories": [c.value for c in ThreatCategory if c != ThreatCategory.CLEAN],
        "detection_layers":    ["unicode_normalization", "base64_decode", "leetspeak", "heuristic_regex", "ai_gpt4o"],
        "heuristic_patterns":  35,
        "ai_analysis":         True,
        "max_content_kb":      MAX_CONTENT_BYTES // 1024,
        "bypass_mitigations":  ["unicode_normalization", "base64_scan", "leetspeak_normalization", "indirect_injection_detection"],
    }
