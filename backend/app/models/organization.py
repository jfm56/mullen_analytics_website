"""Unified-platform tenancy: Organization (account/billing entity) and
ModuleEntitlement (which product modules an org can access).

Part of the AWS unified-platform migration (Phase 1). An Organization replaces
the legacy "user-as-client" model: a client is an Organization that owns one or
more Agencies and has one or more member Users. Module access is governed by
ModuleEntitlement rows (the single source of truth, replacing
profiles.module_overrides + plan-tier bundle logic).
"""
from sqlalchemy import Column, String, Boolean, DateTime, ForeignKey, UniqueConstraint
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import relationship
from datetime import datetime
import uuid

from ..database import Base

# Product modules a client can be entitled to.
MODULES = ("analytics", "predictive", "geographic", "qa", "ecg")


class Organization(Base):
    """Account / billing entity. Owns one or more agencies and has member users."""
    __tablename__ = "organizations"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    name = Column(String(255), nullable=False)
    slug = Column(String(100), unique=True, nullable=False, index=True)
    status = Column(String(50), default="active")

    # Billing / plan (lifted up from the legacy per-user Profile).
    plan = Column(String(50), default="free_trial")
    plan_status = Column(String(50), default="trialing")
    trial_ends_at = Column(DateTime, nullable=True)
    stripe_customer_id = Column(String(255), nullable=True)
    stripe_subscription_id = Column(String(255), nullable=True)

    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    agencies = relationship("Agency", back_populates="organization")
    entitlements = relationship(
        "ModuleEntitlement", back_populates="organization", cascade="all, delete-orphan"
    )

    @property
    def enabled_modules(self) -> set:
        """Set of module names enabled for this organization."""
        return {e.module for e in self.entitlements if e.enabled}


class ModuleEntitlement(Base):
    """Which product module an organization can access — one row per (org, module).
    Single source of truth for analytics | predictive | geographic | qa | ecg."""
    __tablename__ = "module_entitlements"
    __table_args__ = (
        UniqueConstraint("org_id", "module", name="uq_module_entitlement_org_module"),
    )

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    org_id = Column(
        UUID(as_uuid=True),
        ForeignKey("organizations.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    module = Column(String(32), nullable=False)  # one of MODULES
    enabled = Column(Boolean, default=True, nullable=False)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    organization = relationship("Organization", back_populates="entitlements")
