"""
Layer 2: AgentGuard Behavioral Defense Engine
Anomaly detection, trust scoring, and behavioral baselines.
Uses Redis for persistent action history (falls back to in-memory).
"""
import json
import asyncio
from typing import Optional
from dataclasses import dataclass, field
from datetime import datetime, timezone

from app.services.ai_client import get_ai_client, get_model_name
from app.core.config import settings
import structlog

logger = structlog.get_logger()


@dataclass
class BehaviorAnalysis:
    agent_id: str
    trust_score: float
    threat_score: float
    health_score: float
    anomalies: list
    explanation: str
    action_required: bool
    recommended_action: str


# In-process cache — replaced with Redis in production
_action_history: dict[str, list] = {}
_history_lock = asyncio.Lock()

SENSITIVE_RESOURCES = [
    "payroll", "secrets", "admin", "credentials", "financial",
    "passwords", "private_key", "ssn", "pii", "hipaa", "confidential",
]

SENSITIVE_TOOLS = [
    "execute_code", "file_write", "network_request", "db_query",
    "shell_exec", "http_post", "data_export", "email_send",
]


async def _get_history(agent_id: str) -> list:
    """Get action history — Redis-backed in production."""
    try:
        import aioredis  # type: ignore
        r = aioredis.from_url(settings.REDIS_URL)
        raw = await r.lrange(f"aegis:history:{agent_id}", 0, 999)
        await r.aclose()
        return [json.loads(item) for item in raw]
    except Exception:
        return _action_history.get(agent_id, [])


async def _push_history(agent_id: str, action: dict):
    """Push action to history — Redis-backed in production."""
    entry = {**action, "timestamp": datetime.now(timezone.utc).isoformat()}
    try:
        import aioredis  # type: ignore
        r = aioredis.from_url(settings.REDIS_URL)
        key = f"aegis:history:{agent_id}"
        await r.rpush(key, json.dumps(entry))
        await r.ltrim(key, -1000, -1)  # keep last 1000
        await r.expire(key, 86400 * 7)  # TTL 7 days
        await r.aclose()
    except Exception:
        async with _history_lock:
            if agent_id not in _action_history:
                _action_history[agent_id] = []
            _action_history[agent_id].append(entry)
            if len(_action_history[agent_id]) > 1000:
                _action_history[agent_id] = _action_history[agent_id][-1000:]


def _detect_anomalies(agent_id: str, current_action: dict, history: list) -> list:
    """Multi-layered statistical anomaly detection."""
    anomalies = []

    # 1. Sensitive resource access
    resource = str(current_action.get("resource", "")).lower()
    if any(s in resource for s in SENSITIVE_RESOURCES):
        # Check if this agent has ever accessed this resource before
        past_resources = [str(a.get("resource", "")).lower() for a in history[-50:]]
        if resource not in past_resources:
            anomalies.append({
                "type": "new_sensitive_resource_access",
                "severity": "high",
                "detail": f"First-time access to sensitive resource: '{resource}'",
            })
        else:
            anomalies.append({
                "type": "sensitive_resource_access",
                "severity": "medium",
                "detail": f"Access to sensitive resource: '{resource}'",
            })

    # 2. Sensitive tool usage
    tool = str(current_action.get("tool", ""))
    if tool in SENSITIVE_TOOLS:
        past_tools = [str(a.get("tool", "")) for a in history[-100:]]
        if past_tools.count(tool) > 10:
            anomalies.append({
                "type": "excessive_sensitive_tool_use",
                "severity": "high",
                "detail": f"Tool '{tool}' used {past_tools.count(tool)} times in recent history",
            })

    # 3. High frequency burst detection (>20 actions in last 30)
    if len(history) >= 30:
        recent_30 = history[-30:]
        if len(recent_30) >= 25:
            anomalies.append({
                "type": "high_frequency_burst",
                "severity": "medium",
                "detail": f"Action rate spike: {len(recent_30)} actions in last 30 entries",
            })

    # 4. New tool discovery
    if len(history) >= 20 and tool:
        all_tools = {a.get("tool") for a in history[:-5] if a.get("tool")}
        if tool and tool not in all_tools:
            anomalies.append({
                "type": "new_tool_discovery",
                "severity": "low",
                "detail": f"Agent using previously unseen tool: '{tool}'",
            })

    # 5. SQL injection in query field
    query = str(current_action.get("query", "")).lower()
    sql_patterns = ["drop table", "truncate", "delete from", "--", "union select", "exec(", "xp_"]
    if any(p in query for p in sql_patterns):
        anomalies.append({
            "type": "sql_injection_in_query",
            "severity": "critical",
            "detail": f"Destructive SQL pattern detected in query: '{query[:100]}'",
        })

    # 6. Path traversal in resource
    if any(p in resource for p in ["../", "..\\", "/etc/", "/proc/", "c:\\windows"]):
        anomalies.append({
            "type": "path_traversal_attempt",
            "severity": "critical",
            "detail": f"Path traversal pattern in resource: '{resource[:100]}'",
        })

    return anomalies


def _compute_scores(anomalies: list, history_len: int) -> tuple[float, float, float]:
    """Compute trust, threat, health scores from anomaly list."""
    severity_weights = {"critical": 30.0, "high": 15.0, "medium": 7.0, "low": 2.0}
    threat_score = min(100.0, sum(severity_weights.get(a.get("severity", "low"), 2.0) for a in anomalies))
    trust_score = max(0.0, 100.0 - threat_score * 0.9)
    health_score = max(0.0, 100.0 - threat_score)
    return round(trust_score, 1), round(threat_score, 1), round(health_score, 1)


async def analyze_behavior(
    agent_id: str,
    current_action: dict,
    agent_metadata: Optional[dict] = None,
) -> BehaviorAnalysis:
    """Main behavioral analysis entry point."""

    # Build / update history
    history = await _get_history(agent_id)
    await _push_history(agent_id, current_action)

    # Statistical detection
    anomalies = _detect_anomalies(agent_id, current_action, history)

    # AI deep analysis for high-severity anomalies only (avoid unnecessary API calls)
    high_severity = any(a["severity"] in ("high", "critical") for a in anomalies)
    if high_severity and len(history) > 5:
        try:
            client = get_ai_client()
            history_summary = json.dumps(history[-8:], indent=2)
            response = await client.chat.completions.create(
                model=get_model_name(),
                messages=[
                    {
                        "role": "system",
                        "content": (
                            "You are AEGIS One's behavioral analysis engine. "
                            "Analyze the agent action history for security threats. "
                            "Return ONLY valid JSON:\n"
                            '{"additional_anomalies":[],"threat_assessment":"string","action_required":bool,"recommended_action":"quarantine|suspend|monitor|allow"}'
                        ),
                    },
                    {
                        "role": "user",
                        "content": (
                            f"Agent {agent_id} recent history:\n{history_summary}\n\n"
                            f"Current action: {json.dumps(current_action)}\n"
                            f"Statistical anomalies already found: {json.dumps(anomalies)}"
                        ),
                    },
                ],
                response_format={"type": "json_object"},
                temperature=0.1,
                max_tokens=400,
            )
            ai_result = json.loads(response.choices[0].message.content)
            extra = ai_result.get("additional_anomalies", [])
            if isinstance(extra, list):
                anomalies.extend(a for a in extra if isinstance(a, dict) and "type" in a)
        except Exception as e:
            logger.warning("Behavioral AI analysis unavailable", error=str(e))

    trust_score, threat_score, health_score = _compute_scores(anomalies, len(history))
    action_required = threat_score > 50 or any(a["severity"] == "critical" for a in anomalies)
    recommended_action = (
        "quarantine" if threat_score > 75
        else "suspend" if threat_score > 50
        else "monitor" if threat_score > 20
        else "allow"
    )

    explanation_parts = [f"Analyzed {len(history)} historical actions. Found {len(anomalies)} anomalies."]
    for a in anomalies[:3]:
        explanation_parts.append(f"[{a.get('severity','?').upper()}] {a.get('type','unknown')}: {a.get('detail','')}")

    return BehaviorAnalysis(
        agent_id=agent_id,
        trust_score=trust_score,
        threat_score=threat_score,
        health_score=health_score,
        anomalies=anomalies,
        explanation=" | ".join(explanation_parts),
        action_required=action_required,
        recommended_action=recommended_action,
    )
