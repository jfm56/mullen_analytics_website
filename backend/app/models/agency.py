from sqlalchemy import Column, String, Boolean, DateTime, Text, BigInteger, ForeignKey, JSON
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import relationship
from datetime import datetime
import uuid

from ..database import Base


class Agency(Base):
    __tablename__ = "agencies"

    id                = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    # Owning organization (unified-platform tenancy). NULL until backfilled in the
    # Phase 1 migration; then every agency belongs to exactly one organization.
    org_id            = Column(UUID(as_uuid=True), ForeignKey("organizations.id", ondelete="CASCADE"), nullable=True, index=True)
    agency_name       = Column(String(255), nullable=False)
    slug              = Column(String(100), unique=True, nullable=False, index=True)
    subscription_tier = Column(String(50), default="essential")
    # Data classification for platform monitoring: synthetic | trial | production.
    # Synthetic/trial records are EXCLUDED from production client metrics. Defaults
    # to production so a real agency is never mis-counted; the demo agency is synthetic.
    data_classification = Column(String(20), nullable=False, default="production", index=True)
    status            = Column(String(50), default="active")
    storage_path      = Column(Text, nullable=True)
    contact_email     = Column(String(255), nullable=True)
    contact_name      = Column(String(255), nullable=True)
    agency_type       = Column(String(100), nullable=True)
    state             = Column(String(50), nullable=True)
    # Per-agency analytics configuration (risk score thresholds, NFPA targets, etc.)
    # See report.DEFAULT_ANALYTICS_CONFIG for the schema and defaults.
    analytics_config  = Column(JSON, nullable=True)
    # TODO (SaaS v2): add subscription_features (JSON) for per-agency feature flags
    created_at        = Column(DateTime, default=datetime.utcnow)
    updated_at        = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    organization  = relationship("Organization", back_populates="agencies")
    memberships   = relationship("AgencyMembership", back_populates="agency", cascade="all, delete-orphan")
    files         = relationship("AgencyFile",        back_populates="agency", cascade="all, delete-orphan")
    audit_logs    = relationship("AuditLog",          back_populates="agency", cascade="all, delete-orphan")
    pipeline_runs = relationship("PipelineRun",       back_populates="agency", cascade="all, delete-orphan")


class AgencyMembership(Base):
    __tablename__ = "agency_memberships"

    id         = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    agency_id  = Column(UUID(as_uuid=True), ForeignKey("agencies.id", ondelete="CASCADE"), nullable=False, index=True)
    user_id    = Column(UUID(as_uuid=True), ForeignKey("users.id",    ondelete="CASCADE"), nullable=False, index=True)
    role       = Column(String(50), default="member")  # legacy; superseded by the capability flags below

    # Unified-platform capability set — Jim's "review / receive reviews / both" model.
    can_review          = Column(Boolean, default=False, nullable=False)  # QA reviewer: sees queue, decides
    can_receive_reviews = Column(Boolean, default=False, nullable=False)  # crew/provider: sees ONLY own charts' feedback
    is_agency_admin     = Column(Boolean, default=False, nullable=False)  # invite/manage people + assign capabilities
    provider_id         = Column(String(100), nullable=True)              # links a 'receive' member to their crew/provider id
    created_at = Column(DateTime, default=datetime.utcnow)

    agency = relationship("Agency", back_populates="memberships")
    user   = relationship("User",   foreign_keys=[user_id])


class AgencyFile(Base):
    __tablename__ = "agency_files"

    id                = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    agency_id         = Column(UUID(as_uuid=True), ForeignKey("agencies.id", ondelete="CASCADE"), nullable=False, index=True)
    uploaded_by       = Column(UUID(as_uuid=True), ForeignKey("users.id"), nullable=False)
    original_filename = Column(String(500), nullable=False)
    stored_filename   = Column(String(500), nullable=False)
    file_type         = Column(String(50),  nullable=False)
    mime_type         = Column(String(100), nullable=True)
    file_size_bytes   = Column(BigInteger,  nullable=True)
    upload_path       = Column(Text, nullable=False)
    status            = Column(String(50), default="uploaded")
    validation_status = Column(String(50), nullable=True)
    created_at        = Column(DateTime, default=datetime.utcnow)

    agency   = relationship("Agency", back_populates="files")
    uploader = relationship("User",   foreign_keys=[uploaded_by])


class AuditLog(Base):
    __tablename__ = "audit_logs"

    id            = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    agency_id     = Column(UUID(as_uuid=True), ForeignKey("agencies.id"), nullable=True, index=True)
    user_id       = Column(UUID(as_uuid=True), ForeignKey("users.id"),    nullable=True, index=True)
    action        = Column(String(100), nullable=False, index=True)
    resource_type = Column(String(100), nullable=True)
    resource_id   = Column(String(255), nullable=True)
    details       = Column(JSON, nullable=True)
    ip_address    = Column(String(45), nullable=True)
    created_at    = Column(DateTime, default=datetime.utcnow, index=True)

    agency = relationship("Agency", back_populates="audit_logs")


class PipelineRun(Base):
    __tablename__ = "pipeline_runs"

    id            = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    agency_id     = Column(UUID(as_uuid=True), ForeignKey("agencies.id", ondelete="CASCADE"), nullable=False, index=True)
    status        = Column(String(50), default="queued", index=True)
    started_at    = Column(DateTime, nullable=True)
    completed_at  = Column(DateTime, nullable=True)
    error_message = Column(Text, nullable=True)
    output_path   = Column(Text, nullable=True)
    report_path   = Column(Text, nullable=True)
    triggered_by  = Column(UUID(as_uuid=True), ForeignKey("users.id"), nullable=True)
    created_at    = Column(DateTime, default=datetime.utcnow)

    agency = relationship("Agency", back_populates="pipeline_runs")
