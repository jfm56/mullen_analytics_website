"""
emsCharts scheduled-export ingest webhook.

emsCharts' report scheduler (Delivery Method = HTTP(S)) POSTs a CSV export to
this endpoint. We authenticate with HTTP Basic (the Username/Password entered in
the emsCharts form), store the file as an SBEMS DataUpload, then run the SAME
cleaning + dashboard-metrics pipeline the manual portal upload uses — so the
Combined dashboard pools the new data automatically, with the occurrence-indexed
cross-file dedup handling overlapping monthly re-sends.

Cleaning runs in a background task so the HTTP response is fast: emsCharts gets an
immediate 200 and never times out (which would make it re-send). The cleaned data
is persisted to Postgres (DataCleaningResult.cleaned_data_gz), so the dashboard
survives Railway redeploys even though the raw file lives on ephemeral disk.

Config (environment variables — set on Railway):
  EMSCHARTS_INGEST_USER       Basic-auth username emsCharts will send
  EMSCHARTS_INGEST_PASSWORD   Basic-auth password emsCharts will send
  EMSCHARTS_SBEMS_CLIENT_ID   UUID of the SBEMS client (a users.id) to attach uploads to
  ADMIN_EMAIL / CONTACT_EMAIL  where ingest-failure alerts go (fallback jmullen@mullenanalytics.com)

emsCharts form -> Delivery Method: HTTP(S); Server Name: <railway host>; Port: 443;
Username/Password: the two creds above; File Path: /api/emscharts/ingest
"""
import asyncio
import gzip
import logging
import os
import re
import secrets
import uuid as uuid_lib
from datetime import datetime
from pathlib import Path
from typing import Optional, Tuple

from fastapi import APIRouter, BackgroundTasks, Depends, HTTPException, Request
from fastapi.security import HTTPBasic, HTTPBasicCredentials

from ..config import get_settings
from ..database import SessionLocal
from ..models.data_upload import DataCleaningResult, DataUpload, EMSDashboardMetrics
from ..models.user import User
from ..services.email import send_email
from ..services.jobs import JobConfigurationError, JobEnqueueError, enqueue

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/emscharts", tags=["emscharts-ingest"])
security = HTTPBasic(auto_error=False)
settings = get_settings()

_INGEST_USER = os.getenv("EMSCHARTS_INGEST_USER") or ""
_INGEST_PASSWORD = os.getenv("EMSCHARTS_INGEST_PASSWORD") or ""
_SBEMS_CLIENT_ID = os.getenv("EMSCHARTS_SBEMS_CLIENT_ID") or ""
_ALERT_TO = os.getenv("ADMIN_EMAIL") or os.getenv("CONTACT_EMAIL") or "jmullen@mullenanalytics.com"
# Email a "dashboard updated" notice on each successful ingest. Goes to the admin
# only by default; set EMSCHARTS_NOTIFY_CLIENT=1 to also email the client.
# Set EMSCHARTS_NOTIFY_UPDATES=0 to turn the notices off entirely.
_NOTIFY_UPDATES = os.getenv("EMSCHARTS_NOTIFY_UPDATES", "1").strip().lower() not in ("0", "false", "no", "off", "")
_NOTIFY_CLIENT = os.getenv("EMSCHARTS_NOTIFY_CLIENT", "0").strip().lower() in ("1", "true", "yes", "on")

_DISPOSITION_FILENAME = re.compile(r'filename\*?=(?:UTF-8\'\')?"?([^";]+)"?', re.IGNORECASE)


# ---------------------------------------------------------------------------
# Auth
# ---------------------------------------------------------------------------
def _check_auth(creds: Optional[HTTPBasicCredentials]) -> None:
    """HTTP Basic, fail-closed: reject everything until creds are configured."""
    if not _INGEST_USER or not _INGEST_PASSWORD:
        raise HTTPException(status_code=503, detail="emsCharts ingest is not configured on the server.")
    if creds is None:
        raise HTTPException(
            status_code=401, detail="Authentication required.",
            headers={"WWW-Authenticate": "Basic"},
        )
    ok_user = secrets.compare_digest(creds.username or "", _INGEST_USER)
    ok_pass = secrets.compare_digest(creds.password or "", _INGEST_PASSWORD)
    if not (ok_user and ok_pass):
        raise HTTPException(
            status_code=401, detail="Invalid credentials.",
            headers={"WWW-Authenticate": "Basic"},
        )


def _client_uuid() -> uuid_lib.UUID:
    try:
        return uuid_lib.UUID(_SBEMS_CLIENT_ID)
    except (ValueError, TypeError):
        raise HTTPException(status_code=503, detail="EMSCHARTS_SBEMS_CLIENT_ID is not set to a valid UUID.")


# ---------------------------------------------------------------------------
# CSV extraction — handle whatever shape emsCharts sends
# ---------------------------------------------------------------------------
def _filename_from_disposition(header: Optional[str]) -> Optional[str]:
    if not header:
        return None
    m = _DISPOSITION_FILENAME.search(header)
    return Path(m.group(1)).name if m else None


async def _extract_csv(request: Request) -> Tuple[Optional[str], bytes]:
    """Return (filename_or_None, bytes) from either a multipart file field or a raw body."""
    ctype = (request.headers.get("content-type") or "").lower()
    if ctype.startswith("multipart/form-data"):
        form = await request.form()
        for value in form.values():
            fn = getattr(value, "filename", None)
            if fn:  # an UploadFile part
                return (Path(fn).name, await value.read())
        return (None, b"")
    # Raw body: text/csv, application/octet-stream, or unspecified.
    body = await request.body()
    return (_filename_from_disposition(request.headers.get("content-disposition")), body)


# ---------------------------------------------------------------------------
# Endpoints
# ---------------------------------------------------------------------------
@router.get("/ingest")
def ingest_healthcheck(creds: Optional[HTTPBasicCredentials] = Depends(security)):
    """emsCharts 'Test Connection' target — validates reachability AND credentials."""
    _check_auth(creds)
    return {
        "ok": True,
        "ready": bool(_SBEMS_CLIENT_ID),
        "message": "emsCharts ingest endpoint ready." if _SBEMS_CLIENT_ID
                   else "Authenticated, but EMSCHARTS_SBEMS_CLIENT_ID is not set yet.",
    }


@router.get("/selftest-email")
async def selftest_email(creds: Optional[HTTPBasicCredentials] = Depends(security)):
    """Diagnostic: call SendGrid directly and return the real result (status + error).

    Auth-gated; sends a single test email to the admin address only. Used to debug
    why 'dashboard updated' emails aren't arriving. Safe to remove once resolved.
    """
    import httpx
    _check_auth(creds)
    api_key = getattr(settings, "sendgrid_api_key", "") or ""
    from_email = getattr(settings, "smtp_from_email", "") or ""
    from_name = getattr(settings, "smtp_from_name", "") or ""
    out = {
        "configured": bool(api_key and from_email),
        "api_key_present": bool(api_key),
        "api_key_len": len(api_key),
        "from_email": from_email,
        "from_name": from_name,
        "to": _ALERT_TO,
    }
    if not out["configured"]:
        out["note"] = "SENDGRID_API_KEY or SMTP_FROM_EMAIL is empty at runtime."
        return out
    payload = {
        "personalizations": [{"to": [{"email": _ALERT_TO}]}],
        "from": {"email": from_email, "name": from_name},
        "subject": "emsCharts ingest — email self-test",
        "content": [{"type": "text/html",
                     "value": "<p>Self-test from the emsCharts ingest endpoint. "
                              "If you received this, SendGrid delivery works.</p>"}],
    }
    try:
        async with httpx.AsyncClient() as c:
            r = await c.post(
                "https://api.sendgrid.com/v3/mail/send",
                headers={"Authorization": f"Bearer {api_key}", "Content-Type": "application/json"},
                json=payload, timeout=15,
            )
        out["status_code"] = r.status_code
        out["sent"] = 200 <= r.status_code < 300
        out["response_body"] = (r.text or "")[:600]
    except Exception as exc:  # noqa: BLE001
        out["sent"] = False
        out["error"] = str(exc)[:600]
    return out


@router.api_route("/ingest", methods=["POST", "PUT"])
@router.api_route("/ingest/{path_filename:path}", methods=["POST", "PUT"])
async def ingest_export(
    request: Request,
    background: BackgroundTasks,
    path_filename: str = "",
    creds: Optional[HTTPBasicCredentials] = Depends(security),
):
    """Receive a scheduled emsCharts CSV, store it as an SBEMS upload, clean in the background."""
    _check_auth(creds)
    # Log what emsCharts actually sent — invaluable for validating the first delivery.
    logger.info(
        "emscharts ingest: %s %s content-type=%r content-length=%s path_filename=%r",
        request.method, request.url.path, request.headers.get("content-type"),
        request.headers.get("content-length"), path_filename,
    )
    client_uuid = _client_uuid()

    filename, contents = await _extract_csv(request)

    # Empty body = emsCharts connection test / heartbeat — acknowledge, create nothing.
    if not contents or not contents.strip():
        return {"ok": True, "message": "No file in request (treated as a connection test)."}

    max_bytes = settings.max_upload_size_mb * 1024 * 1024
    if len(contents) > max_bytes:
        raise HTTPException(status_code=413, detail=f"File exceeds maximum size of {settings.max_upload_size_mb} MB.")

    # Sanity-check it decodes as text and looks delimited.
    try:
        head = contents[:8192].decode("utf-8-sig", errors="strict")
    except UnicodeDecodeError:
        raise HTTPException(status_code=400, detail="Request body is not UTF-8 text/CSV.")
    if not any(d in head for d in (",", "\t", ";")):
        raise HTTPException(status_code=400, detail="Request body does not look like a delimited CSV.")

    final_name = filename or (Path(path_filename).name if path_filename else None) \
        or f"emscharts_{datetime.utcnow():%Y%m%dT%H%M%SZ}.csv"

    # Save under the same layout as manual uploads so the cleaner can read it.
    stored_name = f"{uuid_lib.uuid4().hex}_{final_name}"
    upload_dir = Path(settings.data_uploads_root) / "clients" / str(client_uuid)
    upload_dir.mkdir(parents=True, exist_ok=True)
    file_path = upload_dir / stored_name
    file_path.write_bytes(contents)
    logger.info("emscharts ingest: saved %s (%d bytes) for client %s", file_path, len(contents), client_uuid)

    db = SessionLocal()
    try:
        record = DataUpload(
            client_id=client_uuid,
            uploaded_by_user_id=client_uuid,   # the feed uploads on the client's own behalf
            original_filename=final_name,
            stored_filename=stored_name,
            file_path=str(file_path),
            file_size=len(contents),
            source_system="EMSCHARTS",
            upload_type="monthly_csv",
            upload_status="UPLOADED",
            reporting_year=datetime.utcnow().year,
            notes="Auto-ingested from emsCharts scheduled export.",
        )
        db.add(record)
        db.commit()
        db.refresh(record)
        upload_id = str(record.id)
    finally:
        db.close()

    # Clean + compute metrics off the request path. AWS uses SQS/ECS; local and
    # legacy Railway deployments retain a worker-owned background fallback.
    try:
        queued = enqueue("legacy_upload_process", {"upload_id": upload_id})
        if not queued["queued"]:
            background.add_task(_process_upload, upload_id)
    except (JobConfigurationError, JobEnqueueError) as exc:
        failure_db = SessionLocal()
        try:
            failed = failure_db.query(DataUpload).filter(DataUpload.id == uuid_lib.UUID(upload_id)).first()
            if failed:
                failed.upload_status = "FAILED"
                failure_db.commit()
        finally:
            failure_db.close()
        raise HTTPException(status_code=503, detail="Data processing worker is not available") from exc

    return {
        "ok": True,
        "upload_id": upload_id,
        "bytes": len(contents),
        "message": "Received; cleaning and dashboard update in progress.",
    }


# ---------------------------------------------------------------------------
# Background processing — mirrors routers/data.py:clean_upload, no auth/session
# ---------------------------------------------------------------------------
def _process_upload(upload_id: str, raise_on_error: bool = False) -> None:
    from ..services.ems_analytics_service import compute_ems_metrics
    from ..services.ems_cleaning_service import run_ems_cleaning
    from ..services.ems_column_mapping_service import get_column_overrides

    db = SessionLocal()
    try:
        upload = db.query(DataUpload).filter(DataUpload.id == uuid_lib.UUID(upload_id)).first()
        if not upload:
            logger.warning("emscharts ingest: upload %s vanished before processing", upload_id)
            return

        if not Path(upload.file_path).exists():
            upload.upload_status = "FAILED"
            db.commit()
            reason = "Original file was not on disk when cleaning started."
            _alert_failure(upload_id, reason)
            if raise_on_error:
                raise FileNotFoundError(reason)
            return

        upload.upload_status = "CLEANING"
        db.commit()

        cleaned_dir = Path(settings.data_uploads_root) / "clients" / str(upload.client_id) / "cleaned"
        cleaned_dir.mkdir(parents=True, exist_ok=True)
        cleaned_path = str(cleaned_dir / f"cleaned_{upload.stored_filename}")

        stats = run_ems_cleaning(upload.file_path, cleaned_path)

        cleaned_blob = None
        try:
            with open(cleaned_path, "rb") as fh:
                cleaned_blob = gzip.compress(fh.read())
        except Exception as exc:  # noqa: BLE001
            logger.warning("emscharts ingest: could not gzip cleaned blob for %s: %s", upload_id, exc)

        summary = {
            "file_name": upload.original_filename,
            "client_id": str(upload.client_id),
            "project_id": str(upload.project_id) if upload.project_id else None,
            "upload_date": upload.created_at.isoformat() if upload.created_at else None,
            "row_count_original": stats["row_count_original"],
            "row_count_cleaned": stats["row_count_cleaned"],
            "duplicate_count": stats["duplicate_rows_count"],
            "missing_value_count": sum(stats["missing_values_summary"].values()),
        }
        overrides = get_column_overrides(upload, db)
        metrics_json = compute_ems_metrics(cleaned_path, summary, stats, overrides=overrides)
        db.add(DataCleaningResult(
            data_upload_id=upload.id,
            missing_values_summary=stats["missing_values_summary"],
            duplicate_rows_count=stats["duplicate_rows_count"],
            removed_rows_count=stats["removed_rows_count"],
            cleaned_file_path=cleaned_path,
            cleaned_data_gz=cleaned_blob,
            cleaning_notes=stats["cleaning_notes"],
        ))
        existing = (
            db.query(EMSDashboardMetrics)
            .filter(EMSDashboardMetrics.data_upload_id == upload.id)
            .first()
        )
        if existing:
            existing.metrics_json = metrics_json
            existing.updated_at = datetime.utcnow()
        else:
            db.add(EMSDashboardMetrics(
                data_upload_id=upload.id,
                client_id=upload.client_id,
                project_id=upload.project_id,
                metrics_json=metrics_json,
            ))
        upload.upload_status = "CLEANED"
        upload.row_count_original = stats["row_count_original"]
        upload.row_count_cleaned = stats["row_count_cleaned"]
        db.commit()

        logger.info(
            "emscharts ingest: upload %s cleaned (%s -> %s rows)",
            upload_id, stats.get("row_count_original"), stats.get("row_count_cleaned"),
        )

        # Notify that the dashboard has fresh data — admin only by default
        # (set EMSCHARTS_NOTIFY_CLIENT=1 to also email the client).
        if _NOTIFY_UPDATES:
            try:
                client = db.query(User).filter(User.id == upload.client_id).first()
                agency = None
                if client and client.profile:
                    agency = (client.profile.company or client.profile.full_name or "").strip() or None
                candidates = [_ALERT_TO]
                if _NOTIFY_CLIENT and client and client.email:
                    candidates.append(client.email)
                recipients: list[str] = []
                for addr in candidates:
                    addr = (addr or "").strip()
                    if addr and addr.lower() not in {r.lower() for r in recipients}:
                        recipients.append(addr)
                logger.info("emscharts ingest: sending update email to %s", recipients)
                _notify_update(recipients, agency, upload, stats)
            except Exception as exc:  # noqa: BLE001
                logger.info("emscharts ingest: update notification skipped: %s", exc)
    except Exception as exc:  # noqa: BLE001
        logger.error("emscharts ingest: processing failed for %s: %s", upload_id, exc)
        try:
            db.rollback()
            u = db.query(DataUpload).filter(DataUpload.id == uuid_lib.UUID(upload_id)).first()
            if u:
                u.upload_status = "FAILED"
                db.commit()
        except Exception:  # noqa: BLE001
            db.rollback()
        _alert_failure(upload_id, str(exc))
        if raise_on_error:
            raise
    finally:
        db.close()


def _notify_update(recipients: list, agency: Optional[str], upload: DataUpload, stats: dict) -> None:
    """Email the admin + client an aggregate 'dashboard updated' notice (no patient data)."""
    if not recipients:
        return
    label = agency or "your organization"
    app_url = (getattr(settings, "app_url", "") or "").rstrip("/")
    dash_url = f"{app_url}/portal/dashboard" if app_url else "the client portal"
    loaded = datetime.utcnow().strftime("%b %d, %Y %H:%M UTC")
    fname = upload.original_filename or "export.csv"
    n_clean = stats.get("row_count_cleaned")
    n_orig = stats.get("row_count_original")
    count_txt = f"{n_clean}" + (f" of {n_orig}" if n_orig else "")
    btn = (
        f"<a href='{dash_url}' style='display:inline-block;background:#2563eb;color:#fff;padding:12px 24px;"
        f"border-radius:6px;text-decoration:none;font-weight:bold;font-size:14px'>View the dashboard</a>"
        if app_url else ""
    )
    html = (
        "<div style='font-family:Arial,sans-serif;color:#111827;max-width:560px'>"
        "<h2 style='font-size:22px;margin:0 0 12px'>Dashboard updated</h2>"
        f"<p style='font-size:15px;line-height:24px;margin:0 0 16px'>New data has just been loaded into the "
        f"<strong>{label}</strong> analytics dashboard.</p>"
        "<table style='font-size:14px;border-collapse:collapse;margin:0 0 20px'>"
        f"<tr><td style='padding:4px 16px 4px 0;color:#6b7280'>Records loaded</td><td style='padding:4px 0'><strong>{count_txt}</strong></td></tr>"
        f"<tr><td style='padding:4px 16px 4px 0;color:#6b7280'>File</td><td style='padding:4px 0'>{fname}</td></tr>"
        f"<tr><td style='padding:4px 16px 4px 0;color:#6b7280'>Loaded</td><td style='padding:4px 0'>{loaded}</td></tr>"
        "<tr><td style='padding:4px 16px 4px 0;color:#6b7280'>Source</td><td style='padding:4px 0'>emsCharts (automatic)</td></tr>"
        "</table>"
        f"{btn}"
        f"<p style='font-size:12px;color:#9ca3af;margin:28px 0 0'>You're receiving this because automatic "
        f"emsCharts data delivery is enabled for {label}. &mdash; Mullen Analytics &amp; Data Solutions</p>"
        "</div>"
    )
    subject = f"{agency} dashboard updated — new data loaded" if agency else "Your Mullen Analytics dashboard was updated"
    for to in recipients:
        try:
            sent = asyncio.run(send_email(to, subject, html))
            logger.info("emscharts ingest: update email to %s -> sent=%s", to, sent)
        except Exception as exc:  # noqa: BLE001
            logger.info("emscharts ingest: update email to %s failed: %s", to, exc)


def _alert_failure(upload_id: str, reason: str) -> None:
    try:
        safe = reason.replace("<", "&lt;").replace(">", "&gt;")
        html = (
            "<p><strong>emsCharts auto-ingest failed</strong></p>"
            f"<p>Upload <code>{upload_id}</code> could not be processed.</p>"
            f"<pre style='white-space:pre-wrap;font-family:inherit'>{safe[:2000]}</pre>"
        )
        asyncio.run(send_email(_ALERT_TO, "emsCharts ingest failed", html))
    except Exception as exc:  # noqa: BLE001
        logger.info("emscharts ingest: failure-alert email skipped: %s", exc)
