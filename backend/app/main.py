from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from .config import get_settings
from .database import engine, Base
from .routers import auth, users, messages, profiles, invoices, uploads, tasks
from .routers import projects, documents, impersonation, reports, dashboard_refresh, quickbooks
from .routers import agencies, agency_files, pipeline, admin, incidents, report_builder
from .services.storage import ensure_storage_root

settings = get_settings()

# Create database tables
Base.metadata.create_all(bind=engine)

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


@app.on_event("startup")
async def on_startup():
    ensure_storage_root(settings.data_storage_root)


@app.get("/")
async def root():
    return {"message": "Mullen Analytics API", "status": "running"}


@app.get("/health")
async def health_check():
    return {"status": "healthy"}
