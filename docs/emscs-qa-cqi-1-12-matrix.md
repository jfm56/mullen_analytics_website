# CQI #1–12 — Implementation Matrix (General indicators)

Each General indicator is classified by **how** it can be determined, then evaluated deterministically
where possible from structured PCR data. Ambiguous/holistic judgments return `HUMAN_REVIEW_REQUIRED` —
never a guess. Every automated verdict carries source evidence. Results are **recommendations**; the
human reviewer's decision is authoritative and stored separately. Engine: `app/services/emscs_qa/`.

**Classifications:** `DETERMINISTIC_RULE` (structured fields) · `TIMELINE_RULE` (timestamps) ·
`TEXT_EXTRACTION` (value from text; structured flag preferred) · `CONSISTENCY_CHECK` (cross-field) ·
`PROTOCOL_RULE` (protocol condition) · `CLINICAL_CONTEXT` (holistic) · `HUMAN_REVIEW` (always human).

| # | Indicator (workbook) | Compliant | Classification | Automated logic (deterministic unless noted) | v1 status |
|---|---|---|---|---|---|
| 1 | Adheres to documentation standards + treatment protocols | Y | CLINICAL_CONTEXT | Holistic → **HUMAN_REVIEW_REQUIRED**; the deterministic indicators below are surfaced as supporting signals | Human-confirmed |
| 2 | HPI contains pertinent info (why 911) | Y | TEXT_EXTRACTION | If structured `hpi_elements` supplied → pass/incomplete; otherwise **HUMAN_REVIEW_REQUIRED** (no LLM) | Partial / human |
| 3 | ≥2 vital sets, ≥1 manual BP, interval by acuity | Y | DETERMINISTIC_RULE | Count vital sets with BP (≥2) and a manual BP present; NA if not a transport | **Deterministic** |
| 4 | Primary/secondary/rapid assessment documented | Y | TEXT_EXTRACTION | `assessment_documented` flag → pass/fail; unknown → HUMAN_REVIEW | Deterministic (flag) / human |
| 5 | Pain level documented | Y | DETERMINISTIC_RULE | Any vital set has a pain value (incl. "unable to assess") | **Deterministic** |
| 6 | Final entry names receiving-facility staff | Y | TEXT_EXTRACTION | `receiving_staff_named` flag → pass/fail; unknown → HUMAN_REVIEW; NA if not transport | Deterministic (flag) / human |
| 7 | Securement with stated strap count (3/4/5) | Y | DETERMINISTIC_RULE | `securement_straps` ∈ {3,4,5}; "all straps"/unspecified → fail; NA if not transport | **Deterministic** |
| 8 | Meds/procedures via Add Action, not free-typed | Y | DETERMINISTIC_RULE | `narrative_only_interventions` empty; NA if no interventions | **Deterministic** |
| 9 | Protocol deviation → special report filed | Y | PROTOCOL_RULE | If `protocol_deviation` then require `special_report_filed`; else NA | **Deterministic** |
| 10 | Appropriate signatures obtained (transports) | Y | DETERMINISTIC_RULE | Patient/guardian + receiving + crew signatures present; NA if not transport | **Deterministic** |
| 11 | Any conflicting statements | **N** | CONSISTENCY_CHECK | Consistency engine → conflicts present = fail, returning **both** conflicting pieces of evidence | **Deterministic** |
| 12 | Transported to appropriate facility | Y | PROTOCOL_RULE | `destination_appropriate` flag → pass/fail; unknown → HUMAN_REVIEW; NA if not transport | Deterministic (flag) / human |

## Notes
- **Deterministic (7):** #3, #5, #7, #8, #9, #10, #11. **Flag-or-human (4):** #2, #4, #6, #12 — pass/fail
  when a structured value is present, else routed to a human (we do not infer from free text with an LLM).
  **Holistic (1):** #1 → always human-confirmed.
- **Findings ≠ severity.** A failed indicator becomes a *finding*; its severity is proposed separately by
  the severity engine from clinical modifiers (so the same failure can be Minor or Critical by context),
  and anything clinically consequential or ambiguous returns `HUMAN_REVIEW_REQUIRED`.
- **Specialty CQI #13–84** are **not** auto-judged in v1 — the applicability engine marks the activated
  categories' indicators as applicable (with a recorded reason) and routes them to human review.
