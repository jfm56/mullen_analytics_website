"""EMSCS QA Review Engine v1 — schema (SYNTHETIC/no-PHI, feature-flagged).

Gated by settings.emscs_qa_v1_enabled (env EMSCS_QA_V1_ENABLED), OFF by default.
Scope: the existing EMSCS synthetic/no-PHI environment only. This module does NOT
connect to live EMSCharts, ingest PHI, or expose anything to a client.

Design principles baked into this schema (from the Phase spec):
- **Data-driven clinical content.** The 8 EMSCS scoring domains, the CQI indicator
  definitions (#1–84), their applicability/evaluation/severity rules, weights, and
  the scoring formula parameters live as DATA (qa_scoring_domains, qa_indicators,
  qa_scoring_config) — seeded from the EMSCS workbook — NOT hardcoded. The schema
  shape therefore does not depend on the workbook's specific clinical content.
- **Original automated result stored SEPARATELY from the human-approved result.**
  qa_indicator_reviews.automated_result / human_result; qa_scores.automated_* vs
  approved_*. The AI/automated engine never writes the human/final values.
- **Deterministic scoring.** Scores are computed by application logic from the
  indicator results + qa_scoring_config; no AI/ML computes or modifies a score.
- **Every negative automated finding carries chart evidence** (qa_findings.evidence
  is required for negative automated findings).
- **Agency-owned + RLS-ready.** Root tables carry agency_id (authoritative tenant);
  children inherit via FK. Charts are synthetic-only in v1 (is_synthetic default true).
"""
from datetime import datetime
import uuid

from sqlalchemy import (
    Boolean, Column, DateTime, Float, ForeignKey, Integer, String, Text, UniqueConstraint,
)
from sqlalchemy.dialects.postgresql import JSONB, UUID

from ..database import Base


# ─────────────────────────────────────────────────────────────────────────────
# Configuration layer (seeded from the EMSCS workbook) — the "Indicator Library"
# ─────────────────────────────────────────────────────────────────────────────
class QaScoringDomain(Base):
    """One of the 8 EMSCS scoring domains (item 8). Platform-level config, seeded
    from the workbook; `weight` + `ordering` drive the deterministic composite.
    Not agency-owned — the methodology is shared; agency data references it."""
    __tablename__ = "qa_scoring_domains"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    slug = Column(String(60), nullable=False, unique=True, index=True)   # stable key, e.g. "documentation"
    name = Column(String(160), nullable=False)                           # workbook display name
    description = Column(Text, nullable=True)
    weight = Column(Float, nullable=False, default=0.0)                  # composite weight (from workbook)
    ordering = Column(Integer, nullable=False, default=0)
    scoring_version = Column(String(40), nullable=False, default="unset")  # ties to the workbook version
    active = Column(Boolean, nullable=False, default=True)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)


class QaIndicator(Base):
    """Indicator Library entry (items 10, 8, 12). One CQI indicator definition.

    `number` is the EMSCS CQI number (#1–84). v1 implements the GENERAL CQI #1–12
    deterministically (evaluation_rule populated, implemented=True); #13–84 are
    STORED AS DEFINITIONS ONLY (implemented=False, evaluation_rule null) per the
    phase scope. The rule columns are JSONB specs the engines interpret — no clinical
    logic is hardcoded; the workbook populates them."""
    __tablename__ = "qa_indicators"
    __table_args__ = (UniqueConstraint("number", "scoring_version", name="uq_qa_indicator_number_version"),)

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    number = Column(Integer, nullable=False, index=True)                 # EMSCS CQI #
    slug = Column(String(80), nullable=False, index=True)
    name = Column(String(240), nullable=False)
    category = Column(String(30), nullable=False, default="general_cqi")  # general_cqi | specialty_cqi
    domain_id = Column(UUID(as_uuid=True), ForeignKey("qa_scoring_domains.id"), nullable=True, index=True)
    definition = Column(Text, nullable=True)                             # workbook definition text

    # Engine specs (interpreted, not hardcoded). Shapes documented in emscs-qa-v1-design.md.
    applicability_rule = Column(JSONB, nullable=True)   # when does this indicator apply to a chart?
    evaluation_rule = Column(JSONB, nullable=True)      # deterministic pass/fail/na from chart fields
    severity_rule = Column(JSONB, nullable=True)        # severity of a failure (severity engine v1)
    weight = Column(Float, nullable=False, default=1.0)

    implemented = Column(Boolean, nullable=False, default=False)  # True only for #1–12 in v1
    scoring_version = Column(String(40), nullable=False, default="unset")
    active = Column(Boolean, nullable=False, default=True)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)


class QaScoringConfig(Base):
    """Deterministic scoring parameters (item 9) for one workbook version: how the
    per-domain scores compose into Quality Score, Indicator Compliance, Composite
    Score, and Tier. Stored as DATA (formula params + tier thresholds) so the exact
    workbook formula is seeded/validated, never guessed in code. One active row."""
    __tablename__ = "qa_scoring_configs"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    scoring_version = Column(String(40), nullable=False, unique=True, index=True)
    # params: {quality_score:{...}, indicator_compliance:{...}, composite:{weights/method},
    #          tiers:[{name,min,max}], rounding:...} — exact shape from the workbook.
    params = Column(JSONB, nullable=False, default=dict)
    source = Column(String(120), nullable=True)   # e.g. "EMSCS workbook v2026-xx (sha256 ...)"
    active = Column(Boolean, nullable=False, default=False)
    created_at = Column(DateTime, default=datetime.utcnow)


# ─────────────────────────────────────────────────────────────────────────────
# Agency-owned review data
# ─────────────────────────────────────────────────────────────────────────────
class QaChart(Base):
    """Chart Log entry (item 4): a chart under QA review. v1 is SYNTHETIC only
    (is_synthetic default True; the review API refuses non-synthetic in v1). May
    reference a normalized ems_incident, but clinical fields the indicators need
    live in chart_data (synthetic/de-identified). No real PHI is stored here."""
    __tablename__ = "qa_charts"
    __table_args__ = (UniqueConstraint("agency_id", "external_ref", name="uq_qa_chart_agency_ref"),)

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    agency_id = Column(UUID(as_uuid=True), ForeignKey("agencies.id", ondelete="CASCADE"),
                       nullable=False, index=True)
    external_ref = Column(String(120), nullable=False, index=True)   # synthetic chart id / workbook row ref
    ems_incident_id = Column(UUID(as_uuid=True), ForeignKey("ems_incidents.id"), nullable=True)

    source = Column(String(30), nullable=False, default="synthetic")  # synthetic | workbook_fixture | ems_incident
    is_synthetic = Column(Boolean, nullable=False, default=True)
    chart_data = Column(JSONB, nullable=False, default=dict)          # operational + synthetic clinical fields
    call_date = Column(DateTime, nullable=True)
    crew_provider_ids = Column(JSONB, nullable=True)                  # crew on this chart (for feedback routing)

    status = Column(String(20), nullable=False, default="pending", index=True)  # pending|in_review|reviewed|approved
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)


class QaReviewSession(Base):
    """A QA review of one chart (item 3). The automated engine creates it
    (status auto_generated); a human reviewer then approves/overrides. The
    automated outputs are immutable; human actions live on the child rows +
    qa_scores.approved_*."""
    __tablename__ = "qa_review_sessions"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    agency_id = Column(UUID(as_uuid=True), ForeignKey("agencies.id", ondelete="CASCADE"),
                       nullable=False, index=True)
    chart_id = Column(UUID(as_uuid=True), ForeignKey("qa_charts.id", ondelete="CASCADE"),
                      nullable=False, index=True)
    scoring_version = Column(String(40), nullable=False, default="unset")

    status = Column(String(24), nullable=False, default="auto_generated", index=True)
    # auto_generated -> pending_human -> approved | overridden
    engine_version = Column(String(40), nullable=True)   # which engine build produced the automated result
    automated_at = Column(DateTime, default=datetime.utcnow)

    # Human review (separate from automated outputs)
    reviewer_user_id = Column(UUID(as_uuid=True), ForeignKey("users.id"), nullable=True)
    approved_at = Column(DateTime, nullable=True)
    review_notes = Column(Text, nullable=True)

    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)


class QaIndicatorReview(Base):
    """Indicator Review (item 5): one applicable indicator's result within a session.

    automated_result = the ORIGINAL deterministic engine output (immutable).
    human_result     = the reviewer's approved/overridden verdict (null until review).
    The engine NEVER writes human_result; approval copies/edits it explicitly."""
    __tablename__ = "qa_indicator_reviews"
    __table_args__ = (
        UniqueConstraint("session_id", "indicator_id", name="uq_qa_indreview_session_indicator"),
    )

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    agency_id = Column(UUID(as_uuid=True), ForeignKey("agencies.id", ondelete="CASCADE"),
                       nullable=False, index=True)
    session_id = Column(UUID(as_uuid=True), ForeignKey("qa_review_sessions.id", ondelete="CASCADE"),
                        nullable=False, index=True)
    indicator_id = Column(UUID(as_uuid=True), ForeignKey("qa_indicators.id"), nullable=False, index=True)
    indicator_number = Column(Integer, nullable=False)   # denormalized for export/regression convenience

    applicable = Column(Boolean, nullable=False, default=True)  # from the applicability engine
    applicability_reason = Column(Text, nullable=True)

    # Immutable automated output: {"verdict":"pass|fail|na","evidence":[...],"detail":{...}}
    automated_result = Column(JSONB, nullable=False, default=dict)
    # Human verdict (null until reviewed): {"verdict":...,"note":...}
    human_result = Column(JSONB, nullable=True)
    overridden = Column(Boolean, nullable=False, default=False)
    override_reason = Column(Text, nullable=True)
    reviewed_by = Column(UUID(as_uuid=True), ForeignKey("users.id"), nullable=True)
    reviewed_at = Column(DateTime, nullable=True)

    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)


class QaFinding(Base):
    """Finding (item 6). A negative/quality finding from a review. Every negative
    AUTOMATED finding MUST include `evidence` (the chart fields/values that triggered
    it) — enforced in the service layer. Human reviewers can accept or dismiss."""
    __tablename__ = "qa_findings"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    agency_id = Column(UUID(as_uuid=True), ForeignKey("agencies.id", ondelete="CASCADE"),
                       nullable=False, index=True)
    session_id = Column(UUID(as_uuid=True), ForeignKey("qa_review_sessions.id", ondelete="CASCADE"),
                        nullable=False, index=True)
    indicator_id = Column(UUID(as_uuid=True), ForeignKey("qa_indicators.id"), nullable=True, index=True)
    indicator_number = Column(Integer, nullable=True)

    finding_type = Column(String(30), nullable=False, default="indicator_fail")
    # indicator_fail | timeline_inconsistency | cross_field | other
    severity = Column(String(20), nullable=True)      # from severity engine v1 (e.g. low|moderate|high|critical)
    description = Column(Text, nullable=False)
    evidence = Column(JSONB, nullable=True)           # REQUIRED for negative automated findings (service-enforced)

    origin = Column(String(16), nullable=False, default="automated")  # automated | human
    status = Column(String(20), nullable=False, default="open")       # open | accepted | dismissed
    dismissed_reason = Column(Text, nullable=True)
    resolved_by = Column(UUID(as_uuid=True), ForeignKey("users.id"), nullable=True)
    resolved_at = Column(DateTime, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)


class QaCrewFeedback(Base):
    """Crew Feedback (item 7). Structured feedback routed to a crew/provider for a
    chart they were on. A `can_receive_reviews` member sees ONLY their own charts'
    feedback (enforced in the service/RLS layer). Non-PHI, synthetic in v1."""
    __tablename__ = "qa_crew_feedback"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    agency_id = Column(UUID(as_uuid=True), ForeignKey("agencies.id", ondelete="CASCADE"),
                       nullable=False, index=True)
    session_id = Column(UUID(as_uuid=True), ForeignKey("qa_review_sessions.id", ondelete="CASCADE"),
                        nullable=False, index=True)
    provider_id = Column(String(100), nullable=False, index=True)   # agency_memberships.provider_id
    summary = Column(Text, nullable=True)
    items = Column(JSONB, nullable=True)        # derived from findings (indicator, severity, note)
    visibility = Column(String(20), nullable=False, default="crew_only")
    created_by = Column(UUID(as_uuid=True), ForeignKey("users.id"), nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)
    acknowledged_at = Column(DateTime, nullable=True)


class QaScore(Base):
    """Deterministic scores for a session (item 9). automated_* = original engine
    scores (immutable); approved_* = recomputed from the human-approved indicator
    results at approval time. Quality Score, Indicator Compliance, Composite Score,
    Tier — computed by application logic from qa_scoring_config, never by AI."""
    __tablename__ = "qa_scores"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    agency_id = Column(UUID(as_uuid=True), ForeignKey("agencies.id", ondelete="CASCADE"),
                       nullable=False, index=True)
    session_id = Column(UUID(as_uuid=True), ForeignKey("qa_review_sessions.id", ondelete="CASCADE"),
                        nullable=False, unique=True, index=True)
    scoring_version = Column(String(40), nullable=False, default="unset")

    # Automated (original) — immutable
    automated_quality_score = Column(Float, nullable=True)
    automated_indicator_compliance = Column(Float, nullable=True)
    automated_composite_score = Column(Float, nullable=True)
    automated_tier = Column(String(40), nullable=True)
    automated_domain_scores = Column(JSONB, nullable=True)   # {domain_slug: score}

    # Approved (post human review) — null until approved
    approved_quality_score = Column(Float, nullable=True)
    approved_indicator_compliance = Column(Float, nullable=True)
    approved_composite_score = Column(Float, nullable=True)
    approved_tier = Column(String(40), nullable=True)
    approved_domain_scores = Column(JSONB, nullable=True)

    computed_at = Column(DateTime, default=datetime.utcnow)
    approved_at = Column(DateTime, nullable=True)


class QaAuditEvent(Base):
    """Human-review audit trail (item 16). Every approve/override/dismiss/export is
    recorded with before/after so the original automated result is always
    reconstructable alongside the human decision. Non-PHI."""
    __tablename__ = "qa_audit_events"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    agency_id = Column(UUID(as_uuid=True), ForeignKey("agencies.id", ondelete="CASCADE"),
                       nullable=False, index=True)
    session_id = Column(UUID(as_uuid=True), ForeignKey("qa_review_sessions.id", ondelete="SET NULL"),
                        nullable=True, index=True)
    actor_user_id = Column(UUID(as_uuid=True), ForeignKey("users.id"), nullable=True)
    action = Column(String(48), nullable=False)   # auto_review_created|indicator_overridden|finding_dismissed|session_approved|export_generated
    before = Column(JSONB, nullable=True)
    after = Column(JSONB, nullable=True)
    detail = Column(JSONB, nullable=True)          # non-PHI
    at = Column(DateTime, default=datetime.utcnow)
