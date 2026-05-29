from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from .config import get_settings
from .database import engine, Base
from .routers import auth, users, messages, profiles, invoices, uploads, tasks
from .routers import projects, documents, impersonation, reports, dashboard_refresh, quickbooks
from .routers import agencies, agency_files, pipeline, admin, incidents, report_builder, payments, clients
from .routers import data as data_router
from .models import data_upload as _data_upload_models  # noqa: F401 – register with Base
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
    ensure_storage_root(settings.data_storage_root)
    ensure_storage_root(settings.data_uploads_root)


@app.get("/")
async def root():
    return {"message": "Mullen Analytics API", "status": "running"}


@app.get("/health")
async def health_check():
    return {"status": "healthy"}
