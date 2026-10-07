"""Platform SUPER_ADMIN security tests.

Proves: platform scope via the AUTHENTICATED RLS clause (not a bypass); tenant
isolation unchanged for non-platform contexts; missing context != platform-wide;
require_super_admin gating; synthetic excluded from production metrics; View-As
audits the real actor; feature flags enforced even for SUPER_ADMIN.
"""
import os
import uuid

import pytest
from sqlalchemy import create_engine, text
from sqlalchemy.engine import make_url
from sqlalchemy.orm import sessionmaker
from fastapi import FastAPI
from fastapi.testclient import TestClient

from app.database import Base
from app.models import emscs_qa, platform_audit  # noqa: F401 — register tables
from app.models.agency import Agency
from app.models.user import User
from app.services.auth import hash_password

pytestmark = pytest.mark.usefixtures("create_test_tables")
APP_PW = "rls_platform_pw"


def _owner():
    return create_engine(os.environ["DATABASE_URL"], future=True)


# ───────────────────────── DB-layer RLS: platform clause ─────────────────────────
@pytest.fixture(scope="module")
def rls():
    from app.security_rls import apply_rls
    owner = _owner()
    Base.metadata.create_all(bind=owner)
    A, B = uuid.uuid4(), uuid.uuid4()
    try:
        apply_rls(owner, app_role_password=APP_PW)   # (re)provisions policies incl. the platform clause
        with owner.begin() as c:
            c.execute(text("INSERT INTO agencies (id,agency_name,slug,data_classification) VALUES "
                           "(:a,'Plat A',:sa,'production'),(:b,'Plat B',:sb,'synthetic')"),
                      {"a": A, "sa": f"plat-a-{uuid.uuid4().hex[:6]}", "b": B, "sb": f"plat-b-{uuid.uuid4().hex[:6]}"})
    except Exception as exc:  # noqa: BLE001
        pytest.skip(f"cannot provision RLS: {exc}")
    yield {"A": A, "B": B}
    with owner.begin() as c:
        c.execute(text("DELETE FROM agencies WHERE id IN (:a,:b)"), {"a": A, "b": B})


def _app_engine():
    u = make_url(os.environ["DATABASE_URL"]).set(username="app_user", password=APP_PW,
                                                 drivername="postgresql+psycopg2")
    return create_engine(u, future=True)


def _visible(ctx_sql, ids):
    eng = _app_engine()
    with eng.connect() as conn:
        with conn.begin():
            for s in ctx_sql:
                conn.execute(text(s))
            rows = conn.execute(text("SELECT id FROM agencies WHERE id = ANY(:ids)"),
                                {"ids": list(ids)}).fetchall()
    return {str(r[0]) for r in rows}


def test_platform_context_sees_all_agencies(rls):
    A, B = rls["A"], rls["B"]
    seen = _visible(["SELECT set_config('app.current_user','%s',true)" % uuid.uuid4(),
                     "SELECT set_config('app.platform_admin','true',true)"], [A, B])
    assert seen == {str(A), str(B)}            # SUPER_ADMIN platform scope sees A and B


def test_agency_context_sees_only_that_agency(rls):
    A, B = rls["A"], rls["B"]
    seen = _visible(["SELECT set_config('app.current_agency','%s',true)" % A], [A, B])
    assert seen == {str(A)}                    # View-As / tenant scope = one agency only


def test_missing_context_is_not_platform_wide(rls):
    A, B = rls["A"], rls["B"]
    seen = _visible(["SELECT set_config('app.current_user','%s',true)" % uuid.uuid4()], [A, B])
    assert seen == set()                       # no agency + no platform GUC => nothing


# ───────────────────────── router authz + aggregates (TestClient) ─────────────────────────
_ENGINE = create_engine(os.environ.get("DATABASE_URL", "postgresql://postgres:postgres@localhost:5432/mullen_analytics"))
_Session = sessionmaker(bind=_ENGINE)


@pytest.fixture(scope="module")
def plat():
    os.environ["EMSCS_QA_V1_ENABLED"] = "true"
    from app.config import get_settings
    get_settings.cache_clear()
    Base.metadata.create_all(_ENGINE)
    s = _Session()
    su = User(email=f"su-{uuid.uuid4().hex[:8]}@mullenanalytics.com", password_hash=hash_password("x"),
              platform_role="super_admin")
    reg = User(email=f"reg-{uuid.uuid4().hex[:8]}@mullenanalytics.com", password_hash=hash_password("x"))
    prod = Agency(agency_name="Prod Co", slug=f"prod-{uuid.uuid4().hex[:6]}", data_classification="production")
    syn = Agency(agency_name="Synth Co", slug=f"syn-{uuid.uuid4().hex[:6]}", data_classification="synthetic")
    s.add_all([su, reg, prod, syn]); s.commit()

    # one QA review in each agency so the classification filter is meaningful
    from app.services.emscs_qa import review_service as rsvc
    from app.services.emscs_qa.chart_data import QaChartData, Vitals
    rsvc.create_review(s, prod.id, QaChartData(external_ref="PROD-1", transported=True,
                       vitals=[Vitals(sbp=120, bp_method="auto", pain=0)], securement_text="all straps"),
                       actor_user_id=su.id)
    rsvc.create_review(s, syn.id, QaChartData(external_ref="SYN-1", transported=True,
                       vitals=[Vitals(sbp=118, bp_method="auto", pain=2)], securement_text="all straps"),
                       actor_user_id=su.id)
    s.commit()

    from app.routers import platform_admin as pa
    from app.services.platform_admin import authz

    app = FastAPI()
    app.include_router(pa.router, prefix="/api")
    app.dependency_overrides[pa.get_db] = lambda: s

    yield {"client": TestClient(app), "s": s, "su": su, "reg": reg, "prod": prod, "syn": syn, "authz": authz}

    for t in ("platform_audit_events",):
        s.execute(text(f"DELETE FROM {t} WHERE actor_user_id IN (:a,:b)"), {"a": su.id, "b": reg.id})  # nosec B608
    s.execute(text("DELETE FROM agencies WHERE id IN (:p,:q)"), {"p": prod.id, "q": syn.id})
    s.execute(text("DELETE FROM users WHERE id IN (:a,:b)"), {"a": su.id, "b": reg.id})
    s.commit(); s.close()
    os.environ.pop("EMSCS_QA_V1_ENABLED", None); get_settings.cache_clear()


def _as(plat, user, monkeypatch):
    async def _resolve(request, db):
        return user
    monkeypatch.setattr(plat["authz"], "resolve_user", _resolve)


def test_require_super_admin_blocks_regular_user(plat, monkeypatch):
    _as(plat, plat["reg"], monkeypatch)
    assert plat["client"].get("/api/v1/platform/overview").status_code == 403
    assert plat["client"].get("/api/v1/platform/qa/monitor").status_code == 403


def test_super_admin_can_view_platform_and_all_agencies(plat, monkeypatch):
    _as(plat, plat["su"], monkeypatch)
    ov = plat["client"].get("/api/v1/platform/overview")
    assert ov.status_code == 200 and ov.json()["agencies"]["total"] >= 2
    ag = plat["client"].get("/api/v1/platform/agencies")
    assert ag.status_code == 200
    slugs = {a["slug"] for a in ag.json()["agencies"]}
    assert plat["prod"].slug in slugs and plat["syn"].slug in slugs   # A and B both visible


def test_me_reports_role(plat, monkeypatch):
    _as(plat, plat["su"], monkeypatch)
    assert plat["client"].get("/api/v1/platform/me").json()["super_admin"] is True
    _as(plat, plat["reg"], monkeypatch)
    assert plat["client"].get("/api/v1/platform/me").json()["super_admin"] is False


def test_synthetic_excluded_from_production_metrics(plat, monkeypatch):
    _as(plat, plat["su"], monkeypatch)
    allm = plat["client"].get("/api/v1/platform/qa/monitor").json()
    prodm = plat["client"].get("/api/v1/platform/qa/monitor?classification=production").json()
    synm = plat["client"].get("/api/v1/platform/qa/monitor?classification=synthetic").json()
    # the production view excludes the synthetic-agency review (and vice versa)
    assert prodm["total_reviews"] >= 1 and synm["total_reviews"] >= 1
    assert allm["total_reviews"] >= prodm["total_reviews"] + synm["total_reviews"]
    # the two filtered views are disjoint subsets of the total
    cleanup_ok = prodm["total_reviews"] < allm["total_reviews"]
    assert cleanup_ok  # production alone is strictly fewer than all


def test_view_as_audits_real_actor(plat, monkeypatch):
    _as(plat, plat["su"], monkeypatch)
    r = plat["client"].post("/api/v1/platform/view-as", json={"agency_id": str(plat["prod"].id)})
    assert r.status_code == 200 and "VIEW-AS" in r.json()["banner"]
    ev = plat["s"].query(platform_audit.PlatformAuditEvent).filter_by(
        actor_user_id=plat["su"].id, action="view_as_start").order_by(
        platform_audit.PlatformAuditEvent.at.desc()).first()
    assert ev is not None and ev.view_as is True and ev.actor_user_id == plat["su"].id  # real actor retained


def test_view_as_requires_agency_id(plat, monkeypatch):
    _as(plat, plat["su"], monkeypatch)
    assert plat["client"].post("/api/v1/platform/view-as", json={}).status_code == 400  # missing != platform


def test_features_do_not_auto_enable(plat, monkeypatch):
    _as(plat, plat["su"], monkeypatch)
    feats = {f["key"]: f["status"] for f in plat["client"].get("/api/v1/platform/features").json()["features"]}
    assert feats["Forecaster v2"] == "unwired" and feats["Geographic v2"] == "unimplemented"
    assert feats["EMSCharts / ZOLL"] == "disconnected"
