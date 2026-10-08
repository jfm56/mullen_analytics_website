# Cardiac/STEMI #16–27 — Implementation Matrix

**Category:** Cardiac/STEMI · **Ruleset:** `emscs-cqi-2025-08` · Architecture: Applicability →
structured rules → timeline → consistency → protocol/context → severity proposal → human review →
deterministic scoring. **The engine proposes; a human approves. No AI computes the score. No protocol
rule is invented — all come from the versioned protocol store + documented EMSCS indicator text.**

**Applicability (whole category):** `_t_cardiac_stemi` — chest pain / STEMI / ACS / angina / cardiac /
MI keywords in the chart text, excluding cardiac *arrest*. Every activation records an
`applicability_reason`. Indicators are evaluated only when the category is applicable.

| # | Indicator text | Trigger | Method | Structured fields | Narrative evidence | Timeline | Protocol | Human-review | Severity guidance | Protocol ref |
|---|---|---|---|---|---|---|---|---|---|---|
| 16 | Documentation of onset time with symptoms? | category applicable | deterministic (present/absent) | `hpi_elements.onset` | onset time in HPI | — | doc req | if unstructured | Minor (doc) | 16 |
| 17 | Documentation of prior interventions before 911? | applicable | deterministic | `hpi_elements.prior_interventions` | prior meds/interventions | — | doc req | — | Minor (doc) | 17 |
| 18 | Initial assessment of pain type? | applicable | deterministic | `hpi_elements.pain_type` | pain character | — | doc req | — | Minor (doc) | 18 |
| 19 | Documentation of duration of pain? | applicable | deterministic | `hpi_elements.pain_duration` | duration | — | doc req | — | Minor (doc) | 19 |
| 20 | Documentation of the quality of pain? | applicable | deterministic | `hpi_elements.pain_quality` | quality (sharp/pressure…) | — | doc req | — | Minor (doc) | 20 |
| 21 | Documentation of radiation of pain? | applicable | deterministic | `hpi_elements.pain_radiation` | radiation | — | doc req | — | Minor (doc) | 21 |
| 22 | Does palpation of the chest wall change pain? | applicable | deterministic | `hpi_elements.pain_palpation` | reproducible-on-palpation | — | doc req | — | Minor (doc) | 22 |
| 23 | Documentation of gastric distress? | applicable | deterministic | `hpi_elements.gastric_distress` | GI symptoms | — | doc req | — | Minor (doc) | 23 |
| 24 | Appropriate oxygen therapy as indicated by perfusion (SpO2 <92%)? | applicable | protocol rule | `vitals.spo2`, `add_actions` (oxygen) | O2 applied | pre/post SpO2 | O2 if SpO2<92% | if ambiguous indication | **Major** (clinical-safety gap) | 24 |
| 25 | Chest pain treated per treatment protocol? | applicable | **clinical context → HUMAN** | `add_actions`, `protocols_applied` | treatments given | treat vs. assess order | per protocol | **always HUMAN** (clinical appropriateness) | human-decided | 25 |
| 26 | Did pain-management interventions continue at regular intervals? | applicable + a pain-mgmt intervention given | **timeline rule** | `add_actions` (analgesic/NTG) + times, `vitals.pain` + times | reassessment/repeat | repeat/reassess at intervals | reassessment req | if partial evidence | Minor→Major (per gap) | 26 |
| 27 | ASA or NTG given, or why not documented? | applicable | protocol rule + contraindication | `add_actions` (aspirin/NTG), `asa_ntg_not_given_reason` | reason if withheld | before/with treatment | ASA/NTG per ACS protocol | if reason ambiguous | **Major** (clinical-safety gap) | 27 |

## Key behaviors
- **Applicability before evaluation** (same correction as #71): the category must be applicable; a chart
  with no cardiac evidence never produces Cardiac findings.
- **Temporal relationships:** #24 pre/post SpO2 around O2; #26 reassessment/repeat intervals after a
  pain-management intervention; #27 ASA/NTG documented with/before treatment. Where a timeline cannot be
  established from structured data, the indicator routes to HUMAN_REVIEW_REQUIRED rather than guessing.
- **Clinical judgment → HUMAN:** #25 (treated *per protocol*) is always HUMAN_REVIEW_REQUIRED; #24/#27
  route to HUMAN when the indication/contraindication cannot be determined from documented evidence.
- **Every negative finding carries evidence; every activation carries `applicability_reason`.**
- **Severity:** documentation elements (#16–23) are documentation-level (Minor by default; the severity
  engine escalates on vulnerability/abnormal context). #24 (hypoxia untreated) and #27 (ASA/NTG withheld
  without reason) are clinical-safety gaps → Major, require_human. No AUTO Critical is assigned by rule;
  the severity engine proposes and a human confirms. Critical findings require explicit acknowledgment.
- **No invented rules:** #16–27 protocol metadata is added to the versioned store
  `protocol_rules.json` (ruleset `emscs-cqi-2025-08`); evaluators cite it via `seed.protocol(n)`.
