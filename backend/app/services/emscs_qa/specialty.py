"""Specialty CQI evaluators — Milestone 2 Release 1: Refusal #75-80, Medication
#63-68, Albuterol #69-74.

Same architecture as General #1-12: deterministic/timeline/protocol rules from
STRUCTURED chart data where possible; HUMAN_REVIEW_REQUIRED for clinical judgment or
ambiguous evidence. Every negative verdict carries evidence. No AI computes a score;
these produce indicator verdicts + findings that a human confirms. Protocol
requirements come from the VERSIONED protocol store (seed.protocol), not prompts.
"""
from __future__ import annotations
from typing import Optional

from .chart_data import QaChartData, AddAction
from .indicators import IndicatorResult, Classification, PASS, FAIL, NA, HUMAN, _ev
from . import seed

IMPLEMENTED_CATEGORIES = ("Refusal", "Medication", "Albuterol")


def _min(t) -> Optional[int]:
    if not t or not isinstance(t, str) or ":" not in t:
        return None
    try:
        h, m = t.split(":")[:2]
        return int(h) * 60 + int(m)
    except (ValueError, TypeError):
        return None


def _meds(c: QaChartData, name: Optional[str] = None):
    out = [a for a in c.add_actions if a.kind == "medication"]
    if name:
        out = [a for a in out if name.lower() in (a.name or "").lower()]
    return out


def _albuterol(c: QaChartData):
    return [a for a in _meds(c) if any(k in (a.name or "").lower() for k in ("albuterol", "salbutamol"))]


def _vitals_with(c: QaChartData, need_rr=False, need_spo2=False, need_bp=False):
    out = []
    for v in c.vitals:
        if need_rr and v.rr is None:
            continue
        if need_spo2 and v.spo2 is None:
            continue
        if need_bp and v.sbp is None:
            continue
        out.append(v)
    return out


def _R(num, cls, verdict, rationale, evidence=None):
    return IndicatorResult(num, cls, verdict, rationale, evidence or [])


# ───────────────────────── Refusal #75-80 ─────────────────────────
def r_75(c):
    rf = c.refusal
    if rf is None:
        return _R(75, Classification.DETERMINISTIC_RULE, FAIL, "No refusal matrix documented.", [_ev("refusal", "absent")])
    ok = bool(rf.matrix_complete) and (bool(rf.signed_patient) or bool(rf.signed_witness))
    if ok:
        return _R(75, Classification.DETERMINISTIC_RULE, PASS, "Refusal matrix complete and signed.",
                  [_ev("matrix_complete", rf.matrix_complete), _ev("signed", rf.signed_patient or rf.signed_witness)])
    return _R(75, Classification.DETERMINISTIC_RULE, FAIL, "Refusal matrix incomplete or unsigned.",
              [_ev("matrix_complete", rf.matrix_complete), _ev("signed_patient", rf.signed_patient),
               _ev("signed_witness", rf.signed_witness)])


def r_76(c):
    rf = c.refusal
    if rf is None or rf.checkboxes_complete is None:
        return _R(76, Classification.DETERMINISTIC_RULE, HUMAN, "Refusal check-box completeness not structured — reviewer to confirm.", [])
    return (_R(76, Classification.DETERMINISTIC_RULE, PASS, "Each refusal check box marked.", [_ev("checkboxes_complete", True)])
            if rf.checkboxes_complete else
            _R(76, Classification.DETERMINISTIC_RULE, FAIL, "Refusal check boxes not individually marked (line through section).", [_ev("checkboxes_complete", False)]))


def r_77(c):
    rf = c.refusal
    # capacity is a clinical judgment; ambiguous context routes to human review
    if c.altered_mental_status or c.possible_ingestion:
        return _R(77, Classification.CLINICAL_CONTEXT, HUMAN,
                  "Capacity is in question (AMS / possible ingestion) — HUMAN REVIEW REQUIRED.",
                  [_ev("altered_mental_status", c.altered_mental_status), _ev("possible_ingestion", c.possible_ingestion)])
    if rf is None or rf.capacity_documented is None:
        return _R(77, Classification.CLINICAL_CONTEXT, HUMAN, "Decision-making capacity not documented in structured form.", [])
    if rf.capacity_documented and (rf.aox is None or rf.aox == 4):
        return _R(77, Classification.DETERMINISTIC_RULE, PASS, "Capacity documented (A&O x4).", [_ev("aox", rf.aox)])
    return _R(77, Classification.DETERMINISTIC_RULE, FAIL, "Decision-making capacity not adequately documented.",
              [_ev("capacity_documented", rf.capacity_documented), _ev("aox", rf.aox)])


def r_78(c):
    sets = _vitals_with(c, need_bp=True)
    if sets:
        return _R(78, Classification.DETERMINISTIC_RULE, PASS, f"{len(sets)} full vital set(s) on refusal.", [_ev("vital_sets", len(sets))])
    return _R(78, Classification.DETERMINISTIC_RULE, FAIL, "No full set of vitals obtained on refusal.", [_ev("vital_sets", 0)])


def r_79(c):
    rf = c.refusal
    if rf is None or rf.return_precautions is None:
        return _R(79, Classification.DETERMINISTIC_RULE, FAIL, "Follow-up / return precautions not documented.", [_ev("return_precautions", None)])
    return (_R(79, Classification.DETERMINISTIC_RULE, PASS, "Follow-up instructions completed.", [_ev("return_precautions", True)])
            if rf.return_precautions else
            _R(79, Classification.DETERMINISTIC_RULE, FAIL, "Follow-up instructions not completed.", [_ev("return_precautions", False)]))


def r_80(c):
    rf = c.refusal
    documented = rf is not None and rf.influence_documented not in (None, False, "")
    if documented:
        return _R(80, Classification.DETERMINISTIC_RULE, PASS, "Sobriety/influence assessment documented.", [_ev("influence_documented", rf.influence_documented)])
    if c.possible_ingestion:
        return _R(80, Classification.DETERMINISTIC_RULE, FAIL, "Possible ingestion but influence/sobriety not documented.", [_ev("possible_ingestion", True)])
    return _R(80, Classification.DETERMINISTIC_RULE, FAIL, "Not-under-the-influence assessment not documented.", [_ev("influence_documented", None)])


# ───────────────────────── Medication #63-68 ─────────────────────────
def m_63(c):
    meds = _meds(c)
    missing = [a.name for a in meds if not a.performed_by]
    if not meds:
        return _R(63, Classification.DETERMINISTIC_RULE, NA, "No medications administered.", [])
    if missing:
        return _R(63, Classification.DETERMINISTIC_RULE, FAIL, "Medication(s) missing the performing provider.", [_ev("missing_performer", missing)])
    return _R(63, Classification.DETERMINISTIC_RULE, PASS, "All medications via Add Action with performer.", [_ev("medications", [a.name for a in meds])])


def m_64(c):
    meds = _meds(c)
    if not meds:
        return _R(64, Classification.DETERMINISTIC_RULE, NA, "No medications administered.", [])
    missing = [a.name for a in meds if not a.indication]
    if missing:
        return _R(64, Classification.DETERMINISTIC_RULE, FAIL, "Indication not documented prior to medication.", [_ev("no_indication", missing)])
    return _R(64, Classification.DETERMINISTIC_RULE, PASS, "Indication documented for each medication.", [])


def m_65(c):
    meds = _meds(c)
    if not meds:
        return _R(65, Classification.DETERMINISTIC_RULE, NA, "No medications administered.", [])
    bad = [a.name for a in meds if not (a.route and a.dose and a.dose_unit and a.response_documented)]
    if bad:
        return _R(65, Classification.DETERMINISTIC_RULE, FAIL, "Route/dose/unit/response incomplete for medication(s).", [_ev("incomplete", bad)])
    return _R(65, Classification.DETERMINISTIC_RULE, PASS, "Route, dose, unit and response documented.", [])


def m_66(c):
    meds = _meds(c)
    if not meds:
        return _R(66, Classification.TIMELINE_RULE, NA, "No medications administered.", [])
    missing = []
    for a in meds:
        if a.reassessed_after:
            continue
        mt = _min(a.time)
        has_post = any(_min(v.time) is not None and mt is not None and _min(v.time) > mt for v in c.vitals)
        if not has_post:
            missing.append(a.name)
    if missing:
        return _R(66, Classification.TIMELINE_RULE, FAIL, "No clinical reassessment documented after medication(s).", [_ev("no_reassessment", missing)])
    return _R(66, Classification.TIMELINE_RULE, PASS, "Reassessment documented after each medication.", [])


def m_67(c):
    meds = _meds(c)
    if not meds:
        return _R(67, Classification.PROTOCOL_RULE, NA, "No medications administered.", [])
    if c.als_dispatched or c.als_on_scene:
        return _R(67, Classification.PROTOCOL_RULE, NA, "ALS already dispatched / on scene.", [_ev("als_on_scene", c.als_on_scene)])
    if c.als_requested:
        return _R(67, Classification.PROTOCOL_RULE, PASS, "ALS request documented.", [_ev("als_requested", True)])
    return _R(67, Classification.PROTOCOL_RULE, FAIL, "Medication given with no ALS on scene and no documented ALS request.", [_ev("als_requested", c.als_requested)])


def m_68(c):
    meds = _meds(c)
    if not meds:
        return _R(68, Classification.PROTOCOL_RULE, NA, "No medications administered.", [])
    # dose-range appropriateness is not fully structured here -> clinical confirmation
    return _R(68, Classification.CLINICAL_CONTEXT, HUMAN,
              "Dose appropriateness vs protocol needs clinical confirmation.",
              [_ev("doses", [{"name": a.name, "dose": a.dose, "unit": a.dose_unit} for a in meds])])


# ───────────────────────── Albuterol #69-74 ─────────────────────────
def a_69(c):
    hay = " ".join([c.history or "", c.primary_impression or "", c.hpi_narrative or ""]).lower()
    if any(k in hay for k in ("copd", "asthma", "reactive airway")):
        return _R(69, Classification.TEXT_EXTRACTION, PASS, "COPD/asthma documented.", [_ev("history_impression", "COPD/asthma present")])
    if hay.strip():
        return _R(69, Classification.TEXT_EXTRACTION, FAIL, "Specific COPD or asthma not documented.", [_ev("history_impression", "no COPD/asthma term")])
    return _R(69, Classification.TEXT_EXTRACTION, HUMAN, "No structured history/impression text to confirm COPD/asthma.", [])


def _alb_times(c):
    return sorted(t for t in (_min(a.time) for a in _albuterol(c)) if t is not None)


def a_70(c):
    alb = _alb_times(c)
    if not alb:
        return _R(70, Classification.TIMELINE_RULE, HUMAN, "Albuterol time not documented — cannot confirm pre-therapy vitals.", [])
    pre = [v for v in _vitals_with(c, need_rr=True, need_spo2=True) if _min(v.time) is not None and _min(v.time) <= alb[0]]
    return (_R(70, Classification.TIMELINE_RULE, PASS, "Pre-therapy RR + SpO2 documented.", [_ev("pre_sets", len(pre))])
            if pre else
            _R(70, Classification.TIMELINE_RULE, FAIL, "No pre-therapy RR + SpO2 before albuterol.", [_ev("pre_sets", 0)]))


def a_71(c):
    return (_R(71, Classification.DETERMINISTIC_RULE, PASS, "Albuterol documented via Add Action.", [_ev("albuterol_actions", len(_albuterol(c)))])
            if _albuterol(c) else
            _R(71, Classification.DETERMINISTIC_RULE, FAIL, "Albuterol not documented via Add Action.", [_ev("albuterol_actions", 0)]))


def a_72(c):
    alb = _alb_times(c)
    if len(_albuterol(c)) < 2:
        return _R(72, Classification.TIMELINE_RULE, NA, "Single albuterol administration.", [_ev("albuterol_count", len(_albuterol(c)))])
    if len(alb) < 2:
        return _R(72, Classification.TIMELINE_RULE, HUMAN, "Repeat albuterol but times not fully documented.", [])
    gaps = [alb[i + 1] - alb[i] for i in range(len(alb) - 1)]
    if any(g < 5 for g in gaps):
        return _R(72, Classification.TIMELINE_RULE, FAIL, "Repeat albuterol administered <5 minutes apart.", [_ev("gaps_min", gaps)])
    return _R(72, Classification.TIMELINE_RULE, PASS, "Repeat albuterol doses >=5 minutes apart.", [_ev("gaps_min", gaps)])


def a_73(c):
    alb = _alb_times(c)
    if not alb:
        return _R(73, Classification.TIMELINE_RULE, HUMAN, "Albuterol time not documented — cannot confirm post-therapy vitals.", [])
    post = [v for v in _vitals_with(c, need_rr=True, need_spo2=True) if _min(v.time) is not None and _min(v.time) > alb[-1]]
    return (_R(73, Classification.TIMELINE_RULE, PASS, "Post-therapy RR + SpO2 documented.", [_ev("post_sets", len(post))])
            if post else
            _R(73, Classification.TIMELINE_RULE, FAIL, "No post-therapy RR + SpO2 after albuterol.", [_ev("post_sets", 0)]))


def a_74(c):
    alb = _albuterol(c)
    resp = any(a.response_documented for a in alb)
    if resp:
        return _R(74, Classification.DETERMINISTIC_RULE, PASS, "Respiratory status/response documented post albuterol.", [_ev("response_documented", True)])
    return _R(74, Classification.DETERMINISTIC_RULE, FAIL, "Patient respiratory status post albuterol not documented.", [_ev("response_documented", False)])


EVALUATORS = {
    "Refusal": {75: r_75, 76: r_76, 77: r_77, 78: r_78, 79: r_79, 80: r_80},
    "Medication": {63: m_63, 64: m_64, 65: m_65, 66: m_66, 67: m_67, 68: m_68},
    "Albuterol": {69: a_69, 70: a_70, 71: a_71, 72: a_72, 73: a_73, 74: a_74},
}


def evaluate_category(category: str, chart: QaChartData) -> list:
    """Evaluate all implemented indicators in `category`. Returns [IndicatorResult]."""
    evs = EVALUATORS.get(category)
    if not evs:
        return []
    return [evs[n](chart) for n in sorted(evs)]


def is_implemented(category: str) -> bool:
    return category in EVALUATORS
