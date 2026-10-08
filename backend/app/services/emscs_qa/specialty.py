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

IMPLEMENTED_CATEGORIES = ("Refusal", "Medication", "Albuterol", "Cardiac/STEMI", "Trauma")


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
    """Decision-making capacity. A&Ox4/orientation is SUPPORTING evidence only and can NEVER
    by itself produce an AUTO MET. AUTO MET requires EXPLICIT capacity-specific documentation
    (understands evaluation/risks, appreciates how risks apply, reasons about choices,
    communicates a consistent choice). Any capacity concern (AMS, intoxication, possible
    ingestion) routes to human review. Incapacity is never auto-inferred — the engine surfaces
    the concern + evidence and the reviewer makes the clinical determination."""
    rf = c.refusal
    # Capacity concerns → clinical determination, never auto-decided.
    concerns = []
    if c.altered_mental_status:
        concerns.append("altered mental status")
    if getattr(c, "intoxication_suspected", None):
        concerns.append("suspected intoxication")
    if c.possible_ingestion:
        concerns.append("possible ingestion")
    aox = rf.aox if rf else None
    if concerns:
        return _R(77, Classification.CLINICAL_CONTEXT, HUMAN,
                  "Capacity concern present (" + ", ".join(concerns) + ") — decision-making capacity "
                  "is a clinical determination; HUMAN REVIEW REQUIRED.",
                  [_ev("capacity_concerns", concerns), _ev("aox", aox)])
    if rf is None:
        return _R(77, Classification.CLINICAL_CONTEXT, HUMAN,
                  "No refusal/capacity documentation — HUMAN REVIEW REQUIRED.", [])
    if rf.capacity_documented:
        # Explicit capacity assessment documented; orientation (A&Ox) is supporting evidence.
        note = f" (A&Ox{aox} supporting)" if aox is not None else ""
        return _R(77, Classification.DETERMINISTIC_RULE, PASS,
                  f"Explicit decision-making-capacity assessment documented{note}.",
                  [_ev("capacity_documented", True), _ev("aox", aox)])
    # Orientation alone (or nothing) — A&Ox cannot by itself establish capacity → reviewer decides.
    return _R(77, Classification.CLINICAL_CONTEXT, HUMAN,
              "Orientation may be documented but no EXPLICIT decision-making-capacity assessment is "
              "present (understands risks / appreciates situation / reasons / communicates choice); "
              "A&Ox alone is insufficient — HUMAN REVIEW REQUIRED. Incapacity is not inferred automatically.",
              [_ev("aox", aox), _ev("capacity_documented", rf.capacity_documented)])


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


def _albuterol_text_evidence(c) -> bool:
    """Narrative/text evidence that albuterol was administered/indicated, independent of a
    structured Add Action (used to distinguish 'not applicable' from 'applicable but undocumented')."""
    text = " ".join([c.hpi_narrative or "", c.history or "", c.primary_impression or "",
                     c.chief_complaint or "", " ".join(c.narrative_only_interventions or [])]).lower()
    return "albuterol" in text or "salbutamol" in text


def a_71(c):
    """Applicability is established BEFORE Met/Not-Met: a structured Add Action → Met; evidence
    albuterol was given/indicated but the Add Action is missing → Not Met (with evidence);
    no evidence albuterol applies → N/A (not a documentation failure)."""
    if _albuterol(c):
        return _R(71, Classification.DETERMINISTIC_RULE, PASS, "Albuterol documented via Add Action.",
                  [_ev("albuterol_actions", len(_albuterol(c)))])
    if _albuterol_text_evidence(c):
        return _R(71, Classification.DETERMINISTIC_RULE, FAIL,
                  "Albuterol referenced in documentation but not recorded via a structured Add Action.",
                  [_ev("albuterol_text_evidence", True), _ev("albuterol_actions", 0)])
    return _R(71, Classification.DETERMINISTIC_RULE, NA, "No evidence albuterol applies to this chart.",
              [_ev("albuterol_actions", 0)])


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


# ───────────────────────── Cardiac/STEMI #16-27 ─────────────────────────
# Pain/HPI documentation elements (#16-23): present/absent from hpi_elements.
_CARDIAC_DOC = {
    16: ("onset", "symptom onset time"),
    17: ("prior_interventions", "prior interventions before EMS"),
    18: ("pain_type", "pain type"),
    19: ("pain_duration", "pain duration"),
    20: ("pain_quality", "pain quality"),
    21: ("pain_radiation", "pain radiation"),
    22: ("pain_palpation", "whether palpation changes the pain"),
    23: ("gastric_distress", "gastric distress"),
}


def _cardiac_doc(num, c):
    key, label = _CARDIAC_DOC[num]
    present = bool((c.hpi_elements or {}).get(key))
    if present:
        return _R(num, Classification.DETERMINISTIC_RULE, PASS, f"Documentation of {label} present.", [_ev(key, True)])
    return _R(num, Classification.DETERMINISTIC_RULE, FAIL, f"Documentation of {label} not present.", [_ev(key, present)])


def _has_action(c, *names):
    return [a for a in c.add_actions if any(n in (a.name or "").lower() for n in names)]


def _oxygen_indicator(c, num):
    """Shared oxygen-by-perfusion evaluator (#24 Cardiac, #37 Trauma). Threshold SpO2 < 92%
    per the versioned protocol. N/A when SpO2 >= 92%; HUMAN when SpO2 undocumented (indication
    unknown) or a withholding reason is documented (clinical confirmation)."""
    pv = (seed.protocol(num) or {}).get("version", "v1")
    spo2_vals = [v.spo2 for v in c.vitals if v.spo2 is not None]
    low = [v for v in c.vitals if v.spo2 is not None and v.spo2 < 92]
    o2 = _has_action(c, "oxygen", "nasal cannula", "non-rebreather", "nrb", "bvm", "cpap")
    reason = (c.structured_fields or {}).get("oxygen_withheld_reason")
    if not spo2_vals:
        return _R(num, Classification.PROTOCOL_RULE, HUMAN,
                  "No SpO2 documented — oxygen indication cannot be determined; HUMAN REVIEW REQUIRED.",
                  [_ev("protocol_version", pv)])
    if not low:
        return _R(num, Classification.PROTOCOL_RULE, NA, "Oxygen not indicated (SpO2 >= 92% throughout).",
                  [_ev("spo2_min", min(spo2_vals)), _ev("protocol_version", pv)])
    if o2:
        return _R(num, Classification.PROTOCOL_RULE, PASS, "Oxygen administered for documented SpO2 < 92%.",
                  [_ev("spo2_min", min(v.spo2 for v in low)), _ev("oxygen", True), _ev("protocol_version", pv)])
    if reason:
        return _R(num, Classification.PROTOCOL_RULE, HUMAN,
                  "SpO2 < 92% and oxygen not given, but a withholding reason is documented — "
                  "clinical confirmation required.",
                  [_ev("spo2_min", min(v.spo2 for v in low)), _ev("oxygen_withheld_reason", reason), _ev("protocol_version", pv)])
    return _R(num, Classification.PROTOCOL_RULE, FAIL,
              "SpO2 < 92% documented but no oxygen therapy and no documented reason for withholding.",
              [_ev("spo2_min", min(v.spo2 for v in low)), _ev("oxygen", False), _ev("protocol_version", pv)])


def c_24(c):
    return _oxygen_indicator(c, 24)


def c_25(c):
    """Treated per protocol — clinical appropriateness is a human determination."""
    return _R(25, Classification.CLINICAL_CONTEXT, HUMAN,
              "Chest-pain treatment appropriateness vs protocol needs clinical confirmation.",
              [_ev("interventions", [a.name for a in c.add_actions]), _ev("protocols_applied", c.protocols_applied)])


def _analgesics(c):
    return _has_action(c, "nitro", "ntg", "fentanyl", "morphine", "aspirin", "asa", "analges", "pain")


def c_26(c):
    """Pain management continued/reassessed at regular intervals (timeline). N/A if none given."""
    meds = _analgesics(c)
    if not meds:
        return _R(26, Classification.TIMELINE_RULE, NA, "No pain-management intervention given.", [])
    times = sorted(t for t in (_min(a.time) for a in meds) if t is not None)
    repeat = len(meds) >= 2
    reassessed = any(_min(v.time) is not None and times and _min(v.time) > times[0] and v.pain is not None
                     for v in c.vitals)
    if repeat or reassessed:
        return _R(26, Classification.TIMELINE_RULE, PASS, "Pain management reassessed/continued at intervals.",
                  [_ev("interventions", len(meds)), _ev("reassessed", reassessed)])
    if not times:
        return _R(26, Classification.TIMELINE_RULE, HUMAN,
                  "Pain-management given but times not documented — cannot confirm interval reassessment.", [])
    return _R(26, Classification.TIMELINE_RULE, FAIL,
              "Pain management given without documented reassessment/continuation at intervals.",
              [_ev("interventions", len(meds)), _ev("reassessed", False)])


def c_27(c):
    """Aspirin AND nitroglycerin, evaluated INDEPENDENTLY (separate indications,
    contraindications and documentation). Each must be given OR have a documented reason for
    withholding — administration of one is NEVER proof the other requirement was met. NTG has
    contraindications (e.g. hypotension / PDE5 inhibitor / RV MI): when NTG is missing and a
    possible contraindication is evident (documented SBP < 100), the indicator routes to HUMAN
    rather than auto-failing. Ambiguity → HUMAN_REVIEW_REQUIRED."""
    pv = (seed.protocol(27) or {}).get("version", "v1")
    asa = _has_action(c, "aspirin", "asa")
    ntg = _has_action(c, "nitro", "ntg", "nitroglycerin")
    legacy = getattr(c, "asa_ntg_not_given_reason", None)
    asa_reason = getattr(c, "asa_not_given_reason", None) or legacy
    ntg_reason = getattr(c, "ntg_not_given_reason", None) or legacy
    hypotensive = any(v.sbp is not None and v.sbp < 100 for v in c.vitals)   # possible NTG contraindication

    def status(given, reason):
        return "given" if given else ("reason" if reason else "missing")
    asa_s, ntg_s = status(asa, asa_reason), status(ntg, ntg_reason)

    ev = [_ev("aspirin", asa_s), _ev("nitroglycerin", ntg_s), _ev("protocol_version", pv)]
    if asa:
        ev.append(_ev("asa_given", [a.name for a in asa]))
    if ntg:
        ev.append(_ev("ntg_given", [a.name for a in ntg]))

    # NTG missing with a possible contraindication → clinical judgment, not an auto-fail.
    if ntg_s == "missing" and hypotensive:
        ev.append(_ev("possible_ntg_contraindication", "documented SBP < 100"))
        if asa_s == "missing":
            ev.append(_ev("aspirin_gap", "neither given nor documented"))
        return _R(27, Classification.CLINICAL_CONTEXT, HUMAN,
                  "Nitroglycerin not given with a possible contraindication (SBP < 100) — clinical "
                  "determination required; evaluate aspirin and nitroglycerin independently.", ev)

    missing = [m for m, s in (("aspirin", asa_s), ("nitroglycerin", ntg_s)) if s == "missing"]
    if not missing:
        return _R(27, Classification.PROTOCOL_RULE, PASS,
                  "Aspirin and nitroglycerin each administered or documented as withheld with a reason.", ev)
    return _R(27, Classification.PROTOCOL_RULE, FAIL,
              f"Not addressed independently: {', '.join(missing)} neither administered nor documented as withheld.", ev)


# ───────────────────────── Trauma #33-38 ─────────────────────────
_TRAUMA_DOC = {
    33: ("injuries", "illness/injury (MOI or additional injuries)"),
    34: ("injury_datetime", "date and time of injury"),
    35: ("mechanism", "mechanism of injury"),
    36: ("pain_assessment", "initial assessment of pain and associated symptoms"),
}


def _trauma_doc(num, c):
    key, label = _TRAUMA_DOC[num]
    present = bool((c.hpi_elements or {}).get(key))
    if num == 35 and getattr(c, "significant_mechanism", None) is not None:
        present = present or True                 # mechanism assessed (documented either way)
    if num == 36 and any(v.pain is not None for v in c.vitals):
        present = True                            # pain documented in vitals
    if present:
        return _R(num, Classification.DETERMINISTIC_RULE, PASS, f"Documentation of {label} present.", [_ev(key, True)])
    return _R(num, Classification.DETERMINISTIC_RULE, FAIL, f"Documentation of {label} not present.", [_ev(key, present)])


def t_37(c):
    return _oxygen_indicator(c, 37)


def t_38(c):
    """Spinal motion restriction. Applicability FIRST: indicated by significant mechanism /
    spinal concern (structured or narrative). Not indicated → N/A; indicated + applied → Met;
    indicated + documented SMR clearance → HUMAN (clinical); indicated + not documented → Not Met."""
    pv = (seed.protocol(38) or {}).get("version", "v1")
    sf = c.structured_fields or {}
    hay = " ".join([c.hpi_narrative or "", c.primary_impression or "", c.chief_complaint or "", c.haystack()]).lower()
    indicated = (bool(getattr(c, "significant_mechanism", None)) or bool(sf.get("spinal_concern"))
                 or any(k in hay for k in ("c-spine", "cervical", "spinal", "neck injury", "back injury", "spine")))
    applied = (bool(_has_action(c, "c-collar", "collar", "spinal", "backboard", "immobil", "smr"))
               or bool(sf.get("spinal_immobilization")))
    if not indicated:
        return _R(38, Classification.PROTOCOL_RULE, NA, "Spinal motion restriction not indicated.", [_ev("indicated", False), _ev("protocol_version", pv)])
    if applied:
        return _R(38, Classification.PROTOCOL_RULE, PASS, "Spinal motion restriction applied/maintained.", [_ev("indicated", True), _ev("applied", True), _ev("protocol_version", pv)])
    if sf.get("spinal_cleared"):
        return _R(38, Classification.CLINICAL_CONTEXT, HUMAN,
                  "Spinal precautions indicated but documented as cleared (SMR clearance) — clinical confirmation required.",
                  [_ev("indicated", True), _ev("spinal_cleared", True), _ev("protocol_version", pv)])
    return _R(38, Classification.PROTOCOL_RULE, FAIL, "Spinal motion restriction indicated but not documented.",
              [_ev("indicated", True), _ev("applied", False), _ev("protocol_version", pv)])


EVALUATORS = {
    "Refusal": {75: r_75, 76: r_76, 77: r_77, 78: r_78, 79: r_79, 80: r_80},
    "Medication": {63: m_63, 64: m_64, 65: m_65, 66: m_66, 67: m_67, 68: m_68},
    "Albuterol": {69: a_69, 70: a_70, 71: a_71, 72: a_72, 73: a_73, 74: a_74},
    "Trauma": {
        33: lambda c: _trauma_doc(33, c), 34: lambda c: _trauma_doc(34, c),
        35: lambda c: _trauma_doc(35, c), 36: lambda c: _trauma_doc(36, c),
        37: t_37, 38: t_38,
    },
    "Cardiac/STEMI": {
        16: lambda c: _cardiac_doc(16, c), 17: lambda c: _cardiac_doc(17, c),
        18: lambda c: _cardiac_doc(18, c), 19: lambda c: _cardiac_doc(19, c),
        20: lambda c: _cardiac_doc(20, c), 21: lambda c: _cardiac_doc(21, c),
        22: lambda c: _cardiac_doc(22, c), 23: lambda c: _cardiac_doc(23, c),
        24: c_24, 25: c_25, 26: c_26, 27: c_27,
    },
}


def evaluate_category(category: str, chart: QaChartData) -> list:
    """Evaluate all implemented indicators in `category`. Returns [IndicatorResult]."""
    evs = EVALUATORS.get(category)
    if not evs:
        return []
    return [evs[n](chart) for n in sorted(evs)]


def is_implemented(category: str) -> bool:
    return category in EVALUATORS
