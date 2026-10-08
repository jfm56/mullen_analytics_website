# Trauma #33–38 — Implementation Matrix

**Category:** Trauma · **Ruleset:** `emscs-cqi-2025-08` · Architecture: Applicability → structured
rules → timeline → consistency → protocol/context → severity proposal → human review → deterministic
scoring. **Engine proposes; human approves. No invented trauma protocol rules** — all from the versioned
protocol store + documented EMSCS indicator text.

**Applicability (whole category):** `_t_trauma` — trauma / injury / fall / MVC / MVA / fracture /
laceration / assault / GSW / stab / collision / struck in the chart text. Every activation records an
`applicability_reason`; indicators evaluate only when applicable.

| # | Indicator text | Trigger | Method | Structured fields | Narrative evidence | Timeline | Protocol | Human-review | Severity | Protocol ref |
|---|---|---|---|---|---|---|---|---|---|---|
| 33 | Illness or injury (MOI or additional injuries) documented? | applicable | deterministic | `hpi_elements.injuries` | injuries/illness | — | doc req | if unstructured | Minor (doc) | 33 |
| 34 | Date and time of injury documented? | applicable | deterministic | `hpi_elements.injury_datetime` | injury date/time | — | doc req | — | Minor (doc) | 34 |
| 35 | Mechanism of injury documented? | applicable | deterministic | `hpi_elements.mechanism` or `significant_mechanism` (assessed) | MOI | — | doc req | — | Minor (doc) | 35 |
| 36 | Initial assessment of pain and associated symptoms? | applicable | deterministic | `hpi_elements.pain_assessment` or `vitals.pain` | pain + associated sx | — | doc req | — | Minor (doc) | 36 |
| 37 | Appropriate oxygen therapy, if required? | applicable | protocol (shared `_oxygen_indicator`) | `vitals.spo2`, `add_actions` (oxygen), `structured_fields.oxygen_withheld_reason` | O2 applied | pre/post SpO2 | O2 if SpO2<92 | **SpO2 undocumented → human; withholding reason → human** | **Major** (clinical-safety) | 37 |
| 38 | Spinal immobilization maintained? | applicable | protocol + applicability | `significant_mechanism`, `structured_fields.spinal_concern/spinal_immobilization/spinal_cleared`, `add_actions` (c-collar/backboard/SMR) | spinal concern + SMR | maintained through transport | SMR when indicated | **SMR clearance documented → human** | **Major** (clinical-safety) | 38 |

## Key behaviors
- **Applicability before evaluation** (as corrected for #71): a chart with no trauma evidence produces no Trauma findings. **#38 establishes the SMR indication first** — not indicated → **N/A** (not a failure); indicated + applied → Met; indicated + documented clearance → **HUMAN**; indicated + undocumented → Not Met.
- **#37 oxygen** reuses the shared `_oxygen_indicator` (threshold SpO2 < 92%, versioned protocol): N/A when SpO2 ≥ 92% throughout; **HUMAN** when SpO2 is undocumented (indication unknown) or a withholding reason is documented.
- **Clinical decisions that cannot be safely determined from documented evidence → HUMAN_REVIEW_REQUIRED** (SMR clearance, oxygen withholding, undocumented SpO2).
- **Every negative finding carries evidence; every activation carries `applicability_reason`.** Critical findings still require explicit acknowledgment.
- **Severity:** documentation elements (#33–36) are documentation-level (Minor by default; the context-driven severity engine escalates on vulnerability/abnormal findings). #37 (hypoxia untreated) and #38 (SMR indicated but absent) are clinical-safety gaps; the severity engine proposes and a human confirms — no AUTO Critical assigned by rule.
- **No invented rules:** #33–38 protocol metadata added to the versioned store `protocol_rules.json` (`emscs-cqi-2025-08`); evaluators cite `seed.protocol(n)` and include `protocol_version` in evidence (#37/#38).
