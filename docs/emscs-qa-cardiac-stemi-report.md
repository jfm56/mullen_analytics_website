# EMSCS QA — #77/#71 Corrections + Cardiac/STEMI #16-27 (STOP checkpoint)

**STOP after Cardiac/STEMI — Trauma not started.** Synthetic/no-PHI only. Deterministic scoring
unchanged (60/60 parity). No WNY-workbook training/tuning. Guardrails held (no live ZOLL/EMSCharts,
no PHI ingestion, no client invite, no production deploy; Forecaster v2 unwired, Geographic v2
unimplemented).

## 1. CQI #77 capacity correction
A&Ox4/orientation is now **supporting evidence only** and can never produce an AUTO MET.
`r_77` (`specialty.py`) rewritten:
- **Capacity concern** (altered mental status, suspected intoxication, possible ingestion) → **HUMAN_REVIEW_REQUIRED**.
- **Explicit** capacity-specific documentation (`refusal.capacity_documented`) → **MET** (A&Ox shown as supporting).
- **Orientation alone / insufficient documentation** → **HUMAN_REVIEW_REQUIRED** (A&Ox cannot establish capacity).
- **Incapacity is never auto-inferred** — no AUTO FAIL; the engine surfaces the concern + evidence and the reviewer decides.
- Model: `Refusal.capacity_documented` clarified as the explicit assessment; added `intoxication_suspected`. AUTO PROPOSED / HUMAN APPROVED preserved; evidence retained.

## 2. CQI #71 albuterol applicability correction
Applicability is now established **before** Met/Not-Met (`a_71` + `_t_albuterol`):
- **No albuterol evidence** → category **not applicable** / **#71 N/A** (not a documentation failure).
- **Albuterol given/indicated in narrative but Add Action missing** → **#71 Not Met** (with evidence). The trigger now activates on narrative/`narrative_only_interventions` text, not just a structured Add Action.
- **Structured Add Action present** → normal **#69-74** evaluation.

## 3. Regression results (both corrections)
`test_emscs_qa_specialty.py` gained 11 tests: #77 (A&Ox4-alone→human, explicit-doc→met, AMS/intoxication/ingestion→human, never-auto-FAIL, reviewer-override) and #71 (no-evidence→N/A, narrative-no-AddAction→Not Met, structured→normal, multi-med→both activate). All green.

## 4. Cardiac/STEMI #16-27 implementation matrix
Full indicator-by-indicator matrix (exact text, trigger, method, required fields/narrative, timeline, protocol, human-review, severity, protocol ref): [`emscs-qa-cardiac-stemi-matrix.md`](emscs-qa-cardiac-stemi-matrix.md).

## 5. Implemented rules (#16-27)
- **#16-23 documentation** (DETERMINISTIC): onset, prior interventions, pain type/duration/quality/radiation, palpation-changes-pain, gastric distress — present/absent from `hpi_elements`.
- **#24 oxygen** (PROTOCOL): SpO2<92% → oxygen required; no hypoxia → N/A; hypoxia untreated → Not Met.
- **#25 treated per protocol** (CLINICAL_CONTEXT): **always HUMAN_REVIEW_REQUIRED** (clinical appropriateness), with the interventions as evidence.
- **#26 pain-management reassessment** (TIMELINE): repeat/ reassessment at intervals after a pain-management intervention; none given → N/A; times missing → human.
- **#27 ASA/NTG** (PROTOCOL): aspirin/NTG given OR a documented reason withheld → Met; neither → Not Met.
- Architecture unchanged: applicability → structured/timeline/protocol rules → severity proposal → human review → deterministic scoring. Every negative finding carries evidence; every activation carries `applicability_reason`. Critical findings still require explicit acknowledgment.

## 6. Protocol versions
Added #16-27 to the versioned store `protocol_rules.json` (`ruleset_version: emscs-cqi-2025-08`), each with trigger / required action / timing / documentation requirement / contraindication / reference section. Evaluators cite `seed.protocol(n)`. **No invented rules.**

## 7. Timeline tests
`test_emscs_qa_cardiac.py`: #24 pre/post SpO2 (N/A when SpO2≥92, Not Met when hypoxic-untreated, Met when treated); #26 reassessment timeline (N/A without pain-mgmt, Not Met single-no-reassess, Met with a later pain reassessment or repeat dose).

## 8. Severity + human-review behavior
#25 is always HUMAN. #24 (hypoxia untreated) and #27 (ASA/NTG withheld without reason) are flagged clinical-safety gaps; the **context-driven severity engine** proposes severity (documentation gaps on a chart with abnormal vitals escalate from Minor toward human-review) and a human confirms — the engine never assigns an AUTO Critical by rule. Same failure → different severity by context (unchanged M1 severity engine).

## 9. Validation results
- **Cardiac unit tests: 16/16 pass** (`test_emscs_qa_cardiac.py`); specialty suite 34/34; six R1 synthetic cases re-run unchanged (clean #77 Met on explicit capacity; ambiguous #77 → human).
- **Validation report** regenerated ([`emscs-qa-milestone-2-validation-report.md`](emscs-qa-milestone-2-validation-report.md)) now covers Cardiac #16-27 in the de-identified WNY workbook alignment (examples-only; small-N caveat). Synthetic acceptance: applicability 6/6, indicator 42/42, FP 0, FN 0.
- **FP/FN (measurable):** 0 on the designed synthetic cases. Live seeded console: FP 16.7%, FN 0.0% (illustrative, hand-seeded N — not an accuracy claim).
- **HUMAN_REVIEW_REQUIRED rate:** Cardiac contributes #25 (always) + any ambiguous timeline; in the seeded Cardiac review 1 of 12 indicators routed to human.

## 10. Super Admin Validation Console (verified)
Console displays **Cardiac/STEMI as automated** (11 reviewed, 100% agreement, 1 human-review) alongside Albuterol/Medication/Refusal; Cardiac Arrest + Trauma remain human-only. AUTO vs HUMAN renders correctly. Screenshots: `docs/emscs-qa-m2-screenshots/09-11`.

## 11. Screenshots
- `09-cardiac-review-16-22.jpg` — Agency QA Review: Cardiac #16-22 AUTO MET / HUMAN MET.
- `10-cardiac-review-23-27-plus-medication.jpg` — #23 Not Met (evidence + applicability_reason), #24 oxygen, #25 HUMAN REVIEW REQUIRED, #26 timeline, #27 ASA/NTG, + cross-category Medication.
- `11-validation-console-cardiac-automated.jpg` — Super Admin Validation: Cardiac/STEMI automated row.

## 12. CI / parity
**Full backend suite: 277 passed** (0 failed). **60/60 scoring parity intact** (`test_emscs_qa_parity.py`; `scoring.py` untouched). `bandit -r app/services/emscs_qa -ll` → 0 Medium+. RLS/security suites green (part of the 277).

## 13. RLS results
QA tenant isolation unchanged (`test_emscs_qa_rls.py`, `test_platform_super_admin.py` in the 277). Cardiac data is agency-scoped like all QA data; Super Admin cross-agency view uses the authenticated platform clause (not an RLS bypass).

## 14. Known clinical ambiguities (deliberately human-routed)
- #25 chest-pain treatment "per protocol" — clinical appropriateness is never auto-decided.
- #24/#27 when indication/contraindication can't be determined from documented evidence → human.
- #26 interval adequacy when intervention times are missing → human (not guessed).
- Capacity (#77) under AMS/intoxication/ingestion or without explicit assessment → human; incapacity never auto-inferred.
- Documentation-element severity (#16-23) is context-driven: on an abnormal-vitals cardiac chart, doc gaps escalate toward human review rather than auto-Minor.

## 15. Remaining specialty categories (NOT started)
ALS Cancel #13-15 · Cardiac Arrest #28-32 · **Trauma #33-38 (next, pending approval)** · Stroke/CVA #39-42 · Burns #43-50 · OB/GYN #51-57 · CPAP #58-62 · Overdose #81-82 · Glucometer #83-84. **STOPPED after Cardiac/STEMI — Trauma not begun.**
