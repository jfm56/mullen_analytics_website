"""PHI remediation infra Priority 1 — RDS TLS enforcement (app side).

Proves the app appends/UPGRADES the DSN sslmode (never downgrades), defaults to 'require'
in PHI_PRODUCTION_MODE, and that the runtime TLS proof helper is callable. The live
'connection is actually encrypted' proof (pg_stat_ssl) is run in non-prod against staging
RDS before the parameter-group change — see docs/rds-tls-procedure.md."""
from types import SimpleNamespace

from app import database


def _set(monkeypatch, **kw):
    s = SimpleNamespace(db_sslmode="", db_sslrootcert="", phi_production_mode=False)
    for k, v in kw.items():
        setattr(s, k, v)
    monkeypatch.setattr(database, "settings", s)


def test_apply_tls_appends_require(monkeypatch):
    _set(monkeypatch, db_sslmode="require")
    assert "sslmode=require" in database._apply_tls("postgresql://u:p@h:5432/db")


def test_apply_tls_upgrades_prefer_to_require(monkeypatch):
    _set(monkeypatch, db_sslmode="require")
    out = database._apply_tls("postgresql://u:p@h:5432/db?sslmode=prefer")
    assert "sslmode=require" in out and "sslmode=prefer" not in out


def test_apply_tls_never_downgrades(monkeypatch):
    _set(monkeypatch, db_sslmode="require")
    out = database._apply_tls("postgresql://u:p@h:5432/db?sslmode=verify-full")
    assert "sslmode=verify-full" in out               # stronger mode preserved


def test_phi_production_mode_defaults_to_require(monkeypatch):
    _set(monkeypatch, phi_production_mode=True)        # db_sslmode blank
    assert "sslmode=require" in database._apply_tls("postgresql://u:p@h/db")


def test_no_enforcement_when_unset(monkeypatch):
    _set(monkeypatch)                                  # dev/test, not phi-prod
    assert "sslmode" not in database._apply_tls("postgresql://u:p@h/db")


def test_sslrootcert_added_for_verify_full(monkeypatch):
    _set(monkeypatch, db_sslmode="verify-full", db_sslrootcert="/certs/rds-ca.pem")
    out = database._apply_tls("postgresql://u:p@h/db")
    assert "sslmode=verify-full" in out and "sslrootcert=" in out


def test_verify_db_tls_is_callable_and_safe():
    # Local dev Postgres has no SSL → False; must not raise.
    assert database.verify_db_tls() in (True, False)
