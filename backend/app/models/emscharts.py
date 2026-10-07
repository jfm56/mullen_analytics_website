"""EMSCharts (ZOLL) ingestion model — agency-owned, per docs/emscharts-integration.md.

Tenancy: organization -> agency -> emscharts_connection / ems_incidents (agency_id
is the authoritative owner; RLS-enforced like the rest of the unified platform).
PHI minimization: the normalized `ems_incidents` model carries OPERATIONAL fields
only (times, unit, scene geo, disposition, call type) — never patient identifiers.
The raw NEMSIS (which may contain PHI) stays only in the KMS-encrypted, agency-
scoped RAW S3 prefix. `sync_runs` reconciliation is non-PHI by construction.
"""
from datetime import datetime
import uuid

from sqlalchemy import (
    Boolean, Column, DateTime, Float, ForeignKey, Integer, String, Text, UniqueConstraint,
)
from sqlalchemy.dialects.postgresql import JSONB, UUID

from ..database import Base


class EMSChartsConnection(Base):
    """Per-AGENCY EMSCharts connection + sync controls. Owned by the agency, not a
    user — changing/removing the configuring admin never changes ownership.
    No secret is stored here; `secret_ref` names an AWS Secrets Manager entry."""
    __tablename__ = "emscharts_connections"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    agency_id = Column(UUID(as_uuid=True), ForeignKey("agencies.id", ondelete="CASCADE"),
                       nullable=False, unique=True, index=True)

    source_system = Column(String(50), nullable=False, default="zoll_emscharts")  # zoll_emscharts | manual_upload | eso
    delivery_method = Column(String(30), nullable=False, default="manual")        # sftp_push | manual
    sftp_username = Column(String(120), nullable=True)                            # per-agency SFTP user we issue
    s3_raw_prefix = Column(String(300), nullable=True)                            # agencies/<id>/emscharts/raw/
    nemsis_version = Column(String(10), nullable=True)                            # e.g. 3.5.0
    secret_ref = Column(String(200), nullable=True)                              # Secrets Manager name — NEVER the secret

    # Sync controls (default OFF — EMSCS trials never auto-enable).
    ems_sync_enabled = Column(Boolean, nullable=False, default=False)
    ems_sync_mode = Column(String(20), nullable=False, default="off")             # off | manual | scheduled_monthly
    last_successful_sync = Column(DateTime, nullable=True)
    last_attempted_sync = Column(DateTime, nullable=True)
    next_scheduled_sync = Column(DateTime, nullable=True)
    sync_status = Column(String(20), nullable=False, default="idle")              # idle | running | succeeded | failed | partial
    sync_error = Column(Text, nullable=True)                                     # non-PHI message only

    created_by = Column(UUID(as_uuid=True), ForeignKey("users.id"), nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)


class SyncRun(Base):
    """Non-PHI operational reconciliation for one ingestion run."""
    __tablename__ = "sync_runs"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    agency_id = Column(UUID(as_uuid=True), ForeignKey("agencies.id", ondelete="CASCADE"),
                       nullable=False, index=True)
    connection_id = Column(UUID(as_uuid=True), ForeignKey("emscharts_connections.id"), nullable=True)

    source_system = Column(String(50), nullable=True)
    trigger = Column(String(20), nullable=True)            # scheduled | manual
    triggered_by = Column(UUID(as_uuid=True), ForeignKey("users.id"), nullable=True)
    requested_period_start = Column(DateTime, nullable=True)
    requested_period_end = Column(DateTime, nullable=True)
    started_at = Column(DateTime, default=datetime.utcnow)
    ended_at = Column(DateTime, nullable=True)

    files_received = Column(Integer, default=0)
    records_received = Column(Integer, default=0)
    inserted = Column(Integer, default=0)
    updated = Column(Integer, default=0)
    unchanged = Column(Integer, default=0)
    rejected = Column(Integer, default=0)
    duplicates = Column(Integer, default=0)
    validation_failures = Column(Integer, default=0)

    final_status = Column(String(20), nullable=False, default="running")  # running | succeeded | failed | partial
    error = Column(Text, nullable=True)  # non-PHI


class EMSIncident(Base):
    """Normalized, agency-owned EMS incident/unit-response (OPERATIONAL fields only —
    no PHI). Deduped/upserted on (agency_id, source_record_id)."""
    __tablename__ = "ems_incidents"
    __table_args__ = (UniqueConstraint("agency_id", "source_record_id", name="uq_ems_incident_agency_source"),)

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    agency_id = Column(UUID(as_uuid=True), ForeignKey("agencies.id", ondelete="CASCADE"),
                       nullable=False, index=True)

    # Lineage / dedup
    source_record_id = Column(String(120), nullable=False, index=True)  # NEMSIS eRecord.01 PCR id
    response_number = Column(String(120), nullable=True)                # eResponse.03
    # Incident/CAD number that links multiple unit-responses to one incident (for
    # first-arriving-unit analysis). The exact NEMSIS source element is export-
    # specific and must be confirmed per agency (like the SFTP details); null => the
    # record is treated as its own single-unit incident.
    incident_number = Column(String(120), nullable=True, index=True)
    source_object_key = Column(String(400), nullable=True)              # RAW S3 key
    sync_run_id = Column(UUID(as_uuid=True), ForeignKey("sync_runs.id"), nullable=True)
    content_hash = Column(String(64), nullable=True)                    # change detection

    # Operational timestamps (NEMSIS eTimes)
    psap_call_at = Column(DateTime, nullable=True)        # eTimes.01
    unit_notified_at = Column(DateTime, nullable=True)    # eTimes.03
    enroute_at = Column(DateTime, nullable=True)          # eTimes.05
    arrived_scene_at = Column(DateTime, nullable=True)    # eTimes.06
    arrived_patient_at = Column(DateTime, nullable=True)  # eTimes.07
    left_scene_at = Column(DateTime, nullable=True)       # eTimes.09
    arrived_dest_at = Column(DateTime, nullable=True)     # eTimes.11
    back_in_service_at = Column(DateTime, nullable=True)  # eTimes.13

    # Operational dimensions
    unit_id = Column(String(60), nullable=True)
    scene_lat = Column(Float, nullable=True)              # eScene.17
    scene_lng = Column(Float, nullable=True)              # eScene.18
    disposition = Column(String(80), nullable=True)
    call_type = Column(String(30), nullable=True)         # emergency | ift | other

    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)


class EMSAnalyticsSnapshot(Base):
    """Agency analytics snapshot for the atomic stage->validate->swap refresh.
    Exactly one row per agency is `status='live'`; the dashboard reads only the
    live snapshot, so a failed/partial refresh never exposes partial data — the
    previous live snapshot stays active until a new one is validated and swapped in."""
    __tablename__ = "ems_analytics_snapshots"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    agency_id = Column(UUID(as_uuid=True), ForeignKey("agencies.id", ondelete="CASCADE"),
                       nullable=False, index=True)
    status = Column(String(20), nullable=False, default="staged", index=True)  # staged | live | superseded
    metrics_json = Column(JSONB, nullable=False, default=dict)
    sync_run_id = Column(UUID(as_uuid=True), ForeignKey("sync_runs.id"), nullable=True)
    computed_at = Column(DateTime, default=datetime.utcnow)
