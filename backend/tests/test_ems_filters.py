"""
EMS Filter Service tests.

Tests:
1.  filter_options_returns_units_munis_calltypes
2.  filter_by_unit_narrows_results
3.  filter_excludes_interfacility_transports
4.  filter_emergency_only_excludes_ift
5.  filter_by_date_range
6.  compare_two_units
7.  compare_returns_diff_metrics
8.  call_volume_deduplicates_by_incident_number
9.  call_volume_falls_back_to_row_count
10. interfacility_detection_multi_column
11. client_cannot_access_other_clients_filter
12. column_settings_ignore_and_restore
13. bulk_ignore_columns
14. ignored_columns_excluded_from_filter_options
"""

import io
import uuid
import pytest

from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker

from app.main import app
from app.database import get_db, Base
from app.services.auth import create_user_with_profile

TEST_DB_URL = "postgresql://postgres:postgres@localhost:5432/mullen_analytics_test"
test_engine = create_engine(TEST_DB_URL)
TestingSessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=test_engine)


def override_get_db():
    db = TestingSessionLocal()
    try:
        yield db
    finally:
        db.close()


@pytest.fixture(scope="session", autouse=True)
def setup_test_db():
    Base.metadata.create_all(bind=test_engine)
    yield


@pytest.fixture(scope="module")
def db():
    session = TestingSessionLocal()
    yield session
    session.close()


@pytest.fixture(scope="module")
def client():
    app.dependency_overrides[get_db] = override_get_db
    yield TestClient(app, raise_server_exceptions=True)
    app.dependency_overrides.pop(get_db, None)


# ── Helpers ────────────────────────────────────────────────────────────────────

def make_admin(db, tag):
    email = f"admin_flt_{tag}_{uuid.uuid4().hex[:5]}@test.com"
    u = create_user_with_profile(db, email=email, password="Admin123!", role="admin")
    db.commit()
    return u, email


def make_client_user(db, tag):
    email = f"client_flt_{tag}_{uuid.uuid4().hex[:5]}@test.com"
    u = create_user_with_profile(db, email=email, password="Client123!", role="client")
    db.commit()
    return u, email


def login(c, email, pw="Admin123!"):
    r = c.post("/api/auth/login", json={"email": email, "password": pw})
    assert r.status_code == 200


def logout(c):
    c.post("/api/auth/logout")


RICH_CSV = "\n".join([
    "Incident Number,Call Date,Dispatch Time,Arrival Time,Unit,Incident Type,Municipality,Age,Response Minutes",
    "INC001,2024-01-15,2024-01-15 08:00:00,2024-01-15 08:10:00,M62,EMS,Springfield,45,10",
    "INC002,2024-01-15,2024-01-15 09:00:00,2024-01-15 09:12:00,M65,FIRE,Springfield,32,12",
    "INC003,2024-01-16,2024-01-16 10:00:00,2024-01-16 10:08:00,M62,EMS,Shelbyville,67,8",
    "INC004,2024-01-16,2024-01-16 14:00:00,2024-01-16 14:15:00,M65,interfacility,Springfield,,15",
    "INC005,2024-01-17,2024-01-17 08:30:00,2024-01-17 08:38:00,M62,EMS,Shelbyville,28,8",
    "INC006,2024-01-17,2024-01-17 11:00:00,2024-01-17 11:09:00,M65,IFT Transfer,Camden,55,9",
    "INC007,2024-01-18,2024-01-18 07:00:00,2024-01-18 07:20:00,M62,EMS,Camden,72,20",
    "INC008,2024-01-18,2024-01-18 15:00:00,2024-01-18 15:06:00,M65,FIRE,Springfield,41,6",
]).encode()

IFT_CSV = "\n".join([
    "Incident Number,Call Date,Dispatch Time,Arrival Time,Unit,Incident Type,Municipality",
    "A001,2024-01-15,2024-01-15 08:00:00,2024-01-15 08:10:00,U1,EMS,City",
    "A002,2024-01-15,2024-01-15 09:00:00,2024-01-15 09:20:00,U1,interfacility,City",
    "A003,2024-01-15,2024-01-15 10:00:00,2024-01-15 10:15:00,U1,IFT Transfer,City",
    "A004,2024-01-15,2024-01-15 11:00:00,2024-01-15 11:10:00,U2,EMS,Suburb",
    "A005,2024-01-15,2024-01-15 12:00:00,2024-01-15 12:08:00,U2,bls transfer,Suburb",
]).encode()

DUP_INC_CSV = "\n".join([
    "Incident Number,Call Date,Unit,Incident Type",
    "INC001,2024-01-15,M62,EMS",
    "INC001,2024-01-15,M65,EMS",
    "INC002,2024-01-16,M62,FIRE",
    "INC003,2024-01-17,M62,EMS",
]).encode()


def upload_and_clean(c, db, tag, csv_bytes=None, monkeypatch=None, tmp_path=None):
    from app.config import get_settings
    if monkeypatch and tmp_path:
        monkeypatch.setattr(get_settings(), "data_uploads_root", str(tmp_path / f"uploads_{tag}"))
    admin, admin_email = make_admin(db, tag)
    target, _ = make_client_user(db, tag)
    login(c, admin_email)
    data = {"source_system": "EMSCHARTS", "client_id": str(target.id)}
    files = {"file": ("data.csv", io.BytesIO(csv_bytes or RICH_CSV), "text/csv")}
    r = c.post("/api/data/uploads", data=data, files=files)
    assert r.status_code == 200
    upload_id = r.json()["id"]
    c.post(f"/api/data/uploads/{upload_id}/clean")
    return upload_id, target, admin_email


# ── Tests ──────────────────────────────────────────────────────────────────────

def test_filter_options_returns_units_munis_calltypes(client, db, tmp_path, monkeypatch):
    uid, _, admin_email = upload_and_clean(client, db, "f1", monkeypatch=monkeypatch, tmp_path=tmp_path)
    login(client, admin_email)
    r = client.get(f"/api/data/uploads/{uid}/filter-options")
    assert r.status_code == 200, r.text
    data = r.json()
    assert "units" in data
    assert "municipalities" in data
    assert "call_types" in data
    assert "date_range" in data
    assert len(data["units"]) >= 2
    assert len(data["municipalities"]) >= 2
    logout(client)


def test_filter_by_unit_narrows_results(client, db, tmp_path, monkeypatch):
    uid, _, admin_email = upload_and_clean(client, db, "f2", monkeypatch=monkeypatch, tmp_path=tmp_path)
    login(client, admin_email)
    opts = client.get(f"/api/data/uploads/{uid}/filter-options").json()
    unit_val = opts["units"][0] if opts["units"] else "M62"
    r = client.post(f"/api/data/uploads/{uid}/dashboard/filter", json={"units": [unit_val]})
    assert r.status_code == 200, r.text
    data = r.json()
    assert "call_volume" in data
    total = data["call_volume"]["total"]
    assert 0 < total < 8
    logout(client)


def test_filter_excludes_interfacility_transports(client, db, tmp_path, monkeypatch):
    uid, _, admin_email = upload_and_clean(client, db, "f3", csv_bytes=IFT_CSV, monkeypatch=monkeypatch, tmp_path=tmp_path)
    login(client, admin_email)
    r_all = client.post(f"/api/data/uploads/{uid}/dashboard/filter", json={})
    r_excl = client.post(f"/api/data/uploads/{uid}/dashboard/filter", json={"exclude_interfacility": True})
    assert r_all.status_code == 200
    assert r_excl.status_code == 200
    total_all = r_all.json()["call_volume"]["total"]
    total_excl = r_excl.json()["call_volume"]["total"]
    assert total_excl < total_all
    logout(client)


def test_filter_emergency_only_excludes_ift(client, db, tmp_path, monkeypatch):
    uid, _, admin_email = upload_and_clean(client, db, "f4", csv_bytes=IFT_CSV, monkeypatch=monkeypatch, tmp_path=tmp_path)
    login(client, admin_email)
    r_all = client.post(f"/api/data/uploads/{uid}/dashboard/filter", json={})
    r_emerg = client.post(f"/api/data/uploads/{uid}/dashboard/filter", json={"emergency_only": True})
    assert r_emerg.status_code == 200
    assert r_emerg.json()["call_volume"]["total"] < r_all.json()["call_volume"]["total"]
    logout(client)


def test_filter_by_date_range(client, db, tmp_path, monkeypatch):
    uid, _, admin_email = upload_and_clean(client, db, "f5", monkeypatch=monkeypatch, tmp_path=tmp_path)
    login(client, admin_email)
    r = client.post(f"/api/data/uploads/{uid}/dashboard/filter",
                    json={"date_range": ["2024-01-15", "2024-01-16"]})
    assert r.status_code == 200, r.text
    total = r.json()["call_volume"]["total"]
    assert 0 < total <= 4
    logout(client)


def test_compare_two_units(client, db, tmp_path, monkeypatch):
    uid, _, admin_email = upload_and_clean(client, db, "f6", monkeypatch=monkeypatch, tmp_path=tmp_path)
    login(client, admin_email)
    opts = client.get(f"/api/data/uploads/{uid}/filter-options").json()
    units = opts.get("units", ["M62", "M65"])
    ua, ub = (units[0], units[1]) if len(units) >= 2 else ("M62", "M65")
    body = {
        "group_a": {"label": ua, "filters": {"units": [ua]}},
        "group_b": {"label": ub, "filters": {"units": [ub]}},
    }
    r = client.post(f"/api/data/uploads/{uid}/dashboard/compare", json=body)
    assert r.status_code == 200, r.text
    data = r.json()
    assert "group_a" in data
    assert "group_b" in data
    assert "diff" in data
    assert data["group_a"]["label"] == ua
    assert data["group_b"]["label"] == ub
    logout(client)


def test_compare_returns_diff_metrics(client, db, tmp_path, monkeypatch):
    uid, _, admin_email = upload_and_clean(client, db, "f7", monkeypatch=monkeypatch, tmp_path=tmp_path)
    login(client, admin_email)
    body = {
        "group_a": {"label": "All", "filters": {}},
        "group_b": {"label": "No IFT", "filters": {"exclude_interfacility": True}},
    }
    r = client.post(f"/api/data/uploads/{uid}/dashboard/compare", json=body)
    assert r.status_code == 200, r.text
    diff = r.json()["diff"]
    assert "calls" in diff
    assert "response_time_median" in diff
    logout(client)


def test_call_volume_deduplicates_by_incident_number(client, db, tmp_path, monkeypatch):
    uid, _, admin_email = upload_and_clean(client, db, "f8", csv_bytes=DUP_INC_CSV, monkeypatch=monkeypatch, tmp_path=tmp_path)
    login(client, admin_email)
    r = client.post(f"/api/data/uploads/{uid}/dashboard/filter", json={})
    assert r.status_code == 200, r.text
    vol = r.json()["call_volume"]
    assert vol["total"] == 3
    assert "incident" in vol["method"].lower()
    logout(client)


def test_call_volume_falls_back_to_row_count(client, db, tmp_path, monkeypatch):
    no_incident_csv = b"Call Date,Unit,Type\n2024-01-15,M1,EMS\n2024-01-15,M2,FIRE\n2024-01-16,M1,EMS\n"
    uid, _, admin_email = upload_and_clean(client, db, "f9", csv_bytes=no_incident_csv, monkeypatch=monkeypatch, tmp_path=tmp_path)
    login(client, admin_email)
    r = client.post(f"/api/data/uploads/{uid}/dashboard/filter", json={})
    assert r.status_code == 200, r.text
    vol = r.json()["call_volume"]
    assert vol["total"] >= 3
    logout(client)


def test_interfacility_detection_multi_column(client, db, tmp_path, monkeypatch):
    multi_col_csv = b"id,call_type,transport_type,unit\n1,EMS,ALS Transport,M1\n2,EMS,interfacility,M1\n3,FIRE,ALS Transport,M2\n4,EMS,bls transfer,M2\n"
    uid, _, admin_email = upload_and_clean(client, db, "f10", csv_bytes=multi_col_csv, monkeypatch=monkeypatch, tmp_path=tmp_path)
    login(client, admin_email)
    r = client.get(f"/api/data/uploads/{uid}/filter-options")
    assert r.status_code == 200
    ift_count = r.json()["interfacility_count"]
    assert ift_count >= 2
    logout(client)


def test_client_cannot_access_other_clients_filter(client, db, tmp_path, monkeypatch):
    uid, _, admin_email = upload_and_clean(client, db, "f11", monkeypatch=monkeypatch, tmp_path=tmp_path)
    logout(client)
    _, email_b = make_client_user(db, "f11b")
    login(client, email_b, pw="Client123!")
    r = client.post(f"/api/data/uploads/{uid}/dashboard/filter", json={})
    assert r.status_code == 403
    logout(client)


def test_column_settings_ignore_and_restore(client, db, tmp_path, monkeypatch):
    uid, _, admin_email = upload_and_clean(client, db, "f12", monkeypatch=monkeypatch, tmp_path=tmp_path)
    login(client, admin_email)
    r = client.patch(f"/api/data/uploads/{uid}/columns/settings",
                     json=[{"column_name": "age", "is_ignored": True, "reason": "test"}])
    assert r.status_code == 200, r.text
    settings = {s["column_name"]: s for s in r.json()}
    assert settings["age"]["is_ignored"] is True

    r2 = client.patch(f"/api/data/uploads/{uid}/columns/settings",
                      json=[{"column_name": "age", "is_ignored": False}])
    settings2 = {s["column_name"]: s for s in r2.json()}
    assert settings2["age"]["is_ignored"] is False
    logout(client)


def test_bulk_ignore_columns(client, db, tmp_path, monkeypatch):
    uid, _, admin_email = upload_and_clean(client, db, "f13", monkeypatch=monkeypatch, tmp_path=tmp_path)
    login(client, admin_email)
    r = client.post(f"/api/data/uploads/{uid}/columns/bulk-ignore",
                    json={"column_names": ["age", "response_minutes"], "reason": "bulk test"})
    assert r.status_code == 200, r.text
    settings = {s["column_name"]: s for s in r.json()}
    assert settings["age"]["is_ignored"] is True
    assert settings["response_minutes"]["is_ignored"] is True
    logout(client)


def test_ignored_columns_excluded_from_filter_options(client, db, tmp_path, monkeypatch):
    uid, _, admin_email = upload_and_clean(client, db, "f14", monkeypatch=monkeypatch, tmp_path=tmp_path)
    login(client, admin_email)
    client.patch(f"/api/data/uploads/{uid}/columns/settings",
                 json=[{"column_name": "unit", "is_ignored": True}])
    r = client.get(f"/api/data/uploads/{uid}/filter-options")
    assert r.status_code == 200
    assert r.json()["units"] == []
    logout(client)
