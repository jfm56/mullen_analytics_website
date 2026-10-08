"""EMSCharts ingestion API: authorized manual upload + Sync Now. Both call the
SAME pipeline (docs/emscharts-integration.md). Server-side authorization only —
the path agency_id is never trusted on its own.

MFA note: a valid Cognito ID token already implies a completed MFA challenge —
the staging pool is MfaConfiguration=ON, so no token is issued without MFA
(verified: password-only auth is denied). get_auth therefore enforces the
"MFA-complete session" requirement.
"""
import hashlib
import os
from datetime import datetime
from uuid import UUID, uuid4

import boto3
from fastapi import APIRouter, Depends, File, HTTPException, Request, UploadFile, status
from sqlalchemy.orm import Session as DBSession

from ..auth import AuthContext, get_auth
from ..config import get_settings
from ..database import get_db
from ..models import (
    Agency, AgencyMembership, AuditLog, EMSChartsConnection, ModuleEntitlement,
)
from ..security_rls import set_agency_context
from ..services.emscharts.lifecycle import (
    assert_org_active, check_caps, delete_agency, export_agency,
)
from ..services.emscharts.pipeline import SyncAlreadyRunning, live_dashboard, refresh_analytics, run_sync
from ..services.jobs import JobConfigurationError, JobEnqueueError, enqueue

router = APIRouter(prefix="/v1", tags=["emscharts"])
settings = get_settings()

ALLOWED_EXT = {".xml", ".csv"}
MAX_UPLOAD_BYTES = 25 * 1024 * 1024  # 25 MB


def _s3():
    return boto3.client("s3", region_name=settings.aws_region or "us-east-2")


def _raw_prefix(agency_id) -> str:
    return f"agencies/{agency_id}/emscharts/raw/"


def _audit(db: DBSession, agency_id, user_id, action, success, details=None, resource_id=None, ip=None):
    """Write a NON-PHI audit event (counts/status/ids only — never PHI/JWT/creds/chart text).
    Sets the agency RLS context so the write (audit_logs is RLS-enforced) is scoped to
    the target agency — including on denial paths, where it records the attempt."""
    try:
        set_agency_context(db, agency_id)
        db.add(AuditLog(
            agency_id=agency_id, user_id=user_id, action=action,
            resource_type="emscharts", resource_id=(str(resource_id) if resource_id else None),
            ip_address=ip, details={"success": success, **(details or {})},
        ))
        db.commit()
    except Exception:  # noqa: BLE001 - auditing must never break the request
        db.rollback()


def require_sync_access(
    agency_id: UUID,
    request: Request,
    ctx: AuthContext = Depends(get_auth),
    db: DBSession = Depends(get_db),
):
    """All server-side checks for EMSCharts sync/upload, with denial auditing:
    Cognito+MFA (get_auth) -> membership -> agency-admin|platform-admin ->
    analytics entitlement -> ems_sync_enabled (trial gate). Returns (ctx, connection)."""
    uid = ctx.user.id
    ip = request.client.host if request.client else None

    def deny(reason, code=status.HTTP_403_FORBIDDEN):
        _audit(db, agency_id, uid, "emscharts_access_denied", False, {"reason": reason}, ip=ip)
        raise HTTPException(code, reason)

    # membership + agency-admin (platform admin gets the explicit privileged path)
    if ctx.is_platform_admin:
        set_agency_context(db, agency_id)
    else:
        membership = (
            db.query(AgencyMembership)
            .filter(AgencyMembership.agency_id == agency_id, AgencyMembership.user_id == uid)
            .first()
        )
        if membership is None:
            deny("Not a member of this agency")
        if not membership.is_agency_admin:
            deny("Agency admin or platform admin required")
        set_agency_context(db, agency_id)  # only after verifying membership

    # analytics entitlement (org-level)
    agency = db.query(Agency).filter(Agency.id == agency_id).first()
    if agency is None or agency.org_id is None:
        deny("Agency is not provisioned")
    if not ctx.is_platform_admin:
        ent = (
            db.query(ModuleEntitlement)
            .filter(ModuleEntitlement.org_id == agency.org_id,
                    ModuleEntitlement.module == "analytics",
                    ModuleEntitlement.enabled.is_(True))
            .first()
        )
        if ent is None:
            deny("Module not enabled: analytics")

    # trial gate — default-off; must be explicitly enabled
    conn = db.query(EMSChartsConnection).filter(EMSChartsConnection.agency_id == agency_id).first()
    if conn is None or not conn.ems_sync_enabled:
        deny("EMSCharts sync is not enabled for this agency")
    if conn.sync_status in ("queued", "running"):
        deny("An EMSCharts sync is already in progress for this agency", status.HTTP_409_CONFLICT)
    # Trial expiration (non-platform-admin) + per-agency resource caps.
    try:
        if not ctx.is_platform_admin:
            assert_org_active(db, agency_id)
        check_caps(db, agency_id)
    except HTTPException as e:
        deny(e.detail, e.status_code)
    return ctx, conn


def _finish(db, agency_id, conn_id, run):
    """Update connection sync state (agency-scoped) after a run."""
    set_agency_context(db, agency_id)
    conn = db.query(EMSChartsConnection).filter(EMSChartsConnection.id == conn_id).first()
    if conn is not None:
        now = datetime.utcnow()
        conn.last_attempted_sync = now
        conn.sync_status = run["final_status"]
        conn.sync_error = None if run["final_status"] != "failed" else "see sync_runs"
        # A partial run may contain malformed/unmapped objects. Do not advance
        # the incremental watermark or those objects would be skipped forever.
        if run["final_status"] == "succeeded":
            conn.last_successful_sync = now
        db.commit()


def _sync_job_payload(agency_id, conn_id, raw_prefix, since, user_id, ip):
    return {
        "agency_id": str(agency_id),
        "connection_id": str(conn_id),
        "raw_prefix": raw_prefix,
        "since": since.isoformat() if since else None,
        "triggered_by": str(user_id),
        "ip": ip,
    }


@router.post("/agencies/{agency_id}/emscharts/sync")
def sync_now(
    agency_id: UUID,
    request: Request,
    access=Depends(require_sync_access),
    db: DBSession = Depends(get_db),
):
    """Sync Now = process this agency's authorized UNPROCESSED raw files already
    present (incremental since last success). It does NOT pull from emsCharts."""
    ctx, conn = access
    # Capture connection values BEFORE run_sync (its commits expire the ORM object,
    # and the post-commit transaction has no agency context so RLS would hide it).
    conn_id = conn.id
    raw_prefix = conn.s3_raw_prefix or _raw_prefix(agency_id)
    since = conn.last_successful_sync
    user_id = ctx.user.id
    ip = request.client.host if request.client else None
    if settings.job_backend.lower() == "sqs":
        try:
            queued = enqueue(
                "emscharts_sync",
                _sync_job_payload(agency_id, conn_id, raw_prefix, since, user_id, ip),
            )
            conn.sync_status = "queued"
            conn.last_attempted_sync = datetime.utcnow()
            db.commit()
            _audit(db, agency_id, user_id, "emscharts_sync_queued", True,
                   {"message_id": queued.get("message_id")}, ip=ip)
            return {"queued": True, "backend": "sqs", "message_id": queued.get("message_id")}
        except (JobConfigurationError, JobEnqueueError) as exc:
            raise HTTPException(status_code=503, detail="EMSCharts worker is not available") from exc
    try:
        run = run_sync(db, agency_id, _s3(), settings.aws_s3_bucket, raw_prefix,
                       since=since, trigger="manual", triggered_by=user_id, connection_id=conn_id)
    except SyncAlreadyRunning as exc:
        raise HTTPException(status_code=409, detail="An EMSCharts sync is already running for this agency") from exc
    _finish(db, agency_id, conn_id, run)
    # Atomic analytics refresh only on a usable run; a failed/invalid refresh keeps
    # the last known-good dashboard.
    refresh = {"swapped": False, "reason": "run not successful"}
    if run["final_status"] in ("succeeded", "partial"):
        refresh = refresh_analytics(db, agency_id, sync_run_id=run["sync_run_id"])
    _audit(db, agency_id, user_id, "emscharts_sync_now", True,
           {**{k: run[k] for k in ("final_status", "files_received", "records_received",
                                   "inserted", "updated", "unchanged", "rejected",
                                   "duplicates", "validation_failures")},
            "analytics_swapped": refresh.get("swapped")},
           resource_id=run["sync_run_id"], ip=ip)
    return {**run, "analytics_refresh": refresh}


@router.post("/agencies/{agency_id}/emscharts/upload")
async def upload(
    agency_id: UUID,
    request: Request,
    file: UploadFile = File(...),
    access=Depends(require_sync_access),
    db: DBSession = Depends(get_db),
):
    """Authorized manual NEMSIS/CSV upload -> validated -> KMS-encrypted RAW S3
    (unique key, never overwritten) -> same pipeline. Synthetic files only."""
    ctx, conn = access
    uid = ctx.user.id
    conn_id = conn.id
    prefix = conn.s3_raw_prefix or _raw_prefix(agency_id)
    ip = request.client.host if request.client else None

    def reject(reason, code=status.HTTP_400_BAD_REQUEST):
        _audit(db, agency_id, uid, "emscharts_upload_rejected", False, {"reason": reason}, ip=ip)
        raise HTTPException(code, reason)

    ext = os.path.splitext(file.filename or "")[1].lower()
    if ext not in ALLOWED_EXT:
        reject(f"Unsupported file type: {ext or 'none'} (allowed: .xml, .csv)")
    data = await file.read(MAX_UPLOAD_BYTES + 1)
    if len(data) == 0:
        reject("Empty file")
    if len(data) > MAX_UPLOAD_BYTES:
        reject("File exceeds the 25 MB limit", code=status.HTTP_413_REQUEST_ENTITY_TOO_LARGE)
    if ext == ".xml":
        import xml.etree.ElementTree as ET
        from defusedxml.ElementTree import fromstring as _safe
        from defusedxml.common import DefusedXmlException
        try:
            _safe(data)  # reject malformed OR unsafe (XXE/entity-expansion) XML before RAW
        except (ET.ParseError, DefusedXmlException):
            reject("Malformed or unsafe XML")

    sha = hashlib.sha256(data).hexdigest()
    safe_name = os.path.basename(file.filename or "upload").replace("/", "_").replace("\\", "_")
    key = f"{prefix}{datetime.utcnow():%Y%m%dT%H%M%S}-{sha[:12]}-{uuid4().hex[:8]}-{safe_name}"

    s3 = _s3()
    # Never overwrite an existing raw object.
    try:
        s3.head_object(Bucket=settings.aws_s3_bucket, Key=key)
        reject("Raw object path already exists", code=status.HTTP_409_CONFLICT)
    except s3.exceptions.ClientError as exc:
        # A missing object is the only expected exception. Do not turn missing
        # permissions, a disabled bucket, or an AWS outage into a false
        # "available" result before attempting the write.
        error_code = str(exc.response.get("Error", {}).get("Code", ""))
        if error_code not in {"404", "NoSuchKey", "NotFound"}:
            raise HTTPException(
                status_code=status.HTTP_502_BAD_GATEWAY,
                detail="Unable to verify raw object storage",
            ) from exc

    encryption = {"ServerSideEncryption": "aws:kms"}
    if settings.aws_kms_key_id:
        encryption["SSEKMSKeyId"] = settings.aws_kms_key_id
    s3.put_object(
        Bucket=settings.aws_s3_bucket,
        Key=key,
        Body=data,
        ContentType="application/octet-stream",
        **encryption,
    )

    if settings.job_backend.lower() == "sqs":
        try:
            queued = enqueue(
                "emscharts_sync",
                _sync_job_payload(agency_id, conn_id, prefix, None, uid, ip),
            )
            conn.sync_status = "queued"
            conn.last_attempted_sync = datetime.utcnow()
            db.commit()
            _audit(db, agency_id, uid, "emscharts_upload_queued", True,
                   {"raw_key": key, "bytes": len(data), "sha256": sha,
                    "message_id": queued.get("message_id")}, ip=ip)
            return {"ok": True, "queued": True, "backend": "sqs", "raw_key": key,
                    "bytes": len(data), "sha256": sha, "message_id": queued.get("message_id")}
        except (JobConfigurationError, JobEnqueueError) as exc:
            raise HTTPException(status_code=503, detail="EMSCharts worker is not available") from exc

    # Process via the SAME pipeline (so the upload is validated + normalized + reconciled).
    try:
        run = run_sync(db, agency_id, s3, settings.aws_s3_bucket, prefix,
                       since=None, trigger="manual", triggered_by=uid, connection_id=conn_id)
    except SyncAlreadyRunning as exc:
        raise HTTPException(status_code=409, detail="An EMSCharts sync is already running for this agency") from exc
    _finish(db, agency_id, conn_id, run)
    refresh = {"swapped": False, "reason": "run not successful"}
    if run["final_status"] in ("succeeded", "partial"):
        refresh = refresh_analytics(db, agency_id, sync_run_id=run["sync_run_id"])
    _audit(db, agency_id, uid, "emscharts_upload", True,
           {"raw_key": key, "bytes": len(data), "sha256": sha, "sync_run_id": run["sync_run_id"],
            "final_status": run["final_status"], "inserted": run["inserted"],
            "unchanged": run["unchanged"], "validation_failures": run["validation_failures"],
            "analytics_swapped": refresh.get("swapped")},
           resource_id=run["sync_run_id"], ip=ip)
    return {"ok": True, "raw_key": key, "bytes": len(data), "sha256": sha,
            "run": run, "analytics_refresh": refresh}


@router.get("/agencies/{agency_id}/emscharts/dashboard")
def dashboard(
    agency_id: UUID,
    request: Request,
    access=Depends(require_sync_access),
    db: DBSession = Depends(get_db),
):
    """Return the current LIVE analytics snapshot (never a partially-processed one)."""
    ctx, _conn = access
    snap = live_dashboard(db, agency_id)
    return {"agency_id": str(agency_id), "live": snap}


def require_admin_access(
    agency_id: UUID,
    request: Request,
    ctx: AuthContext = Depends(get_auth),
    db: DBSession = Depends(get_db),
):
    """Agency-admin or platform-admin + trial-active (no sync-enabled requirement)."""
    uid = ctx.user.id
    ip = request.client.host if request.client else None

    def deny(reason, code=status.HTTP_403_FORBIDDEN):
        _audit(db, agency_id, uid, "emscharts_admin_denied", False, {"reason": reason}, ip=ip)
        raise HTTPException(code, reason)

    if ctx.is_platform_admin:
        set_agency_context(db, agency_id)
    else:
        m = (db.query(AgencyMembership)
             .filter(AgencyMembership.agency_id == agency_id, AgencyMembership.user_id == uid).first())
        if m is None:
            deny("Not a member of this agency")
        if not m.is_agency_admin:
            deny("Agency admin required")
        set_agency_context(db, agency_id)
        try:
            assert_org_active(db, agency_id)
        except HTTPException as e:
            deny(e.detail, e.status_code)
    return ctx


@router.get("/agencies/{agency_id}/export")
def export(agency_id: UUID, request: Request, ctx: AuthContext = Depends(require_admin_access),
           db: DBSession = Depends(get_db)):
    """Agency-scoped export bundle (DB metadata + S3 object manifest for this agency only)."""
    bundle = export_agency(db, agency_id, _s3(), settings.aws_s3_bucket)
    _audit(db, agency_id, ctx.user.id, "emscharts_export", True, {"counts": bundle["counts"]},
           ip=(request.client.host if request.client else None))
    return bundle


@router.delete("/agencies/{agency_id}")
def delete_agency_endpoint(agency_id: UUID, request: Request, confirm: str = "",
                           ctx: AuthContext = Depends(get_auth), db: DBSession = Depends(get_db)):
    """Delete an agency and ALL its data (DB + S3). Platform-admin ONLY + explicit
    confirm (?confirm=<agency_id>). SYNTHETIC tenants only — never SBES."""
    ip = request.client.host if request.client else None
    if not ctx.is_platform_admin:
        _audit(db, agency_id, ctx.user.id, "agency_delete_denied", False, {"reason": "not platform admin"}, ip=ip)
        raise HTTPException(status.HTTP_403_FORBIDDEN, "Platform admin only")
    if confirm != str(agency_id):
        raise HTTPException(status.HTTP_400_BAD_REQUEST, "Confirm by passing ?confirm=<agency_id>")
    from ..database import admin_engine
    deleted = delete_agency(admin_engine, str(agency_id), _s3(), settings.aws_s3_bucket, deleted_by=ctx.user.id)
    return {"ok": True, "deleted": deleted}
