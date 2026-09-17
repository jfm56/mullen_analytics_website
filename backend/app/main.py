from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse

from .config import get_settings
from .database import engine, Base
from .routers import auth, users, messages, profiles, invoices, uploads, tasks, feedback, errors
from .routers import projects, documents, impersonation, reports, dashboard_refresh, quickbooks
from .routers import agencies, agency_files, pipeline, admin, incidents, report_builder, payments, clients
from .routers import data as data_router
from .routers import settings as settings_router
from .routers import datasets as datasets_router
from .routers import sso
from .routers import plans as plans_router
from .routers import analytics_ingest, analytics_admin, leads_admin, outreach as outreach_router, revenue_checker
from .routers import emscharts_ingest
from .routers import tools as tools_router
from .routers import dispatch as dispatch_router
from .models import tool_usage as _tool_usage_models  # noqa: F401 – register with Base
from .models import data_upload as _data_upload_models  # noqa: F401 – register with Base
from .models import error_log as _error_log_models  # noqa: F401 – register with Base
from .models import web_analytics as _web_analytics_models  # noqa: F401 – register with Base
from .models import lead as _lead_models  # noqa: F401 – register with Base
from .services.storage import ensure_storage_root

settings = get_settings()

app = FastAPI(
    title="Mullen Analytics API",
    description="Backend API for Mullen Analytics Client Portal",
    version="1.0.0",
)

# CORS middleware - allow Next.js frontend
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:3000",
        "http://localhost:3001",
        "http://127.0.0.1:3000",
        "http://127.0.0.1:3001",
        "https://mullenanalytics.com",
        "https://www.mullenanalytics.com",
        settings.app_url,
    ],
    allow_credentials=True,  # Required for cookies
    allow_methods=["*"],
    allow_headers=["*"],
)

# Include routers
app.include_router(auth.router, prefix="/api")
app.include_router(users.router, prefix="/api")
app.include_router(messages.router, prefix="/api")
app.include_router(feedback.router, prefix="/api")
app.include_router(profiles.router, prefix="/api")
app.include_router(invoices.router, prefix="/api")
app.include_router(uploads.router, prefix="/api")
app.include_router(tasks.router, prefix="/api")
app.include_router(projects.router, prefix="/api")
app.include_router(documents.router, prefix="/api")
app.include_router(impersonation.router, prefix="/api")
app.include_router(reports.router, prefix="/api")
app.include_router(dashboard_refresh.router, prefix="/api")
app.include_router(quickbooks.router, prefix="/api")
app.include_router(agencies.router,     prefix="/api")
app.include_router(agency_files.router, prefix="/api")
app.include_router(pipeline.router,     prefix="/api")
app.include_router(incidents.router,       prefix="/api")
app.include_router(report_builder.router,  prefix="/api")
app.include_router(admin.router,           prefix="/api")
app.include_router(payments.router)
app.include_router(clients.router,         prefix="/api")
app.include_router(data_router.router,     prefix="/api")
app.include_router(settings_router.router, prefix="/api")
app.include_router(datasets_router.router, prefix="/api")
app.include_router(errors.router, prefix="/api")
app.include_router(sso.router, prefix="/api")
app.include_router(plans_router.router, prefix="/api")
app.include_router(analytics_ingest.router, prefix="/api")   # public visitor-analytics ingest
app.include_router(analytics_admin.router, prefix="/api")    # admin visitor-analytics dashboard
app.include_router(leads_admin.router, prefix="/api")        # admin lead discovery
app.include_router(outreach_router.router, prefix="/api")    # lead outreach + public unsubscribe
app.include_router(revenue_checker.router, prefix="/api")    # public revenue-checker lead capture
app.include_router(emscharts_ingest.router, prefix="/api")   # emsCharts scheduled-export auto-ingest webhook
app.include_router(tools_router.router, prefix="/api")       # public tool usage capture + admin read
app.include_router(dispatch_router.router, prefix="/api")    # AI dispatch resource predictor (R&D)


@app.on_event("startup")
async def on_startup():
    import logging, os
    log = logging.getLogger(__name__)

    if settings.environment == "local":
        print("=" * 70)
        print("WARNING: Running in LOCAL mode.")
        print("Files are stored locally. No production data should be used.")
        print(f"  DATA_UPLOADS_ROOT : {settings.data_uploads_root}")
        print(f"  DATA_STORAGE_ROOT : {settings.data_storage_root}")
        print("=" * 70)

    raw_url = os.environ.get("DATABASE_URL", "<NOT SET>")
    masked = raw_url[:40] + "..." if len(raw_url) > 40 else raw_url
    log.info("DATABASE_URL env var: %s", masked)
    log.info("ENVIRONMENT: %s | STORAGE_BACKEND: %s", settings.environment, settings.storage_backend)
    try:
        Base.metadata.create_all(bind=engine)
        log.info("DB create_all succeeded")
    except Exception as exc:  # noqa: BLE001
        log.error("DB create_all failed: %s", exc)

    # Self-healing schema patches: create_all() creates new tables but never
    # ALTERs existing ones, and the Railway deploy does not run the SQL
    # migrations. These idempotent ADD COLUMN IF NOT EXISTS statements keep the
    # data_uploads table in sync with the model on every deploy (e.g. the
    # dataset-group columns that post-date the original table migration).
    try:
        from sqlalchemy import text as _text
        _schema_patches = [
            "ALTER TABLE data_uploads ADD COLUMN IF NOT EXISTS upload_type VARCHAR(50) DEFAULT 'yearly_csv'",
            "ALTER TABLE data_uploads ADD COLUMN IF NOT EXISTS dataset_group_id UUID",
            "ALTER TABLE data_uploads ADD COLUMN IF NOT EXISTS reporting_year INTEGER",
            "ALTER TABLE data_uploads ADD COLUMN IF NOT EXISTS reporting_period_start TIMESTAMP",
            "ALTER TABLE data_uploads ADD COLUMN IF NOT EXISTS reporting_period_end TIMESTAMP",
            "CREATE INDEX IF NOT EXISTS ix_data_uploads_dataset_group_id ON data_uploads(dataset_group_id)",
            "CREATE INDEX IF NOT EXISTS ix_data_uploads_reporting_year ON data_uploads(reporting_year)",
            "ALTER TABLE data_cleaning_results ADD COLUMN IF NOT EXISTS cleaned_data_gz BYTEA",
            "ALTER TABLE profiles ADD COLUMN IF NOT EXISTS ems_qa_enabled BOOLEAN DEFAULT FALSE",
            "ALTER TABLE profiles ADD COLUMN IF NOT EXISTS ems_agency_slug VARCHAR(255)",
            "ALTER TABLE profiles ADD COLUMN IF NOT EXISTS ems_role VARCHAR(50)",
            "ALTER TABLE profiles ADD COLUMN IF NOT EXISTS plan VARCHAR(50) DEFAULT 'free_trial'",
            "ALTER TABLE profiles ADD COLUMN IF NOT EXISTS plan_status VARCHAR(50) DEFAULT 'trialing'",
            "ALTER TABLE profiles ADD COLUMN IF NOT EXISTS trial_ends_at TIMESTAMP",
            "ALTER TABLE profiles ADD COLUMN IF NOT EXISTS plan_selected_at TIMESTAMP",
            "ALTER TABLE profiles ADD COLUMN IF NOT EXISTS stripe_customer_id VARCHAR(255)",
            "ALTER TABLE profiles ADD COLUMN IF NOT EXISTS stripe_subscription_id VARCHAR(255)",
            "ALTER TABLE messages ADD COLUMN IF NOT EXISTS direction VARCHAR(20) DEFAULT 'outbound'",
            "ALTER TABLE profiles ADD COLUMN IF NOT EXISTS extra_dataset_slots INTEGER DEFAULT 0",
            "ALTER TABLE users ADD COLUMN IF NOT EXISTS email_confirmed BOOLEAN DEFAULT FALSE",
            "ALTER TABLE leads ADD COLUMN IF NOT EXISTS contact_phone VARCHAR(50)",
            "ALTER TABLE leads ADD COLUMN IF NOT EXISTS date_note VARCHAR(200)",
        ]
        with engine.begin() as conn:
            for _stmt in _schema_patches:
                conn.execute(_text(_stmt))
        log.info("DB schema self-heal patches applied")
    except Exception as exc:  # noqa: BLE001
        log.error("DB schema self-heal failed: %s", exc)

    # One-time backfill: every user predating email verification has
    # email_confirmed=False but was never asked to verify. Mark them confirmed
    # so they aren't retroactively nagged or upload-blocked. Guarded by an
    # app_settings marker so it runs exactly once and never re-confirms future
    # (genuinely unverified) self-serve signups on later restarts.
    try:
        from sqlalchemy import text as _text
        _marker = "email_verification_backfill_v1"
        with engine.begin() as conn:
            already_done = conn.execute(
                _text("SELECT 1 FROM app_settings WHERE key = :k"), {"k": _marker}
            ).first()
            if not already_done:
                result = conn.execute(
                    _text("UPDATE users SET email_confirmed = TRUE WHERE email_confirmed = FALSE")
                )
                conn.execute(
                    _text(
                        "INSERT INTO app_settings (key, value, category, value_type, description, "
                        "created_at, updated_at) VALUES (:k, 'true', 'system', 'boolean', :d, "
                        "NOW(), NOW()) ON CONFLICT (key) DO NOTHING"
                    ),
                    {"k": _marker, "d": "Existing users confirmed when email verification shipped"},
                )
                log.info("Email-verification backfill: confirmed %s pre-existing user(s)",
                         getattr(result, "rowcount", "?"))
    except Exception as exc:  # noqa: BLE001
        log.error("Email-verification backfill failed: %s", exc)

    # Nightly lead-discovery scheduler — ON-PREM instance ONLY (single replica).
    # Gated on scheduler_enabled + leads_enabled so it never runs on Railway or a
    # normal local dev backend by default. APScheduler is imported lazily so the
    # app runs fine even when the package is not installed.
    if settings.scheduler_enabled and settings.leads_enabled:
        try:
            from apscheduler.schedulers.asyncio import AsyncIOScheduler
            from .services.leadgen import discover as _lead_discover
            from .database import SessionLocal as _SessionLocal

            def _run_nightly_discovery():
                _db = _SessionLocal()
                try:
                    _lead_discover.run_discovery(_db)
                finally:
                    _db.close()

            _scheduler = AsyncIOScheduler()
            _scheduler.add_job(_run_nightly_discovery, "cron", hour=settings.lead_discovery_hour,
                               id="nightly_lead_discovery", replace_existing=True)
            _scheduler.start()
            log.info("Nightly lead-discovery scheduler started (hour=%s)", settings.lead_discovery_hour)
        except Exception as exc:  # noqa: BLE001
            log.error("Lead-discovery scheduler failed to start: %s", exc)

    ensure_storage_root(settings.data_storage_root)
    ensure_storage_root(settings.data_uploads_root)


@app.get("/")
async def root():
    return {"message": "Mullen Analytics API", "status": "running"}


@app.get("/health")
async def health_check():
    return {"status": "healthy"}


@app.exception_handler(Exception)
async def _log_unhandled_exception(request: Request, exc: Exception):
    """Capture unhandled server errors to error_logs (admin IT visibility), then
    return a clean 500. FastAPI's own handlers take precedence for HTTPException /
    validation errors, so only genuine 500s land here — expected 4xx are not logged."""
    import logging
    import traceback
    log = logging.getLogger("app.unhandled")
    log.error("Unhandled error on %s %s: %s", request.method, request.url.path, exc)
    try:
        from .database import SessionLocal
        from .models.error_log import ErrorLog
        db = SessionLocal()
        try:
            uid = None
            try:  # best-effort: attribute the error to the signed-in user
                from .routers.auth import get_session_token
                from .services.auth import validate_session
                token = get_session_token(request)
                if token:
                    u = validate_session(db, token)
                    uid = u.id if u else None
            except Exception:  # noqa: BLE001
                uid = None
            db.add(ErrorLog(
                user_id=uid,
                source="server",
                level="error",
                error_type=type(exc).__name__,
                message=str(exc)[:2000] or type(exc).__name__,
                path=str(request.url.path)[:500],
                method=request.method,
                status_code=500,
                stacktrace=traceback.format_exc()[:8000],
                user_agent=request.headers.get("user-agent"),
                ip_address=request.client.host if request.client else None,
            ))
            db.commit()
        finally:
            db.close()
    except Exception:  # noqa: BLE001
        log.exception("Failed to persist error log")
    return JSONResponse(status_code=500, content={"detail": "Internal server error"})
