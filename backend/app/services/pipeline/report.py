"""
Module 4 — Executive Report Generator.

Combines all module outputs into a single executive_report.json that
drives the frontend dashboard.
"""
import json
import logging
import math
from datetime import datetime, timezone
from pathlib import Path
from typing import Any, Dict, Optional

logger = logging.getLogger(__name__)


def _sanitize(obj: Any) -> Any:
    """Recursively replace NaN/Inf floats with None so the report is valid JSON."""
    if isinstance(obj, float):
        return None if (math.isnan(obj) or math.isinf(obj)) else obj
    if isinstance(obj, dict):
        return {k: _sanitize(v) for k, v in obj.items()}
    if isinstance(obj, list):
        return [_sanitize(v) for v in obj]
    return obj


def _fmt_seconds(s: Any) -> str:
    """Format a seconds value as mm:ss string."""
    try:
        secs = int(float(s))
        return f"{secs // 60}m {secs % 60:02d}s"
    except (TypeError, ValueError):
        return "—"


def build(
    agency_id: str,
    agency_name: str,
    subscription_tier: str,
    validation: Dict[str, Any],
    call_volume: Dict[str, Any],
    response_times: Dict[str, Any],
    output_dir: str,
    data_quality: Optional[Dict[str, Any]] = None,
    staffing: Optional[Dict[str, Any]] = None,
    unit_performance: Optional[Dict[str, Any]] = None,
    municipality: Optional[Dict[str, Any]] = None,
    forecasting: Optional[Dict[str, Any]] = None,
) -> Dict[str, Any]:
    """Assemble and persist the executive report."""

    total_calls = call_volume.get("total_calls", 0)
    date_range  = call_volume.get("date_range", {})
    total_resp  = response_times.get("total_response", {})
    nfpa        = response_times.get("nfpa_1710", {})
    top_types   = call_volume.get("by_incident_type", {})
    busiest_h   = call_volume.get("busiest_hour")
    busiest_day = call_volume.get("busiest_day")
    busiest_mo  = call_volume.get("busiest_month")

    key_metrics = {
        "total_calls":              total_calls,
        "date_range_start":         date_range.get("start"),
        "date_range_end":           date_range.get("end"),
        "avg_total_response_sec":   total_resp.get("mean"),
        "avg_total_response_fmt":   _fmt_seconds(total_resp.get("mean")),
        "median_response_sec":      total_resp.get("median"),
        "median_response_fmt":      _fmt_seconds(total_resp.get("median")),
        "p90_response_sec":         total_resp.get("p90"),
        "p90_response_fmt":         _fmt_seconds(total_resp.get("p90")),
        "nfpa_1710_pct":            nfpa.get("pct_within_target"),
        "nfpa_1710_compliant":      nfpa.get("compliant"),
        "busiest_hour":             busiest_h,
        "busiest_day":              busiest_day,
        "busiest_month":            busiest_mo,
        "top_incident_types":       list(top_types.keys())[:5],
    }

    highlights = []
    if total_calls:
        highlights.append(f"{total_calls:,} total calls analyzed.")
    if key_metrics["avg_total_response_fmt"] != "—":
        highlights.append(
            f"Average total response time: {key_metrics['avg_total_response_fmt']}."
        )
    if nfpa.get("pct_within_target") is not None:
        pct = nfpa["pct_within_target"]
        status = "meets" if nfpa.get("compliant") else "does not meet"
        highlights.append(
            f"NFPA 1710 compliance: {pct}% of responses within 6 min — agency {status} the 90% target."
        )
    if busiest_day:
        highlights.append(f"Busiest day of week: {busiest_day}.")
    if busiest_h is not None:
        period = "AM" if busiest_h < 12 else "PM"
        hr = busiest_h if busiest_h <= 12 else busiest_h - 12
        highlights.append(f"Peak call hour: {hr}:00 {period}.")
    if staffing and staffing.get("unique_employees"):
        highlights.append(
            f"{staffing['unique_employees']} unique staff members on record."
        )
    if unit_performance and unit_performance.get("total_units"):
        flagged = unit_performance.get("flagged_units", [])
        msg = f"{unit_performance['total_units']} units analyzed."
        if flagged:
            msg += f" {len(flagged)} unit(s) below NFPA compliance target: {', '.join(flagged[:3])}."
        highlights.append(msg)
    if municipality and municipality.get("total_municipalities"):
        flagged_m = municipality.get("flagged_municipalities", [])
        msg = f"{municipality['total_municipalities']} municipalities covered."
        if flagged_m:
            msg += f" {len(flagged_m)} area(s) flagged for poor response times."
        highlights.append(msg)
    if staffing and staffing.get("overtime_pct", 0) > 20:
        highlights.append(
            f"Staffing: {staffing['overtime_pct']}% of shifts exceed standard hours — review overtime."
        )
    if forecasting:
        fcast = forecasting.get("call_volume_forecast", {})
        direction = fcast.get("trend_direction")
        if direction and direction != "stable":
            slope = fcast.get("trend_slope", 0)
            highlights.append(
                f"Call volume trend: {direction} ({slope:+.1f} calls/day)."
            )
        attrition = forecasting.get("attrition_risk", {})
        risk_level = attrition.get("risk_level", "low")
        if risk_level in ("medium", "high"):
            highlights.append(
                f"Staffing attrition risk: {risk_level.upper()} — {len(attrition.get('indicators', []))} indicator(s) flagged."
            )
        model_name = fcast.get("model_name")
        if model_name:
            reliability = "" if fcast.get("is_reliable", True) else " (low reliability — see model card)"
            highlights.append(
                f"Forecast model selected: {model_name}{reliability}."
            )

    # ── Quality warnings for highlights ──────────────────────────────────
    dq = data_quality or {}
    dq_warnings = dq.get("warnings", [])
    for w in dq_warnings[:3]:  # surface up to 3 quality issues in highlights
        highlights.append(f"Data quality: {w}")

    # ── Chart flags (for frontend conditional rendering) ──────────────────
    chart_flags = dq.get("chart_flags", {
        "response_time":         True,
        "call_volume_by_hour":   True,
        "call_volume_by_date":   True,
        "unit_performance":      True,
    })

    # ── Model explanation card ────────────────────────────────────────────
    fcast_data       = (forecasting or {}).get("call_volume_forecast", {})
    model_explanation: Dict[str, Any] = {}
    if fcast_data and "model_name" in fcast_data:
        model_explanation = {
            "model_name":         fcast_data.get("model_name"),
            "model_reason":       fcast_data.get("model_reason"),
            "is_reliable":        fcast_data.get("is_reliable", True),
            "reliability_warning": fcast_data.get("reliability_warning"),
            "top_features":       fcast_data.get("top_features", []),
            "model_scores":       fcast_data.get("model_scores", {}),
            "train_days":         fcast_data.get("train_days"),
            "test_days":          fcast_data.get("test_days"),
        }

    report = {
        "schema_version":    "1.1",
        "generated_at":      datetime.now(timezone.utc).isoformat(),
        "agency_id":         agency_id,
        "agency_name":       agency_name,
        "subscription_tier": subscription_tier,
        "key_metrics":       key_metrics,
        "highlights":        highlights,
        "chart_flags":       chart_flags,
        "quality_warnings":  dq_warnings,
        "model_explanation": model_explanation,
        "modules": {
            "data_quality":    dq,
            "validation":      validation,
            "call_volume":     call_volume,
            "response_times":  response_times,
            "staffing":        staffing or {},
            "unit_performance": unit_performance or {},
            "municipality":    municipality or {},
            "forecasting":     forecasting or {},
        },
    }

    out_path = str(Path(output_dir) / "executive_report.json")
    Path(output_dir).mkdir(parents=True, exist_ok=True)
    with open(out_path, "w", encoding="utf-8") as fh:
        json.dump(_sanitize(report), fh, indent=2, default=str)

    logger.info("Executive report written to %s", out_path)
    return report
