"""
AI dashboard interpretation — turns the agency's already-computed analytics into
a plain-language executive read: what's important, what it means, what to do.

Grounding & privacy:
  • The model only sees metrics the platform's own services already computed
    (call volume, response times, staffing, IFT outlook) — never raw PHI — and is
    instructed to cite only the provided numbers (no invented figures or causes).
  • It interprets the SAME numbers the dashboards render, so the AI read reconciles
    with the charts (one source of truth → reproducible).

Implementation mirrors report_builder/draft.py: Anthropic over httpx, no SDK
dependency, gated on ANTHROPIC_API_KEY. Without the key the endpoint returns a
graceful "unavailable" payload and the UI shows an enable hint.
"""
import json
import logging
import os
from typing import Any, Dict, List, Optional

import httpx

logger = logging.getLogger(__name__)

_ANTHROPIC_URL = "https://api.anthropic.com/v1/messages"
# Most capable current model for nuanced operational interpretation + recommendations.
# One-line change to "claude-sonnet-4-6" (cheaper) or "claude-haiku-4-5" (cheapest).
_MODEL = "claude-opus-4-8"
_MAX_TOKENS = 1800

# In-process cache: the interpretation is stable until the underlying data changes,
# so we key on (upload_id, data signature) to avoid paying for the LLM on every
# dashboard view. Swap for Redis in a multi-process deployment.
_CACHE: Dict[str, Dict[str, Any]] = {}

_SYSTEM = (
    "You are an expert EMS operations analyst writing an executive interpretation of an "
    "agency's analytics dashboard for its leadership (chief / operations director). You are "
    "given a JSON summary computed from the agency's own data: call volume, response-time "
    "performance, demand patterns, a staffing recommendation, a staffing turnover-risk read, and the interfacility-transport"
    "(IFT) outlook.\n\n"
    "Rules:\n"
    "- Ground EVERY statement in the provided numbers. Never invent figures, trends, or causes.\n"
    "- Be specific and quantitative — cite the actual values, days, hours, and percentages.\n"
    "- Response-time terms follow ZOLL emsCharts. RESPONSE time = en route -> on-scene (the "
    "headline figure). CHUTE time = dispatch -> en route (crew turnout). DISPATCH-TO-ON-SCENE = "
    "chute + response, and it is THIS interval the ~9-minute time-to-scene target is measured "
    "against — not the shorter headline response. Cite the interval you mean; never conflate them.\n"
    "- Respect data caveats: if history is short or a sample is small, say so and soften claims.\n"
    "- If the summary includes 'active_filters', the data is a FILTERED subset (e.g. one "
    "municipality, emergency-only, a specific month). Interpret ONLY that subset, name the "
    "filter scope in your headline, and don't generalize to the whole agency.\n"
    "- Recommendations must be concrete, tied to the data (staffing windows, station coverage, "
    "IFT scheduling, response-time targets), and prioritized.\n"
    "- This is operational decision support, not medical advice or a mandate.\n"
    "- Write in plain, direct prose for a busy chief. No preamble."
)

_JSON_CONTRACT = (
    "Respond with ONLY a JSON object — no markdown fences, no text before or after — "
    "matching exactly this shape:\n"
    "{\n"
    '  "headline": "one-sentence executive takeaway",\n'
    '  "key_findings": ["3-5 short, specific, quantitative bullet strings"],\n'
    '  "what_it_means": "2-4 sentence plain-language interpretation of the operational picture",\n'
    '  "recommendations": [\n'
    '    {"action": "concrete step", "rationale": "why, tied to the data", "priority": "high|medium|low"}\n'
    "  ]\n"
    "}"
)


def _api_key() -> str:
    """Resolve the Anthropic key, ensuring the config .env -> os.environ bridge has
    run first (pydantic-settings loads .env into Settings, not os.environ)."""
    try:
        from ..config import get_settings
        get_settings()
    except Exception:  # noqa: BLE001
        pass
    return os.getenv("ANTHROPIC_API_KEY", "").strip()


def is_insights_available() -> bool:
    return bool(_api_key())


def _top_labels(obj: Any, n: int = 5) -> List[str]:
    """Compact 'label (count)' list from a value-counts result of unknown shape."""
    if isinstance(obj, dict):
        if obj.get("available") is False:
            return []
        items: List[Any] = list(obj.items())
    elif isinstance(obj, list):
        items = obj
    else:
        return []
    out: List[str] = []
    for it in items[:n]:
        if isinstance(it, dict):
            label = it.get("value") or it.get("name") or it.get("label") or it.get("type")
            cnt = it.get("count") or it.get("calls") or it.get("n")
            if label is not None:
                out.append(f"{label} ({cnt})" if cnt is not None else str(label))
        elif isinstance(it, (tuple, list)) and len(it) == 2:
            out.append(f"{it[0]} ({it[1]})")
    return out


def _build_summary(upload, db) -> Dict[str, Any]:
    """Assemble the compact, grounded metrics the model interprets — the same
    numbers the dashboards display, so the AI read reconciles with the charts."""
    from .ems_analytics_service import _call_volume, _response_times
    from .ems_column_mapping_service import get_column_overrides
    from .ems_ift_service import get_ift_outlook
    from .ems_predictive_service import _load_df, get_predictive_dashboard

    df = _load_df(upload)
    if df is None or df.empty:
        return {}
    try:
        ov = get_column_overrides(upload, db) or {}
    except Exception:  # noqa: BLE001
        ov = {}

    cv = _call_volume(df, ov) or {}
    try:
        rt = _response_times(df, ov) or {}
    except Exception:  # noqa: BLE001
        rt = {}
    pred = get_predictive_dashboard(upload, db) or {}
    try:
        ift = get_ift_outlook(upload, db) or {}
    except Exception:  # noqa: BLE001
        ift = {}

    ctx = pred.get("context") or {}
    staffing = pred.get("staffing") or {}
    fc = pred.get("call_volume_forecast") or {}
    patterns = pred.get("patterns") or {}

    volume = {
        "total_calls": cv.get("total_calls"),
        "count_basis": cv.get("count_basis"),
        "emergency_calls": cv.get("emergency_calls"),
        "interfacility_calls": cv.get("interfacility_calls"),
        "avg_calls_per_day": cv.get("avg_calls_per_day"),
        "avg_calls_per_week": cv.get("avg_calls_per_week"),
        "busiest_day_of_week": cv.get("busiest_day_of_week") or patterns.get("busiest_weekday"),
        "busiest_hour": patterns.get("busiest_hour"),
        "top_incident_types": _top_labels(cv.get("by_incident_type")),
        "top_municipalities": _top_labels(cv.get("by_municipality")),
    }

    resp = None
    if rt.get("available"):
        st_rt = staffing.get("response_time") or {}
        ivs = rt.get("intervals") or {}

        def _iv(name: str) -> Optional[Dict[str, Any]]:
            v = ivs.get(name)
            return {"median_min": v.get("median_minutes"), "p90_min": v.get("p90_minutes")} if v else None

        d2a = ivs.get("dispatch_to_arrival") or {}
        resp = {
            # Headline = ZOLL response (en route -> on-scene).
            "headline_metric": rt.get("metric_label") or rt.get("metric"),
            "response_median_min": rt.get("median_minutes"),
            "response_p90_min": rt.get("p90_minutes"),
            "sample_size": rt.get("sample_size"),
            # Full ZOLL interval set so the read can describe the call lifecycle.
            "intervals_min": {
                k: _iv(k) for k in (
                    "chute_time", "response_time", "scene_time", "transport_time",
                    "turnaround_time", "total_time", "dispatch_to_arrival",
                ) if ivs.get(k)
            },
            # The time-to-scene target is measured on DISPATCH -> on-scene, not the
            # shorter headline response — keep these explicitly distinct for the model.
            "time_to_scene_p90_min": d2a.get("p90_minutes"),
            "target_metric": "dispatch_to_on_scene_p90",
            "target_p90_min": st_rt.get("target_p90_minutes"),
            "meeting_target": st_rt.get("meeting_target"),
        }

    staff = None
    if staffing:
        ift_crew = staffing.get("ift_crew") or {}
        high_risk = [d.get("weekday") for d in (staffing.get("by_weekday") or []) if d.get("risk") == "High"]
        staff = {
            "emergency_units_peak": staffing.get("emergency_units"),
            "binding_constraint": staffing.get("binding_constraint"),
            "coverage_units": staffing.get("coverage_units"),
            "demand_units": staffing.get("demand_units"),
            "response_adjustment_units": (staffing.get("response_time") or {}).get("adjustment_units"),
            "projected_unit_hour_utilization": staffing.get("projected_unit_hour_utilization"),
            "ift_crew_recommended": ift_crew.get("recommended"),
            "ift_crew_units": ift_crew.get("units"),
            "ift_crew_window": (
                f"{ift_crew.get('window_days')} from {ift_crew.get('window_start')}:00"
                if ift_crew.get("recommended") else None
            ),
            "total_units_in_ift_window": staffing.get("total_units_in_ift_window"),
            "high_risk_weekdays": high_risk or None,
        }

    forecast = None
    if fc and fc.get("trend_direction"):
        nxt = None
        vals = fc.get("forecast_values") or []
        mos = fc.get("forecast_months") or []
        if vals and mos:
            nxt = {"month": mos[0], "expected_calls": vals[0]}
        forecast = {
            "trend_direction": fc.get("trend_direction"),
            "trend_slope_calls_per_day": fc.get("trend_slope"),
            "next_month": nxt,
            "model": fc.get("model_name"),
            "reliable": fc.get("is_reliable"),
        }

    ift_summary = None
    if ift.get("available"):
        if ift.get("applicable"):
            sched = ift.get("schedule_recommendation") or {}
            locs = ift.get("by_location") or []
            ift_summary = {
                "applicable": True,
                "ift_count": ift.get("ift_count"),
                "share_of_volume_pct": ift.get("ift_share_pct"),
                "trend": ift.get("trend"),
                "weekly_expected": ift.get("weekly_expected_ift"),
                "suggested_window": (
                    f"{sched.get('window_days')} {sched.get('window_start')}:00-{sched.get('window_end')}:00"
                ),
                "window_covers_pct_of_ift": sched.get("pct_of_all_ift_covered"),
                "top_origin": (locs[0].get("location") if locs else None),
            }
        else:
            ift_summary = {
                "applicable": False,
                "ift_count": ift.get("ift_count"),
                "share_of_volume_pct": ift.get("ift_share_pct"),
            }

    warnings = list(pred.get("warnings") or [])
    for w in (ift.get("warnings") or []):
        if w not in warnings:
            warnings.append(w)

    # Turnover risk — reuse the already-computed predictive result (no recompute).
    turnover_summary = None
    if staffing:
        try:
            from .ems_turnover_service import _operational_stress
            st = _operational_stress(pred)
            turnover_summary = {
                "method": "operational_proxy",
                "risk_level": st["level"],
                "composite_index": st["composite_index"],
                "drivers": (st.get("drivers") or [])[:4],
            }
        except Exception:  # noqa: BLE001
            pass

    return {
        "agency": (
            getattr(upload, "agency_name", None)
            or getattr(upload, "original_filename", None)
            or getattr(upload, "filename", None)
        ),
        "period": {
            "start": ctx.get("history_start"),
            "end": ctx.get("history_end"),
            "days_of_history": ctx.get("days_available"),
            "forecast_confidence": pred.get("confidence"),
        },
        "volume": volume,
        "response_time": resp,
        "forecast": forecast,
        "staffing": staff,
        "turnover": turnover_summary,
        "ift": ift_summary,
        "data_caveats": warnings,
    }


def _signature(summary: Dict[str, Any]) -> str:
    p = summary.get("period")
    p = p if isinstance(p, dict) else {}          # combined view passes a plain string
    v = summary.get("volume") or {}
    return f"{p.get('end')}|{p.get('days_of_history')}|{v.get('total_calls')}"


def _parse_json(text: str) -> Optional[Dict[str, Any]]:
    """Best-effort JSON extraction — tolerant of stray markdown fences/prose."""
    text = (text or "").strip()
    if not text:
        return None
    try:
        return json.loads(text)
    except Exception:  # noqa: BLE001
        pass
    if "```" in text:
        chunk = text.split("```")[1]
        if chunk.lstrip().lower().startswith("json"):
            chunk = chunk.lstrip()[4:]
        try:
            return json.loads(chunk.strip())
        except Exception:  # noqa: BLE001
            pass
    a, b = text.find("{"), text.rfind("}")
    if 0 <= a < b:
        try:
            return json.loads(text[a:b + 1])
        except Exception:  # noqa: BLE001
            return None
    return None


async def interpret_dashboard(upload, db, refresh: bool = False) -> Dict[str, Any]:
    """Return the AI executive interpretation, or a graceful unavailable payload."""
    if not is_insights_available():
        return {
            "available": False,
            "key_missing": True,
            "reason": "AI interpretation is off — set ANTHROPIC_API_KEY in backend/.env to enable it.",
        }

    summary = _build_summary(upload, db)
    if not summary or not (summary.get("volume") or {}).get("total_calls"):
        return {"available": False, "reason": "Not enough cleaned data to interpret yet."}

    cache_key = f"{getattr(upload, 'id', '')}:{_signature(summary)}"
    return await _interpret(summary, cache_key, refresh)


def _describe_filters(f: Optional[Dict[str, Any]]) -> List[str]:
    """Human-readable list of the active dashboard filters, for the AI to name."""
    if not f:
        return []
    parts: List[str] = []
    dr = f.get("date_range")
    if isinstance(dr, (list, tuple)) and (dr[0] or (len(dr) > 1 and dr[1])):
        end = dr[1] if len(dr) > 1 else ""
        parts.append(f"dates {dr[0] or '…'} to {end or '…'}")
    for key, label in (("municipalities", "municipalities"), ("units", "units"), ("call_types", "call types")):
        vals = f.get(key)
        if vals:
            shown = ", ".join(map(str, vals[:6]))
            more = f" +{len(vals) - 6} more" if len(vals) > 6 else ""
            parts.append(f"{label}: {shown}{more}")
    if f.get("emergency_only"):
        parts.append("emergency calls only")
    if f.get("exclude_interfacility"):
        parts.append("excluding interfacility transports")
    if f.get("ift_only"):
        parts.append("interfacility transports only")
    return parts


def _summary_from_metrics(metrics: Dict[str, Any], agency: str, period: str, scope: str,
                          filters_applied: Optional[Dict[str, Any]] = None) -> Dict[str, Any]:
    """Build the AI summary from an already-computed metrics dict — used by the
    combined view (and any filtered view), which pools/filters rather than one upload."""
    cv = metrics.get("call_volume") or {}
    rt = metrics.get("response_times") or {}
    up = metrics.get("unit_performance") or {}
    tr = metrics.get("transport") or {}
    disp = metrics.get("dispositions") or {}
    active = _describe_filters(filters_applied)
    summary: Dict[str, Any] = {
        "agency": agency,
        "period": period,
        "scope": ("Filtered subset — " + "; ".join(active)) if active else scope,
        "volume": {
            "total_calls": cv.get("total_calls"),
            "count_basis": cv.get("count_basis"),
            "emergency_calls": cv.get("emergency_calls"),
            "interfacility_calls": cv.get("interfacility_calls"),
            "busiest_day_of_week": cv.get("busiest_day_of_week"),
            "top_call_types": _top_labels(cv.get("by_incident_type"), 8),
            "top_municipalities": _top_labels(cv.get("by_municipality"), 8),
        },
        "response_times": {k: rt.get(k) for k in
            ("metric_label", "median_minutes", "mean_minutes", "p90_minutes", "max_minutes", "sample_size")
            if rt.get(k) is not None},
        "top_units": _top_labels(up.get("calls_per_unit") or up.get("by_unit"), 8),
    }
    # Outcome mix + transport rate (available on the newer analytics) enrich the read.
    if isinstance(disp.get("summary"), list) and disp["summary"]:
        summary["call_outcomes"] = [f"{c.get('label')} ({c.get('count')})" for c in disp["summary"]]
    if tr.get("available") and tr.get("transport_rate_pct") is not None:
        summary["transport_rate_pct"] = tr.get("transport_rate_pct")
    if active:
        summary["active_filters"] = active
        if metrics.get("row_count") is not None:
            summary["filtered_row_count"] = metrics.get("row_count")
    return summary


async def interpret_combined(metrics: Dict[str, Any], agency: str, period: str, refresh: bool = False,
                             filters_applied: Optional[Dict[str, Any]] = None) -> Dict[str, Any]:
    """AI interpretation for the combined / filtered view, from pooled (optionally
    filtered) metrics. When filters are active the read is scoped to that subset."""
    if not is_insights_available():
        return {"available": False, "key_missing": True,
                "reason": "AI interpretation is off — set ANTHROPIC_API_KEY in backend/.env to enable it."}
    if not (metrics.get("call_volume") or {}).get("total_calls"):
        return {"available": False,
                "reason": ("No calls match the current filters to interpret."
                           if filters_applied else "Not enough cleaned data to interpret yet.")}
    summary = _summary_from_metrics(metrics, agency, period, "Combined - all datasets", filters_applied)
    filt_sig = "|".join(_describe_filters(filters_applied)) or "nofilter"
    return await _interpret(summary, f"combined:{agency}:{period}:{filt_sig}:{_signature(summary)}", refresh)


async def _interpret(summary: Dict[str, Any], cache_key: str, refresh: bool = False) -> Dict[str, Any]:
    """Send a prepared summary to the model and return the parsed interpretation."""
    if not refresh and cache_key in _CACHE:
        return {**_CACHE[cache_key], "cached": True}

    api_key = _api_key()
    summary_json = json.dumps(summary, indent=2, default=str)
    active = summary.get("active_filters")
    scope_note = ""
    if active:
        scope_note = (
            "IMPORTANT: This dashboard view is FILTERED to — " + "; ".join(active) + ". "
            "Interpret ONLY this subset, name the filter scope in your headline, and do not "
            "generalize to the whole agency.\n\n"
        )
    payload = {
        "model": _MODEL,
        "max_tokens": _MAX_TOKENS,
        "system": _SYSTEM,
        "messages": [{
            "role": "user",
            "content": (
                f"Agency: {summary.get('agency')}\n\n"
                f"{scope_note}"
                f"Dashboard summary (JSON):\n{summary_json}\n\n"
                f"{_JSON_CONTRACT}\n\nProduce the executive interpretation as JSON."
            ),
        }],
    }
    headers = {
        "x-api-key": api_key,
        "anthropic-version": "2023-06-01",
        "content-type": "application/json",
    }

    try:
        async with httpx.AsyncClient(timeout=60.0) as client:
            resp = await client.post(_ANTHROPIC_URL, json=payload, headers=headers)
            resp.raise_for_status()
        body = resp.json()
        text = next((b.get("text", "") for b in body.get("content", []) if b.get("type") == "text"), "")
        insight = _parse_json(text)
    except httpx.HTTPStatusError as exc:
        detail = exc.response.text[:300] if exc.response is not None else ""
        logger.warning("ai-insights: Anthropic API error %s: %s", exc.response.status_code, detail)
        return {"available": False, "reason": f"AI service error ({exc.response.status_code}). Try again shortly."}
    except Exception as exc:  # noqa: BLE001
        logger.warning("ai-insights: request failed: %s", exc)
        return {"available": False, "reason": "AI interpretation failed to generate. Try again shortly."}

    if not insight:
        return {"available": False, "reason": "AI returned an unreadable response. Try refreshing."}

    result = {
        "available": True,
        "model": _MODEL,
        "generated_for": summary.get("period"),
        "active_filters": summary.get("active_filters") or None,
        "scope": summary.get("scope"),
        "headline": insight.get("headline"),
        "key_findings": insight.get("key_findings") or [],
        "what_it_means": insight.get("what_it_means"),
        "recommendations": insight.get("recommendations") or [],
        # The exact numbers the model read, so leadership can reconcile/reproduce.
        "grounded_summary": summary,
    }
    _CACHE[cache_key] = result
    return result
