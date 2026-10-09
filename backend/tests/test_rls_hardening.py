"""DB-layer RLS hardening tests — role-based platform boundary, membership-write
authorization, forged-GUC resistance, least-privilege, and fail-closed startup
validation. Synthetic Agency A/B only; everything cleaned up in teardown.

Model under test (see app/security_rls.py):
  * Cross-agency (platform) access is granted ONLY to the dedicated `app_platform`
    DB role (NOT superuser, NOT BYPASSRLS) via a role-keyed policy clause. An ordinary
    app_user cannot reach it by forging any GUC (the retired app.platform_admin bypass).
  * agency_memberships WRITES are restricted to agency-admins of the current agency
    (or platform): ordinary members cannot create memberships or self-grant admin.
  * Least-privilege grants: append-only audit, read-only QA config, no PUBLIC/bypass.
  * Startup validation fails closed on missing tables/policies/grants/migration baseline.

Skips cleanly when the environment cannot provision roles (no Postgres / no perms).
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
_RLS_ERR = "row-level security"


def _owner_engine():
    url = os.environ.get("DATABASE_URL")
    if not url:
        pytest.skip("DATABASE_URL not set")
    return create_engine(url, future=True)


def _role_engine(role):
    u = make_url(os.environ["DATABASE_URL"])
    return create_engine(
        u.set(username=role, password=("rls_platform_distinct_pw" if role == "app_platform" else APP_PW), drivername="postgresql+psycopg2"), future=True)


def _is_rls_error(exc: DBAPIError) -> bool:
    return _RLS_ERR in str(getattr(exc, "orig", exc)).lower()


@pytest.fixture(scope="module")
def seeded():
    owner = _owner_engine()
    Base.metadata.create_all(bind=owner)
    A, B = uuid.uuid4(), uuid.uuid4()
    admin_a, member_a, staff = uuid.uuid4(), uuid.uuid4(), uuid.uuid4()
    try:
        # Mimic the migration runner's ledger so the startup validator's baseline check
        # passes and the runtime roles are granted SELECT on it by apply_rls.
        with owner.begin() as c:
            c.execute(text("CREATE TABLE IF NOT EXISTS schema_migrations ("
                           "filename TEXT PRIMARY KEY, sha256 TEXT NOT NULL, "
                           "applied_at TIMESTAMPTZ NOT NULL DEFAULT NOW())"))
            for fn in ("016_unified_platform_identity.sql", "017_rls_least_privilege.sql",
                       "018_role_based_platform_boundary.sql", "019_portal_model_columns.sql",
                       "020_protect_platform_role.sql"):
                c.execute(text("INSERT INTO schema_migrations(filename, sha256) VALUES (:f,'x') "
                               "ON CONFLICT (filename) DO NOTHING"), {"f": fn})
        apply_rls(owner, app_role_password=APP_PW, platform_role_password="rls_platform_distinct_pw")
        apply_rls_qa(owner)
    except Exception as exc:  # noqa: BLE001 — only provisioning may legitimately skip
        if os.environ.get("CI", "").lower() == "true":
            pytest.fail(f"CI could not provision the required RLS roles/policies: {exc}")
        pytest.skip(f"cannot provision RLS in this environment: {exc}")

    with owner.begin() as c:  # seed-data failures are real bugs, not skips
        for aid, slug in ((A, "rls-h-a"), (B, "rls-h-b")):
            c.execute(text("INSERT INTO agencies (id, agency_name, slug, data_classification) "
                           "VALUES (:id,:n,:s,'synthetic')"),
                      {"id": aid, "n": slug, "s": f"{slug}-{uuid.uuid4().hex[:6]}"})
            c.execute(text("INSERT INTO pipeline_runs (id, agency_id, status) VALUES (:id,:a,'done')"),
                      {"id": uuid.uuid4(), "a": aid})
            c.execute(text("INSERT INTO qa_charts (id, agency_id, external_ref, source, is_synthetic, chart_data, status) "
                           "VALUES (:id,:a,:ref,'synthetic',true,'{}','pending')"),
                      {"id": uuid.uuid4(), "a": aid, "ref": f"{slug}-chart"})
        for uid, lbl in ((admin_a, "admin"), (member_a, "member"), (staff, "staff")):
            c.execute(text("INSERT INTO users (id, email, password_hash, totp_enabled) VALUES (:id,:e,'',false)"),
                      {"id": uid, "e": f"rls-h-{lbl}-{uuid.uuid4().hex[:6]}@example.com"})
        # admin_a is an AGENCY ADMIN of A; member_a is an ordinary member of A.
        c.execute(text("INSERT INTO agency_memberships (id, agency_id, user_id, can_review, can_receive_reviews, is_agency_admin) "
                       "VALUES (:id,:a,:u,false,false,true)"), {"id": uuid.uuid4(), "a": A, "u": admin_a})
        c.execute(text("INSERT INTO agency_memberships (id, agency_id, user_id, can_review, can_receive_reviews, is_agency_admin) "
                       "VALUES (:id,:a,:u,true,false,false)"), {"id": uuid.uuid4(), "a": A, "u": member_a})

    app_engine = _role_engine("app_user")
    platform_engine = _role_engine("app_platform")
    yield {"A": A, "B": B, "admin_a": admin_a, "member_a": member_a, "staff": staff,
           "app": app_engine, "platform": platform_engine, "owner": owner}

    app_engine.dispose()
    platform_engine.dispose()
    with owner.begin() as c:
        c.execute(text("DELETE FROM qa_charts WHERE agency_id IN (:a,:b)"), {"a": A, "b": B})
        c.execute(text("DELETE FROM pipeline_runs WHERE agency_id IN (:a,:b)"), {"a": A, "b": B})
        c.execute(text("DELETE FROM agency_memberships WHERE agency_id IN (:a,:b)"), {"a": A, "b": B})
        c.execute(text("DELETE FROM users WHERE id IN (:a,:b,:c)"), {"a": admin_a, "b": member_a, "c": staff})
        c.execute(text("DELETE FROM agencies WHERE id IN (:a,:b)"), {"a": A, "b": B})


def _ctx(conn, *, agency=None, user=None):
    if user is not None:
        conn.execute(text("SELECT set_config('app.current_user', :v, true)"), {"v": str(user)})
    if agency is not None:
        conn.execute(text("SELECT set_config('app.current_agency', :v, true)"), {"v": str(agency)})


# ───────── role posture + inheritance (item 6) ─────────
def test_runtime_roles_are_not_privileged(seeded):
    with seeded["owner"].connect() as c:
        for role in ("app_user", "app_platform"):
            r = c.execute(text("SELECT rolsuper, rolbypassrls, rolcreatedb, rolcreaterole "
                               "FROM pg_roles WHERE rolname=:r"), {"r": role}).first()
            assert r == (False, False, False, False), (role, tuple(r))


def test_runtime_roles_inherit_no_privileged_role(seeded):
    with seeded["owner"].connect() as c:
        bad = c.execute(text(
            "SELECT r.rolname FROM pg_auth_members m "
            "JOIN pg_roles g ON g.oid=m.roleid JOIN pg_roles r ON r.oid=m.member "
            "WHERE r.rolname IN ('app_user','app_platform') AND (g.rolsuper OR g.rolbypassrls)")).fetchall()
        assert bad == [], bad


def test_app_user_connection_identity(seeded):
    with seeded["app"].connect() as conn:
        assert conn.execute(text("SELECT current_user")).scalar() == "app_user"


def test_app_user_cannot_mint_platform_admin(seeded):
    with seeded["app"].connect() as conn:
        with pytest.raises(DBAPIError) as error:
            conn.execute(text("UPDATE users SET platform_role='super_admin' WHERE id=:u"),
                         {"u": seeded["member_a"]})
        assert error.value.orig.pgcode == "42501"
        conn.rollback()
    with seeded["owner"].connect() as conn:
        assert conn.execute(text("SELECT platform_role FROM users WHERE id=:u"),
                            {"u": seeded["member_a"]}).scalar() is None


def test_app_user_cannot_insert_platform_admin(seeded):
    with seeded["app"].connect() as conn:
        with pytest.raises(DBAPIError) as error:
            conn.execute(text("INSERT INTO users(id,email,password_hash,totp_enabled,platform_role) "
                              "VALUES (:u,:e,'',false,'super_admin')"),
                         {"u": uuid.uuid4(), "e": f"synthetic-{uuid.uuid4().hex}@example.com"})
        assert error.value.orig.pgcode == "42501"
        conn.rollback()


def test_platform_identity_can_manage_platform_role(seeded):
    with seeded["platform"].connect() as conn:
        with conn.begin() as transaction:
            assert conn.execute(text("UPDATE users SET platform_role='super_admin' WHERE id=:u"),
                                {"u": seeded["member_a"]}).rowcount == 1
            transaction.rollback()


def test_role_password_metacharacters_are_not_driver_parameters(seeded):
    from app.security_rls import _ensure_role
    role = "synthetic_password_" + uuid.uuid4().hex
    password = "synthetic-quote'percent%colon:slash\\password"
    role_engine = None
    try:
        with seeded["owner"].begin() as conn:
            _ensure_role(conn, role, password)
        url = make_url(os.environ["DATABASE_URL"]).set(username=role, password=password)
        role_engine = create_engine(url)
        with role_engine.connect() as conn:
            assert conn.execute(text("SELECT current_user")).scalar() == role
    finally:
        if role_engine is not None:
            role_engine.dispose()
        with seeded["owner"].begin() as conn:
            conn.execute(text(f'DROP ROLE IF EXISTS "{role}"'))


# ───────── ordinary-tenant SELECT isolation ─────────
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


# ───────── cross-agency WRITES rejected within a context (WITH CHECK) ─────────
def test_insert_into_current_agency_ok(seeded):
    A = seeded["A"]
    new_id = uuid.uuid4()
    with seeded["app"].connect() as conn, conn.begin():
        _ctx(conn, agency=A)
        conn.execute(text("INSERT INTO pipeline_runs (id, agency_id, status) VALUES (:id,:a,'x')"),
                     {"id": new_id, "a": A})
    with seeded["owner"].begin() as c:
        assert str(c.execute(text("SELECT agency_id FROM pipeline_runs WHERE id=:id"), {"id": new_id}).scalar()) == str(A)
        c.execute(text("DELETE FROM pipeline_runs WHERE id=:id"), {"id": new_id})


def test_cross_agency_insert_rejected_by_with_check(seeded):
    A, B = seeded["A"], seeded["B"]
    with pytest.raises(DBAPIError) as ei:
        with seeded["app"].connect() as conn, conn.begin():
            _ctx(conn, agency=A)
            conn.execute(text("INSERT INTO pipeline_runs (id, agency_id, status) VALUES (:id,:b,'evil')"),
                         {"id": uuid.uuid4(), "b": B})
    assert _is_rls_error(ei.value)


def test_update_cannot_move_row_to_other_agency(seeded):
    A, B = seeded["A"], seeded["B"]
    with pytest.raises(DBAPIError) as ei:
        with seeded["app"].connect() as conn, conn.begin():
            _ctx(conn, agency=A)
            conn.execute(text("UPDATE pipeline_runs SET agency_id=:b WHERE agency_id=:a"), {"a": A, "b": B})
    assert _is_rls_error(ei.value)


def test_delete_cannot_reach_other_agency_row(seeded):
    A, B = seeded["A"], seeded["B"]
    with seeded["app"].connect() as conn, conn.begin():
        _ctx(conn, agency=A)
        assert conn.execute(text("DELETE FROM pipeline_runs WHERE agency_id=:b"), {"b": B}).rowcount == 0
    with seeded["owner"].connect() as c:
        assert c.execute(text("SELECT count(*) FROM pipeline_runs WHERE agency_id=:b"), {"b": B}).scalar() >= 1


# ───────── platform boundary is role-based, not GUC ─────────
def test_forged_platform_guc_grants_nothing(seeded):
    # The retired bypass: app_user forging the old app.platform_admin GUC gets NO
    # cross-agency access (no policy reads that GUC any more).
    A, B = seeded["A"], seeded["B"]
    with seeded["app"].connect() as conn, conn.begin():
        conn.execute(text("SELECT set_config('app.platform_admin','true',true)"))
        _ctx(conn, user=uuid.uuid4())
        assert conn.execute(text("SELECT count(*) FROM pipeline_runs")).scalar() == 0


def test_platform_role_sees_all_agencies(seeded):
    A, B = seeded["A"], seeded["B"]
    with seeded["platform"].connect() as conn, conn.begin():
        assert conn.execute(text("SELECT current_user")).scalar() == "app_platform"
        seen = {str(r[0]) for r in conn.execute(text("SELECT agency_id FROM pipeline_runs"))}
    assert {str(A), str(B)} <= seen


def test_platform_role_can_write_any_agency(seeded):
    B = seeded["B"]
    pid = uuid.uuid4()
    with seeded["platform"].connect() as conn, conn.begin():
        conn.execute(text("INSERT INTO pipeline_runs (id, agency_id, status) VALUES (:id,:b,'plat')"),
                     {"id": pid, "b": B})
    with seeded["owner"].begin() as c:
        assert c.execute(text("SELECT count(*) FROM pipeline_runs WHERE id=:id"), {"id": pid}).scalar() == 1
        c.execute(text("DELETE FROM pipeline_runs WHERE id=:id"), {"id": pid})


def test_context_does_not_leak_to_fresh_connection(seeded):
    with seeded["app"].connect() as conn, conn.begin():
        assert conn.execute(text("SELECT count(*) FROM pipeline_runs")).scalar() == 0


# ───────── agency_memberships write authorization (item 3) ─────────
def test_agency_admin_can_add_staff(seeded):
    A, admin_a, staff = seeded["A"], seeded["admin_a"], seeded["staff"]
    mid = uuid.uuid4()
    with seeded["app"].connect() as conn, conn.begin():
        _ctx(conn, agency=A, user=admin_a)
        conn.execute(text("INSERT INTO agency_memberships (id, agency_id, user_id, can_review, can_receive_reviews, is_agency_admin) "
                          "VALUES (:id,:a,:u,true,false,false)"), {"id": mid, "a": A, "u": staff})
    with seeded["owner"].begin() as c:
        assert c.execute(text("SELECT count(*) FROM agency_memberships WHERE id=:id"), {"id": mid}).scalar() == 1
        c.execute(text("DELETE FROM agency_memberships WHERE id=:id"), {"id": mid})


def test_ordinary_member_cannot_add_membership(seeded):
    A, member_a, staff = seeded["A"], seeded["member_a"], seeded["staff"]
    with pytest.raises(DBAPIError) as ei:
        with seeded["app"].connect() as conn, conn.begin():
            _ctx(conn, agency=A, user=member_a)
            conn.execute(text("INSERT INTO agency_memberships (id, agency_id, user_id, can_review, can_receive_reviews, is_agency_admin) "
                              "VALUES (:id,:a,:u,false,false,false)"), {"id": uuid.uuid4(), "a": A, "u": staff})
    assert _is_rls_error(ei.value)


def test_ordinary_member_cannot_self_grant_admin(seeded):
    A, member_a = seeded["A"], seeded["member_a"]
    with seeded["app"].connect() as conn, conn.begin():
        _ctx(conn, agency=A, user=member_a)
        # UPDATE is filtered to admin-only rows by the USING clause → affects 0 rows.
        assert conn.execute(text("UPDATE agency_memberships SET is_agency_admin=true "
                                 "WHERE user_id=:u AND agency_id=:a"), {"u": member_a, "a": A}).rowcount == 0
    with seeded["owner"].connect() as c:
        assert c.execute(text("SELECT is_agency_admin FROM agency_memberships WHERE user_id=:u"),
                         {"u": member_a}).scalar() is False  # never escalated


def test_member_cannot_self_grant_into_other_agency(seeded):
    A, B, member_a = seeded["A"], seeded["B"], seeded["member_a"]
    with pytest.raises(DBAPIError) as ei:
        with seeded["app"].connect() as conn, conn.begin():
            _ctx(conn, agency=A, user=member_a)
            conn.execute(text("INSERT INTO agency_memberships (id, agency_id, user_id, can_review, can_receive_reviews, is_agency_admin) "
                              "VALUES (:id,:b,:u,false,false,true)"), {"id": uuid.uuid4(), "b": B, "u": member_a})
    assert _is_rls_error(ei.value)


# ───────── least-privilege grants ─────────
def test_audit_log_is_append_only(seeded):
    A = seeded["A"]
    aid = uuid.uuid4()
    with seeded["app"].connect() as conn, conn.begin():
        _ctx(conn, agency=A)
        conn.execute(text("INSERT INTO audit_logs (id, agency_id, action) VALUES (:id,:a,'test.event')"),
                     {"id": aid, "a": A})
    for sql in ("UPDATE audit_logs SET action='tamper' WHERE id=:id", "DELETE FROM audit_logs WHERE id=:id"):
        with pytest.raises(DBAPIError):
            with seeded["app"].connect() as conn, conn.begin():
                _ctx(conn, agency=A)
                conn.execute(text(sql), {"id": aid})
    with seeded["owner"].begin() as c:
        c.execute(text("DELETE FROM audit_logs WHERE id=:id"), {"id": aid})


def test_qa_config_is_read_only(seeded):
    with seeded["app"].connect() as conn, conn.begin():
        conn.execute(text("SELECT count(*) FROM qa_scoring_domains"))
    with pytest.raises(DBAPIError):
        with seeded["app"].connect() as conn, conn.begin():
            conn.execute(text("INSERT INTO qa_scoring_domains DEFAULT VALUES"))


def test_ungranted_table_is_inaccessible(seeded):
    owner = seeded["owner"]
    tname = f"rls_future_{uuid.uuid4().hex[:8]}"
    with owner.begin() as c:
        c.execute(text(f"CREATE TABLE {tname} (id int primary key, secret text)"))  # nosec B608
        c.execute(text(f"INSERT INTO {tname} VALUES (1, 'top-secret')"))  # nosec B608
    try:
        for role in ("app", "platform"):
            with pytest.raises(DBAPIError):
                with seeded[role].connect() as conn, conn.begin():
                    conn.execute(text(f"SELECT secret FROM {tname}"))  # nosec B608
    finally:
        with owner.begin() as c:
            c.execute(text(f"DROP TABLE {tname}"))  # nosec B608


def test_public_has_no_create_on_schema(seeded):
    with seeded["app"].connect() as c:
        assert c.execute(text("SELECT EXISTS (SELECT 1 FROM pg_namespace n CROSS JOIN LATERAL aclexplode(COALESCE(n.nspacl, acldefault('n',n.nspowner))) a WHERE n.nspname='public' AND a.grantee=0 AND a.privilege_type='CREATE')")).scalar() is False


# ───────── fail-closed startup validation (item 2) ─────────
def test_runtime_validation_passes_on_healthy_db(seeded):
    from app.startup_checks import validate_runtime_schema
    assert validate_runtime_schema(seeded["app"], require_rls=True, qa_enabled=True) == []


def test_runtime_validation_fails_when_policy_missing(seeded):
    from app.startup_checks import validate_runtime_schema, assert_runtime_ready
    owner = seeded["owner"]
    with owner.begin() as c:
        c.execute(text("DROP POLICY IF EXISTS agency_isolation ON pipeline_runs"))
    try:
        problems = validate_runtime_schema(seeded["app"], require_rls=True, qa_enabled=True)
        assert any("pipeline_runs" in p for p in problems), problems
        with pytest.raises(RuntimeError):
            assert_runtime_ready(seeded["app"], require_rls=True, qa_enabled=True)
    finally:
        apply_rls(owner, app_role_password=APP_PW, platform_role_password="rls_platform_distinct_pw")


def test_runtime_validation_detects_retired_guc_regression(seeded):
    # If a policy ever reintroduced the forgeable app.platform_admin GUC, validation fails.
    from app.startup_checks import validate_runtime_schema
    owner = seeded["owner"]
    with owner.begin() as c:
        c.execute(text("DROP POLICY IF EXISTS agency_isolation ON pipeline_runs"))
        c.execute(text("CREATE POLICY agency_isolation ON pipeline_runs "
                       "USING (agency_id = NULLIF(current_setting('app.current_agency',true),'')::uuid "
                       "OR NULLIF(current_setting('app.platform_admin',true),'')='true')"))
    try:
        problems = validate_runtime_schema(seeded["app"], require_rls=True, qa_enabled=True)
        assert any("platform_admin" in p for p in problems), problems
    finally:
        apply_rls(owner, app_role_password=APP_PW, platform_role_password="rls_platform_distinct_pw")


def test_runtime_validation_fails_when_migration_baseline_missing(seeded):
    from app.startup_checks import validate_runtime_schema
    owner = seeded["owner"]
    with owner.begin() as c:
        c.execute(text("DELETE FROM schema_migrations WHERE filename='017_rls_least_privilege.sql'"))
    try:
        problems = validate_runtime_schema(seeded["app"], require_rls=True, qa_enabled=True)
        assert any("017_rls_least_privilege.sql" in p for p in problems), problems
    finally:
        with owner.begin() as c:
            c.execute(text("INSERT INTO schema_migrations(filename, sha256) VALUES "
                           "('017_rls_least_privilege.sql','x') ON CONFLICT (filename) DO NOTHING"))
