"""Apply ordered SQL migrations once, with checksum and advisory-lock safety.



Designed for an ECS one-off task. It uses the admin database identity; the API
and worker continue to use the RLS-enforced ``app_user`` identity.
"""
from __future__ import annotations

from contextlib import contextmanager
import hashlib
import logging
from pathlib import Path

import psycopg
from sqlalchemy.engine import URL

from app.database import _get_admin_url
from app.config import get_settings

LOG = logging.getLogger("mullen.migrations")
MIGRATION_DIR = Path(__file__).resolve().parents[1] / "migrations"
LOCK_ID = 73420519


def _dsn() -> str:
    value = _get_admin_url()

    if isinstance(value, URL):
        return value.set(
            drivername="postgresql"
        ).render_as_string(hide_password=False)

    return str(value)

@contextmanager
def safe_connection():
    try:
        connection = psycopg.connect(_dsn())
    except psycopg.Error:
        raise RuntimeError(
            "Database connection failed. Check credentials, "
            "network access, and PostgreSQL configuration."
        ) from None

    with connection:
        yield connection


def apply_migrations() -> None:
    files = sorted(MIGRATION_DIR.glob("*.sql"))
    if not files:
        raise RuntimeError(f"No migrations found in {MIGRATION_DIR}")

    with safe_connection() as connection:
        with connection.cursor() as cursor:
            cursor.execute("SELECT pg_advisory_lock(%s)", (LOCK_ID,))
            try:
                cursor.execute(
                    """
                    CREATE TABLE IF NOT EXISTS schema_migrations (
                        filename TEXT PRIMARY KEY,
                        sha256 TEXT NOT NULL,
                        applied_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
                    )
                    """
                )
                connection.commit()
                for path in files:
                    sql = path.read_text(encoding="utf-8")
                    digest = hashlib.sha256(sql.encode("utf-8")).hexdigest()
                    cursor.execute(
                        "SELECT sha256 FROM schema_migrations WHERE filename = %s",
                        (path.name,),
                    )
                    row = cursor.fetchone()
                    if row:
                        if row[0] != digest:
                            raise RuntimeError(
                                f"Applied migration changed on disk: {path.name}"
                            )
                        LOG.info("already applied: %s", path.name)
                        continue

                    LOG.info("applying: %s", path.name)
                    try:
                        cursor.execute(sql)
                        cursor.execute(
                            "INSERT INTO schema_migrations(filename, sha256) VALUES (%s, %s)",
                            (path.name, digest),
                        )
                        connection.commit()
                    except Exception:
                        connection.rollback()
                        raise

                settings = get_settings()
                if settings.auth_mode == "cognito" and settings.app_db_password:
                    # Provision the deliberately low-privilege runtime role and
                    # RLS only after the complete schema exists.
                    from app.database import admin_engine
                    from app.security_rls import apply_rls

                    apply_rls(
                        admin_engine,
                        app_role_password=settings.app_db_password,
                    )
                    LOG.info("runtime database role and RLS policies provisioned")
            finally:
                cursor.execute("SELECT pg_advisory_unlock(%s)", (LOCK_ID,))
                connection.commit()


if __name__ == "__main__":
    logging.basicConfig(level=logging.INFO)
    apply_migrations()
