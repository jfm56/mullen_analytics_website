"""
Section registry for the report builder.

Each enabled section has:
  - metadata (id, label, category)
  - a compute(report_dict) -> summary_dict function
  - a prompt string used by the LLM drafter

Sections derive entirely from executive_report.json — no extra DB queries.
"""
from typing import Any, Dict, List, Optional

NFPA_BLS_TARGET_S = 300  # 5-minute BLS total response P90 target


def _fmt_s(s: Any) -> str:
    if s is None:
        return "—"
    try:
        v = int(float(s))
        m, r = divmod(v, 60)
        return f"{m}m {r:02d}s"
    except (TypeError, ValueError):
        return "—"


def _top_n(d: dict, n: int = 7) -> List[Dict]:
    return [
        {"label": k, "value": v}
        for k, v in sorted(d.items(), key=lambda x: -x[1])[:n]
    ]


# ── Compute functions ─────────────────────────────────────────────────────────

def _compute_nfpa_compliance(report: dict) -> dict:
    rt    = report.get("modules", {}).get("response_times", {})
    nfpa  = rt.get("nfpa_1710", {})
    total = rt.get("total_response", {})
    p90   = total.get("p90")
    pct   = nfpa.get("pct_within_target")
    exceed_s = round(p90 - NFPA_BLS_TARGET_S) if p90 is not None else None

    def _phase(key):
        p = rt.get(key, {})
        return {"median_s": p.get("median"), "median_fmt": _fmt_s(p.get("median")),
                "p90_s": p.get("p90"), "p90_fmt": _fmt_s(p.get("p90"))}

    return {
        "p90_s":          p90,
        "p90_fmt":        _fmt_s(p90),
        "target_s":       NFPA_BLS_TARGET_S,
        "target_fmt":     "5m 00s",
        "exceed_by_s":    exceed_s,
        "exceed_by_fmt":  _fmt_s(abs(exceed_s)) if exceed_s is not None else "—",
        "pct_within":     pct,
        "compliant":      nfpa.get("compliant"),
        "phases": {
            "call_processing": _phase("call_processing"),
            "turnout":         _phase("turnout"),
            "travel":          _phase("travel"),
            "total_response":  _phase("total_response"),
        },
        "timestamp_caveat": True,
    }


def _compute_response_time_intervals(report: dict) -> dict:
    rt = report.get("modules", {}).get("response_times", {})

    def _phase(key):
        p = rt.get(key, {})
        return {
            "median_s":   p.get("median"),
            "median_fmt": _fmt_s(p.get("median")),
            "p90_s":      p.get("p90"),
            "p90_fmt":    _fmt_s(p.get("p90")),
        }

    total = rt.get("total_response", {})
    return {
        "call_processing": _phase("call_processing"),
        "turnout":         _phase("turnout"),
        "travel":          _phase("travel"),
        "total_response": {
            **_phase("total_response"),
            "mean_s":   total.get("mean"),
            "mean_fmt": _fmt_s(total.get("mean")),
            "p95_s":    total.get("p95"),
            "p95_fmt":  _fmt_s(total.get("p95")),
        },
        "timestamp_caveat": True,
    }


def _compute_call_volume_by_type(report: dict) -> dict:
    cv      = report.get("modules", {}).get("call_volume", {})
    by_type = cv.get("by_incident_type", {})
    total   = cv.get("total_calls", 0)
    top5    = _top_n(by_type, 5)
    top_sum = sum(x["value"] for x in top5)
    return {
        "total_calls":    total,
        "distinct_types": len(by_type),
        "top_types":      top5,
        "top5_pct":       round(top_sum / total * 100, 1) if total else 0,
    }


def _compute_hour_of_day(report: dict) -> dict:
    cv      = report.get("modules", {}).get("call_volume", {})
    by_hour = cv.get("by_hour", {})
    if not by_hour:
        return {"available": False}
    total   = cv.get("total_calls", 0)
    peak_h  = cv.get("busiest_hour")
    sorted_ = sorted(by_hour.items(), key=lambda x: -x[1])
    slow_h  = sorted_[-1][0] if sorted_ else None
    biz     = sum(v for h, v in by_hour.items() if 8 <= int(h) <= 18)
    nite    = sum(v for h, v in by_hour.items() if int(h) >= 22 or int(h) <= 6)
    return {
        "available":     True,
        "peak_hour":     peak_h,
        "slow_hour":     slow_h,
        "business_pct":  round(biz  / total * 100, 1) if total else 0,
        "overnight_pct": round(nite / total * 100, 1) if total else 0,
        "distribution":  by_hour,
    }


def _compute_day_of_week(report: dict) -> dict:
    cv     = report.get("modules", {}).get("call_volume", {})
    by_dow = cv.get("by_day_of_week", {})
    if not by_dow:
        return {"available": False}
    total   = cv.get("total_calls", 0)
    peak_d  = cv.get("busiest_day")
    sorted_ = sorted(by_dow.items(), key=lambda x: -x[1])
    slow_d  = sorted_[-1][0] if sorted_ else None
    wknd    = sum(v for d, v in by_dow.items() if d.lower() in ("saturday", "sunday", "sat", "sun"))
    return {
        "available":   True,
        "peak_day":    peak_d,
        "slow_day":    slow_d,
        "weekend_pct": round(wknd / total * 100, 1) if total else 0,
        "distribution": by_dow,
    }


def _compute_monthly_seasonality(report: dict) -> dict:
    cv       = report.get("modules", {}).get("call_volume", {})
    by_month = cv.get("by_month", {})
    if not by_month:
        return {"available": False}
    total     = cv.get("total_calls", 0)
    peak_mo   = cv.get("busiest_month")
    sorted_   = sorted(by_month.items(), key=lambda x: -x[1])
    trough_mo = sorted_[-1][0] if sorted_ else None
    n         = len(by_month)
    avg       = total / n if n else 0
    peak_v    = by_month.get(peak_mo, 0) if peak_mo else 0
    delta_pct = round((peak_v - avg) / avg * 100, 1) if avg else 0
    return {
        "available":      True,
        "peak_month":     peak_mo,
        "trough_month":   trough_mo,
        "peak_above_avg": delta_pct,
        "months_in_data": n,
        "distribution":   by_month,
    }


def _compute_top_units(report: dict) -> dict:
    cv      = report.get("modules", {}).get("call_volume", {})
    by_unit = cv.get("by_unit", {})
    total   = cv.get("total_calls", 0)
    top7    = _top_n(by_unit, 7)
    top_sum = sum(x["value"] for x in top7)
    return {
        "total_calls": total,
        "total_units": len(by_unit),
        "top_units":   top7,
        "top7_pct":    round(top_sum / total * 100, 1) if total else 0,
    }


def _compute_per_unit_compliance(report: dict) -> dict:
    up      = report.get("modules", {}).get("unit_performance", {})
    units   = up.get("units", {})
    flagged = up.get("flagged_units", [])
    unit_list = []
    for name, s in units.items():
        p90 = s.get("response_p90")
        unit_list.append({
            "unit":    name,
            "calls":   s.get("calls"),
            "p90_s":   p90,
            "p90_fmt": _fmt_s(p90),
            "pass":    p90 is not None and p90 <= NFPA_BLS_TARGET_S,
        })
    unit_list.sort(key=lambda x: (x["p90_s"] or 9999))
    passing = sum(1 for u in unit_list if u["pass"])
    return {
        "units":       unit_list,
        "total_units": len(unit_list),
        "passing":     passing,
        "failing":     len(unit_list) - passing,
        "flagged":     flagged,
        "target_fmt":  "5m 00s",
    }


# ── Prompt templates ──────────────────────────────────────────────────────────

PROMPTS: Dict[str, str] = {
    "nfpa_compliance": (
        "You are a technical writer producing an EMS consulting report. "
        "Data: {summary_json}\n\n"
        "Write 2–4 sentences describing NFPA 1710 compliance using ONLY the numbers above.\n"
        "Rules:\n"
        "- Lead with the P90 value vs the 5m 00s target.\n"
        "- State pass or fail clearly.\n"
        "- Mention pct_within as supporting context, not the compliance test.\n"
        "- If timestamp_caveat is true, append: "
        "'Note: timestamps carry minute-level resolution; sub-60-second intervals appear as < 1 minute.'\n"
        "- No recommendations. No speculation on causes. Exact numbers only.\n"
        "Output: plain paragraph, no bullet points, no headers."
    ),
    "response_time_intervals": (
        "You are a technical writer producing an EMS consulting report. "
        "Data: {summary_json}\n\n"
        "Write 2–3 sentences describing response time intervals using ONLY the numbers above.\n"
        "Rules:\n"
        "- State median for each phase: call processing, turnout, travel, total response.\n"
        "- If timestamp_caveat is true, note minute-level resolution affects sub-60-second phases.\n"
        "- No recommendations. No speculation.\n"
        "Output: plain paragraph."
    ),
    "call_volume_by_type": (
        "You are a technical writer producing an EMS consulting report. "
        "Data: {summary_json}\n\n"
        "Write 2–3 sentences describing call volume by incident type using ONLY the numbers above.\n"
        "Rules:\n"
        "- Name the top types and their call counts.\n"
        "- State what share of total volume the top types represent.\n"
        "- No recommendations. No speculation.\n"
        "Output: plain paragraph."
    ),
    "hour_of_day": (
        "You are a technical writer producing an EMS consulting report. "
        "Data: {summary_json}\n\n"
        "Write 2–3 sentences describing hour-of-day call distribution using ONLY the numbers above.\n"
        "Rules:\n"
        "- State peak and slowest hours.\n"
        "- State the business-hours percentage and overnight percentage.\n"
        "- No recommendations. No speculation.\n"
        "Output: plain paragraph."
    ),
    "day_of_week": (
        "You are a technical writer producing an EMS consulting report. "
        "Data: {summary_json}\n\n"
        "Write 2 sentences describing day-of-week distribution using ONLY the numbers above.\n"
        "Rules: state busiest and slowest days and the weekend percentage.\n"
        "No recommendations. No speculation.\n"
        "Output: plain paragraph."
    ),
    "monthly_seasonality": (
        "You are a technical writer producing an EMS consulting report. "
        "Data: {summary_json}\n\n"
        "Write 2–3 sentences describing monthly call volume seasonality using ONLY the numbers above.\n"
        "Rules:\n"
        "- Name peak and trough months.\n"
        "- State how much above average the peak month is.\n"
        "- No recommendations. No speculation.\n"
        "Output: plain paragraph."
    ),
    "top_units": (
        "You are a technical writer producing an EMS consulting report. "
        "Data: {summary_json}\n\n"
        "Write 2 sentences describing unit call volume distribution using ONLY the numbers above.\n"
        "Rules: name top units, their call counts, and share of volume. No recommendations.\n"
        "Output: plain paragraph."
    ),
    "per_unit_compliance": (
        "You are a technical writer producing an EMS consulting report. "
        "Data: {summary_json}\n\n"
        "Write 2–4 sentences describing per-unit NFPA 1710 compliance using ONLY the numbers above.\n"
        "Rules:\n"
        "- State how many units pass and fail the P90 ≤ 5m 00s standard.\n"
        "- Name units with their P90 values.\n"
        "- No recommendations. No speculation on causes.\n"
        "Output: plain paragraph."
    ),
}

# ── Registry ──────────────────────────────────────────────────────────────────

SECTION_REGISTRY = [
    {"id": "nfpa_compliance",         "label": "NFPA 1710 Compliance",         "category": "dispatch",  "enabled": True,  "compute": _compute_nfpa_compliance},
    {"id": "response_time_intervals", "label": "Response Time Intervals",       "category": "dispatch",  "enabled": True,  "compute": _compute_response_time_intervals},
    {"id": "per_unit_compliance",     "label": "Per-Unit NFPA Compliance",      "category": "dispatch",  "enabled": True,  "compute": _compute_per_unit_compliance},
    {"id": "call_volume_by_type",     "label": "Call Volume by Type",           "category": "dispatch",  "enabled": True,  "compute": _compute_call_volume_by_type},
    {"id": "top_units",               "label": "Top Units by Call Volume",      "category": "dispatch",  "enabled": True,  "compute": _compute_top_units},
    {"id": "hour_of_day",             "label": "Hour of Day Distribution",      "category": "dispatch",  "enabled": True,  "compute": _compute_hour_of_day},
    {"id": "day_of_week",             "label": "Day of Week Distribution",      "category": "dispatch",  "enabled": True,  "compute": _compute_day_of_week},
    {"id": "monthly_seasonality",     "label": "Monthly Seasonality",           "category": "dispatch",  "enabled": True,  "compute": _compute_monthly_seasonality},
    {"id": "staffing_overview",       "label": "Staffing Overview",             "category": "staffing",  "enabled": False, "disabled_reason": "Requires staffing CSV (SBEMS_Staffing_2022_2025.csv)"},
    {"id": "termination_trends",      "label": "Termination Trends",            "category": "staffing",  "enabled": False, "disabled_reason": "Requires staffing CSV"},
    {"id": "volunteer_roster",        "label": "Volunteer / PRN Roster",        "category": "staffing",  "enabled": False, "disabled_reason": "Requires volunteer roster CSV"},
    {"id": "financial_breakeven",     "label": "Financial Break-Even Analysis", "category": "financial", "enabled": False, "disabled_reason": "Requires financial assumptions form"},
]

SECTION_MAP = {s["id"]: s for s in SECTION_REGISTRY}


def compute_section(section_id: str, report: dict) -> Optional[dict]:
    s = SECTION_MAP.get(section_id)
    if not s or not s.get("enabled"):
        return None
    return s["compute"](report)


def get_section_meta() -> List[dict]:
    return [{k: v for k, v in s.items() if k != "compute"} for s in SECTION_REGISTRY]
