"""PHI remediation Priority 1 — Production Security Profile tests.

Covers the required cases: session-mode production PHI startup denied, DB-superuser
production startup denied, and a fully-compliant config passing. DB probes are
monkeypatched so the test does not need a real superuser/non-superuser database.
"""
from types import SimpleNamespace

import pytest

from app import phi_security_profile as psp
from app import phi_egress
from app.phi_security_profile import assert_phi_production_safe, run_checks, PhiSecurityError


def _good_settings(**over):
    s = SimpleNamespace(
        phi_production_mode=True, auth_mode="cognito", app_db_password="app-pass",
        storage_backend="s3", session_cookie_secure=True, environment="production",
        secret_key="x" * 40, database_url="postgresql://u:p@h:5432/db?sslmode=require",
    )
    for k, v in over.items():
        setattr(s, k, v)
    return s


@pytest.fixture()
def compliant_db(monkeypatch):
    """Make the two DB probes report a compliant runtime (non-superuser, RLS on)."""
    monkeypatch.setattr(psp, "_probe_superuser", lambda e: False)
    monkeypatch.setattr(psp, "_probe_rls_enabled", lambda e: True)
    monkeypatch.setattr(psp, "_db_url", lambda s: s.database_url)   # avoid env coupling


def _names_failing(settings, engine=object()):
    return {c.name for c in run_checks(settings, engine) if not c.ok}


def test_profile_not_enforced_in_dev_mode():
    # PHI_PRODUCTION_MODE false → no enforcement regardless of other settings.
    assert assert_phi_production_safe(_good_settings(phi_production_mode=False), engine=None) is None


def test_compliant_config_passes(compliant_db):
    checks = assert_phi_production_safe(_good_settings(), engine=object())
    assert checks is not None and all(c.ok for c in checks)


def test_session_mode_production_phi_startup_denied(compliant_db):
    s = _good_settings(auth_mode="session")
    assert "approved_auth_mode" in _names_failing(s)
    with pytest.raises(PhiSecurityError) as e:
        assert_phi_production_safe(s, engine=object())
    assert "approved_auth_mode" in str(e.value)


def test_db_superuser_production_startup_denied(monkeypatch):
    monkeypatch.setattr(psp, "_probe_superuser", lambda e: True)        # runtime can bypass RLS
    monkeypatch.setattr(psp, "_probe_rls_enabled", lambda e: True)
    monkeypatch.setattr(psp, "_db_url", lambda s: s.database_url)
    with pytest.raises(PhiSecurityError) as e:
        assert_phi_production_safe(_good_settings(), engine=object())
    assert "db_runtime_non_superuser" in str(e.value)


def test_missing_engine_fails_closed():
    # No engine to probe → RLS/superuser checks fail closed → startup denied.
    with pytest.raises(PhiSecurityError):
        assert_phi_production_safe(_good_settings(), engine=None)


def test_local_storage_backend_denied(compliant_db):
    assert "secure_storage_backend" in _names_failing(_good_settings(storage_backend="local"))


def test_db_tls_required(monkeypatch):
    monkeypatch.setattr(psp, "_probe_superuser", lambda e: False)
    monkeypatch.setattr(psp, "_probe_rls_enabled", lambda e: True)
    monkeypatch.setattr(psp, "_db_url", lambda s: "postgresql://u:p@h:5432/db")  # no sslmode
    assert "db_tls_required" in _names_failing(_good_settings())


def test_external_phi_egress_must_be_disabled(compliant_db, monkeypatch):
    # If an external NON-PHI processor were ever approved for PHI, the profile blocks startup.
    monkeypatch.setattr(phi_egress, "_phi_approved_hosts", lambda: frozenset({"api.anthropic.com"}))
    assert "external_phi_egress_disabled" in _names_failing(_good_settings())


def test_placeholder_secret_denied(compliant_db):
    assert "secure_secret_key" in _names_failing(
        _good_settings(secret_key="change-this-in-production-use-openssl-rand-hex-32"))


def test_dev_environment_denied(compliant_db):
    assert "production_environment" in _names_failing(_good_settings(environment="local"))


def test_local_phi_write_guard():
    from app.phi_security_profile import guard_local_phi_write
    # dev/synthetic (profile off) → allowed
    guard_local_phi_write("/data/x.csv", settings=SimpleNamespace(phi_production_mode=False))
    # production PHI mode → local persistent write blocked (must use S3/KMS)
    with pytest.raises(PhiSecurityError):
        guard_local_phi_write("/data/x.csv", settings=SimpleNamespace(phi_production_mode=True))
