"""
Lead discovery + outreach (company-level, admin-managed).

Adapted from the mullen_ai_jarvis Lead/OutreachMessage schema, but for a
multi-tenant server admin portal instead of a single-user local app:
  * leads are the COMPANY's prospects (no per-user ownership),
  * outreach is DRAFT-FOR-REVIEW — an OutreachMessage is only sent after an
    admin approves it (approved_by/approved_at set); never auto-sent,
  * a suppression list (opt-outs / bounces) is checked before any send
    (CAN-SPAM / GDPR).

Discovery is run by the nightly crawler (services/leadgen) on the on-prem
instance and also via POST /api/admin/leads/discover.
"""
import uuid
from datetime import datetime

from sqlalchemy import Column, DateTime, ForeignKey, Integer, String, Text
from sqlalchemy.dialects.postgresql import UUID

from ..database import Base


class Lead(Base):
    __tablename__ = "leads"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    company = Column(String(300), nullable=False, index=True)
    contact_name = Column(String(200), nullable=True)
    contact_email = Column(String(320), nullable=True, index=True)
    contact_role = Column(String(200), nullable=True)
    website = Column(String(500), nullable=True)
    vertical = Column(String(50), nullable=True, index=True)         # healthcare | ems | gov | smb | research | other
    source = Column(String(30), default="research", index=True)      # research | samgov | rfp | manual | referral
    source_url = Column(String(1000), nullable=True)
    need_summary = Column(Text, nullable=True)                       # what they appear to be looking for (LLM)
    signal = Column(String(500), nullable=True)                     # short "why relevant" tag
    status = Column(String(30), default="researched", index=True)    # researched|contacted|meeting|proposal|won|lost|disqualified
    score = Column(Integer, default=0, index=True)                  # 0-100 heuristic
    notes = Column(Text, nullable=True)
    discovered_at = Column(DateTime, default=datetime.utcnow, index=True)
    last_contacted_at = Column(DateTime, nullable=True)
    next_followup_at = Column(DateTime, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow, index=True)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)


class OutreachMessage(Base):
    __tablename__ = "outreach_messages"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    lead_id = Column(UUID(as_uuid=True), ForeignKey("leads.id", ondelete="CASCADE"), index=True, nullable=False)
    channel = Column(String(20), default="email")                    # email (only, for now)
    subject = Column(String(500), nullable=True)
    body_text = Column(Text, nullable=True)
    status = Column(String(20), default="draft", index=True)         # draft | approved | sent | replied | discarded
    generated_by = Column(String(50), nullable=True)                # llm model / "manual"
    approved_by = Column(UUID(as_uuid=True), ForeignKey("users.id"), nullable=True)  # admin who approved the send
    approved_at = Column(DateTime, nullable=True)
    sent_at = Column(DateTime, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow, index=True)


class LeadSuppression(Base):
    """Opt-out / bounce suppression — checked before ANY outreach send."""
    __tablename__ = "lead_suppressions"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    email = Column(String(320), unique=True, index=True, nullable=False)
    reason = Column(String(30), default="unsubscribe")               # unsubscribe | bounce | complaint | manual
    created_at = Column(DateTime, default=datetime.utcnow)
