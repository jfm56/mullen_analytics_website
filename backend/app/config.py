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

    @field_validator("database_url", mode="before")
    @classmethod
    def fix_postgres_url(cls, v: str) -> str:
        if isinstance(v, str) and v.startswith("postgres://"):
            return v.replace("postgres://", "postgresql://", 1)
        return v
    
    # Auth
    secret_key: str = "change-this-in-production-use-openssl-rand-hex-32"
    algorithm: str = "HS256"
    access_token_expire_minutes: int = 60 * 24  # 24 hours
    session_cookie_name: str = "session"
    session_cookie_secure: bool = True  # Set to False for local dev without HTTPS
    session_cookie_httponly: bool = True
    session_cookie_samesite: str = "lax"
    
    # Password Reset
    password_reset_expire_hours: int = 1

    # Email verification (public self-serve signup)
    email_verification_expire_hours: int = 48

    # Email (SendGrid HTTP API)
    sendgrid_api_key: str = ""
    smtp_from_email: str = "noreply@mullenanalytics.com"
    smtp_from_name: str = "Mullen Analytics"
    
    # Storage
    storage_provider: str = "s3"  # "s3" or "gcs"
    aws_access_key_id: str = ""
    aws_secret_access_key: str = ""
    aws_s3_bucket: str = ""
    aws_region: str = "us-east-1"
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
    app_url: str = "http://localhost:3000"
    api_url: str = "http://localhost:8000"
    debug: bool = False

    # SSO handoff to the EMS QA platform (one login). The portal signs a
    # short-lived, single-use Ed25519 token; the EMS QA app verifies it with the
    # matching public key and starts the member's session there. Set
    # sso_private_key (PEM) in the environment; never commit it.
    sso_private_key: str = ""  # PEM-encoded Ed25519 PRIVATE key (sign only)
    sso_issuer: str = "mullen-portal"
    sso_audience: str = "mullen-ems-qa"
    sso_token_ttl_seconds: int = 60
    ems_qa_sso_url: str = "https://app.mullenanalytics.com/api/auth/sso"
    


@lru_cache()
def get_settings() -> Settings:
    return Settings()
