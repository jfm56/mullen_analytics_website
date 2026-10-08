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


# TLS enforcement (RDS TLS Priority 1). Upgrade-only: never weakens a stronger mode.
_SSL_RANK = {"disable": 0, "allow": 1, "prefer": 2, "require": 3, "verify-ca": 4, "verify-full": 5}


def _required_sslmode() -> str:
    """Minimum sslmode to enforce: the configured db_sslmode, or 'require' in
    PHI_PRODUCTION_MODE (so a blank setting cannot silently disable TLS). '' = no enforcement."""
    if settings.db_sslmode:
        return settings.db_sslmode
    return "require" if getattr(settings, "phi_production_mode", False) else ""


def _apply_tls(url: str) -> str:
    """Append/UPGRADE the DSN's sslmode (and sslrootcert) to at least the required mode.
    Upgrade-only — a DSN that already requests verify-full is never downgraded."""
    from urllib.parse import urlsplit, urlunsplit, parse_qsl, urlencode
    mode = _required_sslmode()
    if not mode or not url:
        return url
    parts = urlsplit(url)
    q = dict(parse_qsl(parts.query, keep_blank_values=True))
    cur = q.get("sslmode")
    if _SSL_RANK.get(mode, 3) > _SSL_RANK.get(cur, -1):
        q["sslmode"] = mode
    if settings.db_sslrootcert and "sslrootcert" not in q:
        q["sslrootcert"] = settings.db_sslrootcert
    return urlunsplit((parts.scheme, parts.netloc, parts.path, urlencode(q), parts.fragment))


def _get_database_url() -> str:
    """Runtime DSN — the low-privilege app_user in staging/prod (RLS enforced), TLS-enforced."""
    return _apply_tls(_norm(os.environ.get("DATABASE_URL") or settings.database_url))


def _get_admin_url() -> str:
    """Owner DSN for schema migrations / RLS provisioning (TLS-enforced too). Falls back to
    the runtime URL when no separate admin URL is configured (local/session mode)."""
    return _apply_tls(_norm(
        os.environ.get("DATABASE_ADMIN_URL")
        or settings.database_admin_url
        or os.environ.get("DATABASE_URL")
        or settings.database_url
    ))


def verify_db_tls(eng=None) -> bool:
    """Runtime proof that the live DB connection is ENCRYPTED (pg_stat_ssl.ssl = true).
    Use in non-prod to prove enforced TLS before changing the RDS parameter group:
        python -c "from app.database import verify_db_tls; print(verify_db_tls())"
    Returns False against a non-TLS server (e.g. a local dev Postgres without SSL)."""
    eng = eng or engine
    try:
        with eng.connect() as c:
            return bool(c.execute(text(
                "SELECT ssl FROM pg_stat_ssl WHERE pid = pg_backend_pid()"
            )).scalar())
    except Exception:  # noqa: BLE001 — treat an unprovable connection as not-encrypted
        return False


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
            "set_config('app.current_agency','',false), "
            "set_config('app.platform_admin','',false)"
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
