import os
from functools import lru_cache
from sqlalchemy import URL, create_engine, event, text
from sqlalchemy.engine import make_url
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import sessionmaker
from .config import get_settings

settings = get_settings()


def _norm(url: str) -> str:
    if url.startswith("postgres://"):
        url = url.replace("postgres://", "postgresql://", 1)
    return url


def _get_database_url():
    """Runtime DSN — the low-privilege app_user in staging/prod (RLS enforced)."""
    explicit = os.environ.get("DATABASE_URL")
    if explicit:
        return _norm(explicit)
    if settings.database_host:
        return URL.create(
            "postgresql+psycopg",
            username=settings.database_user,
            password=settings.database_password or settings.app_db_password,
            host=settings.database_host,
            port=settings.database_port,
            database=settings.database_name,
            query={"sslmode": settings.database_sslmode},
        )
    return _norm(settings.database_url)


def _get_admin_url():
    """Owner DSN for schema migrations / RLS provisioning. Falls back to the
    runtime URL when no separate admin URL is configured (local/session mode)."""
    explicit = os.environ.get("DATABASE_ADMIN_URL") or settings.database_admin_url
    if explicit:
        return _norm(explicit)
    if settings.database_host and settings.database_admin_password:
        return URL.create(
            "postgresql+psycopg",
            username=settings.database_admin_user,
            password=settings.database_admin_password,
            host=settings.database_host,
            port=settings.database_port,
            database=settings.database_name,
            query={"sslmode": settings.database_sslmode},
        )
    return _get_database_url()


def _get_platform_url():
    """Super Admin DSN — the dedicated low-privilege `app_platform` role used ONLY by
    the platform (cross-agency) request path. NOT a superuser and NOT BYPASSRLS; its
    cross-agency reach is the role-keyed RLS policy clause. Falls back to the ordinary
    runtime URL when no separate platform credential is configured (local/session
    mode, where RLS is not enforced), so platform endpoints keep working locally."""
    explicit = os.environ.get("PLATFORM_DATABASE_URL") or settings.platform_database_url
    if explicit:
        platform = make_url(_norm(explicit))
        ordinary = _get_database_url()
        ordinary = ordinary if isinstance(ordinary, URL) else make_url(ordinary)
        if settings.auth_mode == "cognito" and (
            platform.username != settings.platform_db_user or not platform.password
            or platform.password == ordinary.password
        ):
            raise ValueError("PLATFORM_DATABASE_URL must use the dedicated role and a distinct password")
        return platform
    if settings.auth_mode == "cognito":
        if not settings.platform_db_password or settings.platform_db_password == settings.app_db_password:
            raise ValueError("Configure a distinct PLATFORM_DB_PASSWORD or PLATFORM_DATABASE_URL")
        ordinary = _get_database_url()
        ordinary = ordinary if isinstance(ordinary, URL) else make_url(ordinary)
        if settings.platform_db_password == ordinary.password:
            raise ValueError("Platform and ordinary database passwords must differ")
        return ordinary.set(username=settings.platform_db_user, password=settings.platform_db_password)
    return _get_database_url()


engine = create_engine(
    _get_database_url(),
    pool_size=settings.database_pool_size,
    pool_pre_ping=True,
)

# Separate engine for create_all / self-heal ALTERs / apply_rls(). Runs as the
# table owner so it can ALTER and provision RLS; the runtime `engine` must NOT be
# a superuser or it would bypass RLS.
admin_engine = create_engine(_get_admin_url(), pool_pre_ping=True)

# Super Admin cross-agency engine (connects as the non-superuser, non-BYPASSRLS
# `app_platform` role). Used ONLY by the platform request path; ordinary requests
# never touch it. Its cross-agency visibility is the role-keyed RLS policy clause.
@lru_cache(maxsize=1)
def get_platform_engine():
    """Initialize only in API platform paths, never in an ordinary worker import."""
    platform_engine = create_engine(_get_platform_url(), pool_pre_ping=True)
    event.listen(platform_engine, "checkin", _reset_rls_context)
    return platform_engine


def _reset_rls_context(dbapi_connection, connection_record):
    """Defense-in-depth against pooled-connection context leakage: clear the RLS
    GUCs to empty (deny-by-default) whenever a connection returns to the pool.
    Request-scoped context is set with SET LOCAL (transaction-scoped, so it is
    already discarded at transaction end); this is a belt-and-suspenders reset so
    a reused connection can never carry a previous request's user/agency context.
    (The legacy `app.platform_admin` GUC is reset too though no policy reads it now.)
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
        except Exception:  # noqa: BLE001  # nosec B110 - a checkin reset must never raise into the pool
            pass


# Reset the RLS GUCs on BOTH runtime pools on checkin (app_user and app_platform).
event.listen(engine, "checkin", _reset_rls_context)


SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

Base = declarative_base()


def get_db():
    """Dependency for getting database sessions (ordinary app_user identity)."""
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()


def get_platform_db():
    """Dependency for the Super Admin platform (cross-agency) path: a session bound to
    the `app_platform` engine. Use ONLY behind a verified SUPER_ADMIN check — never for
    ordinary requests. Cross-agency access is granted by the role-keyed RLS policy, not
    a bypass, so RLS stays enforced and tenant isolation for app_user is unchanged."""
    db = sessionmaker(autocommit=False, autoflush=False, bind=get_platform_engine())()
    try:
        yield db
    finally:
        db.close()
