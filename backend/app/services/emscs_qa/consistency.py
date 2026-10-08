"""CQI #11 — cross-field consistency engine.

Compares narrative, assessments, vitals, impression, procedures, medications,
disposition and outcome. Returns the TWO conflicting pieces of evidence for each
contradiction (never just "conflict found"). Deterministic — no LLM.

Two mechanisms:
  (a) Generic paired-field disagreement — any structured_fields[key] that is a dict
      of {source: value} with two sources whose normalized values differ. This is
      how a chart encodes e.g. {"airway": {"charted":"i-gel","narrative":"ALS intubation"}}.
  (b) Named semantic rules over typed fields (ROSC vs ongoing compressions, acuity vs
      post-arrest, pediatric weight-for-age), each returning both sides.

Returns list[(conflict_label, evidence_a, evidence_b)].
"""
from __future__ import annotations
from typing import Optional

from .chart_data import QaChartData


def _norm(v) -> str:
    return str(v).strip().lower()


def _disagreeing_pair(d: dict):
    """Given {source: value}, return the first two sources whose values differ."""
    items = [(k, v) for k, v in d.items() if v not in (None, "")]
    for i in range(len(items)):
        for j in range(i + 1, len(items)):
            if _norm(items[i][1]) != _norm(items[j][1]):
                return items[i], items[j]
    return None


def _ev(source, value, note=""):
    return {"source": source, "value": value, "note": note}


def _semantic_rules(c: QaChartData):
    out = []
    sf = c.structured_fields or {}

    # ROSC documented but compressions ongoing at destination
    rosc = c.outcome.get("rosc")
    comp_at_dest = sf.get("compressions_at_destination")
    if rosc is True and comp_at_dest in (True, "yes", "y"):
        out.append(("ROSC vs ongoing compressions at destination",
                    _ev("outcome.rosc", True, "ROSC documented prior to ED"),
                    _ev("compressions_at_destination", comp_at_dest, "compressions on ED arrival")))

    # Final acuity low while impression indicates a post-arrest / critical patient
    acuity = _norm(c.final_acuity) if c.final_acuity else ""
    impression = _norm(c.primary_impression) if c.primary_impression else ""
    low_acuity = any(w in acuity for w in ("green", "lower", "non-emergent", "yellow"))
    critical_impr = any(w in impression for w in ("arrest", "post arrest", "post-arrest", "rosc", "stemi"))
    if low_acuity and critical_impr:
        out.append(("Final acuity vs clinical picture",
                    _ev("final_acuity", c.final_acuity),
                    _ev("primary_impression", c.primary_impression, "critical impression charted at a lower acuity")))

    # Pulseless vs perfusion sign (cap refill < 2s while pulseless)
    pulse = _norm(sf.get("pulse", ""))
    cap = sf.get("cap_refill_sec")
    if pulse in ("absent", "pulseless", "none") and isinstance(cap, (int, float)) and cap < 2:
        out.append(("Pulseless vs perfusion sign",
                    _ev("pulse", sf.get("pulse")),
                    _ev("cap_refill_sec", cap, "cap refill < 2s documented while pulseless")))

    # Pediatric weight-for-age plausibility (rough APLS: kg ~= 2*(age+4))
    if c.age_years is not None and 1 <= c.age_years <= 14:
        wt = sf.get("weight_kg")
        if isinstance(wt, (int, float)) and wt > 0:
            expected = 2 * (c.age_years + 4)
            if wt < 0.5 * expected or wt > 1.8 * expected:
                out.append(("Weight implausible for age",
                            _ev("weight_kg", wt),
                            _ev("age_years", c.age_years, f"expected ~{round(expected)} kg for age")))

    return out


def find_conflicts(c: QaChartData):
    """Return list of (label, evidence_a, evidence_b)."""
    conflicts = []
    for key, val in (c.structured_fields or {}).items():
        if isinstance(val, dict):
            pair = _disagreeing_pair(val)
            if pair:
                (na, va), (nb, vb) = pair
                conflicts.append((f"{key}: {na} vs {nb}", _ev(na, va), _ev(nb, vb)))
    conflicts.extend(_semantic_rules(c))
    return conflicts
