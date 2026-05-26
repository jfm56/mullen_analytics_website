"""
Data-upload feature tests.

Tests:
1.  admin_can_upload_csv_for_any_client
2.  client_can_upload_csv_for_own_account
3.  client_cannot_upload_for_another_client
4.  non_csv_upload_is_rejected
5.  client_cannot_access_another_clients_uploads
6.  cleaning_creates_cleaned_csv
7.  missing_value_summary_is_stored
8.  duplicate_count_is_stored
"""

import io
import uuid
import tempfile
import os
import pytest

from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker

from app.main import app
from app.database import get_db, Base
from app.services.auth import create_user_with_profile
from app.models.user import User, Profile
from app.models.data_upload import DataUpload, DataCleaningResult, EMSDashboardMetrics

# ---------------------------------------------------------------------------
# Test database
# ---------------------------------------------------------------------------

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
    """Create tables once per session; never drop mid-run so sibling modules keep their data."""
    Base.metadata.create_all(bind=test_engine)
    yield
    # Tables intentionally left; test_portal.py handles final teardown via its own fixture


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


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------

def make_admin(db, suffix="da"):
    email = f"admin_{suffix}_{uuid.uuid4().hex[:6]}@test.com"
    user = create_user_with_profile(db, email=email, password="Admin123!", role="admin")
    db.commit()
    return user, email


def make_client_user(db, suffix="dc"):
    email = f"client_{suffix}_{uuid.uuid4().hex[:6]}@test.com"
    user = create_user_with_profile(db, email=email, password="Client123!", role="client")
    db.commit()
    return user, email


def login(http_client, email, password="Admin123!"):
    resp = http_client.post("/api/auth/login", json={"email": email, "password": password})
    assert resp.status_code == 200, f"Login failed: {resp.text}"


def logout(http_client):
    http_client.post("/api/auth/logout")


def make_csv_bytes(rows=5, add_duplicates=0, add_empty_rows=0) -> bytes:
    """Build a minimal EMSCharts-style CSV in memory."""
    lines = [
        "Incident Number,Patient Name,Call Date,  Unit  ,Disposition,Age",
        "INC001,John Smith,2024-01-15,UNIT1,TRANSPORTED,45",
        "INC002,,2024-01-16,UNIT2,,",
        "INC003,Jane Doe,2024-01-17,UNIT1,REFUSED,32",
        "INC004,Bob Jones,,UNIT3,TRANSPORTED,",
        "INC005,Alice Brown,2024-01-19,UNIT2,CANCELLED,28",
    ]
    # add duplicate rows
    for _ in range(add_duplicates):
        lines.append("INC001,John Smith,2024-01-15,UNIT1,TRANSPORTED,45")
    # add completely empty rows
    for _ in range(add_empty_rows):
        lines.append(",,,,,")
    return "\n".join(lines).encode()


def upload_csv(http_client, csv_bytes=None, client_id=None, filename="test.csv", content_type="text/csv"):
    if csv_bytes is None:
        csv_bytes = make_csv_bytes()
    data = {"source_system": "EMSCHARTS"}
    if client_id:
        data["client_id"] = str(client_id)
    files = {"file": (filename, io.BytesIO(csv_bytes), content_type)}
    return http_client.post("/api/data/uploads", data=data, files=files)


# ---------------------------------------------------------------------------
# 1. Admin can upload CSV for any client
# ---------------------------------------------------------------------------

def test_admin_can_upload_csv_for_any_client(client, db):
    admin, admin_email = make_admin(db, "u1")
    target_client, _ = make_client_user(db, "u1")
    login(client, admin_email)

    resp = upload_csv(client, client_id=target_client.id)
    assert resp.status_code == 200, resp.text
    data = resp.json()
    assert data["client_id"] == str(target_client.id)
    assert data["upload_status"] == "UPLOADED"
    assert data["original_filename"] == "test.csv"

    logout(client)


# ---------------------------------------------------------------------------
# 2. Client can upload CSV for their own account
# ---------------------------------------------------------------------------

def test_client_can_upload_csv_for_own_account(client, db):
    _, client_email = make_client_user(db, "u2")
    login(client, client_email, password="Client123!")

    # client_id NOT supplied — backend uses the logged-in user's id
    data = {"source_system": "EMSCHARTS"}
    files = {"file": ("own.csv", io.BytesIO(make_csv_bytes()), "text/csv")}
    resp = client.post("/api/data/uploads", data=data, files=files)
    assert resp.status_code == 200, resp.text
    assert resp.json()["original_filename"] == "own.csv"

    logout(client)


# ---------------------------------------------------------------------------
# 3. Client cannot upload for another client
# ---------------------------------------------------------------------------

def test_client_cannot_upload_for_another_client(client, db):
    client_a, email_a = make_client_user(db, "u3a")
    client_b, _ = make_client_user(db, "u3b")
    login(client, email_a, password="Client123!")

    resp = upload_csv(client, client_id=client_b.id)
    assert resp.status_code == 403, resp.text

    logout(client)


# ---------------------------------------------------------------------------
# 4. Non-CSV upload is rejected
# ---------------------------------------------------------------------------

def test_non_csv_upload_is_rejected(client, db):
    admin, admin_email = make_admin(db, "u4")
    target, _ = make_client_user(db, "u4")
    login(client, admin_email)

    # Excel file
    data = {"client_id": str(target.id), "source_system": "EMSCHARTS"}
    files = {"file": ("data.xlsx", io.BytesIO(b"PK\x03\x04fake excel"), "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet")}
    resp = client.post("/api/data/uploads", data=data, files=files)
    assert resp.status_code == 400, resp.text
    assert "csv" in resp.json()["detail"].lower()

    logout(client)


# ---------------------------------------------------------------------------
# 5. Client cannot access another client's uploads
# ---------------------------------------------------------------------------

def test_client_cannot_access_another_clients_uploads(client, db):
    admin, admin_email = make_admin(db, "u5")
    client_a, email_a = make_client_user(db, "u5a")
    client_b, email_b = make_client_user(db, "u5b")

    # Admin uploads a file for client_a
    login(client, admin_email)
    resp = upload_csv(client, client_id=client_a.id)
    assert resp.status_code == 200
    upload_id = resp.json()["id"]
    logout(client)

    # client_b tries to access it
    login(client, email_b, password="Client123!")
    resp = client.get(f"/api/data/uploads/{upload_id}")
    assert resp.status_code == 403, resp.text
    logout(client)


# ---------------------------------------------------------------------------
# 6. Cleaning creates a cleaned CSV on disk
# ---------------------------------------------------------------------------

def test_cleaning_creates_cleaned_csv(client, db, tmp_path, monkeypatch):
    from app.config import get_settings, Settings

    # Redirect storage to a temp dir for this test
    test_uploads_root = str(tmp_path / "uploads")
    monkeypatch.setattr(get_settings(), "data_uploads_root", test_uploads_root)

    admin, admin_email = make_admin(db, "u6")
    target, _ = make_client_user(db, "u6")
    login(client, admin_email)

    resp = upload_csv(client, client_id=target.id, csv_bytes=make_csv_bytes(add_empty_rows=2))
    assert resp.status_code == 200, resp.text
    upload_id = resp.json()["id"]

    # Run cleaning
    clean_resp = client.post(f"/api/data/uploads/{upload_id}/clean")
    assert clean_resp.status_code == 200, clean_resp.text
    data = clean_resp.json()
    assert data["upload_status"] == "CLEANED"
    assert data["row_count_original"] is not None
    assert data["row_count_cleaned"] is not None

    logout(client)


# ---------------------------------------------------------------------------
# 7. Missing value summary is stored
# ---------------------------------------------------------------------------

def test_missing_value_summary_is_stored(client, db, tmp_path, monkeypatch):
    from app.config import get_settings

    monkeypatch.setattr(get_settings(), "data_uploads_root", str(tmp_path / "uploads7"))

    admin, admin_email = make_admin(db, "u7")
    target, _ = make_client_user(db, "u7")
    login(client, admin_email)

    # CSV has blanks in Patient Name and Age columns
    resp = upload_csv(client, client_id=target.id, csv_bytes=make_csv_bytes())
    assert resp.status_code == 200
    upload_id = resp.json()["id"]

    client.post(f"/api/data/uploads/{upload_id}/clean")

    results_resp = client.get(f"/api/data/uploads/{upload_id}/cleaning-results")
    assert results_resp.status_code == 200, results_resp.text
    results = results_resp.json()
    assert len(results) == 1
    summary = results[0]["missing_values_summary"]
    assert isinstance(summary, dict)
    # At least one column should have missing values given our test CSV
    assert len(summary) > 0

    logout(client)


# ---------------------------------------------------------------------------
# 8. Duplicate count is stored
# ---------------------------------------------------------------------------

def test_duplicate_count_is_stored(client, db, tmp_path, monkeypatch):
    from app.config import get_settings

    monkeypatch.setattr(get_settings(), "data_uploads_root", str(tmp_path / "uploads8"))

    admin, admin_email = make_admin(db, "u8")
    target, _ = make_client_user(db, "u8")
    login(client, admin_email)

    resp = upload_csv(client, client_id=target.id, csv_bytes=make_csv_bytes(add_duplicates=2))
    assert resp.status_code == 200
    upload_id = resp.json()["id"]

    client.post(f"/api/data/uploads/{upload_id}/clean")

    results_resp = client.get(f"/api/data/uploads/{upload_id}/cleaning-results")
    assert results_resp.status_code == 200
    results = results_resp.json()
    assert len(results) == 1
    assert results[0]["duplicate_rows_count"] == 2

    logout(client)


# ---------------------------------------------------------------------------
# 9. Dashboard metrics are generated after cleaning
# ---------------------------------------------------------------------------

def test_dashboard_metrics_generated_after_clean(client, db, tmp_path, monkeypatch):
    from app.config import get_settings
    monkeypatch.setattr(get_settings(), "data_uploads_root", str(tmp_path / "uploads9"))
    admin, admin_email = make_admin(db, "u9")
    target, _ = make_client_user(db, "u9")
    login(client, admin_email)
    resp = upload_csv(client, client_id=target.id, csv_bytes=make_csv_bytes())
    assert resp.status_code == 200
    upload_id = resp.json()["id"]
    client.post(f"/api/data/uploads/{upload_id}/clean")
    dash_resp = client.get(f"/api/data/uploads/{upload_id}/dashboard")
    assert dash_resp.status_code == 200, dash_resp.text
    data = dash_resp.json()
    assert "metrics" in data
    m = data["metrics"]
    assert "upload_summary" in m
    assert "call_volume" in m
    assert "data_quality" in m
    assert m["call_volume"]["total_calls"] > 0
    logout(client)


# ---------------------------------------------------------------------------
# 10. Missing columns do not crash the dashboard
# ---------------------------------------------------------------------------

def test_missing_columns_do_not_crash_dashboard(client, db, tmp_path, monkeypatch):
    from app.config import get_settings
    monkeypatch.setattr(get_settings(), "data_uploads_root", str(tmp_path / "uploads10"))
    minimal_csv = b"id,description\n1,test call\n2,another call\n"
    admin, admin_email = make_admin(db, "u10")
    target, _ = make_client_user(db, "u10")
    login(client, admin_email)
    resp = upload_csv(client, client_id=target.id, csv_bytes=minimal_csv)
    assert resp.status_code == 200
    upload_id = resp.json()["id"]
    client.post(f"/api/data/uploads/{upload_id}/clean")
    dash_resp = client.get(f"/api/data/uploads/{upload_id}/dashboard")
    assert dash_resp.status_code == 200, dash_resp.text
    m = dash_resp.json()["metrics"]
    assert m["response_times"].get("available") is False
    assert m["unit_performance"].get("available") is False
    logout(client)


# ---------------------------------------------------------------------------
# 11. Client cannot view another client's dashboard
# ---------------------------------------------------------------------------

def test_client_cannot_view_another_clients_dashboard(client, db, tmp_path, monkeypatch):
    from app.config import get_settings
    monkeypatch.setattr(get_settings(), "data_uploads_root", str(tmp_path / "uploads11"))
    admin, admin_email = make_admin(db, "u11")
    client_a, email_a = make_client_user(db, "u11a")
    _, email_b = make_client_user(db, "u11b")
    login(client, admin_email)
    resp = upload_csv(client, client_id=client_a.id, csv_bytes=make_csv_bytes())
    assert resp.status_code == 200
    upload_id = resp.json()["id"]
    client.post(f"/api/data/uploads/{upload_id}/clean")
    logout(client)
    login(client, email_b, password="Client123!")
    resp = client.get(f"/api/data/uploads/{upload_id}/dashboard")
    assert resp.status_code == 403, resp.text
    logout(client)


# ---------------------------------------------------------------------------
# 12. metrics_json contains frontend-ready structure with time+unit columns
# ---------------------------------------------------------------------------

def test_metrics_json_structure(client, db, tmp_path, monkeypatch):
    from app.config import get_settings
    monkeypatch.setattr(get_settings(), "data_uploads_root", str(tmp_path / "uploads12"))
    csv_rows = [
        "Incident Number,Call Date,Dispatch Time,Arrival Time,Unit,Incident Type,Municipality",
        "INC001,2024-01-15,2024-01-15 08:00:00,2024-01-15 08:10:00,UNIT1,EMS,Springfield",
        "INC002,2024-01-15,2024-01-15 09:00:00,2024-01-15 09:12:00,UNIT2,FIRE,Springfield",
        "INC003,2024-01-16,2024-01-16 10:00:00,2024-01-16 10:08:00,UNIT1,EMS,Shelbyville",
        "INC004,2024-01-16,2024-01-16 14:00:00,2024-01-16 14:15:00,UNIT3,EMS,Springfield",
        "INC005,2024-01-17,2024-01-17 08:30:00,2024-01-17 08:38:00,UNIT2,EMS,Shelbyville",
    ]
    csv_bytes = "\n".join(csv_rows).encode()
    admin, admin_email = make_admin(db, "u12")
    target, _ = make_client_user(db, "u12")
    login(client, admin_email)
    resp = upload_csv(client, client_id=target.id, csv_bytes=csv_bytes)
    assert resp.status_code == 200
    upload_id = resp.json()["id"]
    client.post(f"/api/data/uploads/{upload_id}/clean")
    dash_resp = client.get(f"/api/data/uploads/{upload_id}/dashboard")
    assert dash_resp.status_code == 200
    m = dash_resp.json()["metrics"]
    assert m["response_times"]["available"] is True
    assert m["response_times"]["median_minutes"] is not None
    assert isinstance(m["call_volume"].get("by_incident_type"), list)
    assert isinstance(m["call_volume"].get("by_municipality"), list)
    assert m["unit_performance"]["available"] is True
    assert len(m["unit_performance"]["calls_per_unit"]) > 0
    logout(client)
