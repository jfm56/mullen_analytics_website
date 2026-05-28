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
    
    # Email (Gmail SMTP)
    gmail_user: str = ""
    gmail_app_password: str = ""
    smtp_from_email: str = ""
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

    # Stripe (unused — billing via QuickBooks)
    stripe_secret_key: str = ""
    stripe_webhook_secret: str = ""
    stripe_publishable_key: str = ""

    # App
    app_url: str = "http://localhost:3000"
    api_url: str = "http://localhost:8000"
    debug: bool = False
    


@lru_cache()
def get_settings() -> Settings:
    return Settings()
