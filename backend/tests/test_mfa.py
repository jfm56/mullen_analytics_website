"""Portal TOTP MFA: enrollment, the login challenge, recovery codes, disable.

Exercises the real endpoints through the TestClient (cookie-backed sessions),
generating valid codes with pyotp. All deterministic and network-free.
"""
import pyotp
import pytest

from app.models.user import User, Profile
from app.services.auth import hash_password

PW = "CIpassword1!"


def _make_and_login(client, db, email, *, ems=False, role="client"):
    user = User(email=email, password_hash=hash_password(PW), email_confirmed=True)
    db.add(user)
    db.flush()
    db.add(Profile(
        id=user.id, email=email, role=role, full_name="MFA User",
        ems_qa_enabled=ems, ems_agency_slug="smoke-test-ems" if ems else None,
        ems_role="qa_reviewer" if ems else None,
    ))
    db.commit()
    res = client.post("/api/auth/login", json={"email": email, "password": PW})
    assert res.status_code == 200, res.text
    return user, res.json()


def _enroll(client):
    data = client.post("/api/auth/mfa/enroll").json()
    code = pyotp.TOTP(data["secret"]).now()
    act = client.post("/api/auth/mfa/activate", json={"code": code})
    assert act.status_code == 200, act.text
    return data["secret"], act.json()["recovery_codes"]


def test_client_without_mfa_must_enroll_at_login(client, db):
    _, body = _make_and_login(client, db, "mfa-none@example.com")
    assert body["mfa_required"] is False
    assert body["mfa_enrollment_required"] is True
    s = client.get("/api/auth/session").json()
    assert s["mfa_enabled"] is False
    assert s["mfa_passed"] is True
    assert s["mfa_required"] is False
    assert s["mfa_enrollment_required"] is True


def test_admin_without_mfa_does_not_enter_client_enrollment(client, db):
    _, body = _make_and_login(client, db, "mfa-admin@example.com", role="admin")
    assert body["mfa_required"] is False
    assert body["mfa_enrollment_required"] is False

    session = client.get("/api/auth/session").json()
    assert session["mfa_enrollment_required"] is False


def test_qa_client_enrolls_at_initial_login(client, db):
    _, body = _make_and_login(client, db, "mfa-qa-first-login@example.com", ems=True)
    assert body["mfa_required"] is False
    assert body["mfa_enrollment_required"] is True

    session = client.get("/api/auth/session").json()
    assert session["authenticated"] is True
    assert session["mfa_enabled"] is False
    assert session["mfa_enrollment_required"] is True

    _enroll(client)
    completed = client.get("/api/auth/session").json()
    assert completed["mfa_enabled"] is True
    assert completed["mfa_passed"] is True
    assert completed["mfa_enrollment_required"] is False

    client.post("/api/auth/logout")
    returning = client.post(
        "/api/auth/login",
        json={"email": "mfa-qa-first-login@example.com", "password": PW},
    ).json()
    assert returning["mfa_enrollment_required"] is False
    assert returning["mfa_required"] is True


def test_enroll_requires_correct_code_and_returns_recovery(client, db):
    _make_and_login(client, db, "mfa-enroll@example.com")
    data = client.post("/api/auth/mfa/enroll").json()
    assert data["secret"]
    # The QR must be a standalone SVG data URI (xmlns present) so it renders in
    # an <img src>. (svg_inline omits xmlns and shows as a broken image.)
    assert data["qr_svg"].startswith("data:image/svg+xml")
    from urllib.parse import unquote
    assert "xmlns" in unquote(data["qr_svg"][:400])
    assert data["provisioning_uri"].startswith("otpauth://totp/")

    bad = client.post("/api/auth/mfa/activate", json={"code": "000000"})
    assert bad.status_code == 400  # wrong code does not enable

    code = pyotp.TOTP(data["secret"]).now()
    act = client.post("/api/auth/mfa/activate", json={"code": code})
    assert act.status_code == 200
    assert len(act.json()["recovery_codes"]) == 10

    s = client.get("/api/auth/session").json()
    assert s["mfa_enabled"] is True
    assert s["mfa_passed"] is True  # enrolling proves possession


def test_login_challenge_then_verify(client, db):
    user, _ = _make_and_login(client, db, "mfa-login@example.com")
    secret, _ = _enroll(client)
    client.post("/api/auth/logout")

    body = client.post("/api/auth/login", json={"email": user.email, "password": PW}).json()
    assert body["mfa_required"] is True
    s = client.get("/api/auth/session").json()
    assert s["mfa_required"] is True and s["mfa_passed"] is False

    v = client.post("/api/auth/mfa/verify", json={"code": pyotp.TOTP(secret).now()})
    assert v.status_code == 200
    s2 = client.get("/api/auth/session").json()
    assert s2["mfa_passed"] is True


def test_recovery_code_is_single_use(client, db):
    user, _ = _make_and_login(client, db, "mfa-recovery@example.com")
    _, recovery = _enroll(client)
    client.post("/api/auth/logout")

    client.post("/api/auth/login", json={"email": user.email, "password": PW})
    first = client.post("/api/auth/mfa/verify", json={"code": recovery[0]})
    assert first.status_code == 200

    client.post("/api/auth/logout")
    client.post("/api/auth/login", json={"email": user.email, "password": PW})
    reuse = client.post("/api/auth/mfa/verify", json={"code": recovery[0]})
    assert reuse.status_code == 400  # already consumed


def test_disable_requires_password_and_code(client, db):
    _make_and_login(client, db, "mfa-disable@example.com")
    secret, _ = _enroll(client)

    wrong_pw = client.post("/api/auth/mfa/disable", json={"password": "nope", "code": pyotp.TOTP(secret).now()})
    assert wrong_pw.status_code == 403

    ok = client.post("/api/auth/mfa/disable", json={"password": PW, "code": pyotp.TOTP(secret).now()})
    assert ok.status_code == 200
    s = client.get("/api/auth/session").json()
    assert s["mfa_enabled"] is False
