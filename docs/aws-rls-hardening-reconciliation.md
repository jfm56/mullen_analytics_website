# AWS Security Hardening — Reconciliation against `feat/aws-backend-migration`

**Task:** reconcile the completed RLS hardening milestone against the real GitHub repo
`jfm56/mullen_analytics_website`, branch **`feat/aws-backend-migration`** @ **`6b08d7f`**
("Preserve verified AWS staging migrations and ECS IAM fixes").
**Result:** hardening transferred cleanly onto the target; **307 tests pass**; migration **017**
validated against the real 013–016 schema. **Not pushed, not deployed.** PHI gate NOT READY.

---

## 1. Where the original hardening lives (and why GitHub didn't show it)

The branch `security/aws-rls-hardening` **does exist locally** but was **committed, never pushed**,
so it is absent from the GitHub remote. Its two commits (base `c8dc4d0` = PR #27 merge):

| Role | **Exact SHA** | Subject |
|---|---|---|
| Code | **`c3bbe265c4c4f9919110f4683733533e9c82a354`** (`c3bbe26`) | Security: RLS least-privilege, WITH CHECK policies, read-only startup validation |
| Report | **`4cf177c6e45f2b75b83b458ca6877210179aee47`** (`4cf177c`) | docs: AWS RLS hardening milestone report |

**Transferable patch:** `git format-patch` of both commits applies cleanly onto `6b08d7f`
(sent alongside this report). Re-applied on the target they became `aeeae1e` + `f0c9203` on
branch **`security/aws-rls-hardening-reconciled`**; `git range-diff` reports
`c3bbe26 = aeeae1e` and `4cf177c = f0c9203` (**identical content — zero merge drift**).

**Patch contents verified present:** migration `017_rls_least_privilege.sql` ✓, startup validation
`app/startup_checks.py` ✓, least-privilege + WITH CHECK RLS `app/security_rls.py` ✓, automated
security tests `tests/test_rls_hardening.py` ✓, hardening report `docs/aws-rls-hardening-report.md` ✓.

---

## 2. Migration-baseline discrepancy — RESOLVED

Last milestone flagged that the repo's `main` ended at `012` with no `013`–`016`. The target branch
**confirms the real baseline**: it carries

- `013_emscharts_tables.sql`, `014_pipeline_invariants.sql`,
  `015_ems_dataset_groups_agency_ownership.sql`, `016_unified_platform_identity.sql`.

So **`016` genuinely exists** and my forward-only **`017`** is the correct next number — exactly as
designed. **Migrations 013–016 were NOT touched** (`git` shows them unchanged on the reconciled
branch); `017` is a new file only. (Minor pre-existing history quirk on the target, not introduced
here: two `006_*` files and no `004_*` — the old `004_ems_column_mappings` was renumbered to
`006_ems_column_mappings`. Flagged, not altered.)

**Migration runner — also present on the target (correction to the prior milestone's "no runner").**
`backend/scripts/run_migrations.py` applies each `*.sql` once inside its own transaction under an
advisory lock, records `filename + sha256` in a `schema_migrations` table, and (in cognito mode) calls
the now-hardened `apply_rls()` after all migrations. **The runner is unchanged by this PR.** `017` was
adjusted to match the runner's convention: it defers transaction control to the runner (no self-managed
`BEGIN`/`COMMIT`, like 013–016) and was verified to apply cleanly under the runner's single-transaction
execution model. Because the runner also runs `apply_rls()`, the final state converges identically
whether reached via `017` or `apply_rls()` (both idempotent).

---

## 3. File-by-file change summary (delta on top of `6b08d7f`)

| File | New/Mod | What |
|---|---|---|
| `backend/app/security_rls.py` | Mod | Per-table least-privilege grants (replaces blanket `GRANT … ON ALL TABLES/SEQUENCES`); append-only audit/error grants; scoped `app_settings_id_seq` grant; **`WITH CHECK`** on every `agency_isolation` policy; tightened write rule for `agency_memberships`/`agencies` (writable only in current verified-agency context → closes membership self-grant). |
| `backend/app/startup_checks.py` | **New** | Read-only `validate_runtime_schema` / `assert_runtime_ready`: required tables/columns, runtime role not SUPERUSER/BYPASSRLS, RLS + policy present on every tenancy table. Pure reads. |
| `backend/app/main.py` | Mod | Provisioning (`create_all`/self-heal ALTERs/backfills/`apply_rls`/QA provisioning) gated to **local dev only**; staging/prod run `assert_runtime_ready` and **fail fast**; no admin creds at runtime. Auto-merged cleanly with the target's `install_phi_guard` import and new `/ready` probe. |
| `backend/app/config.py` | Mod | `db_auto_provision: bool = False`. Auto-merged cleanly with the target's Secrets-Manager DB fields, job/SQS config, and `phi_ingestion_enabled` kill switch. |
| `backend/migrations/017_rls_least_privilege.sql` | **New** | Forward-only, idempotent operator migration mirroring the hardened grants + WITH CHECK policies; QA sections existence-guarded. |
| `backend/tests/test_rls_hardening.py` | **New** | 17 DB-layer cross-agency tests. |
| `docs/aws-rls-hardening-report.md` | **New** | Full hardening report (findings F1–F6, deployment steps, PHI assessment). |

**Compatibility with the target's own work (verified):** the target changed `main.py` only by adding
the `phi_guard` middleware and a `/ready` endpoint — it added **no new schema-modifying startup
operations**, so the `should_provision` gating covers every provisioning path. `database.py` keeps
`DATABASE_URL` precedence and the `engine`/`admin_engine` split + pool-checkin GUC reset my hardening
relies on. No conflict markers; both auto-merges confirmed semantically correct.

---

## 4. Test evidence

- **Full backend suite on the reconciled branch (real 013–016 schema): 307 passed, 0 failed.**
- **`tests/test_rls_hardening.py`: 17/17** — cross-agency SELECT/INSERT/UPDATE/DELETE blocked, membership self-grant rejected, platform clause still works + no pool leak, append-only/read-only grants hold, ungranted table inaccessible, startup validation passes healthy / fails on missing policy.
- **Migration `017` applied to the live dev DB as owner → exit 0** (BEGIN→REVOKE×2→GRANT×3→DO×3→COMMIT). Independent verification of its output: every sampled tenancy policy now has both `USING` and `WITH CHECK`; `audit_logs` grants to `app_user` = exactly `{SELECT, INSERT}`; `agency_memberships` `WITH CHECK` = `agency_id = current_agency OR platform_admin` (no `user_id` self-grant escape). **PASS.**

---

## 5. Platform-admin GUC spoofing — review + database-enforced mitigation (PROPOSAL)

**Risk (reproduced).** `_PLATFORM = current_setting('app.platform_admin') = 'true'`. The value is a
well-known literal, so **any role that can execute SQL as `app_user` (e.g. via a SQL-injection defect
elsewhere) can `set_config('app.platform_admin','true')` and read/write every agency.** The existing
M3 test `tests/test_platform_super_admin.py:71` already encodes this — it sets `app.current_user` to a
**random UUID** plus the GUC and asserts cross-agency visibility. A throwaway-table demo confirmed:
current clause → random-user + forged GUC sees **both** agencies.

App-layer gating is sound (set only after `require_super_admin_user`; pool-checkin resets it), so there
is **no application-layer escalation**. The gap is purely DB-layer defense-in-depth.

### Recommended (robust): dedicated platform role behind a credential boundary
Give platform cross-agency access its **own low-privilege login role** (e.g. `mullen_platform`) with a
cross-agency policy, reached through a **separate SQLAlchemy engine** whose credentials come from
Secrets Manager and are used **only** inside the super-admin-gated request path (`platform_admin.py`'s
`platform_ctx`). `app_user` is never granted the ability to assume it, so an injected statement on the
`app_user` connection **cannot** cross the boundary. Preserves the approved flow
(`require_super_admin_user` → platform scope); the change is plumbing (new secret/engine/routing),
warranting its own review. This fully eliminates the GUC-forgery vector.

### Immediate (defense-in-depth): identity-bound GUC clause
Strengthen the clause to require a **verified super-admin identity**, not just the boolean:

```
_PLATFORM := current_setting('app.platform_admin',true)='true'
             AND EXISTS (SELECT 1 FROM users u
                         WHERE u.id = NULLIF(current_setting('app.current_user',true),'')::uuid
                           AND u.platform_role = 'SUPER_ADMIN')
```

The approved flow already calls `set_user_context(super_admin.id)` before `set_platform_context`, so
**no application change is needed**. Demonstrated on the throwaway table: random-user + forged GUC now
sees **nothing**; a real SUPER_ADMIN + GUC still sees **all** agencies.
**Residual:** `app_user` holds `SELECT` on `users`, so a determined attacker could enumerate a
super-admin UUID and set both GUCs — hence this is a bar-raiser (and ties the escape to a real,
auditable identity), **not** a complete fix. Use it as an interim step toward the dedicated-role design.

**Not applied here** (both options alter the approved Super Admin mechanism and the M3 test): offered
for approval as a separate change. Implementing the identity-bound clause also requires updating
`test_platform_super_admin.py:71` to seed a real super-admin instead of a random UUID.

---

## 6. Remaining security gaps
- **F5 platform-admin GUC** — forgeable at the DB layer; mitigation proposed above, not yet applied.
- **Migration runner** — `backend/scripts/run_migrations.py` exists on this branch (checksum-tracked,
  advisory-locked, run as a one-off ECS task). `017` is runner-compatible and unchanged migrations are
  checksum-verified by the runner. No gap here; noted for completeness.
- **Legacy self-serve agency creation** (`agencies.py`) is session-mode / RLS-off by design; under the
  unified platform, agency provisioning is a platform-admin operation.
- **Tests skip** where no Postgres/role-creation is available (same pattern as `test_emscs_qa_rls.py`).
- No live AWS/RDS verification (out of scope: no deploy / no service start).

---

## 7. PHI readiness assessment
This reconciliation confirms the hardening integrates cleanly with the real AWS backend branch and its
`013`–`016` schema, and that tenant isolation holds for reads **and writes** (WITH CHECK), with
least-privilege grants, fail-fast startup validation, and no runtime admin credentials. It does **not**
clear the PHI production gate: the F5 platform-clause hardening is still open, there is no migration
runner, live RDS/TLS/Redis/account-control verification remains outstanding, and nothing here authorizes
PHI, a live EMSCharts/ZOLL connection, client credentials, an invite, DNS/prod changes, or deployment.
The target also ships `phi_ingestion_enabled=False` (kill switch) — keep it false.
**PHI PRODUCTION GATE = NOT READY.**

---

## 8. Branch / handoff
- Reconciled work: local branch **`security/aws-rls-hardening-reconciled`** = `6b08d7f` + `aeeae1e` + `f0c9203` (**not pushed**).
- Transferable patch: `format-patch` of `c3bbe26`/`4cf177c` (applies cleanly onto `feat/aws-backend-migration`).
- To land it: push the reconciled branch (or `git am` the patch onto `feat/aws-backend-migration`), open a PR for review; apply `017` to staging as the schema owner **after** confirming the 013–016 baseline. Do not deploy until reviewed.
