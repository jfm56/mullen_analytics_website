"""Read-only runtime schema/security validation for staging & production.

In those environments the API and worker must NOT create, ALTER, backfill, or
provision anything at startup (that requires owner/admin DB credentials and risks
schema drift on every boot). Instead they connect as the low-privilege runtime
role and *verify* that an operator-run migration has already put the database in
the expected shape — required tables and columns exist, the runtime role is not a
superuser and cannot bypass RLS, and the agency-isolation policies are enabled on
every tenancy table. `assert_runtime_ready()` raises (failing startup) when any
required invariant is missing or invalid, so a misconfigured deploy fails fast and
loudly rather than silently serving with isolation disabled.

All checks are pure reads (information_schema / pg_catalog). Nothing here modifies
the database, and nothing here needs owner privileges — it runs as `app_user`.
"""
from __future__ import annotations

import logging

from sqlalchemy import text
from sqlalchemy.engine import Engine

from .security_rls import _RLS_TABLES, _QA_AGENCY_TABLES

log = logging.getLogger(__name__)

# Tables that MUST exist for the API to function (tenancy tables + core identity).
_REQUIRED_TABLES = frozenset(_RLS_TABLES | {
    "users", "profiles", "sessions", "organizations", "app_settings",
    "module_entitlements",
})

# Representative column-drift checks — the agency-tenancy and identity columns that
# the former self-heal ALTERs added. If a migration has not been applied these are
# the first things to go missing, and their absence breaks isolation or auth.
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


def _existing_tables(conn) -> set[str]:
    rows = conn.execute(text(
        "SELECT table_name FROM information_schema.tables "
        "WHERE table_schema = 'public'"
    ))
    return {r[0] for r in rows}


def _existing_columns(conn, table: str) -> set[str]:
    rows = conn.execute(
        text(
            "SELECT column_name FROM information_schema.columns "
            "WHERE table_schema = 'public' AND table_name = :t"
        ),
        {"t": table},
    )
    return {r[0] for r in rows}


def _rls_state(conn, table: str) -> tuple[bool, bool]:
    """(rls_enabled, agency_isolation_policy_present) for one table."""
    enabled = conn.execute(
        text("SELECT relrowsecurity FROM pg_class WHERE relname = :t AND relkind = 'r'"),
        {"t": table},
    ).scalar()
    has_policy = conn.execute(
        text(
            "SELECT count(*) FROM pg_policies "
            "WHERE schemaname = 'public' AND tablename = :t AND policyname = 'agency_isolation'"
        ),
        {"t": table},
    ).scalar()
    return bool(enabled), bool(has_policy)


def validate_runtime_schema(engine: Engine, *, require_rls: bool, qa_enabled: bool) -> list[str]:
    """Return a list of human-readable problems (empty == healthy).

    require_rls: enforce the runtime role is non-privileged and every tenancy table
                 has RLS + the agency_isolation policy (unified/cognito deployments).
    qa_enabled:  additionally require the EMSCS QA tables + their RLS.
    """
    problems: list[str] = []
    with engine.connect() as conn:
        # --- Runtime role must not be able to bypass tenant isolation ---
        if require_rls:
            role = conn.execute(text(
                "SELECT rolsuper, rolbypassrls FROM pg_roles WHERE rolname = current_user"
            )).first()
            who = conn.execute(text("SELECT current_user")).scalar()
            if role is None:
                problems.append(f"cannot read role attributes for runtime user {who!r}")
            else:
                if role[0]:
                    problems.append(f"runtime role {who!r} is a SUPERUSER (would bypass RLS)")
                if role[1]:
                    problems.append(f"runtime role {who!r} has BYPASSRLS (would bypass RLS)")

        # --- Required tables ---
        tables = _existing_tables(conn)
        for t in sorted(_REQUIRED_TABLES):
            if t not in tables:
                problems.append(f"required table missing: {t}")

        # --- Required columns (schema drift / un-applied migration) ---
        for table, column in _REQUIRED_COLUMNS:
            if table in tables and column not in _existing_columns(conn, table):
                problems.append(f"required column missing: {table}.{column}")

        # --- RLS enabled + policy present on every tenancy table ---
        if require_rls:
            for t in sorted(_RLS_TABLES):
                if t not in tables:
                    continue  # already reported if required; skip RLS probe
                enabled, has_policy = _rls_state(conn, t)
                if not enabled:
                    problems.append(f"RLS not enabled on tenancy table: {t}")
                if not has_policy:
                    problems.append(f"agency_isolation policy missing on tenancy table: {t}")

            if qa_enabled:
                for t in sorted(_QA_AGENCY_TABLES):
                    if t not in tables:
                        problems.append(f"EMSCS QA enabled but table missing: {t}")
                        continue
                    enabled, has_policy = _rls_state(conn, t)
                    if not enabled:
                        problems.append(f"RLS not enabled on QA table: {t}")
                    if not has_policy:
                        problems.append(f"agency_isolation policy missing on QA table: {t}")

    return problems


def assert_runtime_ready(engine: Engine, *, require_rls: bool, qa_enabled: bool) -> None:
    """Validate the live database and RAISE (failing startup) if anything required
    is missing or invalid. Use in staging/production where the app must never
    self-provision schema."""
    problems = validate_runtime_schema(engine, require_rls=require_rls, qa_enabled=qa_enabled)
    if problems:
        detail = "\n  - ".join(problems)
        raise RuntimeError(
            "Database is not in a valid state for this environment. An operator must "
            "apply the pending migration(s) before the API can start safely.\n  - "
            + detail
        )
    log.info(
        "Runtime schema validation passed (require_rls=%s, qa_enabled=%s)",
        require_rls, qa_enabled,
    )
