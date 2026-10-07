"""Agency lifecycle / EMSCS trial controls: server-side trial expiration, cost
caps, agency-scoped export, and agency deletion (synthetic tenants only in tests).
"""
import json
from datetime import datetime

from fastapi import HTTPException, status
from sqlalchemy import text
from sqlalchemy.orm import sessionmaker

from ...models import (
    Agency, AgencyMembership, EMSChartsConnection, EMSIncident, ModuleEntitlement,
    Organization, SyncRun,
)
from ...security_rls import set_agency_context

# Per-agency enforceable caps (app-level; AWS Budgets is monitoring, not a hard cap).
MAX_INCIDENTS = 500_000
MAX_RAW_OBJECTS = 10_000
MAX_SYNCS_PER_DAY = 50


def assert_org_active(db, agency_id):
    """Block access when the agency's organization trial has expired (server-side).
    Expired = trial_ends_at in the past while still on a trial plan_status, or an
    explicit non-active status. Raises 402 so the client can show an upgrade path."""
    agency = db.query(Agency).filter(Agency.id == agency_id).first()
    if agency is None or agency.org_id is None:
        return
    org = db.query(Organization).filter(Organization.id == agency.org_id).first()
    if org is None:
        return
    status_val = (org.plan_status or "").lower()
    if status_val in ("suspended", "expired", "trial_expired"):
        raise HTTPException(status.HTTP_402_PAYMENT_REQUIRED, "Organization access is suspended/expired")
    if org.trial_ends_at and datetime.utcnow() > org.trial_ends_at and status_val in ("trialing", "free_trial", "trial"):
        raise HTTPException(status.HTTP_402_PAYMENT_REQUIRED, "Trial period has expired")


def check_caps(db, agency_id):
    """Enforce per-agency resource caps before accepting more work."""
    n = db.query(EMSIncident).filter(EMSIncident.agency_id == agency_id).count()
    if n >= MAX_INCIDENTS:
        raise HTTPException(status.HTTP_429_TOO_MANY_REQUESTS,
                            f"Agency incident cap reached ({MAX_INCIDENTS})")
    today = datetime.utcnow().date()
    syncs_today = (db.query(SyncRun)
                   .filter(SyncRun.agency_id == agency_id,
                           SyncRun.started_at >= datetime(today.year, today.month, today.day))
                   .count())
    if syncs_today >= MAX_SYNCS_PER_DAY:
        raise HTTPException(status.HTTP_429_TOO_MANY_REQUESTS,
                            f"Daily sync cap reached ({MAX_SYNCS_PER_DAY})")


def export_agency(db, agency_id, s3, bucket):
    """Agency-scoped export bundle (agency_scoped; no other tenant's data). Includes
    metadata records + an S3 object manifest for the agency's prefix."""
    set_agency_context(db, agency_id)
    agency = db.query(Agency).filter(Agency.id == agency_id).first()
    org = db.query(Organization).filter(Organization.id == agency.org_id).first() if agency else None
    mems = db.query(AgencyMembership).filter(AgencyMembership.agency_id == agency_id).all()
    ents = db.query(ModuleEntitlement).filter(ModuleEntitlement.org_id == (org.id if org else None)).all()
    conn = db.query(EMSChartsConnection).filter(EMSChartsConnection.agency_id == agency_id).first()
    runs = db.query(SyncRun).filter(SyncRun.agency_id == agency_id).count()
    incidents = db.query(EMSIncident).filter(EMSIncident.agency_id == agency_id).count()

    prefix = f"agencies/{agency_id}/"
    keys = []
    paginator = s3.get_paginator("list_objects_v2")
    for page in paginator.paginate(Bucket=bucket, Prefix=prefix):
        keys.extend(o["Key"] for o in (page.get("Contents", []) or []))

    return {
        "exported_at": datetime.utcnow().isoformat(),
        "agency": {"id": str(agency.id), "name": agency.agency_name, "slug": agency.slug} if agency else None,
        "organization": {"id": str(org.id), "slug": org.slug, "plan_status": org.plan_status} if org else None,
        "memberships": [{"user_id": str(m.user_id), "is_agency_admin": m.is_agency_admin,
                         "can_review": m.can_review, "can_receive_reviews": m.can_receive_reviews} for m in mems],
        "entitlements": [e.module for e in ents if e.enabled],
        "emscharts_connection": {"ems_sync_enabled": conn.ems_sync_enabled,
                                 "s3_raw_prefix": conn.s3_raw_prefix} if conn else None,
        "counts": {"incidents": incidents, "sync_runs": runs, "s3_objects": len(keys)},
        "s3_manifest": keys,
    }


def delete_agency(engine, agency_id, s3, bucket, deleted_by=None):
    """Delete an agency and ALL its data (DB + S3). Runs via the master/owner engine
    (RLS-exempt) so cross-table cleanup is reliable. Authorization is at the API
    (platform-admin + explicit confirm). SYNTHETIC tenants only in tests — never SBES."""
    deleted = {}
    with engine.begin() as conn:
        for table in ("ems_analytics_snapshots", "ems_incidents", "sync_runs",
                      "emscharts_connections", "agency_files", "audit_logs", "pipeline_runs",
                      "agency_memberships"):
            r = conn.execute(text(f"DELETE FROM {table} WHERE agency_id = :a"), {"a": agency_id})  # {table} from fixed allowlist, not user input  # nosec B608
            deleted[table] = r.rowcount
        r = conn.execute(text("DELETE FROM agencies WHERE id = :a"), {"a": agency_id})
        deleted["agencies"] = r.rowcount

    # S3: delete every object under the agency prefix.
    prefix = f"agencies/{agency_id}/"
    s3_deleted = 0
    paginator = s3.get_paginator("list_objects_v2")
    for page in paginator.paginate(Bucket=bucket, Prefix=prefix):
        objs = [{"Key": o["Key"]} for o in (page.get("Contents", []) or [])]
        if objs:
            s3.delete_objects(Bucket=bucket, Delete={"Objects": objs})
            s3_deleted += len(objs)
    deleted["s3_objects"] = s3_deleted
    # Platform-level deletion audit (agency_id NULL so it survives the deletion).
    with engine.begin() as conn:
        conn.execute(text(
            "INSERT INTO audit_logs (id, agency_id, user_id, action, resource_type, resource_id, details, created_at) "
            "VALUES (gen_random_uuid(), NULL, :u, 'agency_deleted', 'agency', :rid, CAST(:d AS json), NOW())"),
            {"u": (str(deleted_by) if deleted_by else None), "rid": str(agency_id), "d": json.dumps(deleted)})
    return deleted
