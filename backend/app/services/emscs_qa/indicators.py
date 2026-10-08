"""General CQI #1-12 evaluators + classification.

Each indicator is classified by HOW it can be determined, and evaluated
deterministically wherever possible from structured PCR data. Ambiguous or
inherently-clinical judgments return HUMAN_REVIEW_REQUIRED (never a guess).
Every automated verdict carries source evidence. Results are RECOMMENDATIONS;
a human reviewer confirms/overrides. CQI #11 delegates to the consistency engine.

Classifications (per phase spec):
  DETERMINISTIC_RULE  calculable from structured fields
  TIMELINE_RULE       calculable from timestamps
  TEXT_EXTRACTION     needs a value pulled from text (structured flag preferred)
  CONSISTENCY_CHECK   cross-field contradiction (the consistency engine)
  PROTOCOL_RULE       depends on a protocol condition
  CLINICAL_CONTEXT    holistic clinical judgment
  HUMAN_REVIEW        always routed to a human
"""
from __future__ import annotations
from dataclasses import dataclass, field
from enum import Enum
from typing import Optional

from .chart_data import QaChartData
from . import consistency

PASS = "pass"
FAIL = "fail"
NA = "na"
HUMAN = "human_review_required"


class Classification(str, Enum):
    DETERMINISTIC_RULE = "DETERMINISTIC_RULE"
    TIMELINE_RULE = "TIMELINE_RULE"
    TEXT_EXTRACTION = "TEXT_EXTRACTION"
    CONSISTENCY_CHECK = "CONSISTENCY_CHECK"
    PROTOCOL_RULE = "PROTOCOL_RULE"
    CLINICAL_CONTEXT = "CLINICAL_CONTEXT"
    HUMAN_REVIEW = "HUMAN_REVIEW"


@dataclass
class IndicatorResult:
    number: int
    classification: Classification
    verdict: str                      # pass | fail | na | human_review_required
    rationale: str
    evidence: list = field(default_factory=list)   # [{"field","value","note"}]


def _ev(field_name, value, note=""):
    return {"field": field_name, "value": value, "note": note}


def _is_transport(c: QaChartData) -> Optional[bool]:
    if c.transported is not None:
        return c.transported
    if c.disposition:
        d = c.disposition.lower()
        if "transport" in d:
            return True
        if "refus" in d or "no transport" in d or "ama" in d:
            return False
    return None


# ── #1 documentation standards + treatment protocols (holistic) ──
def cqi_1(c):
    return IndicatorResult(1, Classification.CLINICAL_CONTEXT, HUMAN,
                           "Holistic documentation-standards + protocol adherence — reviewer judgment "
                           "required; supporting signals come from the deterministic indicators.", [])


# ── #2 HPI pertinence ──
def cqi_2(c):
    el = c.hpi_elements or {}
    if el:
        missing = [k for k, v in el.items() if not v]
        present = [k for k, v in el.items() if v]
        if not missing:
            return IndicatorResult(2, Classification.TEXT_EXTRACTION, PASS,
                                   "All tracked HPI elements present.", [_ev("hpi_elements", present)])
        return IndicatorResult(2, Classification.TEXT_EXTRACTION, HUMAN,
                               "HPI elements incomplete — reviewer should confirm pertinence.",
                               [_ev("hpi_elements_missing", missing), _ev("hpi_elements_present", present)])
    return IndicatorResult(2, Classification.TEXT_EXTRACTION, HUMAN,
                           "HPI pertinence needs narrative judgment (no structured HPI elements supplied).",
                           [_ev("hpi_narrative", "present" if c.hpi_narrative else "absent")])


# ── #3 >=2 vitals incl. manual BP at acuity interval ──
def cqi_3(c):
    if _is_transport(c) is False:
        return IndicatorResult(3, Classification.DETERMINISTIC_RULE, NA,
                               "Not a transport with an activity log.", [])
    sets_with_bp = [v for v in c.vitals if v.sbp is not None]
    manual = any((v.bp_method or "").lower() == "manual" for v in sets_with_bp)
    ev = [_ev("vital_sets_with_bp", len(sets_with_bp)), _ev("manual_bp_present", manual)]
    if len(sets_with_bp) < 2:
        return IndicatorResult(3, Classification.DETERMINISTIC_RULE, FAIL,
                               f"Only {len(sets_with_bp)} vital set(s) with BP; need at least 2.", ev)
    if not manual:
        return IndicatorResult(3, Classification.DETERMINISTIC_RULE, FAIL,
                               "Two or more sets but none with a manual BP.", ev)
    return IndicatorResult(3, Classification.DETERMINISTIC_RULE, PASS,
                           f"{len(sets_with_bp)} vital sets with a manual BP.", ev)


# ── #4 assessment documented ──
def cqi_4(c):
    if c.assessment_documented is True:
        return IndicatorResult(4, Classification.TEXT_EXTRACTION, PASS,
                               "Assessment documented.", [_ev("assessment_documented", True)])
    if c.assessment_documented is False:
        return IndicatorResult(4, Classification.TEXT_EXTRACTION, FAIL,
                               "No primary/secondary/rapid assessment documented.",
                               [_ev("assessment_documented", False)])
    return IndicatorResult(4, Classification.TEXT_EXTRACTION, HUMAN,
                           "Assessment documentation not structured — reviewer to confirm.", [])


# ── #5 pain level documented ──
def cqi_5(c):
    documented = [v.pain for v in c.vitals if v.pain is not None]
    if documented:
        return IndicatorResult(5, Classification.DETERMINISTIC_RULE, PASS,
                               "Pain documented in at least one vital set.",
                               [_ev("pain_values", documented)])
    if not c.vitals:
        return IndicatorResult(5, Classification.DETERMINISTIC_RULE, HUMAN,
                               "No vitals recorded — cannot confirm pain documentation.", [])
    return IndicatorResult(5, Classification.DETERMINISTIC_RULE, FAIL,
                           "No pain level documented in any vital set.",
                           [_ev("vital_sets", len(c.vitals))])


# ── #6 transfer of care names receiving staff ──
def cqi_6(c):
    if _is_transport(c) is False:
        return IndicatorResult(6, Classification.TEXT_EXTRACTION, NA, "Not a transport.", [])
    if c.receiving_staff_named is True:
        return IndicatorResult(6, Classification.TEXT_EXTRACTION, PASS,
                               "Receiving facility staff named at transfer of care.",
                               [_ev("receiving_staff_named", True)])
    if c.receiving_staff_named is False:
        return IndicatorResult(6, Classification.TEXT_EXTRACTION, FAIL,
                               "Final entry does not name who received transfer of care.",
                               [_ev("receiving_staff_named", False)])
    return IndicatorResult(6, Classification.TEXT_EXTRACTION, HUMAN,
                           "Transfer-of-care naming not structured — reviewer to confirm.", [])


# ── #7 securement with stated strap count (3/4/5) ──
def cqi_7(c):
    if _is_transport(c) is False:
        return IndicatorResult(7, Classification.DETERMINISTIC_RULE, NA, "Not a transport.", [])
    if c.securement_straps in (3, 4, 5):
        return IndicatorResult(7, Classification.DETERMINISTIC_RULE, PASS,
                               f"{c.securement_straps} straps documented.",
                               [_ev("securement_straps", c.securement_straps)])
    if c.securement_straps is None:
        return IndicatorResult(7, Classification.DETERMINISTIC_RULE, FAIL,
                               "Strap count not stated ('all straps' / unspecified is not acceptable).",
                               [_ev("securement_text", c.securement_text or "none")])
    return IndicatorResult(7, Classification.DETERMINISTIC_RULE, FAIL,
                           f"Strap count {c.securement_straps} outside expected 3-5.",
                           [_ev("securement_straps", c.securement_straps)])


# ── #8 meds/procedures via Add Action, not free-typed ──
def cqi_8(c):
    if c.narrative_only_interventions:
        return IndicatorResult(8, Classification.DETERMINISTIC_RULE, FAIL,
                               "Intervention(s) free-typed in narrative, not entered as Add Action.",
                               [_ev("narrative_only_interventions", c.narrative_only_interventions)])
    if not c.add_actions and not c.narrative_only_interventions:
        return IndicatorResult(8, Classification.DETERMINISTIC_RULE, NA,
                               "No medications or procedures to document.", [])
    return IndicatorResult(8, Classification.DETERMINISTIC_RULE, PASS,
                           "All interventions documented via Add Action.",
                           [_ev("add_actions", [a.name for a in c.add_actions])])


# ── #9 protocol deviation -> special report ──
def cqi_9(c):
    if c.protocol_deviation is True:
        if c.special_report_filed is True:
            return IndicatorResult(9, Classification.PROTOCOL_RULE, PASS,
                                   "Deviation identified and special report filed.", [_ev("special_report_filed", True)])
        return IndicatorResult(9, Classification.PROTOCOL_RULE, FAIL,
                               "Deviation identified but no special report filed.", [_ev("special_report_filed", c.special_report_filed)])
    if c.protocol_deviation is False:
        return IndicatorResult(9, Classification.PROTOCOL_RULE, NA, "No protocol deviation identified.", [])
    return IndicatorResult(9, Classification.PROTOCOL_RULE, NA,
                           "No protocol deviation flagged (defaults NA unless a deviation is identified).", [])


# ── #10 appropriate signatures ──
def cqi_10(c):
    if _is_transport(c) is False:
        return IndicatorResult(10, Classification.DETERMINISTIC_RULE, NA,
                               "Not a transport (refusal signatures handled by the Refusal category).", [])
    sigs = c.signatures or {}
    required = {"patient_or_guardian": bool(sigs.get("patient") or sigs.get("guardian")),
                "receiving": bool(sigs.get("receiving")),
                "crew": bool(sigs.get("crew"))}
    missing = [k for k, v in required.items() if not v]
    ev = [_ev("signatures", sigs), _ev("consent_signed", c.consent_signed)]
    if missing:
        return IndicatorResult(10, Classification.DETERMINISTIC_RULE, FAIL,
                               f"Missing required signature(s): {', '.join(missing)}.", ev)
    return IndicatorResult(10, Classification.DETERMINISTIC_RULE, PASS, "Required signatures present.", ev)


# ── #11 conflicting statements (consistency engine) ──
def cqi_11(c):
    conflicts = consistency.find_conflicts(c)
    if conflicts:
        return IndicatorResult(11, Classification.CONSISTENCY_CHECK, FAIL,
                               f"{len(conflicts)} cross-field conflict(s) detected.",
                               [{"conflict": k, "evidence_a": a, "evidence_b": b} for (k, a, b) in conflicts])
    return IndicatorResult(11, Classification.CONSISTENCY_CHECK, PASS,
                           "No cross-field conflicts detected in the structured fields checked.", [])


# ── #12 appropriate destination ──
def cqi_12(c):
    if _is_transport(c) is False:
        return IndicatorResult(12, Classification.PROTOCOL_RULE, NA, "Not a transport.", [])
    if c.destination_appropriate is True:
        return IndicatorResult(12, Classification.PROTOCOL_RULE, PASS,
                               "Destination documented as appropriate.", [_ev("destination", c.destination)])
    if c.destination_appropriate is False:
        return IndicatorResult(12, Classification.PROTOCOL_RULE, FAIL,
                               "Destination not appropriate for the impression.", [_ev("destination", c.destination)])
    return IndicatorResult(12, Classification.PROTOCOL_RULE, HUMAN,
                           "Destination appropriateness needs clinical judgment.", [_ev("destination", c.destination)])


EVALUATORS = {1: cqi_1, 2: cqi_2, 3: cqi_3, 4: cqi_4, 5: cqi_5, 6: cqi_6,
              7: cqi_7, 8: cqi_8, 9: cqi_9, 10: cqi_10, 11: cqi_11, 12: cqi_12}

CLASSIFICATION = {
    1: Classification.CLINICAL_CONTEXT, 2: Classification.TEXT_EXTRACTION,
    3: Classification.DETERMINISTIC_RULE, 4: Classification.TEXT_EXTRACTION,
    5: Classification.DETERMINISTIC_RULE, 6: Classification.TEXT_EXTRACTION,
    7: Classification.DETERMINISTIC_RULE, 8: Classification.DETERMINISTIC_RULE,
    9: Classification.PROTOCOL_RULE, 10: Classification.DETERMINISTIC_RULE,
    11: Classification.CONSISTENCY_CHECK, 12: Classification.PROTOCOL_RULE,
}


def evaluate_general(chart: QaChartData) -> list:
    """Run all General #1-12 evaluators; returns list[IndicatorResult]."""
    return [EVALUATORS[n](chart) for n in range(1, 13)]
