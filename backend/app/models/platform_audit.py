"""Platform SUPER_ADMIN audit trail.

Every platform-admin action (platform-scope read, agency View-As, cross-tenant
view, mutation) is recorded here. The REAL actor is always recorded — View-As never
obscures it. Non-PHI by construction (counts/ids/field-level before/after, not chart
content)."""
from datetime import datetime
import uuid

from sqlalchemy import Boolean, Column, DateTime, ForeignKey, String, Text
from sqlalchemy.dialects.postgresql import JSONB, UUID

from ..database import Base


class PlatformAuditEvent(Base):
    __tablename__ = "platform_audit_events"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    actor_user_id = Column(UUID(as_uuid=True), ForeignKey("users.id"), nullable=False, index=True)
    actor_platform_role = Column(String(30), nullable=True)      # e.g. super_admin
    action = Column(String(64), nullable=False, index=True)
    scope = Column(String(16), nullable=True)                    # platform | tenant
    selected_agency_id = Column(UUID(as_uuid=True), nullable=True, index=True)   # the context chosen
    resource_agency_id = Column(UUID(as_uuid=True), nullable=True)               # the resource's owner
    resource_type = Column(String(48), nullable=True)
    resource_id = Column(String(64), nullable=True)
    view_as = Column(Boolean, nullable=False, default=False)     # True when acting via View-As
    view_as_role = Column(String(30), nullable=True)             # e.g. agency_admin
    environment = Column(String(20), nullable=True)              # local | production | ...
    before = Column(JSONB, nullable=True)
    after = Column(JSONB, nullable=True)
    reason = Column(Text, nullable=True)
    ip_address = Column(String(45), nullable=True)
    at = Column(DateTime, default=datetime.utcnow, index=True)
