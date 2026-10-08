# EMSCS QA Review Engine v1 — Milestone 1 Evidence Report

**Date:** 2026-10-07 · Branch `feature/emscs-qa-v1` · Flag `EMSCS_QA_V1_ENABLED` (**default OFF**;
inert everywhere except the approved dev/test env). **Synthetic/no-PHI only.** No ZOLL/EMSCharts
connection, no live PHI ingestion, no EMSCS user invite, no production deploy. Forecaster v2 and
Geographic v2 untouched. **Specialty CQI #13–84 automation NOT started** (definitions stored only).

## Milestone 1 completion criteria
| Criterion | Status |
|---|---|
| 60/60 scoring parity remains intact | ✅ |
| Human override works | ✅ (tested + live) |
| Audit history works | ✅ (tested + live) |
| RLS negative tests pass | ✅ |
| Excel export works | ✅ |
| UI is usable | ✅ (live local demo + screenshots) |
| All QA tests green | ✅ (42 tests) |

## The 12 evidence items — final status
| # | Item | Status / evidence |
|---|---|---|
| 1 | Workbook structure discovered | ✅ `docs/emscs-qa-workbook-discovery.md` — 12 sheets, formulas, lists, tiers/severities, ambiguous fields |
| 2 | CQI #1–84 library imported | ✅ `backend/app/services/emscs_qa/library_seed.json` — 84 indicators, 14 categories, 8 domains, 29 references, 6 dropdowns |
| 3 | Exact scoring formulas identified | ✅ QS = Σ(domain·weight)/5; Compliance = Met/(Met+NotMet); Composite = QS·0.7 + Compliance·100·0.3; Tier 90/80/70 |
| 4 | Scoring parity results | ✅ **FULL PARITY — 60/60 charts, 0 mismatches**; aggregates match Dashboard exactly (`docs/emscs-qa-parity-report.md`) |
| 5 | EMSCS Review View screenshots | ✅ Dashboard, Chart Log, Single Review, Indicator Review, Findings, CQI #11 evidence, Human override, Scoring, Audit (Crew Feedback = placeholder, deferred) |
| 6 | CQI #1–12 implementation matrix | ✅ `docs/emscs-qa-cqi-1-12-matrix.md` — 7 deterministic, 4 flag-or-human, 1 holistic |
| 7 | Consistency-engine tests | ✅ CQI #11 returns **both** conflicting sources; paired-field + semantic rules tested |
| 8 | Human override/audit tests | ✅ 7 service tests: automated immutable, reason-required overrides, Critical-ack gate, score recompute, cross-tenant denial |
| 9 | RLS / authorization tests | ✅ 2 DB-RLS tests (app_user sees only its agency; all 7 QA tables have `agency_isolation` + RLS) + service-layer cross-tenant denial |
| 10 | Excel export comparison | ✅ 8 tests; generated vs source: same 12 sheets, 84 indicators, severity totals (9/102/99/42), Dashboard formulas, dropdowns |
| 11 | Known discrepancies | **None** in parity (0 mismatches); ambiguous fields documented (below) |
| 12 | Clinical/policy questions | Documented (below) — none guessed |

## Scoring parity result
All 60 historical reviews reproduced exactly (Workbook → Application): Quality Score, Indicator
Compliance, Composite, Tier, and Critical/Major/Minor/Commendation counts — **0 differences** (float
noise ≤1e-14). Aggregates match the workbook Dashboard (avg composite 55.67; Critical 9 / Major 102 /
Minor 99 / Commendation 42; tiers 0/0/6/54). **No formula was altered to force parity.**

## Schema / migrations
Gated `Base.metadata.create_all` (no Alembic — the codebase's create_all + self-heal pattern), run only
when the flag is on. Tables: `qa_scoring_domains`, `qa_indicators`, `qa_scoring_configs` (config, shared,
read-only to the runtime role); `qa_charts`, `qa_review_sessions`, `qa_indicator_reviews`, `qa_findings`,
`qa_crew_feedback`, `qa_scores`, `qa_audit_events` (agency-owned, RLS-isolated). The automated proposal
is stored separately from the human decision (`automated_result`/`human_result`;
`automated_severity`/`human_severity`; `automated_*`/`approved_*`) and is never overwritten.

## Routes / endpoints (`/api/v1`, flag-gated, agency-scoped, dual-mode auth)
`GET qa/health`, `GET qa/library`, `POST qa/demo/seed` (local-dev only); per agency:
`GET/POST .../qa/sessions`, `GET .../qa/sessions/{id}`, `POST .../qa/reviews`,
`POST .../qa/indicators/{id}/{accept,override,note}`,
`POST .../qa/findings/{id}/{severity,dismiss,acknowledge}`,
`POST .../qa/sessions/{id}/{findings,note,domain-scores,approve}`, `GET .../qa/audit`,
`GET .../qa/export` (xlsx).

## UI components
`src/app/admin/qa/page.jsx` (Dashboard + Chart Log + export), `src/app/admin/qa/review/[sessionId]/page.jsx`
(Review View: Overview / Source Chart / Clinical Timeline / Indicator Review / Findings / Scoring / Crew
Feedback / Audit; AUTO PROPOSED vs HUMAN APPROVED; evidence on negatives; CQI #11 both sources; HUMAN
REVIEW REQUIRED labels; accept/override/dismiss/acknowledge/approve), `src/lib/api.js` (`emscsQa` client).

## Files changed (backend)
`models/emscs_qa.py`, `services/emscs_qa/{__init__,scoring,seed,chart_data,applicability,indicators,consistency,severity,review,review_service,export,library_seed.json}`,
`routers/emscs_qa.py`, `security_rls.py` (`apply_rls_qa`), `config.py` (flag), `main.py` (gated provisioning + mount),
`.gitignore`. Tests: `test_emscs_qa_{parity,engine,review_service,rls,export,router}.py`, fixture
`tests/fixtures/emscs_wny_fixtures.json` (de-identified). Docs: discovery, parity, cqi-1-12-matrix, this report.

## Tests / CI
**42 QA tests green** (parity 3, engine/orchestration 19, review-service 7, RLS 2, export 8, router 3) +
bandit clean. Prior CI runs green on this branch (through the human-review commit). The export/router/UI
commits pass all 42 tests + bandit locally; their push to GitHub is pending a transient GitHub 500
(git backend incident; API healthy) and will complete on retry.

## RLS results
DB layer: `app_user` (non-superuser) with agency A context sees only A's QA rows; B only B's; no context →
none. All 7 agency-owned QA tables have RLS enabled + the `agency_isolation` policy. Application layer:
every read/write filtered by `agency_id`; Agency B cannot read or mutate Agency A's session/indicator/
finding by id (URL/API manipulation denied); B's session list excludes A. No reliance on frontend filtering.

## Excel export comparison
Generated workbook vs source structure: same 12 sheet names; Chart Log 60 rows with scores/tier;
Indicator Review / Findings row counts match; finding severity totals 9/102/99/42; 84-indicator library;
Scoring Rubric values (0.7/0.3/90); Dashboard aggregate formulas; Result/Severity dropdown validations.
No raw source PHI embedded (de-identified fixture only).

## Known limitations
- **Crew Feedback** is a placeholder (routing per provider after approval) — deferred to M2.
- Severity engine v1 is modifier-based and conservative (clinical calls → HUMAN_REVIEW_REQUIRED); weights
  are a first pass pending clinical confirmation.
- Specialty CQI #13–84 are applicable + reasoned but **not auto-judged** (by design).
- Dev/test used a local demo admin + synthetic demo agency in the local DB (cleanup optional).

## Clinical / policy questions (not guessed — need human confirmation)
1. **Severity is reviewer-authored** in the workbook (not a formula) — confirm the modifier weighting
   (vulnerability / abnormal findings / treatment omission / delay / refusal / ALS / protocol /
   credibility / legal-safety) reflects EMSCS intent.
2. **Specialty applicability is reviewer-selected** — confirm the v1 auto-activation triggers (keyword/
   field) are acceptable as *candidates* (human still judges the indicators).
3. **CQI #2/#4/#6/#12** need text/clinical judgment — handled via structured flags or HUMAN_REVIEW (no LLM);
   confirm acceptable.
4. **CQI #9** had 0 applications this month — its applicability trigger is unconfirmed (defaults NA).

## Deferred to Milestone 2 (pending approval)
Specialty CQI #13–84 automation; full Crew Feedback routing + provider views; richer Clinical Timeline;
staging (Cognito) deployment of the QA module; real EMSCharts/NEMSIS → `QaChartData` normalizer. None of
these are started.

## STOP
Milestone 1 complete pending your approval. No specialty CQI automation, no ZOLL, no live PHI, no EMSCS
user invite, no production deploy.
