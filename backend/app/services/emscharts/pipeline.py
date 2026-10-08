"""EMSCharts ingestion pipeline: RAW (S3 NEMSIS) -> VALIDATE -> NORMALIZE ->
upsert (dedup) -> reconciliation; plus analytics metrics over normalized incidents.

Idempotent: incidents are keyed on (agency_id, source_record_id); re-running the
same data never duplicates. A failure marks the run failed and leaves previously
ingested incidents intact (upserts are additive/idempotent; analytics are only
recomputed on success by the caller). Runs agency-scoped (RLS) even as a job.
"""
import csv
import xml.etree.ElementTree as ET
from datetime import datetime

from sqlalchemy.orm import Session as DBSession
from sqlalchemy.exc import IntegrityError

from ...models import EMSAnalyticsSnapshot, EMSIncident, SyncRun
from ...security_rls import set_agency_context
from .nemsis import parse_csv_records, parse_records, validate

_INCIDENT_FIELDS = (
    "source_record_id", "response_number", "incident_number", "unit_id", "disposition", "call_type",
    "scene_lat", "scene_lng", "content_hash",
    "psap_call_at", "unit_notified_at", "enroute_at", "arrived_scene_at",
    "arrived_patient_at", "left_scene_at", "arrived_dest_at", "back_in_service_at",
)


class SyncAlreadyRunning(RuntimeError):
    """Raised when the agency-level active-sync invariant rejects a second run."""


def run_sync(db: DBSession, agency_id, s3, bucket, raw_prefix,
             since=None, trigger="manual", triggered_by=None, connection_id=None,
             raise_on_error=False):
    """Process RAW NEMSIS objects under raw_prefix for one agency. `since` (datetime)
    processes only objects modified after it (incremental). Returns the SyncRun."""
    set_agency_context(db, agency_id)  # agency-scoped even as a background job
    run = SyncRun(agency_id=agency_id, connection_id=connection_id, source_system="zoll_emscharts",
                  trigger=trigger, triggered_by=triggered_by, started_at=datetime.utcnow(),
                  final_status="running")
    db.add(run)
    try:
        db.flush()
        run_id = run.id  # capture BEFORE commit (RLS + expire_on_commit would hide it after)
        db.commit()      # record the run durably so a later failure still leaves evidence
    except IntegrityError:
        db.rollback()
        raise SyncAlreadyRunning(f"A sync is already running for agency {agency_id}") from None

    c = dict(files_received=0, records_received=0, inserted=0, updated=0, unchanged=0,
             rejected=0, duplicates=0, validation_failures=0)
    seen = set()
    existing_cache = {}
    status = "running"
    try:
        set_agency_context(db, agency_id)  # fresh transaction for the processing work
        paginator = s3.get_paginator("list_objects_v2")
        for page in paginator.paginate(Bucket=bucket, Prefix=raw_prefix):
            for obj in page.get("Contents", []) or []:
                key = obj["Key"]
                if key.endswith("/"):
                    continue
                if since is not None and obj.get("LastModified") is not None:
                    lm = obj["LastModified"].replace(tzinfo=None)
                    if lm <= since:
                        continue
                c["files_received"] += 1
                body = s3.get_object(Bucket=bucket, Key=key)["Body"].read()
                try:
                    # Scheduled exports can be XML NEMSIS or a normalized CSV.
                    # Select by payload signature; extension alone is not a
                    # trustworthy content-type signal in an S3 raw prefix.
                    records = (
                        parse_records(body)
                        if body.lstrip().startswith(b"<")
                        else parse_csv_records(body)
                    )
                except (ET.ParseError, csv.Error, UnicodeDecodeError, ValueError):
                    c["validation_failures"] += 1  # whole file malformed
                    continue
                valid_records = []
                for rec in records:
                    c["records_received"] += 1
                    if rec.get("_error"):
                        c["rejected"] += 1
                        continue
                    if not validate(rec):
                        c["validation_failures"] += 1
                        continue
                    rid = rec["source_record_id"]
                    if rid in seen:
                        c["duplicates"] += 1  # duplicate within this run
                        continue
                    seen.add(rid)
                    valid_records.append(rec)

                # Avoid one database round-trip per record. The cache also
                # makes repeated records across monthly resend files cheap.
                missing_ids = {
                    rec["source_record_id"] for rec in valid_records
                    if rec["source_record_id"] not in existing_cache
                }
                if missing_ids:
                    existing_rows = (
                        db.query(EMSIncident)
                        .filter(EMSIncident.agency_id == agency_id,
                                EMSIncident.source_record_id.in_(missing_ids))
                        .all()
                    )
                    existing_cache.update({r.source_record_id: r for r in existing_rows})
                    existing_cache.update({rid: None for rid in missing_ids if rid not in existing_cache})

                for rec in valid_records:
                    rid = rec["source_record_id"]
                    existing = existing_cache[rid]
                    vals = {k: rec.get(k) for k in _INCIDENT_FIELDS}
                    if existing is None:
                        existing = EMSIncident(agency_id=agency_id, source_object_key=key,
                                               sync_run_id=run_id, **vals)
                        db.add(existing)
                        existing_cache[rid] = existing
                        c["inserted"] += 1
                    elif existing.content_hash != rec["content_hash"]:
                        for k, v in vals.items():
                            setattr(existing, k, v)
                        existing.source_object_key = key
                        existing.sync_run_id = run.id
                        c["updated"] += 1
                    else:
                        c["unchanged"] += 1

        clean = c["validation_failures"] == 0 and c["rejected"] == 0
        status = "succeeded" if clean else "partial"
        # Bulk UPDATE (no ORM re-access; RLS-checked against the agency context) so
        # incident inserts + the run's reconciliation commit together atomically.
        db.query(SyncRun).filter(SyncRun.id == run_id).update(
            {**c, "final_status": status, "ended_at": datetime.utcnow()})
        db.commit()
    except Exception as exc:  # noqa: BLE001 - never leave a run dangling
        db.rollback()  # undo this run's partial incident inserts (previous data intact)
        set_agency_context(db, agency_id)
        status = "failed"
        db.query(SyncRun).filter(SyncRun.id == run_id).update(
            {**c, "final_status": "failed", "error": str(exc)[:500], "ended_at": datetime.utcnow()})
        db.commit()
        if raise_on_error:
            raise
    return {"sync_run_id": str(run_id), "final_status": status, **c}


def _valid_metrics(m) -> bool:
    """Sanity-validate computed metrics before they can become the live dashboard."""
    if m is None:
        return False
    cv = m.get("call_volume")
    if cv is None or cv < 0:
        return False
    if m.get("emergency", 0) + m.get("ift", 0) + m.get("other", 0) != cv:
        return False
    if (m.get("n_with_response") or 0) > cv:
        return False
    for k in ("turnout_min_avg", "travel_min_avg", "response_min_avg"):
        v = m.get(k)
        if v is not None and v < 0:
            return False
    return True


def refresh_analytics(db, agency_id, sync_run_id=None):
    """Atomic stage -> validate -> swap. Compute metrics into a NEW 'staged'
    snapshot; only if valid, atomically demote the current 'live' to 'superseded'
    and promote the staged one to 'live'. A failed/invalid refresh leaves the
    previous live snapshot active (dashboard never shows partial data)."""
    from .analytics import compute_metrics_v2
    set_agency_context(db, agency_id)
    try:
        metrics = compute_metrics_v2(db, agency_id)
    except Exception as exc:  # noqa: BLE001
        return {"swapped": False, "reason": f"compute failed: {type(exc).__name__}"}
    if not _valid_metrics(metrics):
        return {"swapped": False, "reason": "validation failed"}

    set_agency_context(db, agency_id)
    staged = EMSAnalyticsSnapshot(agency_id=agency_id, status="staged",
                                  metrics_json=metrics, sync_run_id=sync_run_id,
                                  computed_at=datetime.utcnow())
    db.add(staged)
    db.flush()
    staged_id = staged.id
    try:
        # One transaction: demote the old live, promote the staged -> atomic swap.
        db.query(EMSAnalyticsSnapshot).filter(
            EMSAnalyticsSnapshot.agency_id == agency_id,
            EMSAnalyticsSnapshot.status == "live").update({"status": "superseded"})
        db.query(EMSAnalyticsSnapshot).filter(
            EMSAnalyticsSnapshot.id == staged_id).update({"status": "live"})
        db.commit()
    except Exception as exc:  # noqa: BLE001
        db.rollback()  # staged row discarded; previous live stays active
        return {"swapped": False, "reason": f"swap failed: {type(exc).__name__}"}
    return {"swapped": True, "snapshot_id": str(staged_id), "metrics": metrics}


def live_dashboard(db, agency_id):
    """Return the current LIVE analytics snapshot for the agency (or None)."""
    set_agency_context(db, agency_id)
    row = (db.query(EMSAnalyticsSnapshot)
           .filter(EMSAnalyticsSnapshot.agency_id == agency_id,
                   EMSAnalyticsSnapshot.status == "live")
           .order_by(EMSAnalyticsSnapshot.computed_at.desc())
           .first())
    if row is None:
        return None
    return {"snapshot_id": str(row.id), "computed_at": row.computed_at.isoformat() if row.computed_at else None,
            "metrics": row.metrics_json}
