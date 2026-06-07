from sqlalchemy import Column, String, JSON, DateTime, Text
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.sql import func
import uuid

from app.core.database import Base


class AuditLog(Base):
    __tablename__ = "audit_logs"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    agent_id = Column(String(255))
    action = Column(String(255), nullable=False)
    resource = Column(String(512))
    details = Column(JSON, default=dict)
    outcome = Column(String(50))
    ip_address = Column(String(64))
    user_agent = Column(Text)
    session_id = Column(String(255))
    created_at = Column(DateTime(timezone=True), server_default=func.now())
