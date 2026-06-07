from sqlalchemy import Column, String, Float, JSON, DateTime, Boolean, Text, Enum
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.sql import func
import uuid
import enum

from app.core.database import Base


class AgentStatus(str, enum.Enum):
    ACTIVE = "active"
    INACTIVE = "inactive"
    QUARANTINED = "quarantined"
    SUSPENDED = "suspended"


class AgentRole(str, enum.Enum):
    ASSISTANT = "assistant"
    ANALYST = "analyst"
    EXECUTOR = "executor"
    ORCHESTRATOR = "orchestrator"
    MONITOR = "monitor"
    AUDITOR = "auditor"


class Agent(Base):
    __tablename__ = "agents"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    name = Column(String(255), nullable=False, index=True)
    role = Column(Enum(AgentRole), nullable=False, default=AgentRole.ASSISTANT)
    status = Column(Enum(AgentStatus), nullable=False, default=AgentStatus.ACTIVE, index=True)

    trust_score = Column(Float, default=100.0)
    threat_score = Column(Float, default=0.0)
    health_score = Column(Float, default=100.0)

    permissions = Column(JSON, default=list)
    # NOTE: renamed from 'metadata' to avoid SQLAlchemy reserved attribute conflict
    agent_metadata = Column("metadata", JSON, default=dict)
    security_profile = Column(JSON, default=dict)
    cryptographic_identity = Column(String(512))

    description = Column(Text)
    endpoint = Column(String(512))
    version = Column(String(50))

    is_protected = Column(Boolean, default=True)
    last_active = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())
    created_at = Column(DateTime(timezone=True), server_default=func.now(), index=True)
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())
