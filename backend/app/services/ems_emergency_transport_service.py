"""
Emergency-transport outlook.

The flip side of the IFT outlook: this covers the agency's EMERGENCY (non-IFT)
activity — how many emergency calls come in, how many become patient transports,
and the day/hour/area patterns + near-term forecast of that emergency-transport
demand. Emergency demand is less schedulable than IFT, but the rhythm still
informs crew deployment and peak staffing.

  • emergency rows  = NOT interfacility (shared classifier, consistent with the
    dashboard's Emergency-vs-Interfacility split),
  • transport rows  = a disposition/outcome column says a patient was transported
    (best-effort; degrades to "calls" when the export has no disposition field),
  • patterns        = day-of-week + hour, top call types, scene areas,
  • forecast        = day-of-week seasonal estimate of emergency transports/day.
"""
import logging
from typing import Any, Dict, List, Optional

import numpy as np
import pandas as pd

from .ems_analytics_service import detect_column, detect_mapped_column, _minutes_between, _safe
from .ems_column_mapping_service import get_column_overrides
from .ems_filter_service import detect_interfacility_rows
from .ems_geographic_service import _centroid_for, _detect_location_column, _normalize_location
from .ems_predictive_service import _load_df, _resolve_dt

logger = logging.getLogger(__name__)

_WD = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"]

# Disposition/outcome columns + keyword rules to tell whether a patient was
# actually transported. "transport" present, minus the negations.
_DISPO_COLS = [
    "disposition", "patient_disposition", "transport_disposition", "call_disposition",
    "unit_disposition", "outcome", "transport_type", "transported",
]
_NO_TRANSPORT = (
    "no transport", "not transport", "without transport", "no treatment",
    "refused", "cancel", "no patient", "dead on scene", "released",
    "standby", "no contact", "treated and release",
)


def _detect_transport_mask(df: pd.DataFrame, ov: Dict) -> tuple[Optional[pd.Series], Optional[str]]:
    """Best-effort: boolean mask of rows where a patient was transported, and the
    column used. Returns (None, None) when no disposition column is present."""
    for cand in _DISPO_COLS:
        col = detect_mapped_column(df, cand, ov) or detect_column(df, cand) or (cand if cand in df.columns else None)
        if not col or col not in df.columns:
            continue
        s = df[col].astype(str).str.lower().str.strip()
        if not s.str.contains("transport", na=False).any():
            # transport_type-style columns mark a transport simply by being filled.
            if cand in ("transport_type",) and s.replace({"nan": "", "none": ""}).str.len().gt(0).any():
                mask = s.replace({"nan": "", "none": ""}).str.len().gt(0)
                return mask, col
            continue
        neg = pd.Series(False, index=df.index)
        for kw in _NO_TRANSPORT:
            neg |= s.str.contains(kw, na=False, regex=False)
        mask = s.str.contains("transport", na=False, regex=False) & ~neg
        return mask, col
    return None, None


def _hours(df: pd.DataFrame, dt: pd.Series, mask: pd.Series) -> pd.Series:
    cols = {c.lower(): c for c in df.columns}
    hod = cols.get("hour_of_day_of_dispatch")
    h = pd.to_numeric(df[hod], errors="coerce") if hod else dt.dt.hour
    h = h[mask].dropna().astype(int)
    return h[(h >= 0) & (h <= 23)]


def get_emergency_transport_outlook(upload, db, horizon_days: int = 14,
                                    df: Optional[pd.DataFrame] = None, overrides: Optional[Dict] = None) -> Dict[str, Any]:
    if df is None:
        df = _load_df(upload)
        if df is None or df.empty:
            return {"available": False, "reason": "No cleaned data available for this upload."}
        try:
            ov = get_column_overrides(upload, db) or {}
        except Exception:  # noqa: BLE001
            ov = {}
    else:
        if df.empty:
            return {"available": False, "reason": "No cleaned data available."}
        ov = overrides or {}
    _, dt = _resolve_dt(df, ov)
    if dt is None:
        return {"available": False, "reason": "No usable dispatch/received date column detected."}

    ift_mask = detect_interfacility_rows(df)
    emergency_mask = ~ift_mask
    emergency_n = int(emergency_mask.sum())
    if emergency_n == 0:
        return {"available": True, "applicable": False,
                "reason": "No emergency (non-interfacility) calls detected for this agency."}

    transport_mask, dispo_col = _detect_transport_mask(df, ov)
    emerg_transport_mask = (emergency_mask & transport_mask) if transport_mask is not None else None
    transports_n = int(emerg_transport_mask.sum()) if emerg_transport_mask is not None else None

    # The "event" we trend/forecast: emergency transports when detectable, else
    # emergency calls. event_label tells the UI which.
    event_mask = emerg_transport_mask if emerg_transport_mask is not None else emergency_mask
    event_label = "emergency transports" if emerg_transport_mask is not None else "emergency calls"
    event_dt = dt[event_mask].dropna()
    valid = dt.dropna()
    span_days = int((valid.max() - valid.min()).days + 1) if len(valid) else 0

    ctx = {
        "history_start": str(valid.min().date()) if len(valid) else None,
        "history_end": str(valid.max().date()) if len(valid) else None,
        "days_available": span_days,
        "total_calls": int(len(df)),
        "method": "day-of-week seasonal (emergency demand)",
    }

    # Weekday averages (per weekday occurrence in the span).
    dow_days = {i: 0 for i in range(7)}
    cur, end = (valid.min().normalize(), valid.max().normalize()) if len(valid) else (None, None)
    while cur is not None and cur <= end:
        dow_days[cur.dayofweek] += 1
        cur += pd.Timedelta(days=1)
    dow_ct = event_dt.dt.dayofweek.value_counts().to_dict()
    wd_avg = {i: (dow_ct.get(i, 0) / max(dow_days[i], 1)) for i in range(7)}
    by_weekday = [
        {"weekday": _WD[i], "avg_per_day": round(wd_avg[i], 2), "total": int(dow_ct.get(i, 0))}
        for i in range(7)
    ]
    busiest_day = max(by_weekday, key=lambda w: w["avg_per_day"])["weekday"] if by_weekday else None

    by_hour = {int(h): int(c) for h, c in _hours(df, dt, event_mask).value_counts().sort_index().items()}
    peak_hour = max(by_hour, key=by_hour.get) if by_hour else None

    # Top emergency call types.
    itype = detect_mapped_column(df, "incident_type", ov)
    by_type: List[Dict[str, Any]] = []
    if itype and itype in df.columns:
        for t, c in df.loc[event_mask, itype].astype(str).value_counts().head(8).items():
            by_type.append({"type": t, "count": int(c)})

    # Scene-area breakdown (where emergency transports originate).
    by_location: List[Dict[str, Any]] = []
    loc_col = _detect_location_column(df, ov)
    if loc_col:
        locs = df.loc[event_mask, loc_col].dropna().astype(str).map(_normalize_location)
        locs = locs[locs.str.len() > 0]
        grand = int(locs.shape[0])
        for name, cnt in locs.value_counts().head(12).items():
            c = _centroid_for(name)
            by_location.append({
                "location": name,
                "count": int(cnt),
                "share_pct": round(100 * int(cnt) / grand, 1) if grand else 0.0,
                "lat": c[0] if c else None,
                "lng": c[1] if c else None,
                "mapped": c is not None,
            })

    # Response time for emergency calls (median + P90 dispatch→on-scene).
    response = None
    disp = detect_mapped_column(df, "dispatch_time", ov)
    arr = detect_mapped_column(df, "arrival_time", ov)
    if disp and arr:
        rt = _minutes_between(df.loc[emergency_mask], disp, arr)
        if rt is not None and rt.notna().sum() > 0:
            response = {
                "median_minutes": _safe(round(float(rt.median()), 1)),
                "p90_minutes": _safe(round(float(rt.quantile(0.90)), 1)),
                "sample_size": int(rt.notna().sum()),
            }

    # Trend: recent half vs earlier half (weekly rate of the event).
    trend = "stable"
    if len(valid) and len(event_dt):
        mid = valid.min() + (valid.max() - valid.min()) / 2
        recent = int((event_dt >= mid).sum())
        earlier = len(event_dt) - recent
        half = max(span_days / 2.0, 1.0)
        rr, er = recent / half * 7, earlier / half * 7
        trend = "rising" if rr >= er * 1.15 else ("falling" if rr <= er * 0.85 else "stable")

    # Forecast next horizon by weekday seasonal average.
    last = valid.max().normalize() if len(valid) else None
    forecast = []
    if last is not None:
        for k in range(1, horizon_days + 1):
            d = last + pd.Timedelta(days=k)
            forecast.append({
                "date": d.strftime("%Y-%m-%d"),
                "weekday": _WD[d.dayofweek],
                "expected": round(wd_avg[d.dayofweek], 1),
            })
    weekly_expected = round(sum(wd_avg.values()), 1)

    transport_rate = (
        round(100 * transports_n / emergency_n, 1)
        if (transports_n is not None and emergency_n) else None
    )

    warnings: List[str] = []
    if span_days and span_days < 365:
        warnings.append(f"Only ~{span_days} days of history — weekly averages are approximate.")
    if transport_mask is None:
        warnings.append("No transport-disposition column found — showing emergency call volume (transports could not be split out).")

    return {
        "available": True,
        "applicable": True,
        "horizon_days": horizon_days,
        "event_label": event_label,
        "emergency_calls": emergency_n,
        "transports": transports_n,
        "non_transports": (emergency_n - transports_n) if transports_n is not None else None,
        "transport_rate_pct": transport_rate,
        "transport_basis": dispo_col,
        "context": ctx,
        "trend": trend,
        "weekly_expected": weekly_expected,
        "busiest_day": busiest_day,
        "peak_hour": peak_hour,
        "response": response,
        "by_weekday": by_weekday,
        "by_hour": by_hour,
        "by_type": by_type,
        "by_location": by_location,
        "forecast": forecast,
        "warnings": warnings,
    }
