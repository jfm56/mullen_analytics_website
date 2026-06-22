"""
Interfacility-transport (IFT) outlook.

IFT is scheduled/recurring (dialysis, discharges, appointments), so unlike
emergent calls it has a strong, learnable weekly + daily rhythm. We:
  • detect IFT rows with the platform's shared classifier (consistent with the
    dashboard's Emergency-vs-Interfacility split),
  • expose the day-of-week and hour patterns,
  • forecast near-term IFT counts from day-of-week seasonality — the right,
    honest method for sparse scheduled demand (heavy ML would overfit ~1/day),
  • recommend a dedicated-crew coverage window (which weekday hours capture the
    most transfers),
  • and gate on applicability: agencies with little IFT get a clear
    "not significant" response instead of a spurious schedule.
"""
import logging
from typing import Any, Dict, List, Optional

import numpy as np
import pandas as pd

from .ems_analytics_service import detect_mapped_column
from .ems_column_mapping_service import get_column_overrides
from .ems_filter_service import detect_interfacility_rows
from .ems_geographic_service import _centroid_for, _detect_location_column, _normalize_location
from .ems_predictive_service import _load_df, _resolve_dt

logger = logging.getLogger(__name__)

_WD = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"]
_MIN_IFT = 30          # too few transfers to schedule around
_MIN_SHARE = 0.015     # < 1.5% of volume → not worth a dedicated schedule


def _ift_hours(df: pd.DataFrame, dt: pd.Series, mask: pd.Series) -> pd.Series:
    """Dispatch hour for the masked rows (prefers the precomputed hour column)."""
    cols = {c.lower(): c for c in df.columns}
    hod = cols.get("hour_of_day_of_dispatch")
    h = pd.to_numeric(df[hod], errors="coerce") if hod else dt.dt.hour
    h = h[mask].dropna().astype(int)
    return h[(h >= 0) & (h <= 23)]


def get_ift_outlook(upload, db, horizon_days: int = 14, shift_hours: int = 8) -> Dict[str, Any]:
    df = _load_df(upload)
    if df is None or df.empty:
        return {"available": False, "reason": "No cleaned data available for this upload."}
    try:
        ov = get_column_overrides(upload, db) or {}
    except Exception:  # noqa: BLE001
        ov = {}
    _, dt = _resolve_dt(df, ov)
    if dt is None:
        return {"available": False, "reason": "No usable dispatch/received date column detected."}

    mask = detect_interfacility_rows(df)
    total = len(df)
    ift_n = int(mask.sum())
    share = (ift_n / total) if total else 0.0
    valid = dt.dropna()
    span_days = int((valid.max() - valid.min()).days + 1) if len(valid) else 0

    ctx = {
        "history_start": str(valid.min().date()) if len(valid) else None,
        "history_end": str(valid.max().date()) if len(valid) else None,
        "days_available": span_days,
        "total_calls": total,
        "method": "day-of-week seasonal (scheduled-demand)",
    }

    # Applicability gate.
    if ift_n < _MIN_IFT or share < _MIN_SHARE:
        return {
            "available": True,
            "applicable": False,
            "ift_count": ift_n,
            "ift_share_pct": round(share * 100, 1),
            "reason": (
                f"Only {ift_n} interfacility transports ({share * 100:.1f}% of volume) — "
                "too few to warrant a dedicated IFT schedule for this agency."
            ),
            "context": ctx,
        }

    ift_dt = dt[mask].dropna()

    # Weekday denominators (how many of each weekday fall in the span).
    dow_days = {i: 0 for i in range(7)}
    cur, end = valid.min().normalize(), valid.max().normalize()
    while cur <= end:
        dow_days[cur.dayofweek] += 1
        cur += pd.Timedelta(days=1)
    dow_ct = ift_dt.dt.dayofweek.value_counts().to_dict()
    wd_avg = {i: (dow_ct.get(i, 0) / max(dow_days[i], 1)) for i in range(7)}
    by_weekday = [
        {"weekday": _WD[i], "avg_per_day": round(wd_avg[i], 2), "total": int(dow_ct.get(i, 0))}
        for i in range(7)
    ]

    # Hour distribution (all IFT) + weekday-only histogram for the schedule window.
    by_hour = {int(h): int(c) for h, c in _ift_hours(df, dt, mask).value_counts().sort_index().items()}
    wk_mask = mask & (dt.dt.dayofweek < 5)
    wk_hours = _ift_hours(df, dt, wk_mask)
    hist = np.zeros(24)
    for h, c in wk_hours.value_counts().items():
        hist[int(h)] = c

    # Type breakdown.
    itype = detect_mapped_column(df, "incident_type", ov)
    by_type: List[Dict[str, Any]] = []
    if itype and itype in df.columns:
        for t, c in df.loc[mask, itype].astype(str).value_counts().head(6).items():
            by_type.append({"type": t, "count": int(c)})

    # Location breakdown — which scene areas generate the most transfers, so a
    # transport crew can be staged near demand. (Origin->destination FACILITY
    # routing needs a receiving-facility field the EMSCharts export lacks; this
    # is the scene location, mapped to a centroid where known.)
    by_location: List[Dict[str, Any]] = []
    loc_col = _detect_location_column(df, ov)
    if loc_col:
        locs = df.loc[mask, loc_col].dropna().astype(str).map(_normalize_location)
        locs = locs[locs.str.len() > 0]
        grand = int(locs.shape[0])
        weeks = max(span_days / 7.0, 1.0)
        for name, cnt in locs.value_counts().head(12).items():
            c = _centroid_for(name)
            by_location.append({
                "location": name,
                "count": int(cnt),
                "share_pct": round(100 * int(cnt) / grand, 1) if grand else 0.0,
                "avg_per_week": round(int(cnt) / weeks, 2),
                "lat": c[0] if c else None,
                "lng": c[1] if c else None,
                "mapped": c is not None,
            })

    # Trend: recent half vs earlier half (weekly rate).
    mid = valid.min() + (valid.max() - valid.min()) / 2
    recent = int((ift_dt >= mid).sum())
    earlier = ift_n - recent
    half = max(span_days / 2.0, 1.0)
    rr, er = recent / half * 7, earlier / half * 7
    trend = "rising" if rr >= er * 1.15 else ("falling" if rr <= er * 0.85 else "stable")

    # Forecast next horizon by weekday seasonal average.
    last = valid.max().normalize()
    forecast = []
    for k in range(1, horizon_days + 1):
        d = last + pd.Timedelta(days=k)
        forecast.append({
            "date": d.strftime("%Y-%m-%d"),
            "weekday": _WD[d.dayofweek],
            "expected_ift": round(wd_avg[d.dayofweek], 1),
        })
    weekly_expected = round(sum(wd_avg.values()), 1)

    # Schedule recommendation: weekday shift window capturing the most IFT.
    best_start, best_cov = 8, 0.0
    for s0 in range(0, 24 - shift_hours + 1):
        cov = float(hist[s0:s0 + shift_hours].sum())
        if cov > best_cov:
            best_cov, best_start = cov, s0
    n_weekdays = sum(dow_days[i] for i in range(5))
    schedule = {
        "window_days": "Mon–Fri",
        "window_start": int(best_start),
        "window_end": int(best_start + shift_hours),
        "shift_hours": shift_hours,
        "pct_of_all_ift_covered": round(100 * best_cov / max(ift_n, 1), 1),
        "avg_ift_per_shift": round(best_cov / max(n_weekdays, 1), 1),
        "note": (
            "A dedicated transport crew on this weekday window would cover the bulk of "
            "scheduled transfers, freeing emergency units."
        ),
    }

    warnings = []
    if span_days < 365:
        warnings.append(f"Only ~{span_days} days of history — weekly averages are approximate.")
    if share < 0.05:
        warnings.append("IFT is a small share of volume; a part-time or on-call transport crew may suffice.")

    return {
        "available": True,
        "applicable": True,
        "horizon_days": horizon_days,
        "ift_count": ift_n,
        "ift_share_pct": round(share * 100, 1),
        "context": ctx,
        "trend": trend,
        "weekly_expected_ift": weekly_expected,
        "by_weekday": by_weekday,
        "by_hour": by_hour,
        "by_type": by_type,
        "by_location": by_location,
        "forecast": forecast,
        "schedule_recommendation": schedule,
        "warnings": warnings,
    }
