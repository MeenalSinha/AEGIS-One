from sqlalchemy import Column, String, Float, JSON, DateTime, Text, Enum, ForeignKey, Index
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.sql import func
import uuid
import enum

from app.core.database import Base


class ThreatType(str, enum.Enum):
    PROMPT_INJECTION = "prompt_injection"
    JAILBREAK = "jailbreak"
    MEMORY_POISONING = "memory_poisoning"
    TOOL_ABUSE = "tool_abuse"
    DATA_EXFILTRATION = "data_exfiltration"
    AGENT_HIJACKING = "agent_hijacking"
    PRIVILEGE_ESCALATION = "privilege_escalation"
    ROLE_CONFUSION = "role_confusion"
    UNAUTHORIZED_ACCESS = "unauthorized_access"
    ANOMALOUS_BEHAVIOR = "anomalous_behavior"


class ThreatSeverity(str, enum.Enum):
    CRITICAL = "critical"
    HIGH = "high"
    MEDIUM = "medium"
    LOW = "low"
    INFO = "info"


class ThreatStatus(str, enum.Enum):
    ACTIVE = "active"
    BLOCKED = "blocked"
    INVESTIGATING = "investigating"
    RESOLVED = "resolved"
    FALSE_POSITIVE = "false_positive"


class Threat(Base):
    __tablename__ = "threats"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    agent_id = Column(UUID(as_uuid=True), ForeignKey("agents.id", ondelete="SET NULL"), nullable=True, index=True)

    threat_type = Column(Enum(ThreatType), nullable=False, index=True)
    severity = Column(Enum(ThreatSeverity), nullable=False, index=True)
    status = Column(Enum(ThreatStatus), default=ThreatStatus.ACTIVE, index=True)

    title = Column(String(512), nullable=False)
    description = Column(Text)
    evidence = Column(JSON, default=dict)
    raw_content = Column(Text)

    risk_score = Column(Float, default=0.0)
    confidence = Column(Float, default=0.0)

    explanation = Column(Text)
    recommended_action = Column(Text)
    remediation = Column(JSON, default=list)

    source_ip = Column(String(64))
    target = Column(String(255))

    detected_at = Column(DateTime(timezone=True), server_default=func.now(), index=True)
    resolved_at = Column(DateTime(timezone=True), nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())

    __table_args__ = (
        Index("ix_threats_detected_at_severity", "detected_at", "severity"),
    )
