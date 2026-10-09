# EMSCS QA — Cardiac/Trauma Clinical Safeguards (STOP for approval)

Three clinical safeguards verified against the **authoritative protocol** and implemented.
**Cardiac/Trauma branch NOT merged** (pending your approval). Synthetic/no-PHI. **60/60 scoring
parity intact.** PHI PRODUCTION GATE = NOT READY. No ALS Cancel / Cardiac Arrest started.

## Authoritative protocol source (all three rules)
- **Document:** New Jersey EMS Clinical Practice Protocols & Guidelines
- **Issuing authority / jurisdiction:** New Jersey Department of Health, Office of EMS
- **Version / effective date:** **v1, effective August 21, 2025** (248 pages)
- (This matches the `emscs-cqi-2025-08` ruleset effective date already in the protocol store.)

## 1. Oxygen #24 (Cardiac) / #37 (Trauma)
**Protocol:** §3.0 Acute Coronary Syndrome **p114** ("administer oxygen only to patients with…
hypoxia (O2 saturation <94%)… to keep O2 saturation ≥94%"); §2.23 Stroke **p111** ("maintain SPO2
between 94%-99%"); **§4.8 TBI p150** — **COPD baseline goal >90%**.

**Discrepancy flagged (not silently changed):** the EMSCS CQI #24/#37 rubric text says "SpO2 below
92%"; the NJ protocol threshold is **<94%**. To avoid replacing the rubric while following the
protocol, the shared `_oxygen_indicator` now:
- **Not Met** — SpO2 **<92%** untreated, no documented reason (clear deficiency under both).
- **N/A** — SpO2 **≥94%** throughout (not indicated per NJ).
- **HUMAN_REVIEW_REQUIRED** — **documented COPD** (NJ COPD goal >90% is patient-specific), the
  **92–93% gray zone** (NJ indicates O2 while the CQI threshold is 92%), a **documented withholding
  reason**, **undocumented SpO2**, and **oxygen given when SpO2 ≥94%** (avoid routine hyperoxia).
- **Met** — oxygen given with any SpO2 <94%.
Evidence cites the NJ protocol + version. **Open question for EMSCS:** align the CQI #24 threshold to
the NJ ≥94% target, or keep 92% for documentation scoring? Until decided, the gray zone → human.

## 2. ASA / Nitroglycerin #27
**Protocol:** §3.0 Acute Coronary Syndrome **p114** — ASA **324 mg PO** for *likely* ACS ("should not
automatically be treated… determine the likelihood of ACS"), a **BLS standing order**; NTG while
symptoms persist and **SBP ≥100 mmHg**; **avoid** NTG with **PDE5 inhibitors** (sildenafil/vardenafil
<24h, tadalafil <48h) and in **inferior-wall / RV STEMI**.

**Implemented:** aspirin and nitroglycerin are evaluated **independently** and the engine distinguishes
four states — **given**, **documented contraindication / reason (not indicated)**, **missing
documentation**, and **apparent protocol deviation**. NTG administered with a possible contraindication
(SBP<100, PDE5, inferior/RV STEMI) → **HUMAN** (apparent deviation). NTG withheld with an evident
contraindication but no documented reason → **HUMAN**. One medication given is **never** proof the other
was addressed. **Uncertain clinical indications are not auto-failed** — only an undocumented
administration-or-reason (a documentation gap) is Not Met. Evidence cites NJ §3.0 p114.

## 3. Spinal Motion Restriction #38
**Protocol:** §4.5 Spinal Motion Restriction **p144** ("perform advanced spinal assessment… to
determine if patient requires SMR"; "isolated penetrating trauma DO NOT require SMR") + **§6.0 Spinal
Assessment p184** — SMR required when ANY of: unreliable patient (altered MS / not A&Ox3 / intoxication
/ communication barrier / child), abnormal neuro function, torticollis, midline tenderness, distracting
injury. "**All steps of the spinal assessment algorithm… must be documented in the ePCR.**"

**Implemented:** **significant mechanism ALONE no longer mandates SMR** (previously auto-FAIL). Now:
positive assessment criteria + SMR → **Met**; positive + no SMR → **Not Met**; documented negative
assessment → **N/A**; isolated penetrating trauma → **N/A**; **mechanism present but no documented
spinal assessment → HUMAN_REVIEW_REQUIRED** (indication cannot be determined). New structured fields:
`spinal_assessment_documented`, `penetrating_trauma`, `neuro_deficit`, `midline_spinal_tenderness`,
`distracting_injury`. Evidence cites NJ §4.5 p144 / §6.0 p184.

## Regression cases added (positive / negative / ambiguous / cross-category)
- **Oxygen:** NA (≥94%), Not Met (<92% untreated), Met (given <94%); ambiguous — COPD→human, 92–93% gray→human, O2-when-not-indicated→human, no-SpO2→human; cross-category (Cardiac+Medication).
- **#27:** both given→Met, ASA-only→Not Met (NTG unaddressed), independent reasons→Met; ambiguous — NTG+SBP<100→human (deviation), NTG+PDE5→human; evidence cites NJ.
- **#38:** positive+SMR→Met, positive+no-SMR→Not Met, documented-negative→NA, penetrating→NA; ambiguous — mechanism-only→human; cross-category via Trauma+Medication.

## Verification (rerun)
- **Full backend suite: 308 passed** (0 failed) — includes Cardiac (31) + Trauma (24) specialty tests.
- **60/60 scoring parity intact** (`scoring.py` untouched).
- **RLS / security:** `test_emscs_qa_rls.py`, `test_platform_super_admin.py` green within the 308.
- **Validation console:** Cardiac/STEMI + Trauma display as **automated** with AUTO-vs-HUMAN
  (verified after a backend restart; the NJ corrections change individual verdict logic, not the
  automation flags). `bandit` clean.
- Six synthetic R1 cases re-run unchanged in outcome (the `critical` pediatric-MVC-refusal case now
  additionally surfaces Trauma documentation gaps #33/#34/#36 — appropriate).

## "If a protocol cannot be verified, retain human review"
All three rules were verified against the NJ v1 (8/21/2025) PDF. Where the protocol is
patient-specific or ambiguous (COPD titration, NTG indication/contraindication nuance, SMR indication
without a documented assessment), the engine **retains human review** rather than inventing a threshold.

## Branch / status
`feature/emscs-qa-cardiac-trauma` @ `98b776e` (pushed, **not merged**). Awaiting approval of these
three safeguards before merge; ALS Cancel / Cardiac Arrest not started.
