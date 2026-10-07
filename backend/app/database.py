import os
from sqlalchemy import create_engine, event, text
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import sessionmaker
from .config import get_settings

settings = get_settings()


def _norm(url: str) -> str:
    if url.startswith("postgres://"):
        url = url.replace("postgres://", "postgresql://", 1)
    return url


def _get_database_url() -> str:
    """Runtime DSN — the low-privilege app_user in staging/prod (RLS enforced)."""
    return _norm(os.environ.get("DATABASE_URL") or settings.database_url)


def _get_admin_url() -> str:
    """Owner DSN for schema migrations / RLS provisioning. Falls back to the
    runtime URL when no separate admin URL is configured (local/session mode)."""
    return _norm(
        os.environ.get("DATABASE_ADMIN_URL")
        or settings.database_admin_url
        or _get_database_url()
    )


engine = create_engine(
    _get_database_url(),
    pool_size=settings.database_pool_size,
    pool_pre_ping=True,
)

# Separate engine for create_all / self-heal ALTERs / apply_rls(). Runs as the
# table owner so it can ALTER and provision RLS; the runtime `engine` must NOT be
# a superuser or it would bypass RLS.
admin_engine = create_engine(_get_admin_url(), pool_pre_ping=True)


@event.listens_for(engine, "checkin")
def _reset_rls_context(dbapi_connection, connection_record):
    """Defense-in-depth against pooled-connection context leakage: clear the RLS
    GUCs to empty (deny-by-default) whenever a connection returns to the pool.
    Request-scoped context is set with SET LOCAL (transaction-scoped, so it is
    already discarded at transaction end); this is a belt-and-suspenders reset so
    a reused connection can never carry a previous request's user/agency context.
    """
    try:
        cur = dbapi_connection.cursor()
        cur.execute(
            "SELECT set_config('app.current_user','',false), "
            "set_config('app.current_agency','',false)"
        )
        cur.close()
        # Must not leave an open transaction on the pooled connection, or the next
        # checkout's pool_pre_ping (set_session) fails "inside a transaction".
        dbapi_connection.commit()
    except Exception:  # noqa: BLE001 - never fail a checkin on reset
        try:
            dbapi_connection.rollback()
        except Exception:  # noqa: BLE001
            pass


SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

Base = declarative_base()


def get_db():
    """Dependency for getting database sessions."""
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
