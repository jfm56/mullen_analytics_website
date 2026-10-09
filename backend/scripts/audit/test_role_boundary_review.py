"""Offline regression checks; PostgreSQL integration checks remain required."""
from types import SimpleNamespace
import os
from pathlib import Path
import subprocess
import sys
import pytest
from sqlalchemy.engine import make_url
from app import database
from app.security_rls import apply_rls, _grant_verbs


@pytest.mark.parametrize('secret', [None, '', 'ordinary-secret'])
def test_provisioning_rejects_missing_or_shared_secret_before_connecting(secret):
    class MustNotConnect:
        def begin(self):
            pytest.fail('credential preflight must run before any database mutation')
    with pytest.raises(ValueError, match='distinct'):
        apply_rls(MustNotConnect(), app_role_password='ordinary-secret',
                  platform_role_password=secret)


def test_new_table_does_not_implicitly_receive_crud():
    with pytest.raises(ValueError, match='No reviewed'):
        _grant_verbs('unreviewed_new_table')


def test_append_only_and_reviewed_crud_profiles():
    assert _grant_verbs('audit_logs') == 'SELECT, INSERT'
    assert _grant_verbs('users') == 'SELECT, INSERT, UPDATE, DELETE'


@pytest.fixture
def platform_settings(monkeypatch):
    monkeypatch.setattr(database, 'settings', SimpleNamespace(
        auth_mode='cognito', platform_database_url='', platform_db_user='app_platform',
        platform_db_password='platform-secret', app_db_password='ordinary-secret'))
    monkeypatch.setattr(database, '_get_database_url', lambda: make_url(
        'postgresql+psycopg://app_user:ordinary-secret@localhost/synthetic'))
    monkeypatch.delenv('PLATFORM_DATABASE_URL', raising=False)


def test_platform_url_derives_from_explicit_runtime_url(platform_settings):
    url = database._get_platform_url()
    assert url.username == 'app_platform'
    assert url.password == 'platform-secret'
    assert url.database == 'synthetic'


@pytest.mark.parametrize('url', [
    'postgresql://app_user:other-secret@localhost/synthetic',
    'postgresql://app_platform:ordinary-secret@localhost/synthetic',
    'postgresql://app_platform@localhost/synthetic',
])
def test_platform_override_rejects_wrong_role_or_shared_secret(platform_settings, monkeypatch, url):
    monkeypatch.setenv('PLATFORM_DATABASE_URL', url)
    with pytest.raises(ValueError, match='dedicated role'):
        database._get_platform_url()


def test_worker_import_needs_no_platform_credential():
    env = dict(os.environ, AUTH_MODE="cognito", PLATFORM_DB_PASSWORD="",
               PLATFORM_DATABASE_URL="", APP_DB_PASSWORD="ordinary-secret",
               DATABASE_URL="postgresql://app_user:ordinary-secret@localhost/synthetic")
    backend = Path(__file__).resolve().parents[2]
    env["PYTHONPATH"] = str(backend)
    result = subprocess.run([
        sys.executable, "-c",
        "import worker; from app.database import get_platform_engine; "
        "assert get_platform_engine.cache_info().currsize == 0"
    ], env=env, capture_output=True, text=True, check=False)
    assert result.returncode == 0, result.stderr


def test_platform_engine_fails_closed_when_secret_missing(platform_settings, monkeypatch):
    monkeypatch.setattr(database.settings, "platform_db_password", "")
    database.get_platform_engine.cache_clear()
    with pytest.raises(ValueError, match="distinct"):
        database.get_platform_engine()


def test_migration_core_metadata_has_every_reviewed_grant_table():
    from app import models  # noqa: F401 – register core models without API startup
    from app.security_rls import _CRUD_TABLES, _APPEND_ONLY_TABLES, _QA_TABLE_NAMES
    expected = (_CRUD_TABLES | _APPEND_ONLY_TABLES) - _QA_TABLE_NAMES
    assert expected <= set(database.Base.metadata.tables)


def test_worker_validates_database_before_connecting_to_queue(monkeypatch):
    import worker
    from app import startup_checks
    monkeypatch.setattr(worker, "get_settings", lambda: SimpleNamespace(
        job_backend="sqs", pipeline_queue_url="synthetic", environment="staging",
        auth_mode="cognito", emscs_qa_v1_enabled=False))
    def refuse(*args, **kwargs):
        raise RuntimeError("synthetic database validation refused startup")
    monkeypatch.setattr(startup_checks, "assert_runtime_ready", refuse)
    monkeypatch.setattr(worker, "_client", lambda settings: pytest.fail("queue accessed before validation"))
    with pytest.raises(RuntimeError, match="validation refused"):
        worker.run_forever()
