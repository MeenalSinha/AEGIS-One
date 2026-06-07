"""
WebSocket endpoints for real-time event streaming.
Live feed pulls real threat events from DB, supplemented with simulated
events to maintain stream continuity during quiet periods.
"""
from fastapi import APIRouter, WebSocket, WebSocketDisconnect, Depends
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
import asyncio
import json
import random
from datetime import datetime, timezone, timedelta

from app.core.database import AsyncSessionLocal
from app.models.threat import Threat, ThreatStatus

router = APIRouter()

# Connection registry for broadcasting
_connections: set[WebSocket] = set()

THREAT_TYPES = ["prompt_injection", "jailbreak", "data_exfiltration", "tool_abuse", "anomalous_behavior"]
SEVERITIES = ["critical", "high", "medium", "low"]
AGENT_NAMES = [
    "GPT-Analyst-01", "DataProcessor-02", "ReportWriter-03",
    "CodeExecutor-04", "EmailAgent-05", "DBQuery-06",
]


def _sim_event() -> dict:
    """Generate a realistic simulated threat event."""
    t = random.choice(THREAT_TYPES)
    s = random.choices(SEVERITIES, weights=[5, 20, 40, 35])[0]
    agent = random.choice(AGENT_NAMES)
    blocked = random.random() > 0.12
    return {
        "type": "threat_event",
        "id": f"sim_{random.randint(100000, 999999)}",
        "threat_type": t,
        "severity": s,
        "agent": agent,
        "blocked": blocked,
        "risk_score": round(random.uniform(0.3, 1.0), 2),
        "confidence": round(random.uniform(0.6, 1.0), 2),
        "timestamp": datetime.now(timezone.utc).isoformat(),
        "message": f"{t.replace('_', ' ').title()} {'blocked' if blocked else 'detected'} on {agent}",
        "source": "simulated",
    }


async def _fetch_recent_db_events(since_seconds: int = 30) -> list[dict]:
    """Pull real threat events from DB created in the last N seconds."""
    try:
        async with AsyncSessionLocal() as db:
            since = datetime.now(timezone.utc) - timedelta(seconds=since_seconds)
            result = await db.execute(
                select(Threat)
                .where(Threat.detected_at >= since)
                .order_by(Threat.detected_at.desc())
                .limit(5)
            )
            threats = result.scalars().all()
            return [
                {
                    "type": "threat_event",
                    "id": str(t.id),
                    "threat_type": t.threat_type.value,
                    "severity": t.severity.value,
                    "agent": "unknown",
                    "blocked": t.status == ThreatStatus.BLOCKED,
                    "risk_score": round(t.risk_score, 2),
                    "confidence": round(t.confidence, 2),
                    "timestamp": t.detected_at.isoformat() if t.detected_at else datetime.now(timezone.utc).isoformat(),
                    "message": t.title,
                    "source": "database",
                }
                for t in threats
            ]
    except Exception:
        return []


async def _fetch_agent_statuses() -> list[dict]:
    """Pull real agent statuses from DB."""
    try:
        from app.models.agent import Agent
        async with AsyncSessionLocal() as db:
            result = await db.execute(
                select(Agent.id, Agent.name, Agent.trust_score, Agent.threat_score, Agent.status)
                .order_by(Agent.created_at.desc())
                .limit(10)
            )
            agents = result.all()
            if agents:
                return [
                    {
                        "id": str(a.id),
                        "name": a.name,
                        "trust_score": round(a.trust_score, 1),
                        "threat_score": round(a.threat_score, 1),
                        "status": a.status.value,
                    }
                    for a in agents
                ]
    except Exception:
        pass

    # Fallback to simulated agent list
    return [
        {
            "id": f"sim_{i}",
            "name": name,
            "trust_score": round(random.uniform(60, 100), 1),
            "threat_score": round(random.uniform(0, 35), 1),
            "status": random.choices(["active", "active", "active", "quarantined"], weights=[88, 4, 4, 4])[0],
        }
        for i, name in enumerate(AGENT_NAMES)
    ]


@router.websocket("/live-feed")
async def live_feed(websocket: WebSocket):
    await websocket.accept()
    _connections.add(websocket)
    last_db_check = 0.0

    try:
        while True:
            import time
            now = time.monotonic()

            # Every 10 seconds try to pull real DB events
            if now - last_db_check > 10:
                db_events = await _fetch_recent_db_events(since_seconds=15)
                if db_events:
                    for evt in db_events:
                        await websocket.send_text(json.dumps(evt))
                    last_db_check = now
                    await asyncio.sleep(random.uniform(1.5, 3.0))
                    continue
                last_db_check = now

            # Always emit simulated events to keep stream alive
            event = _sim_event()
            await websocket.send_text(json.dumps(event))
            await asyncio.sleep(random.uniform(1.5, 4.0))

    except WebSocketDisconnect:
        pass
    except Exception:
        pass
    finally:
        _connections.discard(websocket)


@router.websocket("/agent-status")
async def agent_status_feed(websocket: WebSocket):
    await websocket.accept()
    try:
        while True:
            agents = await _fetch_agent_statuses()
            payload = {
                "type": "agent_update",
                "agents": agents,
                "timestamp": datetime.now(timezone.utc).isoformat(),
                "total": len(agents),
            }
            await websocket.send_text(json.dumps(payload))
            await asyncio.sleep(5)
    except WebSocketDisconnect:
        pass
    except Exception:
        pass


async def broadcast_threat_event(event: dict):
    """Broadcast a threat event to all connected WebSocket clients."""
    dead: set[WebSocket] = set()
    for ws in list(_connections):
        try:
            await ws.send_text(json.dumps(event))
        except Exception:
            dead.add(ws)
    _connections.difference_update(dead)
