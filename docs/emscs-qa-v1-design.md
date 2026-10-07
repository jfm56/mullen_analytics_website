# EMSCS QA Review Engine v1 — Design (Synthetic Only)

**Status (2026-10-07): Milestone 1 FOUNDATION in place; scoring parity + regression BLOCKED on the EMSCS workbook.**
Feature-flagged `EMSCS_QA_V1_ENABLED` (default **OFF** everywhere except the approved dev/test synthetic
env). Scope: the existing EMSCS **synthetic/no-PHI** environment only. **Not** authorization to connect
live EMSCharts, ingest PHI, invite EMSCS users, change DNS/production, or start the trial.

## Architecture principles (from the phase spec)
1. **Data-driven clinical content.** The 8 scoring domains, the CQI indicator definitions (#1–84), their
   applicability/evaluation/severity rules, weights, and the scoring formula live as **data** seeded from
   the EMSCS workbook — not hardcoded. The code is a generic deterministic engine that interprets that
   data. This is why the schema can be built before the workbook arrives, and why the workbook populates
   config (not code) with no schema rework.
2. **AI never scores.** Scoring is deterministic application logic over indicator results + a seeded
   `qa_scoring_config`. No AI/ML computes or modifies a score. (We also do **not** train any model on the
   60-chart workbook — it is used only as workflow/scoring/indicator/validation/severity specification.)
3. **Original automated result stored separately from the human-approved result**, everywhere:
   `qa_indicator_reviews.automated_result` vs `human_result`; `qa_scores.automated_*` vs `approved_*`.
   The engine writes only the automated side; a human reviewer explicitly approves/overrides.
4. **Every negative automated finding carries chart evidence** (`qa_findings.evidence`, service-enforced).
5. **Human-in-the-loop.** All automated results are recommendations pending human approval; the composite
   score/tier a crew sees is the **approved** one. Full audit trail (`qa_audit_events`, before/after).
6. **Agency-owned + RLS.** Agency-owned QA tables carry `agency_id` and get the platform's
   `agency_isolation` RLS policy (`apply_rls_qa`). Config tables are shared methodology (read-only to the
   runtime role). Charts are **synthetic-only** in v1 (`is_synthetic` default true).

## Schema (implemented — `backend/app/models/emscs_qa.py`)
Config layer (seeded from workbook, platform-level):
- **`qa_scoring_domains`** — the 8 EMSCS domains (slug, name, weight, ordering, scoring_version).
- **`qa_indicators`** — the Indicator Library: number (#1–84), name, category (general/specialty), domain,
  definition, `applicability_rule`/`evaluation_rule`/`severity_rule` (JSONB specs), weight, `implemented`
  (true only for #1–12 in v1), scoring_version.
- **`qa_scoring_configs`** — deterministic scoring params (Quality Score / Indicator Compliance /
  Composite / Tier formula + tier thresholds) per workbook version.

Agency-owned review data (RLS-isolated):
- **`qa_charts`** — Chart Log (item 4). Synthetic chart under review; `chart_data` JSONB holds operational
  + synthetic clinical fields; optional link to `ems_incidents`.
- **`qa_review_sessions`** — one review of one chart; `status` auto_generated→pending_human→approved|overridden.
- **`qa_indicator_reviews`** — Indicator Review (item 5); `automated_result` (immutable) vs `human_result`.
- **`qa_findings`** — Findings (item 6); negative automated findings require `evidence`.
- **`qa_crew_feedback`** — Crew Feedback (item 7); routed per `provider_id`, crew sees only their own.
- **`qa_scores`** — Quality/Indicator-Compliance/Composite/Tier, `automated_*` vs `approved_*` (item 9).
- **`qa_audit_events`** — approve/override/dismiss/export trail with before/after (item 16).

## Engines (planned — generic, interpret the seeded rules)
- **Applicability engine (item 11):** evaluates `qa_indicators.applicability_rule` against `chart_data`
  to decide which indicators apply to a chart (e.g., "applies when call_type=cardiac_arrest").
- **Evaluation engine (item 12, CQI #1–12):** deterministic pass/fail/na from `evaluation_rule` +
  `chart_data`; emits an immutable `automated_result` + evidence.
- **Clinical timeline engine (item 13):** validates temporal ordering/plausibility of chart timestamps.
- **Cross-field consistency engine (item 14):** flags contradictory fields (e.g., procedure present but
  not in narrative; disposition vs transport).
- **Severity engine v1 (item 15):** maps a failure to a severity via `severity_rule`.
- **Scoring engine (item 9):** deterministic composition of indicator results → per-domain scores →
  Quality Score, Indicator Compliance, Composite Score, Tier, per `qa_scoring_config`.

## Rule-spec shapes (proposed; finalized from the workbook)
- `applicability_rule`: `{all:[{field, op, value}], any:[...]}` predicate over `chart_data`.
- `evaluation_rule`: `{type:"field_present"|"field_in"|"time_within"|..., field, params, evidence_fields}`.
- `severity_rule`: `{default:"moderate", by_value:{...}}`.
- `qa_scoring_config.params`: `{quality_score:{method,fields}, indicator_compliance:{method},
  composite:{domain_weights|method}, tiers:[{name,min,max}], rounding}`.

## ⛔ Blocking dependency — the EMSCS workbook (required input, not currently accessible)
The workbook was **not found** anywhere on the host (projects, Downloads, Desktop, Documents, OneDrive),
and `mullen-ems-qa` contains no EMSCS/CQI methodology. The following Milestone-1 items **cannot be
completed or correctly proven without it** (and must not be guessed for a clinical scoring product):
1. **The 8 scoring domains** — exact names + weights + which indicators map to each.
2. **CQI indicators #1–12** — exact definitions, applicability conditions, pass/fail criteria, severity.
3. **CQI #13–84** — definitions to store in the Indicator Library (definitions only in v1).
4. **Exact scoring formula** — how Quality Score, Indicator Compliance, and Composite Score are computed,
   and the Tier thresholds. (This is the core of "exact workbook scoring replication".)
5. **The 60 reviewed charts** — needed as **synthetic/de-identified fixtures** with their known
   applicable indicators, Quality Score, Indicator Compliance, Composite Score, and Tier, to build the
   regression tests the phase requires (matching parity).

**To unblock:** provide the workbook file (path or upload). It will be imported via the `qa_indicators`/
`qa_scoring_domains`/`qa_scoring_configs` seed + a de-identified fixture set — the schema/engines above do
not change. Until then, v1 ships inert (flag OFF) with the foundation above.

## Human-review workflow (implemented in schema; service layer next)
auto_generated (engine writes automated_result + findings + automated scores) → pending_human → reviewer
approves or overrides per indicator (writes human_result, override_reason, audit before/after) → on
approval the scoring engine recomputes **approved_*** from the human results. The crew-facing feedback and
the "final" score are always the **approved** values; automated values are retained immutably for audit.

## Safety posture
Flag OFF ⇒ QA models not registered, no QA tables created, no routes mounted, module fully inert — zero
footprint on the live portal. Flag ON only in the approved synthetic/no-PHI dev/test env. No live
EMSCharts, no PHI, no client exposure, no DNS/production change.
