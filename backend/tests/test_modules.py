"""Per-client product-module access (tiers + overrides).

Unit-tests the resolver, and drives the gated endpoints far enough to hit
require_module (which runs BEFORE the upload lookup), so the gate is proven
without needing real cleaned data: a blocked client gets 403; an entitled one
passes the gate and only then 404s on the bogus upload id.
"""
import uuid

from app.models.user import User, Profile
from app.services.auth import hash_password
from app.services.plans import enabled_modules

PW = "CIpassword1!"
BOGUS = str(uuid.uuid4())


class _P:
    def __init__(self, plan="essential", overrides=None, qa=False):
        self.plan = plan
        self.module_overrides = overrides
        self.ems_qa_enabled = qa
        self.extra_dataset_slots = 0


def test_tier_defaults():
    assert enabled_modules(_P("essential")) == {"analytics": True, "predictive": False, "geographic": False, "qa": False}
    assert enabled_modules(_P("professional")) == {"analytics": True, "predictive": True, "geographic": True, "qa": False}


def test_overrides_add_and_revoke():
    assert enabled_modules(_P("essential", {"predictive": True}))["predictive"] is True
    assert enabled_modules(_P("professional", {"geographic": False}))["geographic"] is False


def test_qa_follows_ems_qa_enabled_not_tier():
    assert enabled_modules(_P("enterprise", None, qa=False))["qa"] is False
    assert enabled_modules(_P("enterprise", None, qa=True))["qa"] is True


def _make_client(db, email, *, plan="essential", overrides=None):
    user = User(email=email, password_hash=hash_password(PW), email_confirmed=True)
    db.add(user)
    db.flush()
    db.add(Profile(id=user.id, email=email, role="client", full_name="Mod Client",
                   plan=plan, module_overrides=overrides))
    db.commit()
    return user


def test_predictive_endpoint_gated(client, db):
    # essential tier → no predictive → 403 before any upload work
    u = _make_client(db, "mod-nopred@example.com", plan="essential")
    client.post("/api/auth/login", json={"email": u.email, "password": PW})
    r = client.get(f"/api/data/uploads/{BOGUS}/predictive")
    assert r.status_code == 403
    assert "Predictive" in r.json()["detail"]


def test_predictive_endpoint_allowed_with_override(client, db):
    # override grants predictive → passes the gate → 404 on the bogus upload
    u = _make_client(db, "mod-pred@example.com", plan="essential", overrides={"predictive": True})
    client.post("/api/auth/login", json={"email": u.email, "password": PW})
    r = client.get(f"/api/data/uploads/{BOGUS}/predictive")
    assert r.status_code == 404  # got past require_module


def test_geographic_endpoint_gated(client, db):
    u = _make_client(db, "mod-nogeo@example.com", plan="essential")
    client.post("/api/auth/login", json={"email": u.email, "password": PW})
    r = client.get(f"/api/data/uploads/{BOGUS}/mva-hotspots")
    assert r.status_code == 403
    assert "Geographic" in r.json()["detail"]


def test_plans_me_surfaces_modules(client, db):
    u = _make_client(db, "mod-plansme@example.com", plan="professional", overrides={"geographic": False})
    client.post("/api/auth/login", json={"email": u.email, "password": PW})
    body = client.get("/api/plans/me").json()
    mods = body.get("features", body).get("modules") if isinstance(body.get("features", body), dict) else None
    # /plans/me returns features (resolve_features) which now includes `modules`
    feats = body.get("features", body)
    assert feats["modules"] == {"analytics": True, "predictive": True, "geographic": False, "qa": False}
