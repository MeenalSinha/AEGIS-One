"""
Layer 3: AgentShield SOC — Multi-Agent Security Swarm
Six specialized AI security agents with inter-agent communication.
"""
import json
import asyncio
from dataclasses import dataclass, field
from datetime import datetime, timezone
from typing import Optional

from app.services.ai_client import get_ai_client, get_model_name
import structlog

logger = structlog.get_logger()


@dataclass
class AgentMessage:
    from_agent: str
    to_agent: str
    message_type: str       # "alert", "query", "response", "escalate"
    content: str
    priority: str = "medium"
    timestamp: str = field(default_factory=lambda: datetime.now(timezone.utc).isoformat())


@dataclass
class SOCResult:
    agent_name: str
    finding: str
    severity: str
    recommendation: str
    evidence: list
    messages_sent: list[AgentMessage]
    execution_ms: int = 0


# ─── Individual agent prompts ──────────────────────────────────────────────────

SOC_AGENTS = {
    "threat_hunter": {
        "name": "Threat Hunter Agent",
        "icon": "crosshair",
        "color": "#ff4444",
        "description": "Continuously hunts for active threats and attack patterns",
        "system_prompt": """You are the Threat Hunter Agent in the AEGIS One Security Operations Center.
Your role: actively investigate threat intelligence and hunting hypotheses.
Analyze the provided threat data and hunt for: APT indicators, lateral movement, persistence mechanisms, C2 communication.
Return JSON: {"finding": "...", "severity": "critical|high|medium|low", "recommendation": "...", "evidence": [], "iocs": []}""",
    },
    "compliance_agent": {
        "name": "Compliance Agent",
        "icon": "clipboard-check",
        "color": "#00ff88",
        "description": "Validates GDPR, HIPAA, SOC2, ISO 27001 compliance",
        "system_prompt": """You are the Compliance Agent in AEGIS One SOC.
Analyze agent behavior and data access patterns against: GDPR Article 5-7, HIPAA §164.312, SOC2 CC6-CC9, ISO 27001 A.9.
Return JSON: {"finding": "...", "severity": "...", "recommendation": "...", "evidence": [], "frameworks_violated": []}""",
    },
    "risk_analyst": {
        "name": "Risk Analyst Agent",
        "icon": "trending-up",
        "color": "#f59e0b",
        "description": "Calculates enterprise risk exposure and CVSS scores",
        "system_prompt": """You are the Risk Analyst Agent in AEGIS One SOC.
Quantify enterprise risk from the provided threat data. Calculate CVSS v3.1 scores.
Return JSON: {"finding": "...", "severity": "...", "recommendation": "...", "evidence": [], "risk_score": 0.0-10.0, "cvss_vector": "..."}""",
    },
    "policy_agent": {
        "name": "Policy Enforcement Agent",
        "icon": "shield",
        "color": "#3b82f6",
        "description": "Enforces security policies and governance rules",
        "system_prompt": """You are the Policy Enforcement Agent in AEGIS One SOC.
Check if agent actions violate: least-privilege principle, separation of duties, data minimization, need-to-know.
Return JSON: {"finding": "...", "severity": "...", "recommendation": "...", "evidence": [], "policies_violated": []}""",
    },
    "audit_agent": {
        "name": "Audit Agent",
        "icon": "scroll",
        "color": "#a855f7",
        "description": "Creates forensic trails and tamper-evident audit records",
        "system_prompt": """You are the Audit Agent in AEGIS One SOC.
Create a forensic audit trail from the provided events. Identify gaps in auditability.
Return JSON: {"finding": "...", "severity": "...", "recommendation": "...", "evidence": [], "forensic_timeline": []}""",
    },
    "incident_responder": {
        "name": "Incident Responder Agent",
        "icon": "zap",
        "color": "#ef4444",
        "description": "Automatically mitigates active threats and coordinates response",
        "system_prompt": """You are the Incident Responder Agent in AEGIS One SOC.
Determine the optimal incident response playbook. Recommend: containment, eradication, recovery, post-incident steps.
Return JSON: {"finding": "...", "severity": "...", "recommendation": "...", "evidence": [], "playbook": [], "auto_actions": []}""",
    },
}


async def _run_soc_agent(
    agent_key: str,
    context: str,
    messages_received: list[AgentMessage],
) -> SOCResult:
    """Run a single SOC agent and return its findings."""
    import time
    start = time.monotonic()

    agent_cfg = SOC_AGENTS[agent_key]
    client = get_ai_client()

    user_content = f"Security context:\n{context}"
    if messages_received:
        msgs_text = "\n".join(f"[{m.from_agent}→{m.to_agent}]: {m.content}" for m in messages_received)
        user_content += f"\n\nMessages from other agents:\n{msgs_text}"

    try:
        response = await client.chat.completions.create(
            model=get_model_name(),
            messages=[
                {"role": "system", "content": agent_cfg["system_prompt"]},
                {"role": "user",   "content": user_content},
            ],
            response_format={"type": "json_object"},
            temperature=0.1,
            max_tokens=500,
        )
        r = json.loads(response.choices[0].message.content)
        finding = r.get("finding", "No significant finding")
        severity = r.get("severity", "low")
        recommendation = r.get("recommendation", "Monitor situation")
        evidence = r.get("evidence", [])
    except Exception as e:
        logger.warning(f"SOC agent {agent_key} failed", error=str(e))
        finding = f"Analysis unavailable — {agent_key} encountered an error"
        severity = "info"
        recommendation = "Retry analysis when AI service is available"
        evidence = []

    # Inter-agent messaging: escalate to incident_responder if critical
    messages_sent = []
    if severity in ("critical", "high") and agent_key != "incident_responder":
        messages_sent.append(AgentMessage(
            from_agent=agent_cfg["name"],
            to_agent="Incident Responder Agent",
            message_type="escalate",
            content=f"ESCALATION from {agent_cfg['name']}: {finding[:200]}",
            priority="high",
        ))

    return SOCResult(
        agent_name=agent_cfg["name"],
        finding=finding,
        severity=severity,
        recommendation=recommendation,
        evidence=evidence,
        messages_sent=messages_sent,
        execution_ms=int((time.monotonic() - start) * 1000),
    )


async def run_soc_swarm(context: str) -> dict:
    """
    Run all 6 SOC agents concurrently, then pass critical findings to incident responder.
    Returns structured swarm result with inter-agent communication log.
    """
    first_wave_keys = ["threat_hunter", "compliance_agent", "risk_analyst", "policy_agent", "audit_agent"]

    # Wave 1: Run first 5 agents concurrently
    wave1_results = await asyncio.gather(
        *[_run_soc_agent(k, context, []) for k in first_wave_keys],
        return_exceptions=True,
    )

    results: list[SOCResult] = [r for r in wave1_results if isinstance(r, SOCResult)]
    errors = [str(r) for r in wave1_results if not isinstance(r, SOCResult)]

    # Collect escalation messages
    all_messages: list[AgentMessage] = []
    for r in results:
        all_messages.extend(r.messages_sent)

    # Wave 2: Incident responder gets all findings + escalation messages
    incident_context = context + "\n\nFindings from security team:\n" + "\n".join(
        f"[{r.agent_name}][{r.severity.upper()}]: {r.finding}" for r in results
    )
    ir_result = await _run_soc_agent("incident_responder", incident_context, all_messages)
    results.append(ir_result)

    # Compile communication graph
    comm_graph = [
        {
            "from": m.from_agent,
            "to": m.to_agent,
            "type": m.message_type,
            "content": m.content,
            "priority": m.priority,
            "timestamp": m.timestamp,
        }
        for r in results for m in r.messages_sent
    ]

    # Add ir → team messages
    if ir_result.severity in ("critical", "high"):
        for r in results[:-1]:
            comm_graph.append({
                "from": "Incident Responder Agent",
                "to": r.agent_name,
                "type": "response",
                "content": f"Response playbook deployed: {ir_result.recommendation[:100]}",
                "priority": "high",
                "timestamp": datetime.now(timezone.utc).isoformat(),
            })

    critical_count = sum(1 for r in results if r.severity == "critical")
    high_count     = sum(1 for r in results if r.severity == "high")

    return {
        "agents": [
            {
                "name":           r.agent_name,
                "finding":        r.finding,
                "severity":       r.severity,
                "recommendation": r.recommendation,
                "evidence":       r.evidence,
                "execution_ms":   r.execution_ms,
                "config":         SOC_AGENTS.get(list(SOC_AGENTS.keys())[min(i, len(SOC_AGENTS)-1)], {}),
            }
            for i, r in enumerate(results)
        ],
        "communication_graph": comm_graph,
        "summary": {
            "total_agents": len(results),
            "critical":     critical_count,
            "high":         high_count,
            "messages_exchanged": len(comm_graph),
            "overall_severity": "critical" if critical_count > 0 else "high" if high_count > 0 else "medium",
        },
        "errors": errors,
    }
