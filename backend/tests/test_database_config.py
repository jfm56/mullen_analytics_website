"""Database connection configuration tests that do not open a connection."""
from sqlalchemy.engine import URL

from app import database


def test_discrete_runtime_database_settings_build_encoded_url(monkeypatch):
    monkeypatch.delenv("DATABASE_URL", raising=False)
    monkeypatch.setattr(database.settings, "database_host", "db.internal")
    monkeypatch.setattr(database.settings, "database_port", 5432)
    monkeypatch.setattr(database.settings, "database_name", "portal")
    monkeypatch.setattr(database.settings, "database_user", "app_user")
    monkeypatch.setattr(database.settings, "database_password", "p@ss:/word")
    monkeypatch.setattr(database.settings, "database_sslmode", "verify-full")

    url = database._get_database_url()

    assert isinstance(url, URL)
    assert url.host == "db.internal"
    assert url.username == "app_user"
    assert url.password == "p@ss:/word"
    assert url.query["sslmode"] == "verify-full"


def test_explicit_database_url_still_wins(monkeypatch):
    monkeypatch.setenv("DATABASE_URL", "postgres://u:p@explicit.internal/db")
    monkeypatch.setattr(database.settings, "database_host", "ignored.internal")

    assert database._get_database_url() == "postgresql://u:p@explicit.internal/db"
