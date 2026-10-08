# Platform SUPER_ADMIN — Milestone Report

**Date:** 2026-10-07 · Branch `feature/platform-super-admin` (off `feature/emscs-qa-v1`).
**Not deployed to production.** No live EMSCharts/ZOLL, no PHI ingestion, no Chuck invite, no prod
credentials, no DNS, no specialty CQI #13–84, Forecaster v2/Geographic v2 unchanged.

## 1. Role / authorization architecture
`users.platform_role == 'super_admin'` is the **authoritative** record — no scattered email checks.
`services/platform_admin/authz.py`: `is_super_admin(user)`, `resolve_user` (dual auth mode: Cognito or
session), `require_super_admin_user` (403 otherwise), `platform_audit` (real actor always recorded).
SUPER_ADMIN is distinct from AGENCY_ADMIN (the agency-membership capabilities). Platform scope
(cross-agency) requires SUPER_ADMIN **and** an explicit request; agency View-As requires SUPER_ADMIN +
a chosen agency. **A missing agency_id never implies platform scope.** Only the one authorized account
is granted the role (the local demo admin for dev-test; production grants are explicit).

## 2. Schema changes
- `users.platform_role` (VARCHAR, nullable, indexed) — the authorization record.
- `agencies.data_classification` (synthetic | trial | production; default production) — metric isolation.
- `platform_audit_events` table (actor, platform role, scope, selected/resource agency, action, resource,
  view_as(+role), environment, before/after, reason, ip, at).
- RLS policies gained an **authenticated platform clause**: `USING ((<agency check>) OR
  app.platform_admin = 'true')`. `set_platform_context()` sets that GUC **only** after a SUPER_ADMIN check;
  the pool checkin resets it. Self-heal ALTERs added; create_all pattern (no Alembic).

## 3. Routes / endpoints (`/api/v1/platform/*`, SUPER_ADMIN-gated)
`GET me` (role check, used by UI), `GET overview`, `GET agencies`, `GET qa/monitor`, `GET qa/validation`,
`GET features`, `GET health`, `GET audit`, `POST view-as`. Platform-scope endpoints set the platform RLS
clause; `view-as` records a context selection (audited) and the tenant data is then read through the
normal agency-scoped endpoints which authorize the super admin per request.

## 4. Dashboard / UI components
`src/app/admin/platform/`: `layout.jsx` (guard + persistent banner + agency switcher + View-As bar +
sub-nav), `page.jsx` (Overview), `qa-monitor/`, `validation/`, `system/`, `audit/`. `src/lib/api.js`
`platformAdmin` client. `/admin/qa` accepts `?agency=` for View-As.

## 5. Agency-switching behavior
Persistent top banner — `MULLEN PLATFORM ADMIN — All Agencies` or `— Viewing [Agency]`. A switcher
selects **All Agencies** (platform scope) or an individual agency (→ `view-as`, audited; banner updates;
links to that agency's QA). The active context is always visible.

## 6. View-As behavior
Selecting an agency switches the super admin's **view context**, not their identity (no impersonation).
Amber bar: `VIEW-AS — [Agency] / Agency Admin · read-only by default` + **Exit View-As**. The audit
trail records `view_as_start` with the **real super-admin actor** (never obscured).

## 7. Platform QA validation functionality
**Monitor:** cross-agency totals, pending, Critical/Major/Minor/Commendation, most-failed CQIs, override
rate, AUTO-vs-HUMAN agreement, severity agreement, findings-requiring-human; filters (agency,
classification, status). **Validation console:** per-decision AUTO PROPOSED → HUMAN APPROVED (+ evidence,
override reason) and metrics — indicator agreement, override rate, false-positive/negative rate, Critical
recall, finding precision, severity agreement, HUMAN REVIEW REQUIRED frequency. **No automatic retraining.**

## 8. RLS / security test results (10 tests, all pass; no broad RLS bypass)
| Required scenario | Proven by |
|---|---|
| SUPER_ADMIN views Agency A, B, and All | DB-RLS platform clause (platform context → A+B) + `/platform/agencies` returns both |
| AGENCY_ADMIN A views A, not B · PROVIDER A not B | DB-RLS: a tenant context (agency A) sees only A; no platform GUC ⇒ cannot see B |
| URL/API agency_id manipulation doesn't bypass | context is set only after membership/super-admin check; RLS confines; `require_super_admin` 403 for others |
| Removing frontend filters doesn't expose | enforcement is server-side (RLS + role gate), not frontend |
| Platform-scope API fails without SUPER_ADMIN | `test_require_super_admin_blocks_regular_user` (403) |
| Missing context is NOT platform-wide | `test_missing_context_is_not_platform_wide` (no agency + no GUC ⇒ 0 rows); `view-as` requires agency_id |
| QA findings/evidence tenant-isolated | `test_emscs_qa_rls` (app_user sees only its agency's QA rows) — still passes with the platform clause |
| Feature flags enforced even for SUPER_ADMIN | QA endpoints 404 when flag off; features endpoint is status-only |
RLS stays ENABLED; `app_user` stays non-superuser; the platform clause is an explicit authenticated GUC.

## 9. Audit test results
`test_view_as_audits_real_actor`: the `view_as_start` event has `view_as=True` and `actor_user_id` = the
real super admin. The Audit UI shows every platform action with the actor, scope, selected agency, and
View-As role.

## 10. Synthetic / production isolation results
`test_synthetic_excluded_from_production_metrics`: with a review in a production agency and one in a
synthetic agency, `qa/monitor?classification=production` excludes the synthetic review (and vice versa).
Classification is shown throughout the UI (badges + overview breakdown); the demo agency is `synthetic`.

## 11. Screenshots
Delivered: Platform Overview, QA Monitor, QA Validation Console, System & Features, View-As (banner +
bar), Platform Audit (real actor + `view_as_start`).

## 12. CI results
`feature/platform-super-admin` CI green (pip-audit + bandit + full pytest incl. core + QA + platform).
The UI commit (`e01ca7a`) triggered a fresh run.

## 13. Known limitations
- Cross-tenant exploration is **read-only** — no cross-tenant write/delete actions were added (deliberate;
  high-impact confirmation flows are a later increment).
- View-As is an **agency-admin-level view**; provider-level View-As is future.
- Health/import metrics are best-effort (local); staging adds AWS/CI/backup signals.
- The **local demo admin** (`qa-demo@mullenanalytics.com`) and synthetic demo agency are **dev-test only**
  — they must be removed/disabled before any staging/production deploy, and proven unable to authenticate
  outside the local/test environment (tracked as a pre-deploy task).

## 14. Status of the previously pending QA commits
**Resolved.** GitHub's git backend recovered; the pending QA commits are pushed to
`feature/emscs-qa-v1` (`d675d92..5654b6b`): `b3269fe` (export), `429c05b` (router), `3d073eb` (UI),
`5654b6b` (M1 report). (It was **4**, not 5 — `d675d92` had already reached origin before the incident.)
No commit was recreated or modified. CI re-ran green on that branch.

## STOP
Super Admin milestone complete, pending your approval. Not started: EMSCS QA Milestone 2, specialty CQI
#13–84, Forecaster v2, Geographic v2, live EMSCharts/ZOLL, PHI ingestion, production deploy.
