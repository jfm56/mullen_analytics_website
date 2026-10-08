# EMSCS QA — Milestone 2 (Specialty CQI) Validation Report

Ruleset version: `emscs-cqi-2025-08` · Implemented categories: Refusal, Medication, Albuterol, Cardiac/STEMI, Trauma (indicators #63-80).

> Scope note: this release automates **Cardiac/STEMI #16-27, Trauma #33-38, Refusal #75-80, Medication #63-68, Albuterol #69-74**. All other specialty categories remain human-review stubs. The engine proposes; a human approves. No AI computes a score.

> **Corrections applied (2026-10-08):** (1) **#77 capacity** — A&Ox/orientation is supporting evidence only and can never AUTO-MET; AUTO MET requires explicit capacity-specific documentation; AMS / intoxication / possible ingestion / insufficient documentation route to HUMAN REVIEW REQUIRED; incapacity is never auto-inferred. (2) **#71 albuterol** — applicability is established before Met/Not-Met: no evidence → N/A; evidence albuterol was given/indicated but the Add Action is missing → Not Met; a structured Add Action → normal #69-74 evaluation.

## A. Acceptance on synthetic cases (known ground truth)

Six designed cases with known-correct outcomes. Agreement here demonstrates the engine behaves **to specification** — it is an acceptance check, not a generalization-accuracy estimate (the inputs were authored to produce these results).

| Case | Expected behavior | Categories activated | Met/Not-Met agree | Engine findings | OK |
|---|---|---|---|---|---|
| Clean compliant | Refusal #75-80 all Met; no findings. | Refusal | 6/6 | — none — | ✓ |
| Minor documentation failure | #75 unsigned → Minor (documentation). | Refusal | 6/6 | #75 Minor | ✓ |
| Major failure | #78 no vitals on refusal → Major, human confirm. | Refusal | 6/6 | #78 Major | ✓ |
| Critical refusal | #78 + pediatric + significant mechanism → Critical. | Refusal, Trauma | 6/6 | #33 Major, #34 Major, #36 Major, #38 Major, #78 Critical | ✓ |
| Multi-category | Albuterol + Medication; #72 repeat <5 min → human review (abnormal SpO2). | Albuterol, Medication | 12/12 | #72 HUMAN_REVIEW_REQUIRED | ✓ |
| Ambiguous | #77 capacity (AMS/ingestion) → HUMAN REVIEW REQUIRED. | Refusal | 6/6 | #80 Major | ✓ |

**Aggregate over the six cases**

- Applicability agreement: **100%** (6/6 cases)
- Indicator Met/Not-Met agreement: **100%** (42/42 indicators)
- Finding detection: expected 5, produced 9, matched **5/5**
- Severity-proposal agreement (on expected findings): **5/5**
- False positives: **0** · False negatives: **0**
- Routed to HUMAN REVIEW REQUIRED: **2** specialty indicator(s) (e.g., capacity under AMS/ingestion, clinical dose appropriateness)

## B. Alignment with the WNY workbook (examples only)

Source: de-identified fixture of the WNY September 2026 chart review (n=60 charts). The fixture carries the workbook reviewer's Met/Not-Met per specialty indicator but **omits the structured chart content**, so the engine is **not** re-run against these charts. The table reports real-world prevalence and confirms each automated indicator maps to a defined evaluator + versioned protocol.

| # | Category | Auto | Scored (n) | Met | Not Met | NA | Protocol (versioned) |
|---|---|---|---|---|---|---|---|
| 16 | Cardiac/STEMI | auto | 12 | 12 | 0 | 0 | Symptom onset documentation v1 |
| 17 | Cardiac/STEMI | auto | 12 | 7 | 5 | 0 | Prior interventions documentation v1 |
| 18 | Cardiac/STEMI | auto | 12 | 9 | 3 | 0 | Pain type assessment v1 |
| 19 | Cardiac/STEMI | auto | 12 | 11 | 1 | 0 | Pain duration documentation v1 |
| 20 | Cardiac/STEMI | auto | 12 | 9 | 3 | 0 | Pain quality documentation v1 |
| 21 | Cardiac/STEMI | auto | 12 | 12 | 0 | 0 | Pain radiation documentation v1 |
| 22 | Cardiac/STEMI | auto | 12 | 0 | 12 | 0 | Palpation effect on pain v1 |
| 23 | Cardiac/STEMI | auto | 12 | 11 | 1 | 0 | Gastric distress documentation v1 |
| 24 | Cardiac/STEMI | auto | 12 | 2 | 0 | 10 | Oxygen therapy by perfusion v1 |
| 25 | Cardiac/STEMI | auto | 12 | 7 | 5 | 0 | Chest pain treatment per protocol v1 |
| 26 | Cardiac/STEMI | auto | 12 | 0 | 7 | 5 | Pain-management reassessment v1 |
| 27 | Cardiac/STEMI | auto | 12 | 10 | 2 | 0 | Aspirin/Nitroglycerin administration v1 |
| 33 | Trauma | auto | 15 | 15 | 0 | 0 | Injury/illness documentation v1 |
| 34 | Trauma | auto | 15 | 1 | 14 | 0 | Injury date/time documentation v1 |
| 35 | Trauma | auto | 15 | 15 | 0 | 0 | Mechanism of injury documentation v1 |
| 36 | Trauma | auto | 15 | 11 | 4 | 0 | Pain + associated-symptoms assessment v1 |
| 37 | Trauma | auto | 15 | 1 | 0 | 14 | Oxygen therapy if required v1 |
| 38 | Trauma | auto | 15 | 0 | 10 | 5 | Spinal motion restriction v1 |
| 63 | Medication | auto | 12 | 12 | 0 | 0 | Medication documentation v1 |
| 64 | Medication | auto | 12 | 12 | 0 | 0 | Medication indication v1 |
| 65 | Medication | auto | 12 | 12 | 0 | 0 | Medication detail v1 |
| 66 | Medication | auto | 12 | 8 | 3 | 1 | Post-medication reassessment v1 |
| 67 | Medication | auto | 12 | 2 | 2 | 8 | ALS escalation v1 |
| 68 | Medication | auto | 12 | 12 | 0 | 0 | Dose appropriateness v1 |
| 69 | Albuterol | auto | 2 | 2 | 0 | 0 | 2.4A/2.4P Asthma/COPD/Reactive Airway v1 |
| 70 | Albuterol | auto | 2 | 1 | 1 | 0 | 2.4A/2.4P pre-therapy assessment v1 |
| 71 | Albuterol | auto | 2 | 2 | 0 | 0 | Albuterol documentation v1 |
| 72 | Albuterol | auto | 2 | 0 | 0 | 2 | Albuterol repeat dosing v1 |
| 73 | Albuterol | auto | 2 | 1 | 1 | 0 | 2.4A/2.4P post-therapy assessment v1 |
| 74 | Albuterol | auto | 2 | 1 | 1 | 0 | Albuterol response v1 |
| 75 | Refusal | auto | 13 | 0 | 13 | 0 | Refusal / AMA documentation v1 |
| 76 | Refusal | auto | 13 | 0 | 0 | 13 | Refusal / AMA documentation v1 |
| 77 | Refusal | auto | 13 | 10 | 3 | 0 | Decision-making capacity v1 |
| 78 | Refusal | auto | 13 | 6 | 7 | 0 | Refusal vitals v1 |
| 79 | Refusal | auto | 13 | 13 | 0 | 0 | Refusal follow-up v1 |
| 80 | Refusal | auto | 13 | 9 | 4 | 0 | Refusal sobriety assessment v1 |

**Small-count caveat.** Albuterol appears on only ~2 charts and several specialty cells are single-digit. These counts characterize prevalence and confirm indicator definitions; they are **not** sufficient to claim statistical accuracy, and nothing here is used to train or tune the engine.

## C. Known clinical ambiguities (deliberately routed to humans)

- Decision-making capacity when AMS or possible ingestion is present (#77) — never auto-judged.
- Medication dose appropriateness vs protocol (#68) — clinical confirmation required.
- Possible abuse / mandatory-reporting — always high-priority HUMAN REVIEW REQUIRED, never auto-scored.
- Severity of a clinical-safety refusal gap — proposed (Major/Critical) but flagged require_human.
- Albuterol 'given but response not documented' vs 'response poor' — engine detects the documentation gap (#74); clinical interpretation is the reviewer's.

## D. Method / integrity statement

- AI/engine proposes indicator verdicts and severities; it does **not** compute the QA score (scoring stays deterministic — 60/60 workbook parity unchanged).
- Automated proposals are stored separately from human decisions and are never overwritten.
- Protocol requirements come from the versioned store (`protocol_rules.json`), not from prompts.
- The workbook is used for examples/definition alignment only — never for training or tuning.
