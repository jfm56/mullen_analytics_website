"""
Weather- & traffic-aware EMS call forecast — by DAY and by AREA.

Complements the monthly ems_predictive_service. Here we fit a daily model on
calendar + weather features (temperature, precipitation, snow, wind, derived
condition) and project the next ~14 days, then:
  • allocate each day's predicted volume across municipalities by historical
    share (robust with sparse per-area data — avoids N shaky per-area models),
  • overlay each area's typical-traffic congestion factor (from traffic_service;
    Google Routes if configured, else unavailable — traffic has no historical
    daily series, so it's an operational overlay, not a daily predictor),
  • quantify weather impact empirically (avg calls per day by condition).

Reuses the dashboard's data loading / datetime / geo helpers so it runs on the
same EMSCharts schema. Fails soft: weather/traffic outages degrade gracefully.
"""
import logging
from datetime import timedelta
from typing import Any, Dict, List, Optional

import numpy as np
import pandas as pd
from sklearn.ensemble import GradientBoostingRegressor, RandomForestRegressor
from sklearn.linear_model import Ridge
from sklearn.metrics import mean_absolute_error

from . import traffic_service, weather_service
from .ems_column_mapping_service import get_column_overrides
from .ems_geographic_service import (
    _centroid_for,
    _detect_location_column,
    _normalize_location,
)
from .ems_predictive_service import _load_df, _resolve_dt

logger = logging.getLogger(__name__)

_CONDITIONS = ["snow", "ice", "heavy_rain", "rain", "wind", "extreme_heat", "cold"]
_NUM = ["tmax", "tmin", "precip", "snow", "wind"]
_NJ_DEFAULT = (40.63, -74.90)
_Z80 = 1.2816


def _build_features(dates, weather: Dict, t0_ord: int, medians: Optional[Dict] = None):
    """Calendar + weather feature matrix for a list of pd.Timestamp dates."""
    rows: List[Dict[str, Any]] = []
    for d in dates:
        ds = d.strftime("%Y-%m-%d")
        w = weather.get(ds, {})
        dow = d.weekday()          # 0=Mon .. 6=Sun
        doy = d.timetuple().tm_yday
        feat = {
            "t": d.toordinal() - t0_ord,
            "dow_sin": np.sin(2 * np.pi * dow / 7),
            "dow_cos": np.cos(2 * np.pi * dow / 7),
            "doy_sin": np.sin(2 * np.pi * doy / 365.25),
            "doy_cos": np.cos(2 * np.pi * doy / 365.25),
            "is_weekend": 1.0 if dow >= 5 else 0.0,
            "tmax": w.get("temp_max_f"),
            "tmin": w.get("temp_min_f"),
            "precip": w.get("precip_in"),
            "snow": w.get("snow"),
            "wind": w.get("wind_mph"),
        }
        cond = w.get("condition")
        for c in _CONDITIONS:
            feat[f"cond_{c}"] = 1.0 if cond == c else 0.0
        rows.append(feat)

    X = pd.DataFrame(rows)
    if medians is None:
        medians = {}
        for c in _NUM:
            m = X[c].median()
            medians[c] = 0.0 if pd.isna(m) else float(m)
    for c in _NUM:
        X[c] = X[c].fillna(medians.get(c, 0.0))
    return X, medians


def forecast_calls_by_day_and_area(
    upload, db, horizon_days: int = 14, weather: bool = True, traffic: bool = True
) -> Dict[str, Any]:
    """Main entry point. Returns a daily aggregate forecast + per-area allocation
    + weather impact + traffic overlay."""
    df = _load_df(upload)
    if df is None or df.empty:
        return {"available": False, "reason": "No cleaned data available for this upload."}

    try:
        overrides = get_column_overrides(upload, db) or {}
    except Exception:  # noqa: BLE001
        overrides = {}

    dt_col, dt = _resolve_dt(df, overrides)
    if dt is None:
        return {"available": False, "reason": "No usable dispatch/received date column detected."}

    df = df.copy()
    df["_dt"] = dt
    valid = dt.dropna()
    if valid.empty:
        return {"available": False, "reason": "No valid dates parsed from the date column."}

    # Daily totals, gap-filled to a continuous date range.
    daily = valid.dt.normalize().value_counts().sort_index()
    daily.index = pd.DatetimeIndex(daily.index)
    full = pd.date_range(daily.index.min(), daily.index.max(), freq="D")
    daily = daily.reindex(full, fill_value=0)
    n = len(daily)
    if n < 21:
        return {"available": False, "reason": f"Only {n} days of history — need ~21+ for a weather-aware daily forecast."}
    total_calls = int(len(valid))

    # Area column + per-area centroids → service-area centroid for weather/traffic.
    loc_col = _detect_location_column(df, overrides)
    area_series = None
    if loc_col:
        area_series = df[loc_col].dropna().astype(str).map(_normalize_location)
        area_series = area_series[area_series.str.len() > 0]

    mapped_centroids: Dict[str, tuple] = {}
    if area_series is not None:
        for name in area_series.unique():
            c = _centroid_for(name)
            if c:
                mapped_centroids[name] = c
    if mapped_centroids:
        centroid = (
            sum(c[0] for c in mapped_centroids.values()) / len(mapped_centroids),
            sum(c[1] for c in mapped_centroids.values()) / len(mapped_centroids),
        )
    else:
        centroid = _NJ_DEFAULT

    # Historical weather over the training range.
    hist_start = daily.index.min().strftime("%Y-%m-%d")
    hist_end = daily.index.max().strftime("%Y-%m-%d")
    wmap = weather_service.get_weather_map(centroid[0], centroid[1], hist_start, hist_end) if weather else {}
    wmap = wmap or {}
    weather_ok = len(wmap) > 0

    # Train (+ pick best model on a recent holdout).
    t0_ord = daily.index.min().toordinal()
    Xtr, medians = _build_features(list(daily.index), wmap, t0_ord)
    ytr = daily.values.astype(float)
    test_n = min(21, max(7, n // 5))
    Xa, ya, Xb, yb = Xtr.iloc[:-test_n], ytr[:-test_n], Xtr.iloc[-test_n:], ytr[-test_n:]

    candidates = {
        "Ridge": Ridge(alpha=2.0),
        "RandomForest": RandomForestRegressor(n_estimators=200, min_samples_leaf=3, random_state=0),
        "GradientBoosting": GradientBoostingRegressor(n_estimators=150, max_depth=3, random_state=0),
    }
    best_name, best_mae, best_model = None, float("inf"), None
    for name, m in candidates.items():
        try:
            m.fit(Xa, ya)
            mae = mean_absolute_error(yb, m.predict(Xb))
            if mae < best_mae:
                best_name, best_mae, best_model = name, mae, m
        except Exception as exc:  # noqa: BLE001
            logger.warning("weather forecast model %s failed: %s", name, exc)
    if best_model is None:
        return {"available": False, "reason": "Daily model training failed."}

    best_model.fit(Xtr, ytr)  # refit on all history
    resid_std = float(np.std(ytr - best_model.predict(Xtr))) if n > 1 else 0.0

    # Future horizon: archive weather for past dates, forecast API for future ones.
    last = daily.index.max()
    future_dates = [last + timedelta(days=i) for i in range(1, horizon_days + 1)]
    today = pd.Timestamp.now().normalize()
    fut_w: Dict[str, Any] = {}
    if weather:
        past = [d for d in future_dates if d <= today]
        fut = [d for d in future_dates if d > today]
        if past:
            fut_w.update(weather_service.get_weather_map(
                centroid[0], centroid[1], past[0].strftime("%Y-%m-%d"), past[-1].strftime("%Y-%m-%d")) or {})
        if fut:
            fut_w.update(weather_service.get_weather_forecast(
                centroid[0], centroid[1], fut[0].strftime("%Y-%m-%d"), fut[-1].strftime("%Y-%m-%d")) or {})

    Xf, _ = _build_features(future_dates, fut_w, t0_ord, medians=medians)
    yf = np.clip(best_model.predict(Xf), 0, None)

    daily_forecast = []
    for d, yhat in zip(future_dates, yf):
        ds = d.strftime("%Y-%m-%d")
        w = fut_w.get(ds, {})
        daily_forecast.append({
            "date": ds,
            "weekday": d.day_name(),
            "predicted_calls": round(float(yhat), 1),
            "lower": round(max(0.0, float(yhat) - _Z80 * resid_std), 1),
            "upper": round(float(yhat) + _Z80 * resid_std, 1),
            "condition": w.get("condition"),
            "temp_max_f": w.get("temp_max_f"),
            "precip_in": w.get("precip_in"),
        })
    horizon_total = float(np.sum(yf))

    # Weather impact — empirical mean daily calls by condition over history.
    weather_impact: Dict[str, Any] = {"available": weather_ok, "by_condition": [], "baseline_avg": None}
    if weather_ok:
        idx = [d.strftime("%Y-%m-%d") for d in daily.index]
        dser = pd.Series(daily.values, index=idx)
        cser = pd.Series({ds: wmap.get(ds, {}).get("condition") for ds in idx})
        grand = float(dser.mean())
        weather_impact["baseline_avg"] = round(grand, 1)
        rows = []
        for cond, grp in dser.groupby(cser):
            if not cond:
                continue
            avg = float(grp.mean())
            rows.append({
                "condition": cond,
                "avg_calls": round(avg, 1),
                "days": int(len(grp)),
                "delta_pct": round((avg - grand) / grand * 100, 1) if grand else None,
            })
        rows.sort(key=lambda r: -(r["delta_pct"] or 0))
        weather_impact["by_condition"] = rows

    top_features = []
    if hasattr(best_model, "feature_importances_"):
        imp = sorted(zip(Xtr.columns, best_model.feature_importances_), key=lambda x: -x[1])[:8]
        top_features = [{"feature": f, "importance": round(float(v), 3)} for f, v in imp]

    # Per-area allocation by historical share.
    by_area = []
    if area_series is not None and len(area_series):
        counts = area_series.value_counts()
        grand_ct = int(counts.sum())
        for name, cnt in counts.items():
            share = (cnt / grand_ct) if grand_ct else 0.0
            c = mapped_centroids.get(name) or _centroid_for(name)
            by_area.append({
                "area": name,
                "share_pct": round(share * 100, 1),
                "predicted_total": round(horizon_total * share, 1),
                "avg_per_day": round(horizon_total * share / horizon_days, 2),
                "lat": c[0] if c else None,
                "lng": c[1] if c else None,
                "mapped": c is not None,
                "congestion_factor": None,
            })
        by_area.sort(key=lambda r: -r["predicted_total"])

    # Traffic overlay (typical congestion per area).
    traffic_info = {"available": False, "provider": None, "note": None, "areas": []}
    if traffic and mapped_centroids:
        try:
            tr = traffic_service.get_area_congestion(centroid, mapped_centroids)
            traffic_info = {
                "provider": tr.get("provider"),
                "available": tr.get("available"),
                "note": tr.get("note"),
                "areas": tr.get("areas", []),
            }
            cong = {a["name"]: a.get("congestion_factor") for a in tr.get("areas", [])}
            for r in by_area:
                if r["area"] in cong:
                    r["congestion_factor"] = cong[r["area"]]
        except Exception as exc:  # noqa: BLE001
            logger.warning("traffic enrichment failed: %s", exc)

    warnings: List[str] = []
    if weather and not weather_ok:
        warnings.append("Weather data was unavailable (network/API) — forecast used calendar patterns only.")
    if n < 365:
        warnings.append(f"Only ~{n} days of history — weather effects and longer horizons are approximate.")
    if not by_area:
        warnings.append("No mappable municipality/zone column detected — per-area breakdown is unavailable.")

    return {
        "available": True,
        "horizon_days": horizon_days,
        "context": {
            "history_start": hist_start,
            "history_end": hist_end,
            "days_available": n,
            "total_calls": total_calls,
            "datetime_column": dt_col,
            "model_name": best_name,
            "test_mae": round(best_mae, 2),
            "weather_source": "open-meteo" if weather_ok else None,
            "areas_total": len(by_area),
            "areas_mapped": sum(1 for r in by_area if r.get("mapped")),
            "service_centroid": {"lat": round(centroid[0], 4), "lng": round(centroid[1], 4)},
        },
        "horizon_total": round(horizon_total, 1),
        "daily_forecast": daily_forecast,
        "by_area": by_area,
        "weather_impact": weather_impact,
        "model": {"name": best_name, "test_mae": round(best_mae, 2), "top_features": top_features},
        "traffic": traffic_info,
        "warnings": warnings,
    }
