# Mullen Analytics AWS — Security Hardening Milestone (RLS) — Report

**Branch:** `security/aws-rls-hardening` @ `c3bbe26` (off `main`, which carries PR #27).
**Status:** code + local synthetic tests complete. **Not deployed. Do not deploy until reviewed.**
Synthetic/no-PHI only. **PHI PRODUCTION GATE = NOT READY.** EMSCS QA stays feature-gated
(`EMSCS_QA_V1_ENABLED`, default OFF). 60/60 EMSCS QA scoring parity intact (`scoring.py` untouched).
Super Admin cross-agency capability preserved unchanged.

---

## 1. Files changed

| File | Change |
|---|---|
| `backend/app/security_rls.py` | Per-table least-privilege grants (replaces blanket `GRANT … ON ALL TABLES/SEQUENCES`); append-only audit grants; scoped sequence grant; **`WITH CHECK`** added to every `agency_isolation` policy; tightened write rule for `agency_memberships` / `agencies`. |
| `backend/app/startup_checks.py` | **New.** Read-only runtime validator (`validate_runtime_schema`, `assert_runtime_ready`): required tables/columns, runtime role not SUPERUSER/BYPASSRLS, RLS + policy present on every tenancy table. Pure reads. |
| `backend/app/main.py` | Startup provisioning (`create_all` / self-heal ALTERs / backfills / `apply_rls` / QA provisioning) gated to **local dev only**; staging/production run read-only validation and **fail fast**. No admin DB creds used at runtime there. |
| `backend/app/config.py` | New `db_auto_provision: bool = False` (opt-in local-style provisioning). |
| `backend/migrations/017_rls_least_privilege.sql` | **New.** Forward-only, idempotent operator migration mirroring the hardened grants + `WITH CHECK` policies. |
| `backend/tests/test_rls_hardening.py` | **New.** 17 DB-layer cross-agency isolation tests (synthetic Agency A/B). |

**Migration name:** `017_rls_least_privilege.sql` (see the baseline note in §5 — read before applying).

---

## 2. Security findings & severity

| # | Severity | Finding | Status |
|---|---|---|---|
| F1 | **High** | **Blanket privileges.** `app_user` was granted `SELECT,INSERT,UPDATE,DELETE ON ALL TABLES` + `USAGE,SELECT ON ALL SEQUENCES`. The runtime role could rewrite/erase the audit trail (`audit_logs`, `platform_audit_events`, `impersonation_logs`, `qa_audit_events`) and reach any non-tenant / non-application object in `public`. | **Fixed** — per-table grants; audit/error tables are SELECT+INSERT only; sequence grant scoped to the one integer-PK table. |
| F2 | **High** | **Policies had no `WITH CHECK`.** `agency_isolation` used `USING` only. For straight `agency_id` tables Postgres defaults `WITH CHECK := USING`, so cross-agency INSERT happened to be blocked — but the write rule was implicit and not independently stated. | **Fixed** — explicit `WITH CHECK` on every policy. |
| F3 | **High** | **Membership self-grant.** Because the `agency_memberships` read rule is deliberately broad (`user_id = me OR agency_id = current`, for the agency switcher), the defaulted `WITH CHECK` would let a user **INSERT a membership for themselves into an arbitrary agency**, then see that agency's data. | **Fixed** — `WITH CHECK (agency_id = current_agency)`: memberships may be written only in the current, membership-verified agency context. Verified blocked by test. |
| F4 | **Major** | **Runtime schema modification + admin creds.** On every boot (incl. staging/prod) `main.py` ran `create_all`, self-heal `ALTER`s, data backfills, and `apply_rls` as the **owner** (`admin_engine`), requiring administrator DB credentials in the API/worker and risking schema drift. | **Fixed** — provisioning is local-dev only; staging/prod validate read-only and fail fast; runtime needs no admin creds. |
| F5 | **Medium** | **Platform-admin clause trusts a forgeable GUC.** `_PLATFORM` = `current_setting('app.platform_admin') = 'true'`. The application only sets it after `require_super_admin_user`, and the pool checkin resets it (no escalation or leakage in the app threat model — reviewed, see §3). **But** any role that can run arbitrary SQL as `app_user` (e.g. via a SQL-injection defect elsewhere) could `set_config('app.platform_admin','true')` and read across agencies — the RLS defense-in-depth for the platform clause is only as strong as the app's control over executed SQL. | **Documented (not changed).** Recommended remediation in §6. Not altered now because it touches the Super Admin model and warrants its own reviewed change. |
| F6 | **Low** | `apply_rls` default password placeholder (`app_user_change_me`). Never reached in the startup path (called only with `settings.app_db_password`, inside a guard). | Annotated; must-override documented. |

**Also reviewed, no change needed:** `set_config(…, true)` request GUCs are transaction-local; the `checkin` reset in `database.py` clears all three GUCs to deny-by-default on pool return (F5 leakage path closed); RLS is `ENABLE` (not `FORCE`) so the owner remains usable for operator maintenance while `app_user` is fully subject to policy.

---

## 3. Platform-admin (Super Admin) review — escalation / spoofing / pool leakage

- **Escalation:** `set_platform_context()` is the only setter of `app.platform_admin`. Its only callers are in `platform_admin.py` / `services/platform_admin/*`, each gated by `require_super_admin_user` **before** the GUC is set (`platform_admin.py:33→35`). No ordinary-user code path sets it. *Application-layer escalation: none found.*
- **Spoofing (DB layer):** the GUC value `'true'` is forgeable by any role that can execute SQL as `app_user` → **F5** (documented; §6 remediation).
- **Pool leakage:** request GUCs use transaction-local `set_config(…, true)`; the pool `checkin` listener resets `app.current_user/current_agency/platform_admin` to `''` and commits. Test `test_platform_context_does_not_leak_to_fresh_connection` confirms a fresh checkout is deny-by-default.
- **Preserved capability:** with platform context set, cross-agency read **and** write still work (`test_platform_context_sees_all_agencies`, `…can_write_any_agency`).

---

## 4. Test results & gaps

`backend/tests/test_rls_hardening.py` — **17 passed** against local Postgres 17 (synthetic Agency A/B, real `app_user` role, RLS enforced):

- role posture (not SUPERUSER / not BYPASSRLS); SELECT isolation + deny-by-default;
- INSERT into current agency OK; **cross-agency INSERT rejected** (`WITH CHECK`);
- UPDATE cannot reach / cannot move a row to another agency; DELETE cannot reach another agency;
- **membership self-grant into another agency rejected**; membership write in current agency OK;
- platform context reads all / writes any / does not leak to a fresh connection;
- **append-only** audit (UPDATE/DELETE denied, INSERT OK); **read-only** QA config (write denied);
- **ungranted table inaccessible** (least-privilege, vs. the old blanket grant);
- startup validation passes on a healthy DB and **fails when a policy is missing**.

**Full backend suite: 294 passed, 0 failed.** `bandit` clean on the changed modules.

**Gaps / not covered (by design for this milestone):**
- Tests run only where a Postgres `DATABASE_URL` + role-creation is available; they **skip** on SQLite/CI-without-PG (same pattern as the existing `test_emscs_qa_rls.py`).
- Application-layer "ordinary user cannot reach a platform endpoint" is covered by the existing `test_platform_super_admin.py`, not re-asserted here.
- F5 remediation is **not** implemented or tested (see §6).
- No live AWS/RDS verification (out of scope — "do not deploy / start services").

---

## 5. ⚠️ Migration baseline discrepancy (needs confirmation before applying 017)

The milestone states *"the database migrations through 016 have completed successfully"* and *"create new forward-only migrations after 016."* **However, the repository's committed migration history ends at `012_add_mfa.sql`** — there is no `013`–`016`, and **no migration runner** (no Alembic, no runner script). The live schema is actually provisioned by `create_all` + the self-heal `ALTER`s in `main.py`.

- I numbered the new migration **`017`** so it sits after the reported 016 baseline and **made it idempotent and forward-only**, so it is correct whether the live staging DB is at 012 or 016. It does **not** modify any earlier migration.
- **Action needed from you:** confirm the *actual applied baseline* on the staging RDS instance (was 013–016 applied out-of-band, or is the schema `create_all`-provisioned?). If 013–016 were never real migration files, we should either (a) rename this to the true next number, or (b) adopt a real migration runner (recommended) so the numbering is authoritative. I did not fabricate 013–016.

Related: **self-serve agency creation** (`agencies.py`, legacy session mode) is **not** RLS-compatible by design — under the unified/cognito platform, agency + initial-owner provisioning is a platform-admin operation (`_PLATFORM` context). The tightened `WITH CHECK` therefore does not affect the real RLS write paths (verified: `require_membership` sets agency context before staff-membership writes).

---

## 6. Recommendation for F5 (follow-up, needs its own review)

Tie the platform clause to a **verified identity** instead of a bare boolean, preserving the Super Admin capability. Options, in order of preference:

1. **Dedicated `platform_admin` DB role** reached via `SET ROLE` within the super-admin-gated request, with its own cross-agency policy — the escape is then a *role*, not a GUC an injected statement can assert.
2. **Identity-bound clause:** `_PLATFORM := app.platform_admin='true' AND EXISTS (SELECT 1 FROM users WHERE id = current_user_guc AND platform_role='SUPER_ADMIN')`. The app already sets `current_user` to the super-admin before platform scope, so the legitimate flow is unaffected; forgery then also requires a valid super-admin UUID. (Watch per-row subquery cost; order the boolean first.)
3. **Signed/secret token** value for the GUC instead of `'true'`, baked into the policy at provisioning.

Each changes the Super Admin mechanism, so it should be a separate, reviewed change — not bundled here.

---

## 7. Deployment instructions (when approved — not now)

1. **Confirm the migration baseline** (§5). Resolve numbering / adopt a runner if needed.
2. Apply `017_rls_least_privilege.sql` **as the schema owner** (not `app_user`) to staging:
   `psql "$DATABASE_ADMIN_URL" -f backend/migrations/017_rls_least_privilege.sql`. Idempotent; safe to re-run.
3. Ensure the API/worker task definitions:
   - set `DATABASE_URL` to the **`app_user`** DSN (never the owner);
   - do **not** set `DATABASE_ADMIN_URL` and do **not** set `DB_AUTO_PROVISION` (leave provisioning off);
   - keep `ENVIRONMENT=production`, `AUTH_MODE=cognito`, `APP_DB_PASSWORD` set.
4. Deploy. On boot the app runs `assert_runtime_ready` and **fails fast** if the migration/RLS is missing — a green start confirms least-privilege + RLS + policies are in place.
5. Smoke-test Super Admin cross-agency views and one agency-scoped user (isolation) in staging.
6. Keep `EMSCS_QA_V1_ENABLED=false` in production; PHI gate stays **NOT READY**.

---

## 8. PHI readiness assessment

This milestone strengthens tenant isolation (least-privilege grants, write-side `WITH CHECK`, fail-fast validation, no runtime admin creds) — all prerequisites for PHI. It does **not** by itself clear the PHI production gate: the F5 platform-clause hardening is still recommended, live RDS/TLS/Redis/account-control verification remains outstanding (tracked in the PHI readiness docs), and no PHI, live EMSCharts/ZOLL connection, client invite, or production deployment is authorized. **PHI PRODUCTION GATE = NOT READY.**
