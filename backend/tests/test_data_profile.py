"""
Data profile + explorer feature tests.

Tests:
1.  profile_generates_column_metadata
2.  profile_cached_on_second_request
3.  columns_endpoint_returns_type_info
4.  preview_returns_paginated_rows
5.  filter_equals_works
6.  filter_between_works_for_numbers
7.  filter_contains_works_for_text
8.  filter_is_null_works
9.  chart_data_count_aggregation
10. chart_data_numeric_aggregation
11. client_cannot_access_other_clients_profile
12. missing_columns_do_not_crash_profile
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
    email = f"admin_dp_{tag}_{uuid.uuid4().hex[:5]}@test.com"
    u = create_user_with_profile(db, email=email, password="Admin123!", role="admin")
    db.commit()
    return u, email


def make_client_user(db, tag):
    email = f"client_dp_{tag}_{uuid.uuid4().hex[:5]}@test.com"
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
    "INC001,2024-01-15,2024-01-15 08:00:00,2024-01-15 08:10:00,UNIT1,EMS,Springfield,45,10",
    "INC002,2024-01-15,2024-01-15 09:00:00,2024-01-15 09:12:00,UNIT2,FIRE,Springfield,32,12",
    "INC003,2024-01-16,2024-01-16 10:00:00,2024-01-16 10:08:00,UNIT1,EMS,Shelbyville,67,8",
    "INC004,2024-01-16,2024-01-16 14:00:00,2024-01-16 14:15:00,UNIT3,EMS,Springfield,,15",
    "INC005,2024-01-17,2024-01-17 08:30:00,2024-01-17 08:38:00,UNIT2,EMS,Shelbyville,28,8",
    "INC006,2024-01-17,2024-01-17 11:00:00,2024-01-17 11:09:00,UNIT1,TRAUMA,Camden,55,9",
    "INC007,2024-01-18,2024-01-18 07:00:00,2024-01-18 07:20:00,UNIT3,EMS,Camden,72,20",
    "INC008,2024-01-18,2024-01-18 15:00:00,2024-01-18 15:06:00,UNIT2,FIRE,Springfield,41,6",
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

def test_profile_generates_column_metadata(client, db, tmp_path, monkeypatch):
    uid, _, admin_email = upload_and_clean(client, db, "p1", monkeypatch=monkeypatch, tmp_path=tmp_path)
    login(client, admin_email)
    r = client.get(f"/api/data/uploads/{uid}/profile")
    assert r.status_code == 200, r.text
    p = r.json()["profile"]
    assert p["row_count"] > 0
    assert p["column_count"] > 0
    assert "columns" in p
    assert "data_types" in p
    assert "missing_values" in p
    assert "unique_counts" in p
    assert "sample_values" in p
    assert "numeric_summary" in p
    logout(client)


def test_profile_cached_on_second_request(client, db, tmp_path, monkeypatch):
    uid, _, admin_email = upload_and_clean(client, db, "p2", monkeypatch=monkeypatch, tmp_path=tmp_path)
    login(client, admin_email)
    r1 = client.get(f"/api/data/uploads/{uid}/profile")
    assert r1.json()["cached"] is False
    r2 = client.get(f"/api/data/uploads/{uid}/profile")
    assert r2.json()["cached"] is True
    logout(client)


def test_columns_endpoint_returns_type_info(client, db, tmp_path, monkeypatch):
    uid, _, admin_email = upload_and_clean(client, db, "p3", monkeypatch=monkeypatch, tmp_path=tmp_path)
    login(client, admin_email)
    r = client.get(f"/api/data/uploads/{uid}/columns")
    assert r.status_code == 200
    cols = r.json()
    assert isinstance(cols, list)
    assert len(cols) > 0
    col = cols[0]
    assert "name" in col
    assert "type" in col
    assert "missing_pct" in col
    assert "unique_count" in col
    logout(client)


def test_preview_returns_paginated_rows(client, db, tmp_path, monkeypatch):
    uid, _, admin_email = upload_and_clean(client, db, "p4", monkeypatch=monkeypatch, tmp_path=tmp_path)
    login(client, admin_email)
    r = client.get(f"/api/data/uploads/{uid}/preview?limit=3&offset=0")
    assert r.status_code == 200
    data = r.json()
    assert "rows" in data
    assert "total" in data
    assert len(data["rows"]) == 3
    assert data["total"] >= 8
    logout(client)


def test_filter_equals_works(client, db, tmp_path, monkeypatch):
    uid, _, admin_email = upload_and_clean(client, db, "p5", monkeypatch=monkeypatch, tmp_path=tmp_path)
    login(client, admin_email)
    body = {
        "filters": [{"column": "municipality", "operator": "equals", "value": "Camden"}],
        "limit": 100, "offset": 0,
    }
    r = client.post(f"/api/data/uploads/{uid}/query", json=body)
    assert r.status_code == 200, r.text
    rows = r.json()["rows"]
    assert all(str(row.get("municipality", "")).strip() == "Camden" for row in rows)
    assert len(rows) >= 2
    logout(client)


def test_filter_between_works_for_numbers(client, db, tmp_path, monkeypatch):
    uid, _, admin_email = upload_and_clean(client, db, "p6", monkeypatch=monkeypatch, tmp_path=tmp_path)
    login(client, admin_email)
    body = {
        "filters": [{"column": "response_minutes", "operator": "between", "value": [8, 12]}],
        "limit": 100, "offset": 0,
    }
    r = client.post(f"/api/data/uploads/{uid}/query", json=body)
    assert r.status_code == 200, r.text
    rows = r.json()["rows"]
    for row in rows:
        v = row.get("response_minutes")
        if v is not None:
            assert 8 <= float(v) <= 12
    logout(client)


def test_filter_contains_works_for_text(client, db, tmp_path, monkeypatch):
    uid, _, admin_email = upload_and_clean(client, db, "p7", monkeypatch=monkeypatch, tmp_path=tmp_path)
    login(client, admin_email)
    body = {
        "filters": [{"column": "incident_number", "operator": "contains", "value": "INC00"}],
        "limit": 100, "offset": 0,
    }
    r = client.post(f"/api/data/uploads/{uid}/query", json=body)
    assert r.status_code == 200, r.text
    assert r.json()["total"] >= 8
    logout(client)


def test_filter_is_null_works(client, db, tmp_path, monkeypatch):
    uid, _, admin_email = upload_and_clean(client, db, "p8", monkeypatch=monkeypatch, tmp_path=tmp_path)
    login(client, admin_email)
    body = {
        "filters": [{"column": "age", "operator": "is_null"}],
        "limit": 100, "offset": 0,
    }
    r = client.post(f"/api/data/uploads/{uid}/query", json=body)
    assert r.status_code == 200, r.text
    rows = r.json()["rows"]
    assert len(rows) >= 1
    logout(client)


def test_chart_data_count_aggregation(client, db, tmp_path, monkeypatch):
    uid, _, admin_email = upload_and_clean(client, db, "p9", monkeypatch=monkeypatch, tmp_path=tmp_path)
    login(client, admin_email)
    body = {"x_col": "incident_type", "aggregation": "count", "chart_type": "bar", "filters": [], "limit": 20}
    r = client.post(f"/api/data/uploads/{uid}/chart-data", json=body)
    assert r.status_code == 200, r.text
    d = r.json()
    assert "data" in d
    assert len(d["data"]) > 0
    assert "name" in d["data"][0]
    assert "value" in d["data"][0]
    logout(client)


def test_chart_data_numeric_aggregation(client, db, tmp_path, monkeypatch):
    uid, _, admin_email = upload_and_clean(client, db, "p10", monkeypatch=monkeypatch, tmp_path=tmp_path)
    login(client, admin_email)
    body = {
        "x_col": "unit", "y_col": "response_minutes",
        "aggregation": "average", "chart_type": "bar", "filters": [], "limit": 20,
    }
    r = client.post(f"/api/data/uploads/{uid}/chart-data", json=body)
    assert r.status_code == 200, r.text
    d = r.json()
    assert "data" in d
    assert len(d["data"]) > 0
    logout(client)


def test_client_cannot_access_other_clients_profile(client, db, tmp_path, monkeypatch):
    uid, _, admin_email = upload_and_clean(client, db, "p11", monkeypatch=monkeypatch, tmp_path=tmp_path)
    logout(client)
    _, email_b = make_client_user(db, "p11b")
    login(client, email_b, pw="Client123!")
    r = client.get(f"/api/data/uploads/{uid}/profile")
    assert r.status_code == 403, r.text
    logout(client)


def test_missing_columns_do_not_crash_profile(client, db, tmp_path, monkeypatch):
    minimal = b"id,note\n1,hello\n2,world\n3,test\n"
    uid, _, admin_email = upload_and_clean(client, db, "p12", csv_bytes=minimal, monkeypatch=monkeypatch, tmp_path=tmp_path)
    login(client, admin_email)
    r = client.get(f"/api/data/uploads/{uid}/profile")
    assert r.status_code == 200, r.text
    p = r.json()["profile"]
    assert p["row_count"] >= 3
    assert p["column_count"] == 2
    logout(client)
