# EMSCS QA — Milestone 2 (Specialty CQI Automation) · Release 1 Checkpoint

**Status: STOP checkpoint — awaiting approval before Cardiac/STEMI.**
Release 1 scope was **Refusal #75-80 → Medication #63-68 → Albuterol #69-74**, in that
order. All three are implemented, tested, validated on synthetic cases, and visible in
all four review surfaces. Per instruction, the engine did **not** proceed to
Cardiac/STEMI or any other specialty category.

Ruleset version: `emscs-cqi-2025-08` · Flag: `EMSCS_QA_V1_ENABLED` (synthetic/no-PHI dev only) · Environment: local.

---

## 1. Implemented indicators

| Category | Indicators | Evaluator | Notes |
|---|---|---|---|
| Refusal | #75-80 (6) | `specialty.r_75…r_80` | High-risk path with contextual severity modifiers |
| Medication | #63-68 (6) | `specialty.m_63…m_68` | Deterministic for presence/detail/reassessment; HUMAN for dose appropriateness (#68) |
| Albuterol | #69-74 (6) | `specialty.a_69…a_74` | Timeline rules (pre/repeat/post) distinguish *not given* vs *late* vs *response not documented* |

Architecture unchanged from M1: **Applicability → structured rules → timeline →
consistency → protocol/context → severity → human review → deterministic scoring.** The
AI/engine proposes verdicts + severities only; **it never computes the QA score** and
**never invents a protocol requirement** (all requirements come from the versioned store).

## 2. Rules added (by classification)

- **DETERMINISTIC_RULE** — refusal matrix/signature (#75), check-boxes (#76), capacity A&Ox4 (#77 when unambiguous), vitals-on-refusal (#78), follow-up (#79), sobriety (#80); medication performer (#63), indication (#64), route/dose/unit/response (#65); albuterol Add-Action presence (#71), response documented (#74).
- **TIMELINE_RULE** — medication reassessment after administration (#66); albuterol pre-therapy RR+SpO2 (#70), repeat-dose interval ≥5 min (#72), post-therapy RR+SpO2 (#73).
- **PROTOCOL_RULE** — ALS-escalation requirement when a medication is given without ALS (#67).
- **TEXT_EXTRACTION** — COPD/asthma/reactive-airway indication for albuterol (#69).
- **CLINICAL_CONTEXT / HUMAN_REVIEW** — capacity under AMS/possible-ingestion (#77), dose appropriateness vs protocol (#68), possible-abuse → high-priority human review.

Every negative verdict carries chart **evidence**; every activated specialty category
records **why** it activated (`applicability_reason` attached to each result).

## 3. Protocol / version data

New versioned store `backend/app/services/emscs_qa/protocol_rules.json`
(`ruleset_version: emscs-cqi-2025-08`). Each protocol carries: number, category,
protocol_name, version, effective_date, trigger, required/optional action,
contraindication, timing_requirement, documentation_requirement, reference_section.
Loaded via `seed.load_protocol_rules()` / `seed.protocol(n)` / `seed.ruleset_version()`
— **not** hardcoded in prompts. Key timing encoded: albuterol repeat dosing **≥5 min**
between doses (#72).

## 4. Applicability tests

- `test_implemented_specialty_is_evaluated_not_stubbed` — activated implemented category is evaluated, not stubbed.
- `test_unimplemented_specialty_still_human` — Trauma (and other non-R1 categories) still route to HUMAN REVIEW REQUIRED.
- `test_cross_category_activation_albuterol_and_medication` — one chart activates **both** Albuterol and Medication; both indicator sets evaluate.
- Synthetic report: **applicability agreement 6/6 cases.**

## 5. Timeline tests (Albuterol — the "not given / late / no response" distinction)

- `test_albuterol_clean_single` — single dose, pre+post vitals, response documented → all Met; #72 N/A.
- `test_albuterol_late_repeat_fail_72` — two doses 3 min apart → **#72 Not Met** ("given but late").
- `test_albuterol_given_no_response_fail_74` — dose given, response not charted → **#74 Not Met** ("given but response not documented").
- `test_albuterol_no_pre_vitals_fail_70` — no pre-therapy RR+SpO2 → #70 Not Met.
- `test_med_no_reassessment_66` — medication with no post-administration reassessment → #66 Not Met.
- "Not given" is handled by applicability (no albuterol Add Action → #71 Not Met / category not activated as given).

## 6. Severity tests (context-driven; same failure → different severity)

- `test_refusal_documentation_gap_minor` — missing signature only → **Minor**, no human needed.
- `test_refusal_clinical_gap_major` — missing vitals on routine adult refusal → **Major**, require_human.
- `test_refusal_high_risk_context_critical` — missing vitals + pediatric + significant mechanism → **Critical**, require_human.
- `test_refusal_possible_abuse_high_priority_human` — possible abuse → **HUMAN_REVIEW_REQUIRED**, `high_priority=True` (never auto-scored).
- `test_med_als_gap_is_major_not_auto_critical` — ALS-escalation gap (#67) on a geriatric chart is **Major (require_human)**, *not* auto-Critical (the drug was given; it is a protocol gap, not a treatment omission).

## 7. Validation results

Full report: [`docs/emscs-qa-milestone-2-validation-report.md`](emscs-qa-milestone-2-validation-report.md).

**A — Acceptance on six synthetic cases (known ground truth; = behaves to spec, not an accuracy estimate):**
applicability **6/6**, indicator Met/Not-Met **42/42**, findings matched **5/5**,
severity-proposal agreement **5/5**, routed to HUMAN REVIEW REQUIRED **2**.

**B — Workbook alignment (examples only):** de-identified WNY fixture (n=60) carries the
reviewer's Met/Not-Met per specialty indicator but **omits structured chart content**, so
the engine is **not** re-run on those charts. Prevalence reported + each automated
indicator mapped to a versioned protocol. **Small-count caveat** (Albuterol n≈2); nothing
used to train or tune.

**Live console (seeded synthetic agency, mixed human decisions):** indicator agreement
77.6%, override rate 22.4%, finding precision 91.7%, severity agreement 60.0%,
HUMAN REVIEW REQUIRED 63. Per-category: Albuterol 100% / Medication 83.3% / Refusal 93.3%
(all flagged specialty + automated); Cardiac Arrest & Trauma shown as human-only.

## 8. False positives / false negatives

- Synthetic designed cases: **FP 0, FN 0** (engine matches intended verdicts).
- Live seeded data (incl. a deliberate reviewer override where a signature was found on a
  supplemental page): FP rate 18.2%, FN rate 0.0%, measured in the Validation Console and
  filterable by category/indicator/reviewer/severity/AUTO-vs-HUMAN. These are illustrative
  of the monitoring surface, **not** an accuracy claim (small, hand-seeded N).

## 9. Screenshots — [`docs/emscs-qa-m2-screenshots/`](emscs-qa-m2-screenshots/)

1. `01-validation-console-metrics-filters` — metrics + filter bar.
2. `02-validation-category-breakdown` — specialty vs General agreement by category.
3. `03-validation-filtered-refusal` — Category=Refusal filter applied; per-decision incl. the FP override.
4. `04-super-admin-qa-monitor` — cross-agency monitor; failed CQIs include #72/#77/#78/#80.
5. `05-agency-qa-review-chartlog` — six synthetic cases with tiers.
6. `06-review-specialty-indicators` — EMSCS Review View: Medication/Albuterol #63-71 with classification badges + AUTO vs HUMAN.
7. `07-review-albuterol-timeline-evidence` — #72 Not Met with `gaps_min:[3]` evidence + `applicability_reason`.
8. `08-critical-refusal-severity` — #78 Critical proposal with rationale, evidence (`vital_sets:0`), ack-required.

All four surfaces shown: **Agency QA Review · EMSCS Review View · Super Admin QA Monitor · Super Admin Validation Console.**

## 10. CI / test results

- **Full backend suite: 250 passed** (incl. the new 23-test `test_emscs_qa_specialty.py`).
- **Scoring parity: 60/60 intact** (`test_emscs_qa_parity.py`) — scoring.py untouched.
- **SAST:** `bandit -r app/ -ll` → **exit 0** (clean at Medium+; the only B105 hits are
  `"pass"`/`"Met"` verdict dict-keys — false positives, below the Medium+ gate).
- One pre-existing test regression surfaced by wiring specialty findings into the review
  (`review_service` approval blocked on an unexpected 2nd Critical) was fixed at root cause
  — see §6 (`test_med_als_gap_is_major_not_auto_critical`) — not by relaxing the test.

## 11. RLS / isolation results

- `test_db_rls_isolates_qa_charts_by_agency`, `test_all_qa_agency_tables_have_rls_and_policy` — DB-level tenant isolation on all QA tables (RLS stays enabled; app_user non-superuser).
- `test_platform_context_sees_all_agencies`, `test_agency_context_sees_only_that_agency`, `test_missing_context_is_not_platform_wide` — authenticated platform clause; missing context ≠ platform scope.
- `test_require_super_admin_blocks_regular_user`, `test_super_admin_can_view_platform_and_all_agencies` — Super Admin authz path.
- `test_synthetic_excluded_from_production_metrics` — synthetic/production isolation holds for the new specialty data.
- Validation console honors agency/classification scoping; specialty metrics never leak chart content (counts/verdicts/severity labels only).

## 12. Known clinical ambiguities (deliberately human-routed)

- Decision-making **capacity** under AMS / possible ingestion (#77) — never auto-judged.
- Medication **dose appropriateness** vs protocol (#68) — clinical confirmation required.
- **Possible abuse / mandatory reporting** — always high-priority HUMAN REVIEW REQUIRED.
- **Severity** of a clinical-safety refusal gap — proposed (Major/Critical) but `require_human`.
- Albuterol *response poor* vs *response not documented* — engine detects the documentation gap (#74); clinical interpretation is the reviewer's.

## 13. Remaining specialty categories (still human-review stubs — NOT started)

ALS Cancel #13-15 · **Cardiac/STEMI #16-27** · Cardiac Arrest #28-32 · Trauma #33-38 ·
Stroke/CVA #39-42 · Burns #43-50 · OB/GYN #51-57 · CPAP #58-62 · Overdose #81-82 ·
Glucometer #83-84. Each currently returns HUMAN_REVIEW_REQUIRED with an applicability reason.
Per the agreed order, **Cardiac/STEMI is next — pending your approval.**

## 14. Guardrails held

No live ZOLL/EMSCharts; no new PHI ingestion; no EMSCS client invite; no production
deployment; scoring/parity unchanged; Forecaster v2 unwired; Geographic v2 unimplemented.
The local demo credential (`qa-demo@mullenanalytics.com`) remains **development-only** and
must be removed/disabled before any staging or production exposure. The de-identified
workbook fixture is examples-only and was never used to train or tune the engine.

---

### Artifacts
- Engine: `backend/app/services/emscs_qa/specialty.py`, `protocol_rules.json`, `synthetic_cases.py`; `review.py`, `severity.py`, `chart_data.py`, `seed.py` (extended).
- Platform: `app/services/platform_admin/aggregates.py` + `routers/platform_admin.py` (specialty metrics + filters); `src/app/admin/platform/validation/page.jsx` (UI).
- Tests: `backend/tests/test_emscs_qa_specialty.py` (23).
- Reproducible scripts: `scripts/emscs_specialty_validation_report.py`, `scripts/seed_emscs_qa_demo_m2.py`.
- Reports: this file + `emscs-qa-milestone-2-validation-report.md` + screenshots.
