"""
Staffing turnover (attrition) prediction.

Two paths, one output contract so the UI/AI layer is identical:

  1. TRAINED FORECAST — when a client provides monthly separation/HR history,
     `forecast_terminations()` runs the faithful SBEMS model: a Ridge regression
     on monthly termination counts (cyclical + lag + rolling features) plus the
     SBEMS "stress index" (volatility / elevation / trend composite). This is a
     direct port of the SBEMS `TerminationPredictor` so the platform reproduces
     the analysis the client validated.

  2. OPERATIONAL RISK PROXY (default) — the EMSCharts dispatch upload has no
     personnel records, so with dispatch data alone we estimate turnover *risk*
     from operational strain (unit-hour utilization, response-time pressure,
     call-volume trend, coverage adequacy). It is an honest proxy — labeled as
     such — not a headcount forecast, and it emits the same `stress_index` shape
     (composite 0-100 → LOW/MODERATE/HIGH/CRITICAL) as the trained path.

Both reuse the dashboard's column resolution + predictive staffing so the
numbers reconcile with the rest of the platform.
"""
import logging
from typing import Any, Dict, List, Optional

import numpy as np
import pandas as pd

logger = logging.getLogger(__name__)

# Stress thresholds — identical to the SBEMS stress index for consistency.
_LEVELS = [(70.0, "CRITICAL"), (55.0, "HIGH"), (40.0, "MODERATE"), (0.0, "LOW")]

# SBEMS Ridge feature set (ported verbatim).
_FEATURE_COLS = [
    "month", "quarter", "month_sin", "month_cos", "trend",
    "lag_1", "lag_2", "lag_3", "lag_6",
    "rolling_mean_3", "rolling_mean_6", "rolling_std_3",
]


def _level(composite: float) -> str:
    for threshold, name in _LEVELS:
        if composite >= threshold:
            return name
    return "LOW"


def _clamp(x: float, lo: float = 0.0, hi: float = 100.0) -> float:
    return float(max(lo, min(hi, x)))


# ---------------------------------------------------------------------------
# 1) Faithful SBEMS termination forecaster (HR/separation data)
# ---------------------------------------------------------------------------

def _monthly_terminations(terminations_df: pd.DataFrame) -> pd.DataFrame:
    """Aggregate termination dates → monthly counts, gaps filled with 0
    (port of SBEMS prepare_monthly_data)."""
    df = terminations_df.copy()
    df["date"] = pd.to_datetime(df["date"], errors="coerce")
    df = df.dropna(subset=["date"])
    df["ym"] = df["date"].dt.to_period("M")
    monthly = df.groupby("ym").size().reset_index(name="terminations")
    monthly["ym"] = monthly["ym"].dt.to_timestamp()
    if len(monthly):
        full = pd.date_range(monthly["ym"].min(), monthly["ym"].max(), freq="MS")
        monthly = monthly.set_index("ym").reindex(full, fill_value=0).reset_index()
        monthly.columns = ["date", "terminations"]
    return monthly


def _termination_features(df: pd.DataFrame) -> pd.DataFrame:
    """Cyclical + lag + rolling features (port of SBEMS create_features)."""
    df = df.copy()
    df["month"] = df["date"].dt.month
    df["quarter"] = df["date"].dt.quarter
    df["month_sin"] = np.sin(2 * np.pi * df["month"] / 12)
    df["month_cos"] = np.cos(2 * np.pi * df["month"] / 12)
    for lag in (1, 2, 3, 6):
        df[f"lag_{lag}"] = df["terminations"].shift(lag)
    df["rolling_mean_3"] = df["terminations"].rolling(3, min_periods=1).mean().shift(1)
    df["rolling_mean_6"] = df["terminations"].rolling(6, min_periods=1).mean().shift(1)
    df["rolling_std_3"] = df["terminations"].rolling(3, min_periods=1).std().shift(1)
    df["trend"] = range(len(df))
    return df


def _termination_stress_index(monthly: pd.DataFrame) -> Dict[str, Any]:
    """SBEMS composite stress index: volatility(0.3)+elevation(0.4)+trend(0.3)."""
    y = monthly["terminations"]
    hist_mean = float(y.mean()) if len(y) else 0.0
    std = float(y.std()) if len(y) > 1 else 0.0

    volatility = float(y.rolling(6, min_periods=2).std().iloc[-1]) if len(y) >= 2 else 0.0
    vol_score = _clamp((volatility / std * 50) if std > 0 else 0.0)
    elevation_score = float((y.tail(3) > hist_mean).sum()) / 3 * 100
    recent_trend = float(y.tail(3).mean() - y.head(3).mean()) if len(y) >= 3 else 0.0
    trend_score = _clamp((recent_trend / hist_mean * 50 + 50) if hist_mean > 0 else 50.0)

    composite = vol_score * 0.3 + elevation_score * 0.4 + trend_score * 0.3
    return {
        "composite_index": round(composite, 1),
        "level": _level(composite),
        "components": {
            "volatility": {"score": round(vol_score, 1), "weight": 0.3,
                           "detail": "Swings in recent monthly separations."},
            "elevation": {"score": round(elevation_score, 1), "weight": 0.4,
                          "detail": "Recent months running above the historical average."},
            "trend": {"score": round(trend_score, 1), "weight": 0.3,
                      "detail": "Direction of separations over the window."},
        },
        "historical_mean_monthly": round(hist_mean, 2),
        "last_month_actual": int(y.iloc[-1]) if len(y) else 0,
    }


def forecast_terminations(terminations_df: pd.DataFrame, n_months: int = 6) -> Dict[str, Any]:
    """Train the SBEMS Ridge model on monthly separations and forecast forward.

    `terminations_df` needs a `date` column of separation dates (one row each).
    Returns the unified turnover contract with method='trained_forecast'.
    """
    from sklearn.linear_model import Ridge

    monthly = _monthly_terminations(terminations_df)
    if len(monthly) < 6:
        return {"available": False, "reason": f"Only {len(monthly)} months of separation history — need ~12+ for a reliable forecast."}

    feats = _termination_features(monthly)
    model_df = feats.dropna().reset_index(drop=True)
    if len(model_df) < 6:
        return {"available": False, "reason": "Insufficient separation history after feature lags (need ~12+ months)."}

    X, y = model_df[_FEATURE_COLS], model_df["terminations"]
    model = Ridge(alpha=1.0)
    model.fit(X, y)
    preds_in = model.predict(X)
    metrics = {
        "mae": round(float(np.mean(np.abs(y - preds_in))), 3),
        "rmse": round(float(np.sqrt(np.mean((y - preds_in) ** 2))), 3),
        "r2": round(float(1 - np.sum((y - preds_in) ** 2) / np.sum((y - y.mean()) ** 2)), 3) if y.var() else None,
    }

    hist_mean = float(monthly["terminations"].mean())
    hist_std = float(monthly["terminations"].std()) if len(monthly) > 1 else 0.0
    last_date = feats["date"].max()
    recent = list(monthly["terminations"].tail(12).values)
    forecast: List[Dict[str, Any]] = []
    for i in range(n_months):
        fdate = last_date + pd.DateOffset(months=i + 1)
        seq = recent + [p["predicted"] for p in forecast]
        row = {
            "month": fdate.month, "quarter": fdate.quarter,
            "month_sin": np.sin(2 * np.pi * fdate.month / 12),
            "month_cos": np.cos(2 * np.pi * fdate.month / 12),
            "trend": len(feats) + i,
            "lag_1": seq[-1] if len(seq) >= 1 else 0,
            "lag_2": seq[-2] if len(seq) >= 2 else 0,
            "lag_3": seq[-3] if len(seq) >= 3 else 0,
            "lag_6": seq[-6] if len(seq) >= 6 else 0,
            "rolling_mean_3": float(np.mean(seq[-3:])) if seq else 0.0,
            "rolling_mean_6": float(np.mean(seq[-6:])) if seq else 0.0,
            "rolling_std_3": float(np.std(seq[-3:])) if len(seq) > 1 else 0.0,
        }
        pred = max(0.0, float(model.predict(pd.DataFrame([row])[_FEATURE_COLS])[0]))
        if hist_std > 0 and pred >= hist_mean + 1.5 * hist_std:
            risk = "HIGH"
        elif hist_std > 0 and pred >= hist_mean + 0.5 * hist_std:
            risk = "ELEVATED"
        elif pred >= hist_mean:
            risk = "MODERATE"
        else:
            risk = "LOW"
        forecast.append({
            "month": fdate.strftime("%Y-%m"),
            "predicted": round(pred, 1),
            "risk_level": risk,
            "risk_score": round(_clamp((pred - hist_mean) / hist_std * 50 + 50) if hist_std > 0 else 50.0, 0),
        })

    return {
        "available": True,
        "method": "trained_forecast",
        "method_label": "Trained termination forecast (SBEMS Ridge model)",
        "stress_index": _termination_stress_index(monthly),
        "forecast": forecast,
        "monthly_history": [
            {"month": d.strftime("%Y-%m"), "terminations": int(t)}
            for d, t in zip(monthly["date"], monthly["terminations"])
        ],
        "model_metrics": metrics,
        "note": "Forecast of monthly staff separations from your HR history. Decision support — review with leadership.",
    }


# ---------------------------------------------------------------------------
# 2) Operational turnover-risk proxy (dispatch data only)
# ---------------------------------------------------------------------------

def _operational_stress(pred: Dict[str, Any]) -> Dict[str, Any]:
    staffing = pred.get("staffing") or {}
    fc = pred.get("call_volume_forecast") or {}
    rt = staffing.get("response_time") or {}
    assumptions = staffing.get("assumptions") or {}

    uhu = staffing.get("projected_unit_hour_utilization")
    target_uhu = assumptions.get("target_unit_hour_utilization", 0.30) or 0.30
    p90 = rt.get("p90_minutes")
    target_p90 = rt.get("target_p90_minutes", 9.0) or 9.0
    meeting = rt.get("meeting_target")
    resp_adj = rt.get("adjustment_units", 0) or 0
    binding = staffing.get("binding_constraint")
    trend = fc.get("trend_direction")

    drivers: List[str] = []

    # Utilization pressure (0.35) — chronic overwork is the strongest burnout signal.
    if uhu is not None:
        util = _clamp((uhu - target_uhu) / 0.25 * 100)
        if util >= 50:
            drivers.append(f"Unit-hour utilization {uhu} is well above the {target_uhu} target — sustained overwork drives burnout and attrition.")
        elif util <= 5:
            drivers.append(f"Utilization {uhu} is within the {target_uhu} target — low overwork-driven turnover pressure.")
    else:
        util = 0.0

    # Response-time pressure (0.25) — stretched crews across the response area.
    if p90 is not None:
        resp = _clamp((p90 / target_p90 - 1.0) * 100)
        if meeting is False:
            drivers.append(f"Response P90 {p90} min exceeds the {target_p90} min target — crews are stretched on call coverage.")
    else:
        resp = 0.0

    # Call-volume growth (0.20) — rising demand without added staff = rising strain.
    vol = {"increasing": 65.0, "rising": 65.0, "stable": 25.0, "decreasing": 10.0, "falling": 10.0}.get((trend or "").lower(), 25.0)
    if vol >= 60:
        drivers.append("Call volume is trending up — rising workload without added staff compounds crew strain.")

    # Coverage adequacy (0.20) — under-resourcing forces overtime/holdovers.
    if meeting is False:
        cov = _clamp(50 + 15 * resp_adj)
        if resp_adj > 0:
            drivers.append(f"Staffing is response-time-bound (+{resp_adj} unit(s) recommended) — gaps get filled by overtime/holdovers.")
    elif binding == "demand":
        cov = 45.0
    else:
        cov = 20.0

    composite = util * 0.35 + resp * 0.25 + vol * 0.20 + cov * 0.20
    if not drivers:
        drivers.append("No major operational strain signals — turnover risk from overwork looks low on current data.")

    return {
        "composite_index": round(composite, 1),
        "level": _level(composite),
        "components": {
            "utilization_pressure": {"score": round(util, 1), "weight": 0.35,
                                     "detail": f"Projected unit-hour utilization vs {target_uhu} target."},
            "response_pressure": {"score": round(resp, 1), "weight": 0.25,
                                  "detail": f"Response P90 vs {target_p90} min target."},
            "volume_growth": {"score": round(vol, 1), "weight": 0.20,
                              "detail": f"Call-volume trend ({trend or 'n/a'})."},
            "coverage_adequacy": {"score": round(cov, 1), "weight": 0.20,
                                  "detail": "Whether current units meet demand + response targets."},
        },
        "drivers": drivers,
    }


def get_turnover_outlook(upload, db, terminations_df: Optional[pd.DataFrame] = None) -> Dict[str, Any]:
    """Unified turnover entry point.

    If `terminations_df` (HR separation history) is supplied, returns the trained
    SBEMS forecast. Otherwise returns the operational risk proxy from dispatch data.
    """
    # Trained path — only when real separation history is available.
    if terminations_df is not None and not terminations_df.empty:
        try:
            out = forecast_terminations(terminations_df)
            if out.get("available"):
                return out
        except Exception as exc:  # noqa: BLE001
            logger.warning("turnover: trained forecast failed, falling back to proxy: %s", exc)

    # Proxy path — operational strain from dispatch data.
    from .ems_predictive_service import _load_df, get_predictive_dashboard

    df = _load_df(upload)
    if df is None or df.empty:
        return {"available": False, "reason": "No cleaned data available for this upload."}

    pred = get_predictive_dashboard(upload, db) or {}
    if not pred.get("available"):
        return {"available": False, "reason": pred.get("reason", "Predictive inputs unavailable.")}

    ctx = pred.get("context") or {}
    staffing = pred.get("staffing") or {}
    rt = staffing.get("response_time") or {}
    fc = pred.get("call_volume_forecast") or {}

    stress = _operational_stress(pred)
    warnings = list(pred.get("warnings") or [])

    return {
        "available": True,
        "method": "operational_proxy",
        "method_label": "Operational turnover-risk proxy (dispatch-derived)",
        "stress_index": {k: v for k, v in stress.items() if k != "drivers"},
        "drivers": stress["drivers"],
        "context": {
            "history_start": ctx.get("history_start"),
            "history_end": ctx.get("history_end"),
            "days_available": ctx.get("days_available"),
            "total_calls": ctx.get("total_calls"),
            "unit_hour_utilization": staffing.get("projected_unit_hour_utilization"),
            "response_p90_minutes": rt.get("p90_minutes"),
            "response_target_minutes": rt.get("target_p90_minutes"),
            "volume_trend": fc.get("trend_direction"),
        },
        # The trained SBEMS forecaster is ready; it needs HR data the dispatch export lacks.
        "hr_forecast": {
            "available": False,
            "reason": (
                "Upload monthly staff separation/HR history to enable the trained termination "
                "forecast (the SBEMS Ridge model) — the dispatch export contains no personnel records."
            ),
        },
        "note": (
            "Operational turnover-RISK estimate from dispatch data — a burnout/strain proxy, not a "
            "headcount forecast. It flags conditions that drive attrition (overwork, stretched "
            "response, rising demand, thin coverage)."
        ),
        "warnings": warnings,
    }
