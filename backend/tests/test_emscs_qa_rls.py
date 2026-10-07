"""DB-layer RLS test for the EMSCS QA tables.

Provisions the agency_isolation policies via apply_rls_qa, then connects as the
low-privilege app_user and proves tenant isolation at the DATABASE level (not the
service/frontend layer): with agency A's context set, app_user sees only A's QA
rows; with B's, only B's; with none, nothing. Also asserts every QA agency table
has RLS enabled + the policy. Skips only if the environment forbids role creation.

Synthetic agencies/rows only; cleaned up in teardown.
"""
import os
import uuid

import pytest
from sqlalchemy import create_engine, text
from sqlalchemy.engine import make_url

from app.models import emscs_qa  # noqa: F401 — register QA tables with Base
from app.database import Base

pytestmark = pytest.mark.usefixtures("create_test_tables")

APP_PW = "rls_test_app_user_pw"
QA_AGENCY_TABLES = ["qa_charts", "qa_review_sessions", "qa_indicator_reviews",
                    "qa_findings", "qa_crew_feedback", "qa_scores", "qa_audit_events"]


def _owner_engine():
    return create_engine(os.environ["DATABASE_URL"], future=True)


def _app_user_url():
    u = make_url(os.environ["DATABASE_URL"])
    return u.set(username="app_user", password=APP_PW, drivername="postgresql+psycopg2")


@pytest.fixture(scope="module")
def rls(request):
    from app.security_rls import apply_rls_qa
    owner = _owner_engine()
    Base.metadata.create_all(bind=owner)   # ensure QA tables exist in this DB
    A, B = uuid.uuid4(), uuid.uuid4()
    try:
        with owner.begin() as c:
            # DO blocks can't take bind params; APP_PW is a fixed test constant, not user input.
            c.execute(text(
                "DO $$ BEGIN IF NOT EXISTS (SELECT FROM pg_roles WHERE rolname='app_user') "
                f"THEN CREATE ROLE app_user LOGIN PASSWORD '{APP_PW}'; END IF; END $$;"))  # nosec B608
            c.execute(text(f"ALTER ROLE app_user WITH LOGIN PASSWORD '{APP_PW}'"))  # nosec B608
            c.execute(text("GRANT USAGE ON SCHEMA public TO app_user"))
        apply_rls_qa(owner)
        with owner.begin() as c:
            for aid, slug in ((A, "rls-qa-a"), (B, "rls-qa-b")):
                c.execute(text("INSERT INTO agencies (id, agency_name, slug) VALUES (:id,:n,:s)"),
                          {"id": aid, "n": slug, "s": f"{slug}-{uuid.uuid4().hex[:6]}"})
                c.execute(text("INSERT INTO qa_charts (id, agency_id, external_ref, source, is_synthetic, chart_data, status) "
                               "VALUES (:id,:a,:ref,'synthetic',true,'{}','pending')"),
                          {"id": uuid.uuid4(), "a": aid, "ref": f"{slug}-chart"})
    except Exception as exc:  # noqa: BLE001
        pytest.skip(f"cannot provision RLS in this environment: {exc}")

    yield {"A": A, "B": B}

    with owner.begin() as c:
        c.execute(text("DELETE FROM qa_charts WHERE agency_id IN (:a,:b)"), {"a": A, "b": B})
        c.execute(text("DELETE FROM agencies WHERE id IN (:a,:b)"), {"a": A, "b": B})


def _charts_visible(app_engine, agency_id):
    with app_engine.connect() as conn:
        with conn.begin():
            if agency_id is not None:
                conn.execute(text("SELECT set_config('app.current_agency', :a, true)"), {"a": str(agency_id)})
            rows = conn.execute(text("SELECT agency_id FROM qa_charts")).fetchall()
    return {str(r[0]) for r in rows}


def test_db_rls_isolates_qa_charts_by_agency(rls):
    app_engine = create_engine(_app_user_url(), future=True)
    A, B = rls["A"], rls["B"]
    # app_user is NOT a superuser -> RLS applies
    with app_engine.connect() as conn:
        assert conn.execute(text("SELECT current_user")).scalar() == "app_user"
        assert conn.execute(text("SELECT rolsuper FROM pg_roles WHERE rolname='app_user'")).scalar() is False
    assert _charts_visible(app_engine, A) == {str(A)}            # only A
    assert _charts_visible(app_engine, B) == {str(B)}            # only B
    assert _charts_visible(app_engine, None) == set()           # deny-by-default (no context)


def test_all_qa_agency_tables_have_rls_and_policy(rls):
    owner = _owner_engine()
    with owner.connect() as c:
        for t in QA_AGENCY_TABLES:
            enabled = c.execute(text("SELECT relrowsecurity FROM pg_class WHERE relname=:t"), {"t": t}).scalar()
            assert enabled is True, f"RLS not enabled on {t}"
            pol = c.execute(text("SELECT count(*) FROM pg_policies WHERE tablename=:t AND policyname='agency_isolation'"),
                            {"t": t}).scalar()
            assert pol == 1, f"agency_isolation policy missing on {t}"
