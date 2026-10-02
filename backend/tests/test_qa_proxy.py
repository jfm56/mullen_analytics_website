"""QA proxy guardrails: the path allow-list and the MFA gate.

The allow-list tests are pure unit. The MFA-gate tests drive the endpoint far
enough to hit the enrollment/verification checks, which run BEFORE any call to
the EMS QA bridge — so they're deterministic and make no network request. We set
a dummy ems_qa_api_base only to get past the "integration not configured" guard.
"""
import pyotp
import pytest

from app.config import get_settings
from app.models.user import User, Profile
from app.routers.qa_proxy import _allowed
from app.services.auth import hash_password

PW = "CIpassword1!"
FLAGS = "/api/qa/agencies/85fb583a-2432-48bc-8960-b7fdc83a6155/flags"


# ---- allow-list (pure unit) ----

def test_allowlist_permits_qa_surface():
    assert _allowed("agencies/abc/flags")
    assert _allowed("agencies/abc/analytics/summary")
    assert _allowed("agencies/abc/imports")
    assert _allowed("auth/me")
    assert _allowed("auth/me/agencies")
    assert _allowed("/agencies/abc/flags")  # leading slash tolerated


def test_allowlist_blocks_operator_billing_and_raw_auth():
    for p in ["admin/agencies", "billing/webhook", "auth/login", "auth/logout",
              "auth/sso", "auth/signup", "", "agencies", "agenciesX/evil"]:
        assert not _allowed(p), p


# ---- MFA gate (endpoint, network-free) ----

@pytest.fixture()
def _qa_configured():
    s = get_settings()
    prev = s.ems_qa_api_base
    s.ems_qa_api_base = "http://dummy.invalid"  # get past the 503 "not configured" guard
    try:
        yield
    finally:
        s.ems_qa_api_base = prev


def _make_qa_user(db, email):
    user = User(email=email, password_hash=hash_password(PW), email_confirmed=True)
    db.add(user)
    db.flush()
    db.add(Profile(
        id=user.id, email=email, role="client", full_name="QA User",
        ems_qa_enabled=True, ems_agency_slug="smoke-test-ems", ems_role="qa_reviewer",
    ))
    db.commit()
    return user


def test_qa_requires_mfa_enrollment(client, db, _qa_configured):
    user = _make_qa_user(db, "qa-noenroll@example.com")
    client.post("/api/auth/login", json={"email": user.email, "password": PW})
    res = client.get(FLAGS)
    assert res.status_code == 403
    assert res.json()["detail"] == "mfa_enrollment_required"


def test_qa_requires_mfa_verification_when_pending(client, db, _qa_configured):
    user = _make_qa_user(db, "qa-pending@example.com")
    client.post("/api/auth/login", json={"email": user.email, "password": PW})
    # enroll + activate (this session is now verified)
    enroll = client.post("/api/auth/mfa/enroll").json()
    client.post("/api/auth/mfa/activate", json={"code": pyotp.TOTP(enroll["secret"]).now()})
    # new login => pending session
    client.post("/api/auth/logout")
    body = client.post("/api/auth/login", json={"email": user.email, "password": PW}).json()
    assert body["mfa_required"] is True
    res = client.get(FLAGS)
    assert res.status_code == 403
    assert res.json()["detail"] == "mfa_verification_required"


def test_non_entitled_user_blocked(client, db, _qa_configured):
    user = User(email="qa-notenabled@example.com", password_hash=hash_password(PW), email_confirmed=True)
    db.add(user)
    db.flush()
    db.add(Profile(id=user.id, email=user.email, role="client", full_name="No QA", ems_qa_enabled=False))
    db.commit()
    client.post("/api/auth/login", json={"email": user.email, "password": PW})
    res = client.get(FLAGS)
    assert res.status_code == 403
    assert "EMS QA is not enabled" in res.json()["detail"]
