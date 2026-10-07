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
            conn.execute(text(f"CREATE POLICY agency_isolation ON {table} USING ({using})"))

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


def set_user_context(db: DBSession, user_id) -> None:
    """Set the caller's identity for this transaction (every request)."""
    db.execute(
        text("SELECT set_config('app.current_user', :u, true)"),
        {"u": str(user_id)},
    )


def set_agency_context(db: DBSession, agency_id) -> None:
    """Scope the transaction to one agency — call ONLY after verifying membership."""
    db.execute(
        text("SELECT set_config('app.current_agency', :a, true)"),
        {"a": str(agency_id)},
    )
