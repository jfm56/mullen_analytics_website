"""
Column Mapping tests.

Tests:
1.  get_mapping_returns_fields_and_columns        – GET returns all 13 analytics fields + CSV columns
2.  autodetect_recognises_emscharts_columns       – POST autodetect maps date_dispatched → dispatch_datetime etc.
3.  save_mapping_persists                         – PATCH saves rows; GET returns them on next call
4.  saved_mapping_used_in_dashboard               – after PATCH dashboard metrics include response_times
5.  reset_mapping_clears_rows                     – DELETE removes all rows; GET returns empty mapping
6.  preview_metrics_without_saving                – POST preview returns metrics without DB write
7.  response_time_segments_returned               – dispatch→enroute→arrival breakdown present
8.  client_cannot_map_other_clients_upload        – client gets 403 on another client's upload
9.  call_volume_uses_mapped_call_id               – unique call_id used when call_id is mapped
10. municipality_mapped_to_scene_grid             – municipality correctly uses scene_grid column
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


# ── Helpers ─────────────────────────────────────────────────────────────────

def make_admin(db, tag):
    email = f"admin_cm_{tag}_{uuid.uuid4().hex[:5]}@test.com"
    u = create_user_with_profile(db, email=email, password="Admin123!", role="admin")
    db.commit()
    return u, email


def make_client_user(db, tag):
    email = f"client_cm_{tag}_{uuid.uuid4().hex[:5]}@test.com"
    u = create_user_with_profile(db, email=email, password="Client123!", role="client")
    db.commit()
    return u, email


def login(c, email, pw="Admin123!"):
    r = c.post("/api/auth/login", json={"email": email, "password": pw})
    assert r.status_code == 200


def logout(c):
    c.post("/api/auth/logout")


# EMSCharts-style CSV with columns that need mapping
EMSCHARTS_CSV = "\n".join([
    "incident_number,date_dispatched,date_received,date_enroute,date_arrived,date_available,"
    "unit,scene_grid,type_of_service_ihscene,patient_category,response_mode",
    "INC001,2024-01-15 08:05:00,2024-01-15 08:00:00,2024-01-15 08:07:00,2024-01-15 08:12:00,2024-01-15 08:45:00,"
    "M62,NW Zone,BLS,Sick,Emergency",
    "INC002,2024-01-15 09:15:00,2024-01-15 09:10:00,2024-01-15 09:18:00,2024-01-15 09:25:00,2024-01-15 10:00:00,"
    "M65,SE Zone,ALS,Trauma,Emergency",
    "INC003,2024-01-15 11:00:00,2024-01-15 10:55:00,2024-01-15 11:03:00,2024-01-15 11:09:00,2024-01-15 11:40:00,"
    "M62,NW Zone,BLS,Sick,Emergency",
    "INC001,2024-01-15 08:05:00,2024-01-15 08:00:00,2024-01-15 08:07:00,2024-01-15 08:12:00,2024-01-15 08:45:00,"
    "M63,NW Zone,BLS,Sick,Emergency",
    "INC004,2024-01-16 14:00:00,2024-01-16 13:55:00,2024-01-16 14:03:00,2024-01-16 14:10:00,2024-01-16 14:50:00,"
    "M65,SW Zone,ALS,Cardiac,Emergency",
    "INC005,2024-01-16 16:30:00,2024-01-16 16:25:00,2024-01-16 16:33:00,2024-01-16 16:40:00,2024-01-16 17:15:00,"
    "M62,NE Zone,BLS,Fall,Routine",
]).encode()

MAPPING = {
    "call_id":              "incident_number",
    "dispatch_datetime":    "date_dispatched",
    "received_datetime":    "date_received",
    "enroute_datetime":     "date_enroute",
    "arrival_datetime":     "date_arrived",
    "available_datetime":   "date_available",
    "unit":                 "unit",
    "municipality_or_zone": "scene_grid",
    "incident_type":        "type_of_service_ihscene",
    "service_type":         "type_of_service_ihscene",
    "patient_category":     "patient_category",
    "response_mode":        "response_mode",
    "priority":             None,
}


def upload_and_clean(c, db, tag, csv_bytes=None, monkeypatch=None, tmp_path=None):
    from app.config import get_settings
    if monkeypatch and tmp_path:
        monkeypatch.setattr(get_settings(), "data_uploads_root", str(tmp_path / f"cm_{tag}"))
    admin, admin_email = make_admin(db, tag)
    target, _ = make_client_user(db, tag)
    login(c, admin_email)
    data = {"source_system": "EMSCHARTS", "client_id": str(target.id)}
    files = {"file": ("data.csv", io.BytesIO(csv_bytes or EMSCHARTS_CSV), "text/csv")}
    r = c.post("/api/data/uploads", data=data, files=files)
    assert r.status_code == 200, r.text
    uid = r.json()["id"]
    r2 = c.post(f"/api/data/uploads/{uid}/clean")
    assert r2.status_code == 200, r2.text
    return uid, target, admin_email


# ── Tests ────────────────────────────────────────────────────────────────────

def test_get_mapping_returns_fields_and_columns(client, db, tmp_path, monkeypatch):
    uid, _, admin_email = upload_and_clean(client, db, "cm1", monkeypatch=monkeypatch, tmp_path=tmp_path)
    login(client, admin_email)
    r = client.get(f"/api/data/uploads/{uid}/column-mapping")
    assert r.status_code == 200, r.text
    data = r.json()
    assert "analytics_fields" in data
    assert "available_columns" in data
    assert "mapping" in data
    field_names = [f["field"] for f in data["analytics_fields"]]
    assert "dispatch_datetime" in field_names
    assert "arrival_datetime" in field_names
    assert "unit" in field_names
    assert len(data["available_columns"]) > 0
    logout(client)


def test_autodetect_recognises_emscharts_columns(client, db, tmp_path, monkeypatch):
    uid, _, admin_email = upload_and_clean(client, db, "cm2", monkeypatch=monkeypatch, tmp_path=tmp_path)
    login(client, admin_email)
    r = client.post(f"/api/data/uploads/{uid}/column-mapping/autodetect")
    assert r.status_code == 200, r.text
    mapping = r.json()["mapping"]
    assert mapping.get("dispatch_datetime") == "date_dispatched"
    assert mapping.get("arrival_datetime") == "date_arrived"
    assert mapping.get("unit") == "unit"
    assert mapping.get("municipality_or_zone") == "scene_grid"
    assert mapping.get("incident_type") == "type_of_service_ihscene"
    logout(client)


def test_save_mapping_persists(client, db, tmp_path, monkeypatch):
    uid, _, admin_email = upload_and_clean(client, db, "cm3", monkeypatch=monkeypatch, tmp_path=tmp_path)
    login(client, admin_email)
    r = client.patch(f"/api/data/uploads/{uid}/column-mapping", json={"mapping": MAPPING})
    assert r.status_code == 200, r.text
    assert r.json()["metrics_regenerated"] is True
    # Verify persistence
    r2 = client.get(f"/api/data/uploads/{uid}/column-mapping")
    assert r2.status_code == 200
    saved = r2.json()["mapping"]
    assert saved.get("dispatch_datetime") == "date_dispatched"
    assert saved.get("arrival_datetime") == "date_arrived"
    logout(client)


def test_saved_mapping_used_in_dashboard(client, db, tmp_path, monkeypatch):
    uid, _, admin_email = upload_and_clean(client, db, "cm4", monkeypatch=monkeypatch, tmp_path=tmp_path)
    login(client, admin_email)
    # Without mapping — response_times likely unavailable (no standard column names)
    r0 = client.get(f"/api/data/uploads/{uid}/dashboard")
    assert r0.status_code == 200
    rt_before = r0.json()["metrics"].get("response_times", {})

    # Save mapping
    client.patch(f"/api/data/uploads/{uid}/column-mapping", json={"mapping": MAPPING})

    # With mapping — response_times should now be available
    r = client.get(f"/api/data/uploads/{uid}/dashboard")
    assert r.status_code == 200
    rt = r.json()["metrics"].get("response_times", {})
    assert rt.get("available") is True, f"Expected response_times available=True, got: {rt}"
    assert rt.get("median_minutes") is not None
    logout(client)


def test_reset_mapping_clears_rows(client, db, tmp_path, monkeypatch):
    uid, _, admin_email = upload_and_clean(client, db, "cm5", monkeypatch=monkeypatch, tmp_path=tmp_path)
    login(client, admin_email)
    client.patch(f"/api/data/uploads/{uid}/column-mapping", json={"mapping": MAPPING})
    # Reset
    r = client.delete(f"/api/data/uploads/{uid}/column-mapping")
    assert r.status_code == 200
    assert r.json()["reset"] is True
    # Verify empty
    r2 = client.get(f"/api/data/uploads/{uid}/column-mapping")
    assert r2.json()["mapping"] == {}
    logout(client)


def test_preview_metrics_without_saving(client, db, tmp_path, monkeypatch):
    uid, _, admin_email = upload_and_clean(client, db, "cm6", monkeypatch=monkeypatch, tmp_path=tmp_path)
    login(client, admin_email)
    r = client.post(f"/api/data/uploads/{uid}/preview-metrics", json={"mapping": MAPPING})
    assert r.status_code == 200, r.text
    data = r.json()
    assert data.get("response_times", {}).get("available") is True
    # Verify mapping was NOT saved
    r2 = client.get(f"/api/data/uploads/{uid}/column-mapping")
    assert r2.json()["mapping"] == {}
    logout(client)


def test_response_time_segments_returned(client, db, tmp_path, monkeypatch):
    uid, _, admin_email = upload_and_clean(client, db, "cm7", monkeypatch=monkeypatch, tmp_path=tmp_path)
    login(client, admin_email)
    client.patch(f"/api/data/uploads/{uid}/column-mapping", json={"mapping": MAPPING})
    r = client.get(f"/api/data/uploads/{uid}/dashboard")
    assert r.status_code == 200
    rt = r.json()["metrics"]["response_times"]
    assert rt["available"] is True
    # Should have segment breakdowns since all time cols are mapped
    assert rt.get("dispatch_to_enroute_median") is not None
    assert rt.get("enroute_to_arrival_median") is not None
    logout(client)


def test_client_cannot_map_other_clients_upload(client, db, tmp_path, monkeypatch):
    uid, _, admin_email = upload_and_clean(client, db, "cm8", monkeypatch=monkeypatch, tmp_path=tmp_path)
    # Create a different client user
    other_email = f"other_cm_{uuid.uuid4().hex[:6]}@test.com"
    create_user_with_profile(db, email=other_email, password="Other123!", role="client")
    db.commit()
    login(client, other_email, pw="Other123!")
    r = client.patch(f"/api/data/uploads/{uid}/column-mapping", json={"mapping": MAPPING})
    assert r.status_code == 403
    logout(client)


def test_call_volume_uses_mapped_call_id(client, db, tmp_path, monkeypatch):
    uid, _, admin_email = upload_and_clean(client, db, "cm9", monkeypatch=monkeypatch, tmp_path=tmp_path)
    login(client, admin_email)
    # CSV has 6 rows but only 5 unique incident_numbers (INC001 appears twice)
    client.patch(f"/api/data/uploads/{uid}/column-mapping", json={"mapping": MAPPING})
    r = client.get(f"/api/data/uploads/{uid}/dashboard")
    assert r.status_code == 200
    cv = r.json()["metrics"]["call_volume"]
    # Should dedup: 5 unique IDs not 6 rows
    assert cv["total"] == 5
    assert cv["method"] == "unique_incident_number"
    logout(client)


def test_municipality_mapped_to_scene_grid(client, db, tmp_path, monkeypatch):
    uid, _, admin_email = upload_and_clean(client, db, "cm10", monkeypatch=monkeypatch, tmp_path=tmp_path)
    login(client, admin_email)
    client.patch(f"/api/data/uploads/{uid}/column-mapping", json={"mapping": MAPPING})
    r = client.get(f"/api/data/uploads/{uid}/dashboard")
    assert r.status_code == 200
    cv = r.json()["metrics"]["call_volume"]
    # by_municipality should be populated from scene_grid values
    assert isinstance(cv.get("by_municipality"), list)
    zones = {entry["label"] for entry in cv["by_municipality"]}
    assert len(zones) > 0
    assert any("Zone" in z for z in zones)
    logout(client)
