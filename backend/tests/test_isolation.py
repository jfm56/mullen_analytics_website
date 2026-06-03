"""
Integration tests — multi-agency data isolation.

CRITICAL SCOPE: These tests guard against cross-agency data leakage.
Run the full suite before shipping any new endpoint that touches agency data,
especially the comparison, scheduled-runs, and heatmap endpoints.

Failure of any test here means one customer's data is reachable by another.
"""
import pytest


def _make_user(db, email, role="user", password="IsolPass1!"):
    from app.models.user import User, Profile       # noqa: PLC0415
    from app.services.auth import hash_password     # noqa: PLC0415
    u = User(email=email, password_hash=hash_password(password), email_confirmed=True)
    db.add(u)
    db.flush()
    db.add(Profile(id=u.id, email=u.email, role=role, full_name=email.split("@")[0]))
    return u


def _make_agency(db, name):
    from app.models.agency import Agency            # noqa: PLC0415
    import uuid                                     # noqa: PLC0415
    a = Agency(
        agency_name=name,
        slug=f"{name.lower().replace(' ', '-')}-{uuid.uuid4().hex[:6]}",
        status="active",
        subscription_tier="essential",
    )
    db.add(a)
    db.flush()
    return a


def _add_member(db, agency_id, user_id):
    from app.models.agency import AgencyMembership  # noqa: PLC0415
    db.add(AgencyMembership(agency_id=str(agency_id), user_id=str(user_id), role="member"))


def _login(client, email, password="IsolPass1!"):
    res = client.post("/api/auth/login", json={"email": email, "password": password})
    assert res.status_code == 200, f"Login failed for {email}: {res.text}"


# ---------------------------------------------------------------------------
# Core isolation: user A cannot reach agency B endpoints
# ---------------------------------------------------------------------------

def test_agency_data_isolation(db, client):
    """User A (member of agency A) must receive 403 on all agency B endpoints."""
    agency_a = _make_agency(db, "Alpha EMS")
    agency_b = _make_agency(db, "Beta EMS")

    user_a = _make_user(db, "user-a@alpha.example.com")
    user_b = _make_user(db, "user-b@beta.example.com")

    _add_member(db, agency_a.id, user_a.id)
    _add_member(db, agency_b.id, user_b.id)
    db.commit()

    _login(client, "user-a@alpha.example.com")

    for method, path, kwargs in [
        ("get",   f"/api/agencies/{agency_b.id}",                              {}),
        ("get",   f"/api/agencies/{agency_b.id}/files",                        {}),
        ("get",   f"/api/agencies/{agency_b.id}/pipeline/runs",                {}),
        ("get",   f"/api/agencies/{agency_b.id}/analytics-config",             {}),
        ("patch", f"/api/agencies/{agency_b.id}/analytics-config",
                  {"json": {"risk_score": {"nfpa_target_seconds": 999}}}),
    ]:
        fn    = getattr(client, method)
        res   = fn(path, **kwargs)
        assert res.status_code == 403, (
            f"ISOLATION BREACH: {method.upper()} {path} returned {res.status_code} for user-a "
            f"(member of agency A only). Expected 403."
        )


# ---------------------------------------------------------------------------
# Auth: agency member cannot modify analytics config (threshold manipulation)
# ---------------------------------------------------------------------------

def test_analytics_config_patch_requires_admin(db, client):
    """Agency member CANNOT change compliance thresholds even for their own agency."""
    agency = _make_agency(db, "Threshold Test EMS")
    user   = _make_user(db, "chief@threshold.example.com", role="user")
    _add_member(db, agency.id, user.id)
    db.commit()

    _login(client, "chief@threshold.example.com")

    res = client.patch(
        f"/api/agencies/{agency.id}/analytics-config",
        json={"risk_score": {"nfpa_target_seconds": 9999}},
    )
    assert res.status_code == 403, (
        f"THRESHOLD MANIPULATION: agency member was able to PATCH analytics-config "
        f"(status={res.status_code}). Only admin role should succeed."
    )


def test_analytics_config_get_allowed_for_member(db, client):
    """Agency member CAN read (but not write) analytics config for their own agency."""
    agency = _make_agency(db, "Read Config EMS")
    user   = _make_user(db, "reader@config.example.com", role="user")
    _add_member(db, agency.id, user.id)
    db.commit()

    _login(client, "reader@config.example.com")

    res = client.get(f"/api/agencies/{agency.id}/analytics-config")
    assert res.status_code == 200
    assert "config" in res.json()


def test_analytics_config_patch_succeeds_for_admin(db, client):
    """Admin CAN update analytics config."""
    admin  = _make_user(db, "admin-config@mullen.example.com", role="admin")
    agency = _make_agency(db, "Admin Config EMS")
    _add_member(db, agency.id, admin.id)
    db.commit()

    _login(client, "admin-config@mullen.example.com")

    res = client.patch(
        f"/api/agencies/{agency.id}/analytics-config",
        json={"risk_score": {"nfpa_target_seconds": 360}},
    )
    assert res.status_code == 200


# ---------------------------------------------------------------------------
# Unauthenticated: all agency endpoints must reject anonymous requests
# ---------------------------------------------------------------------------

def test_unauthenticated_access_blocked(db, client):
    """No cookies = 401 on all agency endpoints (sanity guard)."""
    agency = _make_agency(db, "Anon Test EMS")
    db.commit()

    for method, path in [
        ("get",   f"/api/agencies/{agency.id}"),
        ("get",   f"/api/agencies/{agency.id}/pipeline/runs"),
        ("get",   f"/api/agencies/{agency.id}/analytics-config"),
        ("patch", f"/api/agencies/{agency.id}/analytics-config"),
    ]:
        client.cookies.clear()
        res = getattr(client, method)(path)
        assert res.status_code in (401, 403), (
            f"UNAUTHENTICATED ACCESS: {method.upper()} {path} returned {res.status_code}"
        )


# ---------------------------------------------------------------------------
# Client upload isolation: client A's data upload is invisible to client B
# ---------------------------------------------------------------------------

def _make_data_upload(db, owner_user_id):
    from app.models.data_upload import DataUpload   # noqa: PLC0415
    up = DataUpload(
        client_id=owner_user_id,
        uploaded_by_user_id=owner_user_id,
        original_filename="secret.csv",
        stored_filename="stored_secret.csv",
        file_path="/tmp/stored_secret.csv",
        file_size=42,
        source_system="EMSCHARTS",
        upload_status="UPLOADED",
    )
    db.add(up)
    db.flush()
    return up


def test_client_upload_isolation(db, client):
    """Client B must not see or reach client A's data upload (IDOR guard)."""
    user_a = _make_user(db, "client-a@isolation.example.com", role="client")
    user_b = _make_user(db, "client-b@isolation.example.com", role="client")
    db.flush()
    upload = _make_data_upload(db, user_a.id)
    db.commit()
    upload_id = str(upload.id)

    # Owner (client A) can see and reach their own upload.
    _login(client, "client-a@isolation.example.com")
    res_a = client.get("/api/data/uploads")
    assert res_a.status_code == 200
    assert any(u["id"] == upload_id for u in res_a.json()), "Client A should see their own upload"

    # Client B is fully isolated.
    client.cookies.clear()
    _login(client, "client-b@isolation.example.com")

    list_b = client.get("/api/data/uploads")
    assert list_b.status_code == 200
    assert all(u["id"] != upload_id for u in list_b.json()), (
        "ISOLATION BREACH: client B can see client A's upload in the list"
    )

    for method, path, kwargs in [
        ("get",    f"/api/data/uploads/{upload_id}",                   {}),
        ("get",    f"/api/data/uploads/{upload_id}/dashboard",         {}),
        ("get",    f"/api/data/uploads/{upload_id}/cleaning-results",  {}),
        ("get",    f"/api/data/uploads/{upload_id}/download-original", {}),
        ("get",    f"/api/data/uploads/{upload_id}/preview",           {}),
        ("post",   f"/api/data/uploads/{upload_id}/clean",             {}),
        ("post",   f"/api/data/uploads/{upload_id}/query",             {"json": {}}),
        ("delete", f"/api/data/uploads/{upload_id}",                   {}),
    ]:
        res = getattr(client, method)(path, **kwargs)
        assert res.status_code == 403, (
            f"ISOLATION BREACH: {method.upper()} {path} returned {res.status_code} for client B "
            f"(not the owner). Expected 403."
        )
