"""Applicability engine.

General CQI #1-12 apply to EVERY chart. Specialty categories (#13-84) activate
INDEPENDENTLY from deterministic chart context — one chart may trigger several.
The REASON each category activated is recorded. This engine only decides WHICH
indicators apply; it does NOT judge specialty indicators (human review does that
in v1). All triggers are deterministic keyword/structured-field checks — no LLM.
"""
from __future__ import annotations
from dataclasses import dataclass, field
from typing import Callable, Optional

from . import seed
from .chart_data import QaChartData


def _kw(text: str, *words: str) -> Optional[str]:
    """Return the first matching keyword (for the reason), else None."""
    t = (text or "").lower()
    for w in words:
        if w in t:
            return w
    return None


# ── Specialty category triggers: category -> fn(chart) -> reason|None ──
# Each returns a short, auditable reason naming the field + match that activated it.
def _t_als_cancel(c: QaChartData) -> Optional[str]:
    if c.als_cancelled is True:
        return "als_cancelled = true"
    hw = _kw(c.haystack(), "als cancel", "cancel als", "cancelled als")
    return f"text contains '{hw}'" if hw else None


def _t_cardiac_stemi(c: QaChartData) -> Optional[str]:
    hw = _kw(c.haystack(), "chest pain", "stemi", "acs", "acute coronary", "angina",
             "myocardial", " mi ", "cardiac")
    if hw and "arrest" not in (c.primary_impression or "").lower():
        return f"text contains '{hw.strip()}'"
    return None


def _t_cardiac_arrest(c: QaChartData) -> Optional[str]:
    hw = _kw(c.haystack(), "cardiac arrest", "pulseless", "rosc", "cpr", "lucas", "defibrillat")
    if hw:
        return f"text contains '{hw}'"
    if c.outcome.get("rosc") is not None or c.outcome.get("arrest"):
        return "outcome indicates arrest/ROSC"
    if any(_kw(a.name, "cpr", "lucas", "defib") for a in c.procedures()):
        return "arrest procedure documented (CPR/LUCAS/defib)"
    return None


def _t_trauma(c: QaChartData) -> Optional[str]:
    hw = _kw(c.haystack(), "trauma", "injury", "fall", "mvc", "mva", "fracture",
             "laceration", "assault", "gsw", "stab", "collision", "struck")
    return f"text contains '{hw}'" if hw else None


def _t_stroke(c: QaChartData) -> Optional[str]:
    hw = _kw(c.haystack(), "stroke", "cva", "facial droop", "fast", "slurred",
             "hemipar", "be-fast", "aphasia")
    return f"text contains '{hw}'" if hw else None


def _t_burns(c: QaChartData) -> Optional[str]:
    hw = _kw(c.haystack(), "burn")
    return f"text contains '{hw}'" if hw else None


def _t_obgyn(c: QaChartData) -> Optional[str]:
    hw = _kw(c.haystack(), "ob/gyn", "obstetric", "labor", "pregnan", "delivery",
             "contraction", "gravida", "para ", "eclampsia")
    return f"text contains '{hw}'" if hw else None


def _t_cpap(c: QaChartData) -> Optional[str]:
    if any(_kw(a.name, "cpap") for a in c.procedures()):
        return "procedure 'CPAP' documented"
    hw = _kw(c.haystack(), "cpap")
    return f"text contains '{hw}'" if hw else None


def _t_medication(c: QaChartData) -> Optional[str]:
    meds = c.medications()
    if meds:
        return f"medication administered ({meds[0].name})"
    return None


def _t_albuterol(c: QaChartData) -> Optional[str]:
    # Structured Add Action is the clean signal.
    for m in c.medications():
        if _kw(m.name, "albuterol", "salbutamol"):
            return f"medication '{m.name}'"
    # Applicability can ALSO be established by narrative/text evidence that albuterol was
    # administered/indicated even when the structured Add Action is missing (#71 then Not Met,
    # not simply N/A). Check the narrative/history/impression + narrative-only interventions.
    text = " ".join([c.hpi_narrative or "", c.history or "", c.primary_impression or "",
                     c.chief_complaint or "", " ".join(c.narrative_only_interventions or [])])
    hw = _kw(text, "albuterol", "salbutamol")
    return f"documentation references '{hw}' without an Add Action" if hw else None


def _t_refusal(c: QaChartData) -> Optional[str]:
    hw = _kw((c.disposition or "") + " " + c.haystack(), "refus", "ama ", "against medical advice", "signed off")
    return f"text contains '{hw.strip()}'" if hw else None


def _t_overdose(c: QaChartData) -> Optional[str]:
    hw = _kw(c.haystack(), "overdose", " od ", "narcan", "naloxone", "opioid", "substance abuse")
    if hw:
        return f"text contains '{hw.strip()}'"
    for m in c.medications():
        if _kw(m.name, "naloxone", "narcan"):
            return f"medication '{m.name}'"
    return None


def _t_glucometer(c: QaChartData) -> Optional[str]:
    for p in c.procedures():
        if _kw(p.name, "glucose", "glucometer", "bgl", "blood sugar"):
            return f"procedure '{p.name}'"
    hw = _kw(c.haystack(), "blood glucose", "glucometer", "hypoglycem", "hyperglycem")
    return f"text contains '{hw}'" if hw else None


_TRIGGERS: dict = {
    "ALS Cancel": _t_als_cancel,
    "Cardiac/STEMI": _t_cardiac_stemi,
    "Cardiac Arrest": _t_cardiac_arrest,
    "Trauma": _t_trauma,
    "Stroke/CVA": _t_stroke,
    "Burns": _t_burns,
    "OB/GYN": _t_obgyn,
    "CPAP": _t_cpap,
    "Medication": _t_medication,
    "Albuterol": _t_albuterol,
    "Refusal": _t_refusal,
    "Overdose": _t_overdose,
    "Glucometer": _t_glucometer,
}


@dataclass
class ApplicableIndicator:
    number: int
    category: str
    applicable: bool
    reason: str


@dataclass
class ApplicabilityResult:
    activations: dict = field(default_factory=dict)        # category -> reason (activated only)
    indicators: list = field(default_factory=list)         # list[ApplicableIndicator] (applicable only)

    def applicable_numbers(self) -> list:
        return [i.number for i in self.indicators]


def evaluate_applicability(chart: QaChartData) -> ApplicabilityResult:
    """General #1-12 always apply; specialty categories activate independently."""
    cat_nums = seed.category_indicator_numbers()
    result = ApplicabilityResult()

    # General — always applicable
    for num in sorted(cat_nums.get("General", [])):
        result.indicators.append(ApplicableIndicator(num, "General", True,
                                                      "General indicator — applies to every chart"))
    result.activations["General"] = "always"

    # Specialty — independent activation, recorded reason
    for category, trigger in _TRIGGERS.items():
        nums = cat_nums.get(category, [])
        if not nums:
            continue
        reason = trigger(chart)
        if reason:
            result.activations[category] = reason
            for num in sorted(nums):
                result.indicators.append(
                    ApplicableIndicator(num, category, True, f"{category} activated: {reason}"))

    result.indicators.sort(key=lambda i: i.number)
    return result
