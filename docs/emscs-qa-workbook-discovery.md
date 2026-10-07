# EMSCS QA Workbook — Discovery Report

**Source:** `EMSCS - WNY Chart Review September 2026.xlsx` (West New York EMS; 60 charts, service dates
2026-09-01 → 2026-09-30). **Read in place, never copied into the repo; contains real PHI** (patient
narratives in the review notes). This report captures **methodology only** (structure, formulas,
indicator catalogue, rubric) — no patient data. The raw workbook is git-ignored; only de-identified
fixtures + non-PHI methodology (`library_seed.json`) are committed.

## 1. Sheets (12)
| Sheet | Size (rows×cols) | Role | PHI? |
|---|---|---|---|
| Dashboard | 116×8 | Aggregates (tier dist, severity totals, domain averages) — all formulas | No (aggregates) |
| Instructions | 15×2 | How-to text | No |
| Chart Log | 204×37 | One row per chart; inputs + computed scores | **Yes** |
| Indicator Review | 1504×8 | One row per indicator per chart (Y/N/NA + QA flag note) | **Yes** (notes) |
| Findings | 1004×9 | Findings + crew feedback, with severity + reference | **Yes** |
| Crew Feedback | — | (title "Findings and Crew Feedback"; feedback routing) | **Yes** |
| Provider Summary | — | Per-provider rollups | **Yes** (names) |
| Agency Trends | — | Trend rollups | No (aggregates) |
| Scoring Rubric | 40×6 | Domain weights, rating anchors, composite weights, tier thresholds | No (methodology) |
| Indicator Library | 95×8 | CQI #1–84 catalogue | No (methodology) |
| References | 60×6 | Protocol/standard citations | No (methodology) |
| Lists | 80×8 | Dropdown value lists | No (methodology) |

## 2. Scoring domains (8) + weights — Scoring Rubric
Each domain rated **0–5**; weights sum to **100**.

| # | Domain | Weight |
|---|---|---|
| 1 | HPI & Narrative | 15 |
| 2 | Assessment | 15 |
| 3 | Protocol Adherence | 20 |
| 4 | Vitals & Reassessment | 10 |
| 5 | Documentation Integrity | 15 |
| 6 | Safety, Securement & Transfer | 10 |
| 7 | Operational Decisions | 10 |
| 8 | Administrative & Billing | 5 |

Rating anchors: 5 Exemplary · 4 Meets Standard · 3 Acceptable · 2 Partial · 1 Deficient · 0 Absent/Unsafe.

## 3. Exact scoring formulas (verified from the cells)
| Output | Chart Log cell | Formula |
|---|---|---|
| Quality Score | `AA` | `SUMPRODUCT(domainScores S:Z, weights S3:Z3) / 5` (requires all 8 present) → 0–100 |
| Indicator Compliance | `AB` | `Met / (Met + Not Met)` over that chart's Indicator Review rows (NA & blank excluded) → 0–1 |
| Composite Score | `AC` | `QualityScore·0.7 + IndicatorCompliance·100·0.3` → 0–100 |
| Tier | `AE` | `≥90 Exemplary · ≥80 Meets Standard · ≥70 Needs Improvement · else Focused Review` |
| Major/Critical count | `AF` | `COUNTIFS(Findings, Major) + COUNTIFS(Findings, Critical)` |
| Commendations | `AG` | `COUNTIFS(Findings, Commendation)` |
| Indicator Status | Ind Review `G` | `IF(F="","", IF(F="NA","NA", IF(F=compliantAnswer, "Met","Not Met")))` |

Composite weights: Quality 0.7, Compliance 0.3 (Rubric C27/C28). Tier thresholds 90/80/70 (C29/C30/C31).

## 4. Indicator Library — CQI #1–84
Columns: #, Category, Indicator (text), Compliant Answer (Y/N), Times Applied, Met, Not Met, Compliance %.
Compliant answer is **Y** for all except **#11** (conflicting statements → compliant answer **N**).
Full catalogue committed in `backend/app/services/emscs_qa/library_seed.json` (non-PHI).

**General (#1–12) — scored on every chart:** 1 documentation-standards/protocol adherence · 2 HPI
pertinence · 3 ≥2 vitals incl. manual BP at acuity interval · 4 assessment documented · 5 pain level
documented · 6 transfer-of-care named · 7 securement strap count stated · 8 meds/procedures via Add
Action (not free text) · 9 protocol-deviation special report · 10 signatures obtained · 11 conflicting
statements (compliant = N) · 12 appropriate destination.

**Specialty categories (#13–84) — activate by chart context (one chart may trigger several):** ALS
Cancel (13–15) · Cardiac/STEMI (16–27) · Cardiac Arrest (28–32) · Trauma (33–38) · Stroke/CVA (39–42) ·
Burns (43–50) · OB/GYN (51–57) · CPAP (58–62) · Medication (63–68) · Albuterol (69–74) · Refusal
(75–80) · Overdose (81–82) · Glucometer (83–84).

## 5. Lists (dropdown/reference values)
- **Result:** Y, N, NA
- **Rating:** 0–5
- **Severity:** Critical, Major, Minor, Commendation
- **Domain:** the 8 domains above
- **Feedback Status:** Pending, Sent to Crew, Acknowledged, Education Assigned, Closed
- **Tier:** Exemplary, Meets Standard, Needs Improvement, Focused Review

## 6. Chart Log columns (row 4)
Review ID · PRID · Incident # · Date of Service · Unit · Primary Caregiver · Crew 2 · ALS Unit ·
Dispatched As · Chief Complaint · Primary Impression · Protocol(s) Applied · Age · Sex · Disposition ·
Final Acuity · Reviewer · Review Date · [8 domain scores] · Quality Score · Indicator Compliance ·
Composite · Rank · Tier · Major/Critical Findings · Commendations · Feedback Status · Reviewer Summary ·
Age (days if <1yr) · Age Group (Neonatal/Pediatric/Adult/Senior, derived from age).

## 7. Findings columns
Review ID · PRID · Primary Caregiver · Crew 2 · Domain · **Severity** · Finding · Recommendation /
Education Point · Reference. Severity set = Critical, Major, Minor, Commendation.

## 8. Workbook reference totals (Dashboard) — the parity targets
60 charts · avg Quality Score 53.15 · avg Indicator Compliance 0.6156 · avg Composite 55.67 · overall
indicator compliance 0.6375. Findings: Critical 9 · Major 102 · Minor 99 · Commendation 42 (252 total).
Tiers: Exemplary 0 · Meets Standard 0 · Needs Improvement 6 · Focused Review 54.

## 9. Missing / ambiguous fields (do NOT guess — flagged for clarification)
1. **Severity assignment is reviewer-authored**, not a formula. The workbook does **not** encode how a
   finding's severity (Critical/Major/Minor/Commendation) is derived — Chuck assigns it per clinical
   context. The same CQI failure appears at different severities across charts (confirms the "findings
   ≠ severity" rule). The automated severity engine must therefore be modifier-based + human-confirmed.
2. **Specialty applicability is reviewer-selected.** The workbook has no automated rule mapping a chart
   to its specialty categories — the reviewer chose which category grids to score. v1 will auto-flag
   candidate categories from structured fields (impression/complaint/protocol) and **store the reason**,
   but not auto-judge specialty indicators.
3. **Several General indicators need unstructured-text judgment** (#1, #2, #6, #12) — not fully
   determinable from structured PCR fields alone; these are classified TEXT_EXTRACTION / HUMAN_REVIEW.
4. **Indicator #9** (protocol-deviation special report) had 0 applications in this month — applicability
   trigger for it is unconfirmed; treat as NA unless a deviation is flagged.
5. **Rank (AD)** is a within-batch RANK() — depends on the full cohort; reproduced only when scoring a
   whole batch, not a single live chart.

## 10. Reproduction status
- Formulas + rubric + 84-indicator library + lists: **extracted and seeded** (`library_seed.json`).
- Scoring engine: `backend/app/services/emscs_qa/scoring.py` (deterministic; mirrors each cell).
- Parity: `backend/tests/test_emscs_qa_parity.py` + `docs/emscs-qa-parity-report.md` → **FULL PARITY on
  all 60 charts** (0 mismatches; aggregates match the Dashboard exactly). No formula was altered.
