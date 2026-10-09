from pydantic_settings import BaseSettings, SettingsConfigDict
from pydantic import field_validator
from functools import lru_cache
import os


class Settings(BaseSettings):
    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        extra="ignore",
    )

    # Database
    database_url: str = "postgresql://localhost:5432/mullen_analytics"
    database_pool_size: int = 10
    # AWS/ECS can inject passwords from Secrets Manager without assembling a
    # credential-bearing DSN in Terraform or task-definition environment data.
    # DATABASE_URL / DATABASE_ADMIN_URL still take precedence for local and
    # legacy deployments.
    database_host: str = ""
    database_port: int = 5432
    database_name: str = "mullen_analytics"
    database_user: str = "app_user"
    database_password: str = ""
    database_admin_user: str = "mullen_admin"
    database_admin_password: str = ""
    database_sslmode: str = "require"
    # Unified-platform runtime DB identity. The app connects as the low-privilege
    # `app_user` (RLS-enforced) for normal requests; schema migrations / RLS
    # provisioning run as the owner via `database_admin_url`. Blank admin url =>
    # fall back to database_url (local/session mode, where RLS is not provisioned).
    database_admin_url: str = ""
    app_db_password: str = ""  # password for the runtime app_user role (staging/prod)

    @field_validator("database_url", mode="before")
    @classmethod
    def fix_postgres_url(cls, v: str) -> str:
        if isinstance(v, str) and v.startswith("postgres://"):
            return v.replace("postgres://", "postgresql://", 1)
        return v

    @field_validator("job_backend")
    @classmethod
    def validate_job_backend(cls, v: str) -> str:
        value = str(v).strip().lower()
        if value not in {"background", "sqs"}:
            raise ValueError("JOB_BACKEND must be 'background' or 'sqs'")
        return value

    @field_validator("job_visibility_timeout_seconds")
    @classmethod
    def validate_job_visibility_timeout(cls, v: int) -> int:
        if int(v) < 1:
            raise ValueError("JOB_VISIBILITY_TIMEOUT_SECONDS must be positive")
        return int(v)
    
    # Auth
    secret_key: str = "change-this-in-production-use-openssl-rand-hex-32"
    algorithm: str = "HS256"
    access_token_expire_minutes: int = 60 * 24  # 24 hours
    session_cookie_name: str = "session"
    session_cookie_secure: bool = True  # Set to False for local dev without HTTPS
    session_cookie_httponly: bool = True
    session_cookie_samesite: str = "lax"

    # ── Cognito (unified-platform auth) ──
    # When auth_mode == "cognito", the API authenticates Bearer Cognito ID tokens
    # (JWKS-verified) instead of the legacy cookie sessions. Both coexist so the
    # live portal keeps working while staging runs on Cognito.
    auth_mode: str = "session"            # "session" (legacy) | "cognito" (unified)
    cognito_region: str = "us-east-2"
    cognito_user_pool_id: str = ""        # e.g. us-east-2_KyaPhydEl
    cognito_client_id: str = ""           # app client id (ID-token audience)

    # ── EMSCS QA Review Engine v1 (synthetic-only, feature-flagged) ──
    # Clinical QA/CQI chart-review module (env EMSCS_QA_V1_ENABLED). OFF everywhere
    # by default; only the approved dev/test (synthetic, no-PHI) environment sets it
    # true. When false: QA routes do not mount, QA tables are not provisioned, and
    # the module is inert. This flag NEVER enables live EMSCharts, PHI ingestion, or
    # any client exposure — those remain separate, explicit approvals.
    emscs_qa_v1_enabled: bool = False

    # Password Reset
    password_reset_expire_hours: int = 1

    # Email verification (public self-serve signup)
    email_verification_expire_hours: int = 48

    # Email (SendGrid HTTP API)
    sendgrid_api_key: str = ""
    smtp_from_email: str = "noreply@mullenanalytics.com"
    smtp_from_name: str = "Mullen Analytics"

    # AI (Anthropic) — powers the dashboard AI insights + report drafting.
    # Empty = those features show a graceful "enable" hint instead of running.
    anthropic_api_key: str = ""
    
    # Storage
    storage_provider: str = "s3"  # "s3" or "gcs"
    aws_access_key_id: str = ""
    aws_secret_access_key: str = ""
    aws_s3_bucket: str = ""
    aws_region: str = "us-east-1"
    aws_kms_key_id: str = ""  # AWS production CMK ARN for S3 object writes
    # Durable processing jobs. "background" preserves local/Railway behavior;
    # AWS sets "sqs" and runs backend.worker as a separate ECS service.
    job_backend: str = "background"  # background | sqs
    pipeline_queue_url: str = ""
    sqs_endpoint_url: str = ""  # localstack/dev only; blank uses AWS
    job_visibility_timeout_seconds: int = 900
    gcs_bucket: str = ""
    gcs_project_id: str = ""
    
    # EMS Platform storage root (D: drive)
    data_storage_root: str = r"D:\MullenAnalytics\ClientData"

    # Data uploads
    data_uploads_root: str = r"D:\MullenAnalytics\DataUploads"
    max_upload_size_mb: int = 100

    # Stripe — one-time invoices + self-serve subscription plans.
    # Empty keys = billing disabled (the request/trial signup model still works).
    stripe_secret_key: str = ""
    stripe_webhook_secret: str = ""
    stripe_publishable_key: str = ""
    # Recurring subscription price IDs (create them in your Stripe dashboard),
    # mapped per plan slug. Leave blank to keep a tier on the manual/trial model.
    stripe_price_starter: str = ""
    stripe_price_professional: str = ""
    stripe_price_enterprise: str = ""

    # Traffic enrichment (response-time / MVA). Default proxy needs no key.
    traffic_provider: str = "time_proxy"   # time_proxy | google
    google_maps_api_key: str = ""
    # Optional station/base origin "lat,lng" for traffic routes; blank = agency center
    traffic_origin: str = ""

    # App
    environment: str = "production"  # local | production
    storage_backend: str = "local"   # local | s3
    # Schema provisioning at startup (create_all / self-heal ALTERs / backfills /
    # RLS provisioning) runs ONLY in local dev. In staging/production the API and
    # worker must connect as the low-privilege runtime role and merely VALIDATE the
    # schema an operator migrated (no owner/admin DB credentials at runtime). Set
    # true ONLY for a deliberate one-off local-style provisioning run.
    db_auto_provision: bool = False
    app_url: str = "http://localhost:3000"
    api_url: str = "http://localhost:8000"
    debug: bool = False
    # Emergency / rollout kill switch. AWS keeps this false until BAA scope,
    # migrations, isolation, reconciliation, backups and monitoring are signed
    # off. It blocks writes to known clinical-data routes without disabling
    # health checks or authentication.
    phi_ingestion_enabled: bool = False

    # SSO handoff to the EMS QA platform (one login). The portal signs a
    # short-lived, single-use Ed25519 token; the EMS QA app verifies it with the
    # matching public key and starts the member's session there. Set
    # sso_private_key (PEM) in the environment; never commit it.
    sso_private_key: str = ""  # PEM-encoded Ed25519 PRIVATE key (sign only)
    sso_issuer: str = "mullen-portal"
    sso_audience: str = "mullen-ems-qa"
    sso_token_ttl_seconds: int = 60
    ems_qa_sso_url: str = "https://app.mullenanalytics.com/api/auth/sso"
    # EMS QA backend base URL for SERVER-SIDE proxying of QA screens rendered inside
    # the portal (/api/qa/* → EMS QA /api/*). The portal exchanges an SSO ticket for
    # an EMS QA session server-side and never exposes it to the browser. Blank =
    # the in-portal QA proxy is disabled (falls back to the launch-handoff only).
    ems_qa_api_base: str = ""  # e.g. http://localhost:8000 (dev) | https://app.mullenanalytics.com (prod)

    # ── On-prem features: first-party visitor analytics + lead discovery ──
    # These run on the on-prem FastAPI instance (own hardware, local Postgres),
    # exposed to the cloud admin via a tunnel (see ONPREM_FASTAPI_URL / proxy2).
    analytics_enabled: bool = True          # public visitor-analytics ingest + admin dashboard
    leads_enabled: bool = False             # nightly lead-discovery crawler + admin Leads
    scheduler_enabled: bool = False         # APScheduler nightly jobs — ON-PREM single replica ONLY
    lead_discovery_hour: int = 2            # local hour (0-23) for the nightly crawl
    # Lead-discovery web search: "duckduckgo" (no key) | "tavily" | "brave"
    lead_search_provider: str = "duckduckgo"
    lead_search_api_key: str = ""
    samgov_api_key: str = ""               # SAM.gov Opportunities API (federal RFPs); blank = skip
    # LLM for need-signal extraction + outreach drafting: "ollama" (local) | "anthropic"
    lead_llm_provider: str = "ollama"
    ollama_base_url: str = "http://localhost:11434"
    ollama_model: str = "llama3.1:8b"
    # Cross-backend admin auth (ON-PREM instance only). The admin's login session
    # lives in the CLOUD (Railway) DB, not locally, so when set, admin endpoints
    # served here (analytics/leads/outreach) also accept a cookie validated by the
    # upstream backend. Unset on the cloud + normal local dev => local-only auth,
    # no behavior change. Point at the public site's proxy to avoid needing the
    # raw Railway URL: url=https://mullenanalytics.com, path=/api/proxy/auth/session
    upstream_auth_url: str = ""
    upstream_auth_path: str = "/api/auth/session"
    


@lru_cache()
def get_settings() -> Settings:
    settings = Settings()
    # Bridge the Anthropic key from .env/Settings into the process environment so
    # modules that read os.getenv("ANTHROPIC_API_KEY") directly (AI insights,
    # report drafting) pick it up. pydantic-settings loads .env into the Settings
    # object, NOT into os.environ — without this bridge, setting the key in .env
    # alone never enables the AI features. An explicit shell env var still wins.
    if settings.anthropic_api_key and not os.getenv("ANTHROPIC_API_KEY"):
        os.environ["ANTHROPIC_API_KEY"] = settings.anthropic_api_key
    return settings
