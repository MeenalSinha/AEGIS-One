from fastapi import APIRouter

from app.api.v1.endpoints import (
    firewall, agents, threats, incidents,
    behavioral, redteam, compliance, dashboard,
    audit, websocket, demo, soc, auth,
)

api_router = APIRouter()

api_router.include_router(auth.router,       prefix="/auth",       tags=["Auth"])
api_router.include_router(firewall.router,   prefix="/firewall",   tags=["Firewall"])
api_router.include_router(agents.router,     prefix="/agents",     tags=["Agents"])
api_router.include_router(threats.router,    prefix="/threats",    tags=["Threats"])
api_router.include_router(incidents.router,  prefix="/incidents",  tags=["Incidents"])
api_router.include_router(behavioral.router, prefix="/behavioral", tags=["Behavioral"])
api_router.include_router(redteam.router,    prefix="/redteam",    tags=["Red Team"])
api_router.include_router(soc.router,        prefix="/soc",        tags=["SOC Swarm"])
api_router.include_router(compliance.router, prefix="/compliance", tags=["Compliance"])
api_router.include_router(dashboard.router,  prefix="/dashboard",  tags=["Dashboard"])
api_router.include_router(audit.router,      prefix="/audit",      tags=["Audit"])
api_router.include_router(websocket.router,  prefix="/ws",         tags=["WebSocket"])
api_router.include_router(demo.router,       prefix="/demo",       tags=["Demo"])
