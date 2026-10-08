"""Production Security Profile (PHI remediation — Priority 1).

When `PHI_PRODUCTION_MODE` is true, the application MUST fail to start unless every PHI
safety condition holds. This makes RLS (and the other controls) **non-optional** for PHI
production and prevents a config typo (e.g. `auth_mode=session`, or connecting as a
DB superuser) from silently downgrading protection. Fail closed: any check that cannot be
proven is treated as failed.

Checks:
  - db_runtime_non_superuser  — the runtime DB role cannot bypass RLS (not superuser / no BYPASSRLS)
  - rls_enabled               — RLS is enabled with policies on tenant tables
  - approved_auth_mode        — auth_mode == "cognito" (per-request agency context + app_user)
  - app_db_password_set       — the non-superuser app_user is provisioned
  - secure_storage_backend    — storage_backend == "s3" (no PHI to local persistent disk)
  - external_phi_egress_disabled — no NON-PHI processor is approved for PHI egress
  - db_tls_required           — DATABASE_URL enforces TLS (sslmode=require/verify-*)
  - cookie_secure             — session cookies are Secure
  - production_environment    — environment is not a dev/test value
  - secure_secret_key         — SECRET_KEY is not the placeholder and is long enough

Dev/test (PHI_PRODUCTION_MODE false) is unaffected — the profile is not enforced.
"""
from __future__ import annotations

import os
from dataclasses import dataclass

from sqlalchemy import text

from .config import get_settings

_PLACEHOLDER_SECRET = "change-this-in-production-use-openssl-rand-hex-32"
_DEV_ENVIRONMENTS = {"local", "test", "testing", "development", "dev", ""}


class PhiSecurityError(RuntimeError):
    """Raised at startup when PHI_PRODUCTION_MODE is set but a safety check fails."""


@dataclass
class Check:
    name: str
    ok: bool
    detail: str = ""


def _probe_superuser(engine) -> bool:
    """True if the runtime DB role is superuser or has BYPASSRLS (i.e. can bypass RLS)."""
    with engine.connect() as c:
        val = c.execute(text(
            "SELECT bool_or(rolsuper OR rolbypassrls) FROM pg_roles WHERE rolname = current_user"
        )).scalar()
    return bool(val)


def _probe_rls_enabled(engine) -> bool:
    """True if RLS is enabled on tenant tables and at least one policy exists."""
    with engine.connect() as c:
        relsec = c.execute(text(
            "SELECT bool_or(relrowsecurity) FROM pg_class "
            "WHERE relname IN ('agency_memberships','data_uploads','agencies')"
        )).scalar()
        npol = c.execute(text("SELECT count(*) FROM pg_policies WHERE schemaname = 'public'")).scalar()
    return bool(relsec) and (npol or 0) > 0


def _db_url(settings) -> str:
    return os.environ.get("DATABASE_URL") or getattr(settings, "database_url", "") or ""


def run_checks(settings, engine=None) -> list[Check]:
    """Evaluate every PHI-production safety condition. Pure except the two DB probes,
    which fail closed (and are monkeypatchable in tests)."""
    checks: list[Check] = []

    checks.append(Check("approved_auth_mode", settings.auth_mode == "cognito",
                        f"auth_mode={settings.auth_mode!r} (must be 'cognito')"))
    checks.append(Check("app_db_password_set", bool(settings.app_db_password),
                        "set" if settings.app_db_password else "MISSING — app_user not provisioned"))
    checks.append(Check("secure_storage_backend", settings.storage_backend == "s3",
                        f"storage_backend={settings.storage_backend!r} (must be 's3')"))

    # external PHI egress disabled: no NON-PHI processor may be PHI-approved.
    from .phi_egress import _phi_approved_hosts, _NON_PHI_ALLOWLIST
    leaky = _phi_approved_hosts() & _NON_PHI_ALLOWLIST
    checks.append(Check("external_phi_egress_disabled", not leaky,
                        f"processors approved for PHI: {sorted(leaky)}" if leaky else "no processor PHI-approved"))

    url = _db_url(settings).lower()
    db_tls = ("sslmode=require" in url) or ("sslmode=verify-ca" in url) or ("sslmode=verify-full" in url)
    checks.append(Check("db_tls_required", db_tls,
                        "sslmode enforced in DATABASE_URL" if db_tls else "DATABASE_URL lacks sslmode=require"))
    checks.append(Check("cookie_secure", bool(settings.session_cookie_secure),
                        f"session_cookie_secure={settings.session_cookie_secure}"))
    checks.append(Check("production_environment", str(settings.environment).lower() not in _DEV_ENVIRONMENTS,
                        f"environment={settings.environment!r}"))
    sk = settings.secret_key or ""
    weak = (sk == _PLACEHOLDER_SECRET) or (len(sk) < 32)
    checks.append(Check("secure_secret_key", not weak,
                        "placeholder or <32 chars" if weak else "ok"))

    if engine is not None:
        try:
            su = _probe_superuser(engine)
            checks.append(Check("db_runtime_non_superuser", not su,
                                "runtime role can BYPASS RLS (superuser/bypassrls)" if su else "non-superuser"))
        except Exception as exc:  # noqa: BLE001 — fail closed
            checks.append(Check("db_runtime_non_superuser", False, f"probe failed: {exc}"))
        try:
            checks.append(Check("rls_enabled", _probe_rls_enabled(engine), "RLS enabled + policies present"))
        except Exception as exc:  # noqa: BLE001 — fail closed
            checks.append(Check("rls_enabled", False, f"probe failed: {exc}"))
    else:
        checks.append(Check("db_runtime_non_superuser", False, "no engine to probe (fail closed)"))
        checks.append(Check("rls_enabled", False, "no engine to probe (fail closed)"))

    return checks


def guard_local_phi_write(path: str = "", *, settings=None) -> None:
    """Runtime safeguard (Priority 3): refuse to write NEW PHI to local persistent storage
    when PHI_PRODUCTION_MODE is set. Production PHI must go to the approved private S3/KMS
    backend; the legacy local-filesystem code paths (SBEMS CSV plane, agency files) must not
    persist PHI in production. Dev/synthetic (profile off) is unaffected."""
    settings = settings or get_settings()
    if getattr(settings, "phi_production_mode", False):
        raise PhiSecurityError(
            "Local persistent PHI write blocked in PHI_PRODUCTION_MODE — use the approved "
            f"private S3/KMS storage backend (attempted path: {path!r})."
        )


def assert_phi_production_safe(settings=None, engine=None):
    """If PHI_PRODUCTION_MODE is set, raise PhiSecurityError unless ALL checks pass.
    Returns the check list on success (or None when the profile is not enforced)."""
    settings = settings or get_settings()
    if not getattr(settings, "phi_production_mode", False):
        return None
    checks = run_checks(settings, engine)
    failed = [c for c in checks if not c.ok]
    if failed:
        raise PhiSecurityError(
            "PHI_PRODUCTION_MODE is set but these PHI safety checks FAILED: "
            + "; ".join(f"{c.name} [{c.detail}]" for c in failed)
        )
    return checks
