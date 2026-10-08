"""Row-Level Security for agency isolation — defense-in-depth beneath the API authz.

`apply_rls()` provisions a low-privilege `app_user` role and enables RLS policies on
the agency-scoped tenancy tables. Two per-request GUCs drive visibility:

  app.current_user   — set on every request; lets a user see their OWN memberships
                       and the agencies they belong to (the agency switcher).
  app.current_agency — set on agency-scoped requests AFTER a membership check;
                       exposes that one agency's data and nothing else.

The runtime app connects as `app_user` (RLS enforced) and sets these via
set_user_context() / set_agency_context(). Superusers bypass RLS, so the app must
NOT connect as a superuser; migrations/DDL run as the owner.
"""
from sqlalchemy import text
from sqlalchemy.engine import Engine
from sqlalchemy.orm import Session as DBSession

_APP_ROLE = "app_user"

# Deny-by-default GUC expressions (unset GUC reads '' after the first set_config,
# so NULLIF('' ) -> NULL and the comparison yields no rows).
_CUR_AGENCY = "NULLIF(current_setting('app.current_agency', true), '')::uuid"
_CUR_USER = "NULLIF(current_setting('app.current_user', true), '')::uuid"
# Platform-admin escape, set ONLY by set_platform_context() AFTER a SUPER_ADMIN check.
# This is a deliberate, authenticated platform-administration path — NOT a broad RLS
# bypass: RLS stays ENABLED, the runtime role remains the non-superuser app_user, and
# normal requests never set this GUC (and the pool checkin resets it), so tenant
# isolation for normal users/agency-admins/providers is completely unchanged.
_PLATFORM = "NULLIF(current_setting('app.platform_admin', true), '') = 'true'"

# The ONLY tables RLS policies are ever provisioned for. `policy()` asserts its
# `table` argument against this set, so a stray or mistyped name can never reach
# the DDL — the identifiers interpolated below are fixed internal constants, never
# request/user input.
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


def apply_rls(engine: Engine, app_role_password: str = "app_user_change_me") -> None:
    """Idempotently create the low-priv app role and enable RLS policies.
    Run as a superuser/owner."""
    with engine.begin() as conn:
        conn.execute(
            text(
                f"DO $$ BEGIN "  # provisioning DDL; identifier is fixed constant _APP_ROLE, never user input  # nosec B608
                f"IF NOT EXISTS (SELECT FROM pg_roles WHERE rolname = '{_APP_ROLE}') THEN "
                f"CREATE ROLE {_APP_ROLE} LOGIN PASSWORD '{app_role_password}'; "
                f"END IF; END $$;"
            )
        )
        # Keep the role's password synced with the configured secret (idempotent;
        # fixed role name + secret value, never user input).
        conn.execute(text(f"ALTER ROLE {_APP_ROLE} WITH LOGIN PASSWORD '{app_role_password}'"))  # nosec B608
        conn.execute(text(f"GRANT USAGE ON SCHEMA public TO {_APP_ROLE}"))
        conn.execute(
            text(f"GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA public TO {_APP_ROLE}")
        )
        conn.execute(
            text(f"GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO {_APP_ROLE}")
        )

        def policy(table: str, using: str) -> None:
            # Defense-in-depth: only ever provision policies for a known tenancy
            # table. `table` is always an internal literal (calls below); this
            # turns any future typo/misuse into a hard failure, not stray DDL.
            if table not in _RLS_TABLES:
                raise ValueError(f"refusing RLS DDL for unknown table {table!r}")
            # ENABLE (not FORCE): the table owner (the master/migration identity,
            # used ONLY for create_all/self-heal/seeds) is exempt, while the
            # non-owner runtime role app_user is fully subject to the policy. The
            # runtime never connects as the owner, so this is not a runtime bypass;
            # a platform admin still runs as app_user via the explicit context path.
            conn.execute(text(f"ALTER TABLE {table} ENABLE ROW LEVEL SECURITY"))
            conn.execute(text(f"ALTER TABLE {table} NO FORCE ROW LEVEL SECURITY"))
            conn.execute(text(f"DROP POLICY IF EXISTS agency_isolation ON {table}"))
            # Append the authenticated platform-admin clause (OR _PLATFORM) so a
            # verified SUPER_ADMIN with set_platform_context() can read across agencies
            # without disabling RLS. Normal requests never set app.platform_admin.
            conn.execute(text(f"CREATE POLICY agency_isolation ON {table} USING (({using}) OR {_PLATFORM})"))

        # Your own memberships (any agency, for the switcher) OR the current agency's.
        policy("agency_memberships", f"user_id = {_CUR_USER} OR agency_id = {_CUR_AGENCY}")
        # The current agency OR any agency you belong to (names for the switcher).
        policy(
            "agencies",
            f"id = {_CUR_AGENCY} OR EXISTS (SELECT 1 FROM agency_memberships m "  # predicate from fixed constants (_CUR_AGENCY/_CUR_USER), never user input  # nosec B608
            f"WHERE m.agency_id = agencies.id AND m.user_id = {_CUR_USER})",
        )
        # Everything else is strictly the current agency.
        for table in ("agency_files", "audit_logs", "pipeline_runs"):
            policy(table, f"agency_id = {_CUR_AGENCY}")

        # --- Agency-owned EMS analytics (unified tenancy) ---
        # Roots carry agency_id directly; deny-by-default when no agency context.
        for table in ("ems_dataset_groups", "data_uploads", "emscharts_connections",
                      "sync_runs", "ems_incidents", "ems_analytics_snapshots"):
            policy(table, f"agency_id = {_CUR_AGENCY}")
        # Children inherit agency ownership through their data_upload_id FK: a child
        # row is visible only if its parent upload is in the current agency. The
        # bare `data_upload_id` is the child row's column (data_uploads has no such
        # column), so it correlates to the outer (policy) table.
        child_using = (
            f"EXISTS (SELECT 1 FROM data_uploads u "  # built from fixed constant _CUR_AGENCY, never user input  # nosec B608
            f"WHERE u.id = data_upload_id AND u.agency_id = {_CUR_AGENCY})"
        )
        for table in _UPLOAD_CHILDREN:
            policy(table, child_using)


# EMSCS QA Review Engine v1 (flag-gated). Agency-owned QA tables carry agency_id
# directly; the three config tables (domains/indicators/scoring) are shared
# methodology, read-only to the runtime role. All identifiers below are fixed
# internal constants from these frozensets, never user input.
_QA_AGENCY_TABLES = frozenset({
    "qa_charts", "qa_review_sessions", "qa_indicator_reviews", "qa_findings",
    "qa_crew_feedback", "qa_scores", "qa_audit_events",
})
_QA_CONFIG_TABLES = frozenset({"qa_scoring_domains", "qa_indicators", "qa_scoring_configs"})


def apply_rls_qa(engine: Engine) -> None:
    """Extend RLS to the EMSCS QA tables. Called ONLY when emscs_qa_v1_enabled and
    after the QA tables have been created (the tables do not exist when the flag is
    off). Agency-owned tables get the same agency_isolation policy as the rest of
    the platform; config tables are granted read-only to app_user."""
    with engine.begin() as conn:
        for _t in sorted(_QA_AGENCY_TABLES):
            conn.execute(text(f"GRANT SELECT, INSERT, UPDATE, DELETE ON {_t} TO {_APP_ROLE}"))  # fixed constant table from _QA_AGENCY_TABLES  # nosec B608
        for _t in sorted(_QA_CONFIG_TABLES):
            conn.execute(text(f"GRANT SELECT ON {_t} TO {_APP_ROLE}"))  # fixed constant table from _QA_CONFIG_TABLES  # nosec B608
        conn.execute(text(f"GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO {_APP_ROLE}"))
        for _t in sorted(_QA_AGENCY_TABLES):
            conn.execute(text(f"ALTER TABLE {_t} ENABLE ROW LEVEL SECURITY"))   # fixed constant table  # nosec B608
            conn.execute(text(f"ALTER TABLE {_t} NO FORCE ROW LEVEL SECURITY"))  # fixed constant table  # nosec B608
            conn.execute(text(f"DROP POLICY IF EXISTS agency_isolation ON {_t}"))  # fixed constant table  # nosec B608
            conn.execute(text(f"CREATE POLICY agency_isolation ON {_t} USING (agency_id = {_CUR_AGENCY} OR {_PLATFORM})"))  # fixed constants only  # nosec B608


def set_user_context(db: DBSession, user_id) -> None:
    """Set the caller's identity for this transaction (every request)."""
    db.execute(
        text("SELECT set_config('app.current_user', :u, true)"),
        {"u": str(user_id)},
    )


def set_agency_context(db: DBSession, agency_id) -> None:
    """Scope the transaction to one agency — call ONLY after verifying membership
    (or SUPER_ADMIN View-As of that agency)."""
    db.execute(
        text("SELECT set_config('app.current_agency', :a, true)"),
        {"a": str(agency_id)},
    )


def set_platform_context(db: DBSession) -> None:
    """Grant platform-wide (cross-agency) visibility for THIS transaction. Call ONLY
    after verifying the caller is a SUPER_ADMIN and they explicitly requested platform
    scope. Pair with set_user_context() so the actor identity is still recorded."""
    db.execute(text("SELECT set_config('app.platform_admin', 'true', true)"))


def clear_platform_context(db: DBSession) -> None:
    """Drop platform-wide visibility (e.g. when a SUPER_ADMIN selects one agency)."""
    db.execute(text("SELECT set_config('app.platform_admin', '', true)"))
