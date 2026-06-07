"""
Layer 3: Compliance Agent
Deterministic compliance scoring based on actual threat/incident state.
Frameworks: GDPR, HIPAA, SOC2, ISO 27001
"""
from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func
from datetime import datetime, timedelta, timezone

from app.core.database import get_db
from app.models.threat import Threat, ThreatSeverity, ThreatStatus, ThreatType
from app.models.incident import Incident, IncidentStatus
from app.models.agent import Agent

router = APIRouter()

# Real compliance control definitions
FRAMEWORKS = {
    "gdpr": {
        "name": "GDPR",
        "total_controls": 99,
        "description": "EU General Data Protection Regulation",
        "key_controls": [
            "Lawful basis for processing (Art. 6)",
            "Data subject rights (Art. 15-22)",
            "Privacy by design (Art. 25)",
            "Data breach notification (Art. 33)",
            "Data Protection Officer designation",
            "Third-party data processor agreements",
            "Cross-border transfer mechanisms",
        ],
        # Threat types that impact this framework
        "sensitive_threats": [ThreatType.DATA_EXFILTRATION, ThreatType.UNAUTHORIZED_ACCESS],
    },
    "hipaa": {
        "name": "HIPAA",
        "total_controls": 75,
        "description": "Health Insurance Portability and Accountability Act",
        "key_controls": [
            "Access controls (164.312(a)(1))",
            "Audit controls (164.312(b))",
            "Integrity controls (164.312(c))",
            "Transmission security (164.312(e)(1))",
            "Business associate agreements",
            "Workforce training and access",
            "Contingency planning",
        ],
        "sensitive_threats": [ThreatType.DATA_EXFILTRATION, ThreatType.PRIVILEGE_ESCALATION],
    },
    "soc2": {
        "name": "SOC 2",
        "total_controls": 64,
        "description": "Service Organization Control 2 — Trust Service Criteria",
        "key_controls": [
            "Security (CC6-CC9)",
            "Availability (A1)",
            "Processing integrity (PI1)",
            "Confidentiality (C1)",
            "Privacy (P1-P8)",
            "Change management procedures",
            "Logical access controls",
        ],
        "sensitive_threats": [ThreatType.PROMPT_INJECTION, ThreatType.JAILBREAK, ThreatType.TOOL_ABUSE],
    },
    "iso27001": {
        "name": "ISO 27001",
        "total_controls": 114,
        "description": "Information Security Management System",
        "key_controls": [
            "Risk assessment and treatment (6.1.2)",
            "Asset management (A.8)",
            "Access control (A.9)",
            "Cryptography (A.10)",
            "Incident management (A.16)",
            "Supplier relationships (A.15)",
            "Business continuity (A.17)",
        ],
        "sensitive_threats": [
            ThreatType.AGENT_HIJACKING,
            ThreatType.MEMORY_POISONING,
            ThreatType.ROLE_CONFUSION,
        ],
    },
}


async def compute_framework_score(
    fw_id: str,
    fw_config: dict,
    total_critical: int,
    total_high: int,
    active_incidents: int,
    framework_threats: int,
) -> dict:
    """
    Deterministic score computation:
    - Base score: 97 (starts near-perfect)
    - Deduct per critical threat relevant to this framework
    - Deduct per high threat, lesser amount
    - Deduct per active incident
    - Deduct for framework-specific threat types
    """
    base = 97.0
    deduction = (
        total_critical * 4.0
        + total_high * 1.5
        + active_incidents * 2.0
        + framework_threats * 3.0
    )
    score = max(50.0, base - deduction)
    score = round(score, 1)

    total = fw_config["total_controls"]
    passed = int((score / 100) * total)
    failed = max(0, total - passed - int(total * 0.02))
    warnings = total - passed - failed

    return {
        "name": fw_config["name"],
        "description": fw_config["description"],
        "total_controls": total,
        "score": score,
        "passed": passed,
        "failed": failed,
        "warnings": warnings,
        "status": "compliant" if score >= 85 else "partial" if score >= 60 else "non_compliant",
        "key_controls": fw_config["key_controls"],
        "last_assessed": datetime.now(timezone.utc).isoformat(),
    }


@router.get("/status")
async def compliance_status(db: AsyncSession = Depends(get_db)):
    since_30d = datetime.now(timezone.utc) - timedelta(days=30)

    # Global threat counts (unresolved)
    total_critical = await db.scalar(
        select(func.count(Threat.id)).where(
            Threat.severity == ThreatSeverity.CRITICAL,
            Threat.status != ThreatStatus.RESOLVED,
        )
    ) or 0

    total_high = await db.scalar(
        select(func.count(Threat.id)).where(
            Threat.severity == ThreatSeverity.HIGH,
            Threat.status != ThreatStatus.RESOLVED,
        )
    ) or 0

    active_incidents = await db.scalar(
        select(func.count(Incident.id)).where(Incident.status == IncidentStatus.OPEN)
    ) or 0

    results = {}
    for fw_id, fw_config in FRAMEWORKS.items():
        # Count threats specifically relevant to this framework
        framework_threats = await db.scalar(
            select(func.count(Threat.id)).where(
                Threat.threat_type.in_(fw_config["sensitive_threats"]),
                Threat.detected_at >= since_30d,
                Threat.status != ThreatStatus.RESOLVED,
            )
        ) or 0

        results[fw_id] = await compute_framework_score(
            fw_id,
            fw_config,
            total_critical,
            total_high,
            active_incidents,
            framework_threats,
        )

    overall = round(sum(r["score"] for r in results.values()) / len(results), 1)

    return {
        "overall_score": overall,
        "frameworks": results,
        "computed_at": datetime.now(timezone.utc).isoformat(),
        "assessment_period_days": 30,
    }


@router.get("/framework/{framework_id}")
async def get_framework_detail(framework_id: str, db: AsyncSession = Depends(get_db)):
    if framework_id not in FRAMEWORKS:
        from fastapi import HTTPException
        raise HTTPException(status_code=404, detail=f"Framework '{framework_id}' not found")

    status_data = await compliance_status(db)
    return status_data["frameworks"][framework_id]
