from sqlalchemy import Column, String, Boolean, DateTime, Text, Integer, Float, ForeignKey, JSON
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import relationship
from datetime import datetime
import uuid

from ..database import Base


class User(Base):
    """User authentication table - replaces Supabase auth.users"""
    __tablename__ = "users"
    
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    email = Column(String(255), unique=True, nullable=False, index=True)
    password_hash = Column(String(255), nullable=False)
    email_confirmed = Column(Boolean, default=False)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    last_sign_in_at = Column(DateTime, nullable=True)
    
    # Relationships
    profile = relationship("Profile", back_populates="user", uselist=False)
    sessions = relationship("Session", back_populates="user")
    password_reset_tokens = relationship("PasswordResetToken", back_populates="user")
    email_verification_tokens = relationship("EmailVerificationToken", back_populates="user")


class Profile(Base):
    """User profile table - matches existing Supabase profiles table"""
    __tablename__ = "profiles"
    
    id = Column(UUID(as_uuid=True), ForeignKey("users.id"), primary_key=True)
    email = Column(String(255), nullable=False)
    role = Column(String(50), default="client")  # 'admin' or 'client'
    full_name = Column(String(255), nullable=True)
    company = Column(String(255), nullable=True)
    logo_url = Column(Text, nullable=True)
    
    # Project fields
    project_name = Column(String(255), nullable=True)
    project_status = Column(String(50), default="Not Started")
    project_phase = Column(String(50), default="discovery")
    project_deadline = Column(DateTime, nullable=True)
    
    # Client status
    client_status = Column(String(50), default="prospect")
    health_score = Column(Integer, default=0)
    contract_value = Column(Float, default=0)
    start_date = Column(DateTime, nullable=True)
    renewal_date = Column(DateTime, nullable=True)
    
    # Check-in
    next_check_in = Column(DateTime, nullable=True)
    check_in_notes = Column(Text, nullable=True)
    
    # Dashboard embed
    tableau_embed_html = Column(Text, nullable=True)
    tableau_embed_type = Column(String(50), default="dashboard")
    tableau_open_url = Column(Text, nullable=True)
    
    # Upload settings
    upload_enabled = Column(Boolean, default=False)
    allowed_file_types = Column(String(255), default="csv,xlsx,json,pdf")
    max_upload_mb = Column(Integer, default=50)

    # EMS QA add-on — entitlement that drives the portal -> EMS QA SSO handoff.
    ems_qa_enabled = Column(Boolean, default=False)
    ems_agency_slug = Column(String(255), nullable=True)
    ems_role = Column(String(50), nullable=True)
    
    # Metadata
    tags = Column(JSON, default=list)
    notes = Column(Text, nullable=True)
    last_login = Column(DateTime, nullable=True)

    # Self-serve membership / plan (chosen at public signup; activated by an admin
    # or, later, by Stripe subscription billing).
    plan = Column(String(50), default="free_trial")       # free_trial|starter|professional|enterprise
    plan_status = Column(String(50), default="trialing")   # trialing|pending|active|past_due|canceled
    trial_ends_at = Column(DateTime, nullable=True)
    plan_selected_at = Column(DateTime, nullable=True)
    # Stripe subscription linkage (set by the billing webhook; no card data stored)
    stripe_customer_id = Column(String(255), nullable=True)
    stripe_subscription_id = Column(String(255), nullable=True)
    extra_dataset_slots = Column(Integer, default=0)  # add-on: each adds +1 active-dataset slot

    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    
    # Relationships
    user = relationship("User", back_populates="profile")


class Session(Base):
    """User sessions for HTTP-only cookie auth"""
    __tablename__ = "sessions"
    
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    user_id = Column(UUID(as_uuid=True), ForeignKey("users.id"), nullable=False, index=True)
    token_hash = Column(String(255), nullable=False, unique=True, index=True)
    expires_at = Column(DateTime, nullable=False)
    created_at = Column(DateTime, default=datetime.utcnow)
    ip_address = Column(String(45), nullable=True)
    user_agent = Column(Text, nullable=True)
    
    # Relationships
    user = relationship("User", back_populates="sessions")


class PasswordResetToken(Base):
    """Password reset tokens"""
    __tablename__ = "password_reset_tokens"
    
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    user_id = Column(UUID(as_uuid=True), ForeignKey("users.id"), nullable=False, index=True)
    token_hash = Column(String(255), nullable=False, unique=True, index=True)
    expires_at = Column(DateTime, nullable=False)
    used_at = Column(DateTime, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)
    
    # Relationships
    user = relationship("User", back_populates="password_reset_tokens")


class EmailVerificationToken(Base):
    """Email verification tokens for public self-serve signups.

    Mirrors PasswordResetToken: the raw token is emailed, only its sha256 hash is
    stored, and it is single-use (used_at) with an expiry.
    """
    __tablename__ = "email_verification_tokens"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    user_id = Column(UUID(as_uuid=True), ForeignKey("users.id"), nullable=False, index=True)
    token_hash = Column(String(255), nullable=False, unique=True, index=True)
    expires_at = Column(DateTime, nullable=False)
    used_at = Column(DateTime, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)

    # Relationships
    user = relationship("User", back_populates="email_verification_tokens")
