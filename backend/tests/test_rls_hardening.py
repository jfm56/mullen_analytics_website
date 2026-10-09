"""DB-layer RLS hardening tests — cross-agency isolation for READS *and WRITES*.

Provisions the low-privilege ``app_user`` role and the agency_isolation policies via
apply_rls/apply_rls_qa, seeds two synthetic agencies (A, B), then connects AS app_user
and proves at the DATABASE level that:

  * SELECT is confined to the current agency (deny-by-default with no context);
  * cross-agency INSERT / UPDATE are rejected by WITH CHECK (not merely hidden);
  * DELETE and UPDATE cannot reach another agency's rows;
  * a user cannot self-grant a membership into an arbitrary agency;
  * the authenticated platform-admin clause still permits legitimate cross-agency
    access, and is deny-by-default / does not leak across pooled connections;
  * least-privilege grants hold — append-only audit tables reject UPDATE/DELETE,
    read-only config rejects writes, and app_user is neither SUPERUSER nor BYPASSRLS;
  * the read-only startup validator passes on a healthy DB and fails when a policy
    is missing.

Skips cleanly when the environment cannot provision roles (no Postgres / no perms).
Synthetic data only; everything is cleaned up in teardown.
"""
import os
import uuid

import pytest
from sqlalchemy import create_engine, text
from sqlalchemy.engine import make_url
from sqlalchemy.exc import DBAPIError

from app.models import emscs_qa  # noqa: F401 — register QA tables with Base
from app.database import Base
from app.security_rls import apply_rls, apply_rls_qa

pytestmark = pytest.mark.usefixtures("create_test_tables")

APP_PW = "rls_hardening_app_user_pw"


def _owner_engine():
    url = os.environ.get("DATABASE_URL")
    if not url:
        pytest.skip("DATABASE_URL not set")
    return create_engine(url, future=True)


def _app_engine():
    u = make_url(os.environ["DATABASE_URL"])
    return create_engine(
        u.set(username="app_user", password=APP_PW, drivername="postgresql+psycopg2"),
        future=True,
    )


@pytest.fixture(scope="module")
def seeded():
    owner = _owner_engine()
    Base.metadata.create_all(bind=owner)
    A, B = uuid.uuid4(), uuid.uuid4()
    user_a = uuid.uuid4()
    try:
        with owner.begin() as c:
            c.execute(text(
                "DO $$ BEGIN IF NOT EXISTS (SELECT FROM pg_roles WHERE rolname='app_user') "
                f"THEN CREATE ROLE app_user LOGIN PASSWORD '{APP_PW}'; END IF; END $$;"))  # nosec B608
        apply_rls(owner, app_role_password=APP_PW)
        apply_rls_qa(owner)
    except Exception as exc:  # noqa: BLE001 — only role/RLS provisioning may legitimately skip
        pytest.skip(f"cannot provision RLS in this environment: {exc}")

    with owner.begin() as c:  # seed data failures are real bugs, not skips
        for aid, slug in ((A, "rls-h-a"), (B, "rls-h-b")):
            c.execute(text("INSERT INTO agencies (id, agency_name, slug) VALUES (:id,:n,:s)"),
                      {"id": aid, "n": slug, "s": f"{slug}-{uuid.uuid4().hex[:6]}"})
            c.execute(text("INSERT INTO pipeline_runs (id, agency_id, status) VALUES (:id,:a,'done')"),
                      {"id": uuid.uuid4(), "a": aid})
            c.execute(text("INSERT INTO qa_charts (id, agency_id, external_ref, source, is_synthetic, chart_data, status) "
                           "VALUES (:id,:a,:ref,'synthetic',true,'{}','pending')"),
                      {"id": uuid.uuid4(), "a": aid, "ref": f"{slug}-chart"})
        # A user who is a member of agency A only.
        c.execute(text("INSERT INTO users (id, email, password_hash) VALUES (:id,:e,'')"),
                  {"id": user_a, "e": f"rls-h-{uuid.uuid4().hex[:6]}@example.com"})
        c.execute(text(
            "INSERT INTO agency_memberships (id, agency_id, user_id, can_review, can_receive_reviews, is_agency_admin) "
            "VALUES (:id,:a,:u,false,false,true)"),
            {"id": uuid.uuid4(), "a": A, "u": user_a})

    app_engine = _app_engine()
    yield {"A": A, "B": B, "user_a": user_a, "app": app_engine, "owner": owner}

    app_engine.dispose()
    with owner.begin() as c:
        c.execute(text("DELETE FROM qa_charts WHERE agency_id IN (:a,:b)"), {"a": A, "b": B})
        c.execute(text("DELETE FROM pipeline_runs WHERE agency_id IN (:a,:b)"), {"a": A, "b": B})
        c.execute(text("DELETE FROM agency_memberships WHERE agency_id IN (:a,:b)"), {"a": A, "b": B})
        c.execute(text("DELETE FROM users WHERE id = :u"), {"u": user_a})
        c.execute(text("DELETE FROM agencies WHERE id IN (:a,:b)"), {"a": A, "b": B})


# ---- helpers ---------------------------------------------------------------
def _ctx(conn, *, agency=None, user=None, platform=False):
    if user is not None:
        conn.execute(text("SELECT set_config('app.current_user', :v, true)"), {"v": str(user)})
    if agency is not None:
        conn.execute(text("SELECT set_config('app.current_agency', :v, true)"), {"v": str(agency)})
    if platform:
        conn.execute(text("SELECT set_config('app.platform_admin', 'true', true)"))


# ---- role posture ----------------------------------------------------------
def test_app_user_is_not_privileged(seeded):
    with seeded["app"].connect() as conn:
        assert conn.execute(text("SELECT current_user")).scalar() == "app_user"
        row = conn.execute(text(
            "SELECT rolsuper, rolbypassrls FROM pg_roles WHERE rolname='app_user'")).first()
        assert row == (False, False)


# ---- SELECT isolation ------------------------------------------------------
def test_select_isolated_by_agency(seeded):
    A, B = seeded["A"], seeded["B"]

    def visible(agency):
        with seeded["app"].connect() as conn, conn.begin():
            _ctx(conn, agency=agency)
            return {str(r[0]) for r in conn.execute(text("SELECT agency_id FROM pipeline_runs"))}

    assert visible(A) == {str(A)}
    assert visible(B) == {str(B)}
    with seeded["app"].connect() as conn, conn.begin():
        assert conn.execute(text("SELECT count(*) FROM pipeline_runs")).scalar() == 0  # deny-by-default


# ---- INSERT WITH CHECK -----------------------------------------------------
def test_insert_into_current_agency_ok(seeded):
    A = seeded["A"]
    new_id = uuid.uuid4()
    with seeded["app"].connect() as conn, conn.begin():
        _ctx(conn, agency=A)
        conn.execute(text("INSERT INTO pipeline_runs (id, agency_id, status) VALUES (:id,:a,'x')"),
                     {"id": new_id, "a": A})
    with seeded["owner"].begin() as c:
        got = c.execute(text("SELECT agency_id FROM pipeline_runs WHERE id=:id"), {"id": new_id}).scalar()
        assert str(got) == str(A)
        c.execute(text("DELETE FROM pipeline_runs WHERE id=:id"), {"id": new_id})


def test_cross_agency_insert_rejected_by_with_check(seeded):
    A, B = seeded["A"], seeded["B"]
    # In agency A's context, inserting a row owned by B must be rejected by WITH CHECK.
    with pytest.raises(DBAPIError):
        with seeded["app"].connect() as conn, conn.begin():
            _ctx(conn, agency=A)
            conn.execute(text("INSERT INTO pipeline_runs (id, agency_id, status) VALUES (:id,:b,'evil')"),
                         {"id": uuid.uuid4(), "b": B})


# ---- UPDATE isolation + WITH CHECK -----------------------------------------
def test_update_cannot_reach_other_agency_row(seeded):
    A, B = seeded["A"], seeded["B"]
    with seeded["app"].connect() as conn, conn.begin():
        _ctx(conn, agency=A)
        res = conn.execute(text("UPDATE pipeline_runs SET status='touched' WHERE agency_id=:b"), {"b": B})
        assert res.rowcount == 0  # B's rows are invisible in A's context


def test_update_cannot_move_row_to_other_agency(seeded):
    A, B = seeded["A"], seeded["B"]
    with pytest.raises(DBAPIError):
        with seeded["app"].connect() as conn, conn.begin():
            _ctx(conn, agency=A)
            conn.execute(text("UPDATE pipeline_runs SET agency_id=:b WHERE agency_id=:a"), {"a": A, "b": B})


# ---- DELETE isolation ------------------------------------------------------
def test_delete_cannot_reach_other_agency_row(seeded):
    A, B = seeded["A"], seeded["B"]
    with seeded["app"].connect() as conn, conn.begin():
        _ctx(conn, agency=A)
        res = conn.execute(text("DELETE FROM pipeline_runs WHERE agency_id=:b"), {"b": B})
        assert res.rowcount == 0
    with seeded["owner"].connect() as c:
        assert c.execute(text("SELECT count(*) FROM pipeline_runs WHERE agency_id=:b"), {"b": B}).scalar() >= 1


# ---- membership self-grant -------------------------------------------------
def test_cannot_self_grant_membership_into_other_agency(seeded):
    A, B, user_a = seeded["A"], seeded["B"], seeded["user_a"]
    # User A, operating in agency A's verified context, tries to insert a membership
    # for THEMSELVES into agency B. The read rule (user_id = me) would have allowed it
    # under a defaulted WITH CHECK; the explicit WITH CHECK (agency_id = current) blocks it.
    with pytest.raises(DBAPIError):
        with seeded["app"].connect() as conn, conn.begin():
            _ctx(conn, agency=A, user=user_a)
            conn.execute(text(
                "INSERT INTO agency_memberships (id, agency_id, user_id, can_review, can_receive_reviews, is_agency_admin) "
                "VALUES (:id,:b,:u,false,false,true)"),
                {"id": uuid.uuid4(), "b": B, "u": user_a})


def test_membership_write_in_current_agency_ok(seeded):
    A = seeded["A"]
    new_user, mid = uuid.uuid4(), uuid.uuid4()
    with seeded["owner"].begin() as c:
        c.execute(text("INSERT INTO users (id, email, password_hash) VALUES (:id,:e,'')"),
                  {"id": new_user, "e": f"rls-h-staff-{uuid.uuid4().hex[:6]}@example.com"})
    with seeded["app"].connect() as conn, conn.begin():
        _ctx(conn, agency=A)
        conn.execute(text(
            "INSERT INTO agency_memberships (id, agency_id, user_id, can_review, can_receive_reviews, is_agency_admin) "
            "VALUES (:id,:a,:u,true,false,false)"),
            {"id": mid, "a": A, "u": new_user})
    with seeded["owner"].begin() as c:
        assert c.execute(text("SELECT count(*) FROM agency_memberships WHERE id=:id"), {"id": mid}).scalar() == 1
        c.execute(text("DELETE FROM agency_memberships WHERE id=:id"), {"id": mid})
        c.execute(text("DELETE FROM users WHERE id=:u"), {"u": new_user})


# ---- platform-admin clause -------------------------------------------------
def test_platform_context_sees_all_agencies(seeded):
    A, B = seeded["A"], seeded["B"]
    with seeded["app"].connect() as conn, conn.begin():
        _ctx(conn, platform=True)
        seen = {str(r[0]) for r in conn.execute(text("SELECT agency_id FROM pipeline_runs"))}
    assert {str(A), str(B)} <= seen


def test_platform_context_can_write_any_agency(seeded):
    B = seeded["B"]
    pid = uuid.uuid4()
    with seeded["app"].connect() as conn, conn.begin():
        _ctx(conn, platform=True)
        conn.execute(text("INSERT INTO pipeline_runs (id, agency_id, status) VALUES (:id,:b,'plat')"),
                     {"id": pid, "b": B})
    with seeded["owner"].begin() as c:
        assert c.execute(text("SELECT count(*) FROM pipeline_runs WHERE id=:id"), {"id": pid}).scalar() == 1
        c.execute(text("DELETE FROM pipeline_runs WHERE id=:id"), {"id": pid})


def test_platform_context_does_not_leak_to_fresh_connection(seeded):
    # A new checkout with no context set sees nothing — the transaction-local GUC does
    # not persist, so a pooled connection cannot inherit a prior request's platform scope.
    with seeded["app"].connect() as conn, conn.begin():
        assert conn.execute(text("SELECT count(*) FROM pipeline_runs")).scalar() == 0


# ---- least-privilege grants ------------------------------------------------
def test_audit_log_is_append_only(seeded):
    A = seeded["A"]
    aid = uuid.uuid4()
    # INSERT allowed (append), in the current agency.
    with seeded["app"].connect() as conn, conn.begin():
        _ctx(conn, agency=A)
        conn.execute(text("INSERT INTO audit_logs (id, agency_id, action) VALUES (:id,:a,'test.event')"),
                     {"id": aid, "a": A})
    # UPDATE denied by table privilege (no UPDATE grant).
    with pytest.raises(DBAPIError):
        with seeded["app"].connect() as conn, conn.begin():
            _ctx(conn, agency=A)
            conn.execute(text("UPDATE audit_logs SET action='tamper' WHERE id=:id"), {"id": aid})
    # DELETE denied by table privilege (no DELETE grant).
    with pytest.raises(DBAPIError):
        with seeded["app"].connect() as conn, conn.begin():
            _ctx(conn, agency=A)
            conn.execute(text("DELETE FROM audit_logs WHERE id=:id"), {"id": aid})
    with seeded["owner"].begin() as c:
        c.execute(text("DELETE FROM audit_logs WHERE id=:id"), {"id": aid})


def test_qa_config_is_read_only(seeded):
    # app_user may SELECT the shared QA config but not write it.
    with seeded["app"].connect() as conn, conn.begin():
        conn.execute(text("SELECT count(*) FROM qa_scoring_domains"))  # no error
    with pytest.raises(DBAPIError):
        with seeded["app"].connect() as conn, conn.begin():
            conn.execute(text("INSERT INTO qa_scoring_domains DEFAULT VALUES"))


def test_app_user_has_no_privilege_on_ungranted_future_table(seeded):
    # Least-privilege is per-table: a table app_user was never granted is inaccessible,
    # even though it lives in the same schema (the old blanket grant would have exposed it).
    owner = seeded["owner"]
    tname = f"rls_future_{uuid.uuid4().hex[:8]}"
    with owner.begin() as c:
        c.execute(text(f"CREATE TABLE {tname} (id int primary key, secret text)"))  # nosec B608
        c.execute(text(f"INSERT INTO {tname} VALUES (1, 'top-secret')"))  # nosec B608
    try:
        with pytest.raises(DBAPIError):
            with seeded["app"].connect() as conn, conn.begin():
                conn.execute(text(f"SELECT secret FROM {tname}"))  # nosec B608
    finally:
        with owner.begin() as c:
            c.execute(text(f"DROP TABLE {tname}"))  # nosec B608


# ---- startup validation ----------------------------------------------------
def test_runtime_validation_passes_on_healthy_db(seeded):
    from app.startup_checks import validate_runtime_schema
    problems = validate_runtime_schema(seeded["app"], require_rls=True, qa_enabled=True)
    assert problems == [], problems


def test_runtime_validation_fails_when_policy_missing(seeded):
    from app.startup_checks import validate_runtime_schema, assert_runtime_ready
    owner = seeded["owner"]
    # Temporarily remove a tenancy policy and confirm the validator flags it + raises.
    with owner.begin() as c:
        c.execute(text("DROP POLICY IF EXISTS agency_isolation ON pipeline_runs"))
    try:
        problems = validate_runtime_schema(seeded["app"], require_rls=True, qa_enabled=True)
        assert any("pipeline_runs" in p for p in problems), problems
        with pytest.raises(RuntimeError):
            assert_runtime_ready(seeded["app"], require_rls=True, qa_enabled=True)
    finally:
        # Restore the policy so later tests/modules see a healthy DB.
        apply_rls(owner, app_role_password=APP_PW)
