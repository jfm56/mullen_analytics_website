"""Severity engine v1 — SEPARATE from finding detection.

A finding (an indicator failure or a consistency conflict) is detected elsewhere;
this engine PROPOSES its severity from clinical context via modifiers. It never
hardcodes "indicator X failed = Major" — the same failure can be Minor on one
chart and Critical on another depending on the modifiers below. Every proposal
carries evidence. Clinically consequential or ambiguous proposals return
HUMAN_REVIEW_REQUIRED (or require_human=True); the human decision is authoritative
and is stored separately from this automated proposal.

Modifier categories (per spec): patient vulnerability, abnormal findings, treatment
omission, delay, refusal/nontransport, ALS decisions, protocol requirements,
documentation credibility, legal/safety.
"""
from __future__ import annotations
from dataclasses import dataclass, field
from enum import Enum
from typing import Optional

from .chart_data import QaChartData

CRITICAL = "Critical"
MAJOR = "Major"
MINOR = "Minor"
COMMENDATION = "Commendation"
HUMAN_REVIEW_REQUIRED = "HUMAN_REVIEW_REQUIRED"


class Modifier(str, Enum):
    PATIENT_VULNERABILITY = "patient_vulnerability"
    ABNORMAL_FINDINGS = "abnormal_findings"
    TREATMENT_OMISSION = "treatment_omission"
    DELAY = "delay"
    REFUSAL_NONTRANSPORT = "refusal_nontransport"
    ALS_DECISION = "als_decision"
    PROTOCOL_REQUIREMENT = "protocol_requirement"
    DOCUMENTATION_CREDIBILITY = "documentation_credibility"
    LEGAL_SAFETY = "legal_safety"


@dataclass
class SeverityProposal:
    proposed: str                      # Critical|Major|Minor|Commendation|HUMAN_REVIEW_REQUIRED
    require_human: bool
    confidence: str                    # "high" | "low"
    modifiers: list = field(default_factory=list)   # [{"modifier","evidence"}]
    rationale: str = ""
    high_priority: bool = False        # True routes to a high-priority human review path (e.g. abuse)


def _abnormal_vitals(c: QaChartData):
    notes = []
    for v in c.vitals:
        if v.sbp is not None and v.sbp < 90:
            notes.append(f"SBP {v.sbp}")
        if v.spo2 is not None and v.spo2 < 92:
            notes.append(f"SpO2 {v.spo2}")
        if v.gcs is not None and v.gcs < 15:
            notes.append(f"GCS {v.gcs}")
    return notes


def _evaluate_modifiers(c: QaChartData, finding: dict):
    """Return list of {modifier, evidence} that apply for this finding+chart."""
    mods = []
    sf = c.structured_fields or {}

    # patient vulnerability
    vuln = None
    if c.age_days is not None and c.age_days <= 30:
        vuln = "neonatal"
    elif c.age_years is not None and c.age_years < 18:
        vuln = "pediatric"
    elif c.age_years is not None and c.age_years >= 65:
        vuln = "geriatric"
    elif sf.get("pregnant") or (c.primary_impression and "pregnan" in c.primary_impression.lower()):
        vuln = "pregnant"
    if vuln:
        mods.append({"modifier": Modifier.PATIENT_VULNERABILITY.value, "evidence": vuln})

    # abnormal findings
    ab = _abnormal_vitals(c)
    if ab:
        mods.append({"modifier": Modifier.ABNORMAL_FINDINGS.value, "evidence": ab})

    # treatment omission
    if finding.get("treatment_omission") or sf.get("treatment_omitted"):
        mods.append({"modifier": Modifier.TREATMENT_OMISSION.value,
                     "evidence": finding.get("treatment_omission") or sf.get("treatment_omitted")})

    # delay
    if sf.get("delay") or sf.get("scene_time_min") and isinstance(sf.get("scene_time_min"), (int, float)) and sf["scene_time_min"] > 20:
        mods.append({"modifier": Modifier.DELAY.value,
                     "evidence": sf.get("delay") or f"scene time {sf.get('scene_time_min')} min"})

    # refusal / nontransport
    if c.disposition and any(w in c.disposition.lower() for w in ("refus", "ama", "no transport")):
        mods.append({"modifier": Modifier.REFUSAL_NONTRANSPORT.value, "evidence": c.disposition})

    # ALS decision
    if c.als_cancelled or (c.als_requested is False and finding.get("als_indicated")):
        mods.append({"modifier": Modifier.ALS_DECISION.value,
                     "evidence": "ALS cancelled" if c.als_cancelled else "ALS indicated but not requested"})

    # protocol requirement
    if finding.get("classification") == "PROTOCOL_RULE" or finding.get("protocol_requirement"):
        mods.append({"modifier": Modifier.PROTOCOL_REQUIREMENT.value,
                     "evidence": finding.get("protocol_requirement") or "protocol-governed element"})

    # documentation credibility (cross-field conflicts)
    if finding.get("indicator_number") == 11 or finding.get("kind") == "consistency_conflict" or sf.get("conflicts"):
        mods.append({"modifier": Modifier.DOCUMENTATION_CREDIBILITY.value,
                     "evidence": finding.get("evidence") or "cross-field conflict(s) present"})

    # legal / safety
    legal_kw = ("consent", "restrain", "abuse", "guardian", "safety", "securement", "refusal")
    hay = " ".join(str(finding.get(k, "")) for k in ("rationale", "domain")).lower()
    if any(k in hay for k in legal_kw) or sf.get("legal_safety"):
        mods.append({"modifier": Modifier.LEGAL_SAFETY.value,
                     "evidence": sf.get("legal_safety") or "legal/safety-relevant element"})

    return mods


def propose_severity(chart: QaChartData, finding: dict) -> SeverityProposal:
    """Propose a severity for a finding. `finding` carries at least {kind}, and
    optionally {indicator_number, classification, domain, rationale, evidence,
    treatment_omission, als_indicated, protocol_requirement}.

    Commendations are positive findings. Pure documentation gaps with no clinical
    modifier are confidently Minor. Anything clinically consequential is proposed
    but flagged require_human; genuinely ambiguous cases return HUMAN_REVIEW_REQUIRED.
    """
    if finding.get("kind") == "commendation":
        return SeverityProposal(COMMENDATION, require_human=False, confidence="high",
                                rationale="Positive finding (commendation).")

    mods = _evaluate_modifiers(chart, finding)
    names = {m["modifier"] for m in mods}
    sf = chart.structured_fields or {}

    # Possible abuse / mandatory reporting -> high-priority human review (never auto-scored).
    if getattr(chart, "possible_abuse", None) or sf.get("possible_abuse") or finding.get("possible_abuse"):
        mods.append({"modifier": Modifier.LEGAL_SAFETY.value, "evidence": "possible abuse — mandatory reporting"})
        return SeverityProposal(HUMAN_REVIEW_REQUIRED, require_human=True, confidence="low", modifiers=mods,
                                high_priority=True,
                                rationale="Possible abuse / mandatory-reporting concern — high-priority human review.")

    # Refusal findings: context-driven (clinical-safety gap vs documentation gap).
    sig_mech = bool(getattr(chart, "significant_mechanism", None)) or bool(finding.get("significant_mechanism"))
    vuln = Modifier.PATIENT_VULNERABILITY.value in names
    abnormal = Modifier.ABNORMAL_FINDINGS.value in names
    if finding.get("category") == "Refusal":
        if finding.get("clinical_safety_gap"):
            if vuln and (sig_mech or abnormal):
                return SeverityProposal(CRITICAL, require_human=True, confidence="low", modifiers=mods,
                                        rationale="High-risk refusal: vulnerable patient with significant "
                                                  "mechanism / abnormal findings and a missing clinical-safety element.")
            return SeverityProposal(MAJOR, require_human=True, confidence="low", modifiers=mods,
                                    rationale="Clinical-safety element missing on a refusal (vitals/capacity/sobriety).")
        return SeverityProposal(MINOR, require_human=False, confidence="high", modifiers=mods,
                                rationale="Refusal documentation gap (signature/check-box/follow-up).")

    # No clinical modifiers at all -> documentation-only gap -> confident Minor.
    clinical = names - set()  # all listed modifiers are clinically relevant
    if not clinical:
        return SeverityProposal(MINOR, require_human=False, confidence="high",
                                modifiers=mods, rationale="Documentation-only gap; no clinical modifiers.")

    # Potential patient-harm combination -> propose Critical, require human confirmation.
    harm = (Modifier.TREATMENT_OMISSION.value in names or Modifier.ALS_DECISION.value in names) and \
           (Modifier.ABNORMAL_FINDINGS.value in names or Modifier.PATIENT_VULNERABILITY.value in names)
    legal = Modifier.LEGAL_SAFETY.value in names

    if harm:
        return SeverityProposal(CRITICAL, require_human=True, confidence="low", modifiers=mods,
                                rationale="Treatment/ALS decision combined with an abnormal finding or a "
                                          "vulnerable patient — potential patient harm; needs human confirmation.")
    # Escalating combination -> propose Major, require human confirmation.
    if len(names) >= 2 or legal or Modifier.PROTOCOL_REQUIREMENT.value in names:
        return SeverityProposal(MAJOR, require_human=True, confidence="low", modifiers=mods,
                                rationale="Clinical/legal/protocol modifiers present; severity needs human confirmation.")
    # A single, non-harm clinical modifier -> ambiguous -> human review.
    return SeverityProposal(HUMAN_REVIEW_REQUIRED, require_human=True, confidence="low", modifiers=mods,
                            rationale="A single clinical modifier applies; severity is clinically ambiguous.")
