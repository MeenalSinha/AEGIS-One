"""SOC Swarm API endpoint."""
from fastapi import APIRouter, Request
from app.services.soc_agents import run_soc_swarm, SOC_AGENTS
from app.core.rate_limit import rate_limit

router = APIRouter()


@router.post("/run")
async def run_swarm(request: Request, payload: dict = {}):
    """Trigger the 6-agent SOC swarm analysis."""
    await rate_limit(request, limit=10, window_seconds=60)
    context = payload.get("context", "General security audit — no specific threat provided.")
    result = await run_soc_swarm(context)
    return result


@router.get("/agents")
async def list_agents():
    """Return SOC agent catalog with metadata."""
    return {
        key: {
            "name":        cfg["name"],
            "icon":        cfg["icon"],
            "color":       cfg["color"],
            "description": cfg["description"],
        }
        for key, cfg in SOC_AGENTS.items()
    }


@router.get("/status")
async def swarm_status():
    return {
        "status": "active",
        "agents": len(SOC_AGENTS),
        "capabilities": ["threat_hunting", "compliance", "risk_analysis", "policy", "audit", "incident_response"],
    }
