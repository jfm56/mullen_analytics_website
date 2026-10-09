"""Read-only runtime schema/security validation for staging & production.

In those environments the API and worker must NOT create, ALTER, backfill, or
provision anything at startup. Instead they connect as the low-privilege runtime
role and *verify* that an operator-run migration has already put the database in the
expected shape, FAILING CLOSED (raising) on any mismatch. The checks are deliberately
deep: actual RLS policy *expressions* (not mere presence), permissive-policy exposure,
role hardening + inheritance, table ownership, the required grant matrix, and the
recorded migration baseline (through 020).

All checks are pure reads (information_schema / pg_catalog). Nothing here modifies the
database, and nothing here needs owner privileges — it runs as `app_user`.
"""
from __future__ import annotations

import logging

from sqlalchemy import text
from sqlalchemy.engine import Engine

from .security_rls import (
    _RLS_TABLES, _QA_AGENCY_TABLES, _APPEND_ONLY_TABLES, _APP_ROLE, _PLATFORM_ROLE,
    _CRUD_TABLES, _QA_TABLE_NAMES,
)

log = logging.getLogger(__name__)

_REQUIRED_TABLES = frozenset(_RLS_TABLES | {
    "users", "profiles", "sessions", "organizations", "app_settings",
    "module_entitlements",
})

_REQUIRED_COLUMNS = (
    ("users", "cognito_sub"),
    ("users", "platform_role"),
    ("users", "email_confirmed"),
    ("users", "totp_enabled"),
    ("agencies", "data_classification"),
    ("agencies", "org_id"),
    ("agency_memberships", "is_agency_admin"),
    ("agency_memberships", "can_review"),
    ("data_uploads", "agency_id"),
    ("ems_dataset_groups", "agency_id"),
    ("profiles", "module_overrides"),
    ("profiles", "ems_qa_enabled"),
    ("profiles", "plan"),
    ("profiles", "plan_status"),
    ("profiles", "trial_ends_at"),
    ("profiles", "plan_selected_at"),
    ("profiles", "stripe_customer_id"),
    ("profiles", "stripe_subscription_id"),
    ("profiles", "extra_dataset_slots"),
    ("messages", "direction"),
)

# The migration that records this hardening; the applied ledger must contain it.
_REQUIRED_MIGRATIONS = (
    "016_unified_platform_identity.sql", "017_rls_least_privilege.sql",
    "018_role_based_platform_boundary.sql", "019_portal_model_columns.sql",
    "020_protect_platform_role.sql",
)

# Fragments every tenancy policy expression MUST contain, and MUST NOT contain.
# The platform clause is role-based; Postgres renders it `CURRENT_USER = 'app_platform'::name`,
# so we match the distinctive role-name token case-insensitively.
_PLATFORM_CLAUSE = _PLATFORM_ROLE                         # e.g. "app_platform" (role-keyed, unforgeable)
_FORBIDDEN_IN_POLICY = "app.platform_admin"               # the retired forgeable GUC


def _existing_tables(conn) -> set[str]:
    return {r[0] for r in conn.execute(text(
        "SELECT table_name FROM information_schema.tables WHERE table_schema='public'"))}


def _columns(conn, table: str) -> set[str]:
    return {r[0] for r in conn.execute(text(
        "SELECT column_name FROM information_schema.columns "
        "WHERE table_schema='public' AND table_name=:t"), {"t": table})}


def _policies(conn, table: str):
    """[(policyname, cmd, permissive, qual, with_check)] for a table (as runtime role)."""
    return conn.execute(text(
        "SELECT policyname, cmd, permissive, COALESCE(qual,''), COALESCE(with_check,'') "
        "FROM pg_policies WHERE schemaname='public' AND tablename=:t"), {"t": table}).fetchall()


def _rls_enabled(conn, table: str) -> bool:
    return bool(conn.execute(text(
        "SELECT relrowsecurity FROM pg_class WHERE relname=:t AND relkind='r'"), {"t": table}).scalar())


def _check_role_hardening(conn, role: str, problems: list[str]) -> None:
    row = conn.execute(text(
        "SELECT rolsuper, rolbypassrls, rolcreatedb, rolcreaterole FROM pg_roles WHERE rolname=:r"),
        {"r": role}).first()
    if row is None:
        problems.append(f"runtime role {role!r} does not exist")
        return
    if row[0]:
        problems.append(f"runtime role {role!r} is SUPERUSER (would bypass RLS)")
    if row[1]:
        problems.append(f"runtime role {role!r} has BYPASSRLS (would bypass RLS)")
    if row[2]:
        problems.append(f"runtime role {role!r} has CREATEDB")
    if row[3]:
        problems.append(f"runtime role {role!r} has CREATEROLE")
    # Inherited privileges: a role this runtime role is a member of must not be
    # privileged (superuser / bypassrls), or it could inherit a bypass.
    inherited = conn.execute(text(
        "SELECT g.rolname, g.rolsuper, g.rolbypassrls FROM pg_auth_members m "
        "JOIN pg_roles g ON g.oid = m.roleid "
        "JOIN pg_roles r ON r.oid = m.member WHERE r.rolname=:r"), {"r": role}).fetchall()
    for gname, gsuper, gbypass in inherited:
        problems.append(f"runtime role {role!r} is a member of {gname!r}; runtime roles must have no role memberships")


def _check_table_ownership(conn, problems: list[str]) -> None:
    rows = conn.execute(text(
        "SELECT tablename, tableowner FROM pg_tables WHERE schemaname='public' AND tablename = ANY(:t)"),
        {"t": sorted(_CRUD_TABLES | _APPEND_ONLY_TABLES | _QA_TABLE_NAMES)}).fetchall()
    for tname, owner in rows:
        if owner in (_APP_ROLE, _PLATFORM_ROLE):
            problems.append(f"tenancy table {tname} is owned by runtime role {owner!r} "
                            f"(owner is exempt from RLS — must be a non-runtime owner)")


def _check_public_privileges(conn, problems: list[str]) -> None:
    # PUBLIC must hold no table privileges on tenancy tables.
    leaked = conn.execute(text(
        "SELECT c.relname, a.privilege_type FROM pg_class c "
        "JOIN pg_namespace n ON n.oid=c.relnamespace "
        "CROSS JOIN LATERAL aclexplode(COALESCE(c.relacl, acldefault('r',c.relowner))) a "
        "WHERE a.grantee=0 AND n.nspname='public' AND c.relname = ANY(:t)"),
        {"t": sorted(_RLS_TABLES)}).fetchall()
    for tname, priv in leaked:
        problems.append(f"PUBLIC has {priv} on tenancy table {tname} (must be revoked)")
    # PUBLIC must not be able to create objects in the public schema.
    if conn.execute(text("SELECT EXISTS (SELECT 1 FROM pg_namespace n CROSS JOIN LATERAL aclexplode(COALESCE(n.nspacl, acldefault('n',n.nspowner))) a WHERE n.nspname='public' AND a.grantee=0 AND a.privilege_type='CREATE')")).scalar():
        problems.append("PUBLIC has CREATE on schema public (must be revoked)")


def _check_policy_expressions(conn, table: str, problems: list[str]) -> None:
    pols = _policies(conn, table)
    if not pols:
        problems.append(f"no RLS policy on tenancy table {table}")
        return
    expected = ({"agency_memberships_sel": "SELECT", "agency_memberships_ins": "INSERT",
                 "agency_memberships_upd": "UPDATE", "agency_memberships_del": "DELETE"}
                if table == "agency_memberships" else {"agency_isolation": "ALL"})
    if {name: cmd for name, cmd, _, _, _ in pols} != expected:
        problems.append(f"{table} has unexpected policy names or commands")
    for name, cmd, permissive, qual, check in pols:
        if permissive != "PERMISSIVE":
            problems.append(f"{table}.{name} has unexpected policy mode")
        if cmd in ("ALL", "UPDATE") and (not qual or not check):
            problems.append(f"{table}.{name} must have both USING and WITH CHECK")
        blob = f"{qual} {check}".lower()
        if _FORBIDDEN_IN_POLICY in blob:
            problems.append(f"{table}.{name} still references the retired {_FORBIDDEN_IN_POLICY} GUC bypass")
        if _PLATFORM_CLAUSE not in blob:
            problems.append(f"{table}.{name} is missing the role-based platform clause")
        # Permissive-policy exposure: a permissive policy whose expression is a bare
        # TRUE (or empty) exposes every row. Flag it.
        for expr_name, expr in (("USING", qual), ("WITH CHECK", check)):
            e = expr.strip().lower().strip("()")
            if e in ("true", "t"):
                problems.append(f"{table}.{name} has an unconditional {expr_name} (true) — exposes all rows")
    # Every agency-scoped table's policy must reference current_agency (tenant key);
    # the upload-children reference it via their parent subquery (data_uploads u ...).
    joined = " ".join(f"{q} {c}" for _, _, _, q, c in pols)
    if "app.current_agency" not in joined:
        problems.append(f"{table} policy does not reference app.current_agency")


def _check_membership_policies(conn, problems: list[str]) -> None:
    pols = {r[0]: (r[1], f"{r[3]} {r[4]}") for r in _policies(conn, "agency_memberships")}
    # Writes must be admin-gated (per-command policies referencing is_agency_admin).
    for pol in ("agency_memberships_ins", "agency_memberships_upd", "agency_memberships_del"):
        if pol not in pols:
            problems.append(f"agency_memberships is missing write policy {pol}")
        elif "is_agency_admin" not in pols[pol][1]:
            problems.append(f"agency_memberships.{pol} does not restrict writes to agency admins")
    if "agency_memberships_sel" not in pols:
        problems.append("agency_memberships is missing its SELECT policy")
    # A single catch-all policy would re-open writes to ordinary members.
    if "agency_isolation" in pols:
        problems.append("agency_memberships still has the permissive catch-all 'agency_isolation' policy")


def _check_grants(conn, problems: list[str], tables: set[str]) -> None:
    # Check effective privileges for BOTH roles; role_table_grants can hide grants
    # to other roles from a low-privilege observer.
    for role in (_APP_ROLE, _PLATFORM_ROLE):
        for t in sorted(_APPEND_ONLY_TABLES & tables):
            privs = {verb for verb in ("SELECT", "INSERT", "UPDATE", "DELETE", "TRUNCATE")
                     if conn.execute(text("SELECT has_table_privilege(:r, :t, :v)"),
                                     {"r": role, "t": f"public.{t}", "v": verb}).scalar()}
            forbidden = privs & {"UPDATE", "DELETE", "TRUNCATE"}
            if forbidden:
                problems.append(f"append-only table {t} grants {sorted(forbidden)} to {role}")
            if not {"SELECT", "INSERT"} <= privs:
                problems.append(f"append-only table {t} is missing SELECT/INSERT for {role}")


def _check_migration_baseline(conn, problems: list[str]) -> None:
    exists = conn.execute(text("SELECT to_regclass('public.schema_migrations')")).scalar()
    if exists is None:
        problems.append("schema_migrations ledger not found — the migration runner has not been applied")
        return
    applied = {r[0] for r in conn.execute(text("SELECT filename FROM schema_migrations"))}
    for m in _REQUIRED_MIGRATIONS:
        if m not in applied:
            problems.append(f"required migration not recorded as applied: {m}")


def validate_runtime_schema(engine: Engine, *, require_rls: bool, qa_enabled: bool,
                            expected_role: str = _APP_ROLE) -> list[str]:
    """Return a list of human-readable problems (empty == healthy)."""
    problems: list[str] = []
    with engine.connect() as conn:
        tables = _existing_tables(conn)
        for t in sorted(_REQUIRED_TABLES):
            if t not in tables:
                problems.append(f"required table missing: {t}")
        for table, column in _REQUIRED_COLUMNS:
            if table in tables and column not in _columns(conn, table):
                problems.append(f"required column missing: {table}.{column}")

        if require_rls:
            connected_role = conn.execute(text("SELECT current_user")).scalar()
            if connected_role != expected_role:
                problems.append(f"connected database role must be {expected_role!r}, got {connected_role!r}")
            guard = conn.execute(text(
                "SELECT t.tgenabled, p.prosecdef FROM pg_trigger t "
                "JOIN pg_proc p ON p.oid=t.tgfoid "
                "WHERE t.tgrelid='public.users'::regclass "
                "AND t.tgname='guard_platform_role' AND NOT t.tgisinternal"
            )).first() if "users" in tables else None
            if guard is None or guard[0] != "O" or guard[1]:
                problems.append("users platform-role guard is missing, disabled, or not SECURITY INVOKER")
            _check_role_hardening(conn, _APP_ROLE, problems)
            _check_role_hardening(conn, _PLATFORM_ROLE, problems)
            _check_table_ownership(conn, problems)
            _check_public_privileges(conn, problems)
            _check_grants(conn, problems, tables)
            _check_migration_baseline(conn, problems)
            for t in sorted(_RLS_TABLES):
                if t not in tables:
                    continue
                if not _rls_enabled(conn, t):
                    problems.append(f"RLS not enabled on tenancy table: {t}")
                if t == "agency_memberships":
                    _check_membership_policies(conn, problems)
                _check_policy_expressions(conn, t, problems)
            if qa_enabled:
                for t in sorted(_QA_AGENCY_TABLES):
                    if t not in tables:
                        problems.append(f"EMSCS QA enabled but table missing: {t}")
                        continue
                    if not _rls_enabled(conn, t):
                        problems.append(f"RLS not enabled on QA table: {t}")
                    _check_policy_expressions(conn, t, problems)
    return problems


def assert_runtime_ready(engine: Engine, *, require_rls: bool, qa_enabled: bool,
                         expected_role: str = _APP_ROLE) -> None:
    """Validate the live database and RAISE (failing startup) if anything required is
    missing or invalid. Fail-closed — used in staging/production where the app must
    never self-provision schema."""
    problems = validate_runtime_schema(engine, require_rls=require_rls, qa_enabled=qa_enabled,
                                       expected_role=expected_role)
    if problems:
        detail = "\n  - ".join(problems)
        raise RuntimeError(
            "Database is not in a valid state for this environment. An operator must "
            "apply the pending migration(s) before the API can start safely.\n  - " + detail
        )
    log.info("Runtime schema validation passed (require_rls=%s, qa_enabled=%s)", require_rls, qa_enabled)
