"""Row-Level Security for agency isolation — defense-in-depth beneath the API authz.

`apply_rls()` provisions two low-privilege login roles and enables RLS on the
agency-scoped tenancy tables:

  app_user       — the ordinary runtime identity the API/worker connect as. Subject
                   to RLS; sees only the current agency's data. Agency context is asserted by the application; see the residual below.
  app_platform   — the Super Admin (Mullen operator) identity, used ONLY by the
                   platform engine for cross-agency oversight. It is NOT a superuser
                   and does NOT have BYPASSRLS; its cross-agency visibility comes
                   solely from a policy clause keyed on the *database role identity*
                   (`current_user = 'app_platform'`), which an app_user session cannot
                   forge (it would have to connect as app_platform, whose credentials
                   live only in the super-admin request path).

Two per-request GUCs drive the ordinary (app_user) visibility:

  app.current_user   — set on every request; lets a user see their OWN memberships
                       and the agencies they belong to (the agency switcher).
  app.current_agency — set on agency-scoped requests AFTER a membership check;
                       exposes that one agency's data and nothing else.

Security model notes:
  * The cross-agency PLATFORM boundary is role-based (not a GUC). The former
    `app.platform_admin='true'` GUC bypass is gone: no policy reads it, so an
    ordinary app_user cannot activate that platform clause by setting the retired GUC.
    Forging agency/user context remains possible under arbitrary SQL access (below).
  * Writes to `agency_memberships` are restricted at the DB layer to agency-admins
    of the current agency (or the platform role): an ordinary member cannot create
    memberships, self-grant admin, or alter authorization records with their authenticated request context.
  * Superusers bypass RLS, so the app must NOT connect as a superuser; migrations/DDL
    run as the owner (used only out-of-band by the migration runner, never at runtime).
  * RESIDUAL (documented): because every end user shares the single `app_user` role,
    the per-request identity (`app.current_user`) and the single-agency scope
    (`app.current_agency`) are still asserted by the application, not proven by the
    database. An attacker able to run arbitrary SQL *as app_user* (e.g. via a SQL
    injection defect elsewhere) could set those GUCs to a victim's values and reach
    one agency's data. Fully closing that requires per-end-user DB roles or signed,
    policy-verified session tokens — see docs/aws-rls-hardening-reconciliation.md.
    An attacker who forges BOTH the agency and a known agency-admin user identity
    can also pass the membership-write predicate. This remains a production blocker
    for a database-enforced identity boundary; the policy relies on trusted API context.
"""
from sqlalchemy import text
from sqlalchemy.engine import Engine
from sqlalchemy.orm import Session as DBSession
from pathlib import Path

_APP_ROLE = "app_user"
_PLATFORM_ROLE = "app_platform"

# Deny-by-default GUC expressions (unset GUC reads '' after the first set_config,
# so NULLIF('') -> NULL and the comparison yields no rows).
_CUR_AGENCY = "NULLIF(current_setting('app.current_agency', true), '')::uuid"
_CUR_USER = "NULLIF(current_setting('app.current_user', true), '')::uuid"

# Cross-agency PLATFORM clause — keyed on the DATABASE ROLE IDENTITY, never a GUC.
# `current_user` here is the SQL session role (the connected login role), which an
# app_user session cannot change without the app_platform credentials. This replaces
# the old forgeable `app.platform_admin='true'` GUC bypass.
_PLATFORM = f"current_user = '{_PLATFORM_ROLE}'"

# A row written/read in `agency_memberships` is an administrative action: it is only
# permitted for an agency-ADMIN of the current agency (or the platform role). The
# subquery reads the actor's own admin membership, which is visible to them under the
# SELECT policy (user_id = current_user branch).
_MEMBER_ADMIN_OF_CURRENT = (
    f"EXISTS (SELECT 1 FROM agency_memberships m "  # nosec B608 - fixed internal GUC-expression constants only, never user input
    f"WHERE m.user_id = {_CUR_USER} AND m.agency_id = {_CUR_AGENCY} AND m.is_agency_admin)"
)

# --- Explicit least-privilege permission matrix (item 4) ----------------------
# app_user and app_platform are the ONLY identities the runtime connects as. They are
# granted PER TABLE (never "GRANT ... ON ALL TABLES", which also captures non-app
# objects) from an EXPLICIT, justified matrix keyed by functional group. Anything not
# downgraded is "operational CRUD": data the runtime legitimately creates/updates for
# normal operation. Provisioning ASSERTS every application table is covered, so a new
# table fails loudly rather than silently receiving CRUD.
#
#   append-only (SELECT, INSERT): authentication/identity audit + error + event trails
#       the runtime appends to and reads but must never rewrite or erase (tamper /
#       erasure resistance). Verified: no UPDATE/DELETE on these tables in routers/services.
#   read-only (SELECT): shared QA methodology/config — runtime reads only (writes are
#       an operator/migration task).
#   operational CRUD (explicit allowlist): identity (users/profiles/sessions/tokens), agency +
#       membership (membership WRITES further restricted by per-command policy below),
#       entitlements (organizations/module_entitlements), analytics (uploads/metrics/
#       emscharts/incidents/pipelines/files), and all other first-party operational data.
_APPEND_ONLY_TABLES = frozenset({
    "audit_logs", "platform_audit_events", "impersonation_logs", "error_logs",
    "qa_audit_events",  # QA audit trail (granted via apply_rls_qa; append-only too)
})
_CRUD_TABLES = frozenset({'agency_memberships', 'leads', 'analytics_column_settings', 'organizations', 'emscharts_connections', 'outreach_messages', 'data_cleaning_results', 'data_profiles', 'data_uploads', 'ems_column_mappings', 'app_settings', 'pipeline_runs', 'module_entitlements', 'web_sessions', 'web_events', 'enhanced_tasks', 'sync_runs', 'projects', 'profiles', 'messages', 'revenue_pipeline', 'email_verification_tokens', 'documents', 'ems_dataset_groups', 'users', 'agencies', 'ems_analytics_snapshots', 'tool_usage', 'client_feedback', 'sessions', 'uploads', 'lead_suppressions', 'invoices', 'password_reset_tokens', 'ems_incidents', 'ems_dashboard_metrics', 'agency_files'})
_READ_ONLY_TABLES = frozenset()  # core has none; QA config is read-only via apply_rls_qa

# QA tables (base + config): granted by apply_rls_qa(), so the base grant pass skips
# them (they may not exist yet, and their verb profile differs).
_QA_TABLE_NAMES = frozenset({
    "qa_charts", "qa_review_sessions", "qa_indicator_reviews", "qa_findings",
    "qa_crew_feedback", "qa_scores", "qa_audit_events",
    "qa_scoring_domains", "qa_indicators", "qa_scoring_configs",
})

# The ONLY integer-PK table (app_settings) uses a sequence that the runtime must use
# to INSERT at runtime (settings API). Every other PK is a client-generated UUID, so
# no other sequence privilege is required — we never grant USAGE on ALL sequences.
_RUNTIME_SEQUENCES = ("app_settings_id_seq",)

_RUNTIME_ROLES = (_APP_ROLE, _PLATFORM_ROLE)


def _grant_verbs(table: str) -> str:
    if table in _APPEND_ONLY_TABLES:
        return "SELECT, INSERT"
    if table in _READ_ONLY_TABLES:
        return "SELECT"
    if table in _CRUD_TABLES or table in (_QA_TABLE_NAMES - _QA_CONFIG_TABLES):
        return "SELECT, INSERT, UPDATE, DELETE"
    raise ValueError(f"No reviewed runtime grant profile for table: {table}")


def _ensure_role(conn, role: str, password: str) -> None:
    """Create or re-sync a least-privilege LOGIN role WITHOUT interpolating the
    password into unescaped SQL text. The role name (%I) and password (%L) are passed
    as bind parameters to Postgres `format()`, which quotes them safely; the returned,
    fully-escaped DDL is then executed. DDL still contains the secret: do not log it. The role is explicitly NOSUPERUSER /
    NOBYPASSRLS / NOCREATEDB / NOCREATEROLE and is never granted membership in another
    role, so it has no inherited privileges."""
    exists = conn.execute(
        text("SELECT 1 FROM pg_roles WHERE rolname = :r"), {"r": role}
    ).scalar()
    verb = "ALTER" if exists else "CREATE"
    ddl = conn.execute(
        text(
            "SELECT format("
            "'%s ROLE %%I WITH LOGIN NOSUPERUSER NOBYPASSRLS NOCREATEDB NOCREATEROLE "
            "INHERIT PASSWORD %%L', :r, :p)" % verb
        ),
        {"r": role, "p": password},
    ).scalar()
    conn.exec_driver_sql(ddl, execution_options={"no_parameters": True})
    # The driver executes the already-quoted SQL directly: text() would parse
    # colon-prefixed password fragments as SQLAlchemy bind parameters.
    # Defense-in-depth: strip role attributes even if the role pre-existed with more.
    hardening = conn.execute(
        text("SELECT format('ALTER ROLE %I NOSUPERUSER NOBYPASSRLS NOCREATEDB NOCREATEROLE', :r)"),
        {"r": role},
    ).scalar()
    conn.exec_driver_sql(hardening, execution_options={"no_parameters": True})
    memberships = conn.execute(text(
        "SELECT p.rolname FROM pg_auth_members m JOIN pg_roles p ON p.oid=m.roleid "
        "JOIN pg_roles c ON c.oid=m.member WHERE c.rolname=:r"), {"r": role}).scalars().all()
    for parent in memberships:
        revoke = conn.execute(text("SELECT format('REVOKE %I FROM %I', :p, :r)"),
                              {"p": parent, "r": role}).scalar()
        conn.exec_driver_sql(revoke, execution_options={"no_parameters": True})


def _apply_least_privilege_grants(conn, role: str) -> None:
    """Revoke any prior/blanket privileges, then GRANT exactly the matrix verbs each
    base (non-QA) application table needs, to `role`. Idempotent; run as the owner."""
    conn.execute(text(f"REVOKE ALL PRIVILEGES ON ALL TABLES IN SCHEMA public FROM {role}"))
    conn.execute(text(f"REVOKE ALL PRIVILEGES ON ALL SEQUENCES IN SCHEMA public FROM {role}"))
    conn.execute(text(f"GRANT USAGE ON SCHEMA public TO {role}"))
    from .database import Base  # local import avoids any import cycle at module load
    for table in sorted(Base.metadata.tables):
        if table in _QA_TABLE_NAMES:
            continue
        # Unknown tables fail provisioning instead of silently receiving CRUD.
        conn.execute(text(f'GRANT {_grant_verbs(table)} ON "{table}" TO {role}'))  # nosec B608
    for seq in _RUNTIME_SEQUENCES:
        conn.execute(text(
            f"DO $$ BEGIN "  # fixed internal constant seq name, never user input  # nosec B608
            f"IF EXISTS (SELECT FROM pg_class WHERE relkind='S' AND relname='{seq}') THEN "
            f"EXECUTE 'GRANT USAGE, SELECT ON SEQUENCE {seq} TO {role}'; END IF; END $$;"
        ))
    # Read-only on the migration ledger so the runtime role can self-verify the
    # applied baseline at startup (the runner owns/writes it; runtime only reads).
    conn.execute(text(
        f"DO $$ BEGIN "  # fixed internal constant, never user input  # nosec B608
        f"IF to_regclass('public.schema_migrations') IS NOT NULL THEN "
        f"EXECUTE 'GRANT SELECT ON schema_migrations TO {role}'; END IF; END $$;"
    ))


def _revoke_public(conn) -> None:
    """Check and tighten PUBLIC and default privileges (item 4): PUBLIC must hold no
    table/sequence privileges and must not be able to create objects in `public`;
    future owner-created objects are not granted to PUBLIC."""
    conn.execute(text("REVOKE ALL PRIVILEGES ON ALL TABLES IN SCHEMA public FROM PUBLIC"))
    conn.execute(text("REVOKE ALL PRIVILEGES ON ALL SEQUENCES IN SCHEMA public FROM PUBLIC"))
    conn.execute(text("REVOKE CREATE ON SCHEMA public FROM PUBLIC"))
    conn.execute(text("ALTER DEFAULT PRIVILEGES IN SCHEMA public REVOKE ALL ON TABLES FROM PUBLIC"))
    conn.execute(text("ALTER DEFAULT PRIVILEGES IN SCHEMA public REVOKE ALL ON SEQUENCES FROM PUBLIC"))


# The ONLY tables RLS policies are ever provisioned for. `policy()` asserts its
# `table` argument against this set, so a stray or mistyped name can never reach the
# DDL — the identifiers interpolated below are fixed internal constants, never input.
_RLS_TABLES = frozenset({
    # Unified agency/org tenancy tables (carry agency_id directly).
    "agency_memberships", "agencies", "agency_files", "audit_logs", "pipeline_runs",
    # EMS analytics ROOTS — now agency-owned (agency_id added; client_id kept for audit).
    "ems_dataset_groups", "data_uploads",
    # EMS analytics CHILDREN — inherit agency ownership via data_upload_id -> data_uploads.
    "data_cleaning_results", "ems_dashboard_metrics", "data_profiles",
    "analytics_column_settings", "ems_column_mappings",
    # EMSCharts ingestion — agency-owned (agency_id direct).
    "emscharts_connections", "sync_runs", "ems_incidents", "ems_analytics_snapshots",
})

# Children reached only through a data_upload — agency ownership inherited via FK.
_UPLOAD_CHILDREN = (
    "data_cleaning_results", "ems_dashboard_metrics", "data_profiles",
    "analytics_column_settings", "ems_column_mappings",
)


def apply_rls(engine: Engine, app_role_password: str,
              platform_role_password: str | None = None) -> None:
    """Idempotently create the low-priv runtime roles and enable RLS policies.
    Run as a superuser/owner. `app_role_password` MUST be supplied in any real
    deployment (the default is a non-usable placeholder; the startup/migration path
    never calls this without a configured password). `platform_role_password` must be supplied and differ from the ordinary role password."""
    if not app_role_password or not platform_role_password or platform_role_password == app_role_password:
        raise ValueError("A distinct platform database password is required")
    platform_pw = platform_role_password
    with engine.begin() as conn:
        _ensure_role(conn, _APP_ROLE, app_role_password)
        _ensure_role(conn, _PLATFORM_ROLE, platform_pw)
        _revoke_public(conn)
        # Keep operator provisioning and migration 020 at the same boundary.
        guard_sql = (Path(__file__).resolve().parents[1] / "migrations" /
                     "020_protect_platform_role.sql").read_text(encoding="utf-8")
        conn.exec_driver_sql(guard_sql)
        for role in _RUNTIME_ROLES:
            _apply_least_privilege_grants(conn, role)

        def _policy_body(table: str, using: str, check: str) -> None:
            if table not in _RLS_TABLES:
                raise ValueError(f"refusing RLS DDL for unknown table {table!r}")
            # ENABLE (not FORCE): the owner (migration identity, used ONLY by the
            # out-of-band migration runner) is exempt; the non-owner runtime roles are
            # fully subject to the policy. app_platform's cross-agency access is the
            # role-identity clause, not an owner/superuser bypass.
            conn.execute(text(f"ALTER TABLE {table} ENABLE ROW LEVEL SECURITY"))
            conn.execute(text(f"ALTER TABLE {table} NO FORCE ROW LEVEL SECURITY"))
            conn.execute(text(f"DROP POLICY IF EXISTS agency_isolation ON {table}"))
            conn.execute(text(
                f"CREATE POLICY agency_isolation ON {table} "
                f"USING (({using}) OR {_PLATFORM}) "
                f"WITH CHECK (({check}) OR {_PLATFORM})"
            ))

        def policy(table: str, using: str, check: str | None = None) -> None:
            _policy_body(table, using, using if check is None else check)

        # --- agency_memberships: per-command policies (item 3) ---
        # Reads: your own memberships (switcher) OR the current agency's OR platform.
        # Writes (INSERT/UPDATE/DELETE): ONLY an agency-admin of the current agency (or
        # platform). An ordinary member cannot create memberships, self-grant admin, or
        # change authorization records — enforced at the DB layer, not just the API.
        conn.execute(text("ALTER TABLE agency_memberships ENABLE ROW LEVEL SECURITY"))
        conn.execute(text("ALTER TABLE agency_memberships NO FORCE ROW LEVEL SECURITY"))
        for pol in ("agency_isolation", "agency_memberships_sel", "agency_memberships_ins",
                    "agency_memberships_upd", "agency_memberships_del"):
            conn.execute(text(f"DROP POLICY IF EXISTS {pol} ON agency_memberships"))
        _read = f"user_id = {_CUR_USER} OR agency_id = {_CUR_AGENCY} OR {_PLATFORM}"
        _write = f"(agency_id = {_CUR_AGENCY} AND {_MEMBER_ADMIN_OF_CURRENT}) OR {_PLATFORM}"
        conn.execute(text(f"CREATE POLICY agency_memberships_sel ON agency_memberships FOR SELECT USING ({_read})"))
        conn.execute(text(f"CREATE POLICY agency_memberships_ins ON agency_memberships FOR INSERT WITH CHECK ({_write})"))
        conn.execute(text(f"CREATE POLICY agency_memberships_upd ON agency_memberships FOR UPDATE USING ({_write}) WITH CHECK ({_write})"))
        conn.execute(text(f"CREATE POLICY agency_memberships_del ON agency_memberships FOR DELETE USING ({_write})"))

        # The current agency OR any agency you belong to is VISIBLE (names for the
        # switcher); writes require the agency's own context (or platform).
        policy(
            "agencies",
            f"id = {_CUR_AGENCY} OR EXISTS (SELECT 1 FROM agency_memberships m "  # fixed constants, never user input  # nosec B608
            f"WHERE m.agency_id = agencies.id AND m.user_id = {_CUR_USER})",
            check=f"id = {_CUR_AGENCY}",
        )
        # Straight agency_id tables: read and write confined to the current agency.
        for table in ("agency_files", "audit_logs", "pipeline_runs",
                      "ems_dataset_groups", "data_uploads", "emscharts_connections",
                      "sync_runs", "ems_incidents", "ems_analytics_snapshots"):
            policy(table, f"agency_id = {_CUR_AGENCY}")
        # Children inherit agency ownership through their data_upload_id FK.
        child_using = (
            f"EXISTS (SELECT 1 FROM data_uploads u "  # fixed constant _CUR_AGENCY, never user input  # nosec B608
            f"WHERE u.id = data_upload_id AND u.agency_id = {_CUR_AGENCY})"
        )
        for table in _UPLOAD_CHILDREN:
            policy(table, child_using)


# EMSCS QA Review Engine v1 (flag-gated). Agency-owned QA tables carry agency_id
# directly; the three config tables (domains/indicators/scoring) are shared
# methodology, read-only to the runtime roles. All identifiers below are fixed
# internal constants from these frozensets, never user input.
_QA_AGENCY_TABLES = frozenset({
    "qa_charts", "qa_review_sessions", "qa_indicator_reviews", "qa_findings",
    "qa_crew_feedback", "qa_scores", "qa_audit_events",
})
_QA_CONFIG_TABLES = frozenset({"qa_scoring_domains", "qa_indicators", "qa_scoring_configs"})


def apply_rls_qa(engine: Engine) -> None:
    """Extend RLS to the EMSCS QA tables. Called ONLY when emscs_qa_v1_enabled and
    after the QA tables have been created. Agency-owned tables get the agency_isolation
    policy (role-based platform clause); config tables are read-only to the runtime."""
    with engine.begin() as conn:
        for role in _RUNTIME_ROLES:
            for _t in sorted(_QA_AGENCY_TABLES):
                conn.execute(text(f"GRANT {_grant_verbs(_t)} ON {_t} TO {role}"))  # fixed constant table  # nosec B608
            for _t in sorted(_QA_CONFIG_TABLES):
                conn.execute(text(f"GRANT SELECT ON {_t} TO {role}"))  # fixed constant table  # nosec B608
        for _t in sorted(_QA_AGENCY_TABLES):
            conn.execute(text(f"ALTER TABLE {_t} ENABLE ROW LEVEL SECURITY"))   # fixed constant table  # nosec B608
            conn.execute(text(f"ALTER TABLE {_t} NO FORCE ROW LEVEL SECURITY"))  # fixed constant table  # nosec B608
            conn.execute(text(f"DROP POLICY IF EXISTS agency_isolation ON {_t}"))  # fixed constant table  # nosec B608
            conn.execute(text(
                f"CREATE POLICY agency_isolation ON {_t} "  # fixed constants only  # nosec B608
                f"USING (agency_id = {_CUR_AGENCY} OR {_PLATFORM}) "
                f"WITH CHECK (agency_id = {_CUR_AGENCY} OR {_PLATFORM})"
            ))


def set_user_context(db: DBSession, user_id) -> None:
    """Set the caller's identity for this transaction (every request)."""
    db.execute(
        text("SELECT set_config('app.current_user', :u, true)"),
        {"u": str(user_id)},
    )


def set_agency_context(db: DBSession, agency_id) -> None:
    """Scope the transaction to one agency — call ONLY after verifying membership
    (or SUPER_ADMIN View-As of that agency, which runs on the platform connection)."""
    db.execute(
        text("SELECT set_config('app.current_agency', :a, true)"),
        {"a": str(agency_id)},
    )
