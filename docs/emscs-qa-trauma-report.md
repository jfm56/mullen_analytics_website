# EMSCS QA — Repo Stabilization + Cardiac #24/#27 + Trauma #33-38 (STOP checkpoint)

**STOP after Trauma.** Synthetic/no-PHI only. Deterministic scoring unchanged (60/60 parity). No
WNY-workbook training/tuning. Guardrails held (no live ZOLL/EMSCharts, no PHI ingestion, no client
invite, no production deployment; Forecaster v2 unwired, Geographic v2 unimplemented). **PHI PRODUCTION
GATE = NOT READY** (unchanged).

## Repository status (Step 1)
- **PR #27 merged** to `main` via the normal protected-branch process (no force, no bypass): merge
  commit **`c8dc4d08`**. Required check `security-and-tests` was green (branch protection requires only
  that; strict=False). The merge triggered the standard `main`→Vercel/Railway deploy; **EMSCS QA stays
  flag-gated OFF** (`EMSCS_QA_V1_ENABLED` default false) so the feature is inert in production.
- Cardiac #24/#27 corrections + Trauma #33-38 are on branch **`feature/emscs-qa-cardiac-trauma`** (off
  updated `main`), pushed — **not merged** (STOP).

## Security-branch preservation (Step 2)
- **App PHI-security branch `security/phi-app-hardening`** created from updated `main` + the preserved
  commit cherry-picked cleanly (**`406a455`**); contains ONLY PHI-security changes, no specialty-CQI.
  **326 backend tests pass** (incl. 60/60 parity, RLS, platform, security-profile). Pushed to origin as
  preservation; **not merged or deployed**.
- **`mullen-aws-platform`: NO git remote configured** (inspected; `git remote -v` empty). I did not
  guess a destination or create a repository. Commit **`8410ef8`** (IaC + PHI/HIPAA docs) is preserved
  locally on `security/phi-hipaa-hardening`. Awaiting a remote URL (or your approval to create one) to push.

## Cardiac corrections (Step 3)
- **#24 oxygen** (`_oxygen_indicator`, shared with #37): threshold **SpO2 < 92%** confirmed against the
  versioned protocol; N/A when SpO2 ≥ 92% throughout; **HUMAN** when SpO2 is undocumented (indication
  unknown) or a withholding reason is documented (clinical exception); PASS when oxygen given; FAIL when
  hypoxic + untreated + no reason. Evidence now cites `protocol_version`.
- **#27 ASA/NTG evaluated INDEPENDENTLY**: aspirin and nitroglycerin assessed separately — each must be
  given OR have a documented reason; **administration of one is never proof the other requirement was
  met**. NTG missing with a possible contraindication (documented SBP < 100) → **HUMAN** (clinical),
  not an auto-fail. Separate `asa_not_given_reason` / `ntg_not_given_reason` fields (legacy combined
  reason still honored). Ambiguity → HUMAN_REVIEW_REQUIRED.
- Regression tests added/updated in `test_emscs_qa_cardiac.py` (ASA-only ≠ NTG met; NTG+hypotension →
  human; independent reasons → met; #24 no-SpO2 → human; #24 withholding-reason → human; protocol-version cited).

## Trauma #33-38 (Step 4)
- **Matrix:** [`emscs-qa-trauma-matrix.md`](emscs-qa-trauma-matrix.md) (exact text, trigger, method,
  fields, narrative, timeline, protocol, human-review, severity, protocol ref).
- **Rules:** #33 injury/illness, #34 injury date/time, #35 mechanism (also satisfied by an assessed
  `significant_mechanism`), #36 pain + associated symptoms (also from `vitals.pain`) — deterministic
  documentation; **#37 oxygen-if-required** (shared `_oxygen_indicator`, protocol); **#38 spinal motion
  restriction** — **applicability first** (not indicated → N/A; indicated + applied → Met; indicated +
  documented SMR clearance → HUMAN; indicated + undocumented → Not Met).
- **Protocol versions:** #33-38 added to the versioned store `protocol_rules.json`
  (`ruleset_version: emscs-cqi-2025-08`); **no invented rules**; #37/#38 cite `protocol_version`.
- **Timeline tests:** #37 pre/post SpO2 (N/A / Not Met / Met / human); #38 indication→application.
- **Severity + human-review:** #37 (hypoxia untreated) and #38 (SMR absent) are clinical-safety gaps;
  the context-driven severity engine proposes and a human confirms (no AUTO Critical by rule). SMR
  clearance and undocumented-SpO2 route to human.
- **Tests:** `test_emscs_qa_trauma.py` (14) — applicability, documentation, #37 oxygen, #38 SMR, orchestration.

## Validation results
- **Full backend suite: 297 passed** (0 failed). Cardiac 25 + Trauma 14 specialty tests pass.
- **60/60 scoring parity intact** (`scoring.py` untouched).
- **Validation report** regenerated ([`emscs-qa-milestone-2-validation-report.md`](emscs-qa-milestone-2-validation-report.md))
  now covers Cardiac #16-27 and Trauma #33-38 in the de-identified WNY workbook alignment (examples-only;
  small-N caveat). Synthetic acceptance: applicability 6/6, indicator 42/42, FP 0, FN 0.
- **Super Admin Validation Console verified:** after a backend restart (a stale `--reload` process was
  showing old automation flags), the console correctly shows **Cardiac/STEMI and Trauma as `automated`**
  (Albuterol/Medication/Refusal/General automated; Cardiac Arrest remains human-only). AUTO-vs-HUMAN renders correctly.

## RLS results
QA tenant isolation unchanged (`test_emscs_qa_rls.py`, `test_platform_super_admin.py` green within the
297). Trauma/Cardiac data is agency-scoped like all QA data; Super Admin cross-agency view uses the
authenticated platform clause (not an RLS bypass).

## Screenshots / evidence (`docs/emscs-qa-m2-screenshots/`)
- `12-validation-trauma-cardiac-automated.jpg` — Super Admin Validation: Cardiac/STEMI + Trauma `automated`.
- `13-trauma-agency-review-indicators.txt` — Agency QA Review Trauma #33-38 verdicts + evidence (verbatim; a clean screenshot was blocked by intermittent window compositing).
- `09-11` (prior) — Cardiac #16-27 Agency review + validation console.

## Outstanding clinical questions
- **#24/#37 oxygen titration for COPD:** the protocol target for COPD may be 88–92%; the current rule
  flags SpO2 < 92% uniformly and routes documented withholding reasons to human. Confirm whether a
  COPD-specific target should be encoded or left to human review.
- **#27 NTG contraindications:** beyond hypotension (SBP < 100), PDE5-inhibitor use and RV/inferior MI
  are contraindications not derivable from current structured fields — these rely on a documented reason
  or route to human. Confirm the structured fields EMSCS wants captured.
- **#38 SMR indication:** indication is inferred from significant mechanism + spinal narrative; confirm
  whether a dedicated structured "spinal assessment / SMR indicated" field should drive applicability.
- **Severity of documentation gaps on abnormal-vitals charts:** the engine escalates doc gaps toward
  human review when abnormal findings are present — confirm this is the desired behavior for Trauma/Cardiac.

## Remaining specialty categories (NOT started)
ALS Cancel #13-15 · Cardiac Arrest #28-32 · Stroke/CVA #39-42 · Burns #43-50 · OB/GYN #51-57 · CPAP
#58-62 · Overdose #81-82 · Glucometer #83-84. **STOPPED after Trauma.**
