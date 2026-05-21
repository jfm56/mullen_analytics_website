"""
Module 6 — Forecasting  (Predictive+ tier).

Daily call-volume forecasting with automatic model selection.

Candidate models
----------------
  1. Moving-average baseline          (7-day rolling mean)
  2. LinearRegression
  3. Ridge                            (alpha=1.0)
  4. GradientBoostingRegressor        (n_estimators=100, max_depth=3)
  5. RandomForestRegressor            (n_estimators=100, min_samples_leaf=5)
  6. VotingRegressor                  (LR + Ridge + RF)
  7. StackingRegressor                (LR + Ridge + RF → Ridge meta)

Feature set (on daily aggregated call counts)
---------------------------------------------
  Lag_1 … Lag_7, Lag_14, Lag_30
  Rolling_7_mean, Rolling_7_std
  Rolling_14_mean, Rolling_30_mean
  Month_sin/cos, DayOfWeek_sin/cos, DayOfYear_sin/cos
  Year, Quarter, IsWeekend, IsMonthStart, IsMonthEnd

Evaluation
----------
  Test set : last 90 days of available data
  Metrics  : MAE, RMSE, R²
  Winner   : lowest MAE; R² < 0.3 triggers a reliability warning

Output includes
---------------
  historical, forecast_months, forecast_values, forecast_lower/upper
  model_name, model_reason, model_scores, top_features, is_reliable,
  reliability_warning
"""
import json
import logging
from pathlib import Path
from typing import Any, Dict, List, Optional

import numpy as np
import pandas as pd
from sklearn.ensemble import (
    GradientBoostingRegressor,
    RandomForestRegressor,
    StackingRegressor,
    VotingRegressor,
)
from sklearn.linear_model import LinearRegression, Ridge
from sklearn.metrics import mean_absolute_error, mean_squared_error, r2_score
from sklearn.pipeline import Pipeline
from sklearn.preprocessing import StandardScaler

from .columns import normalize_cols, resolve

logger = logging.getLogger(__name__)


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------

_MIN_TRAIN_DAYS = 120   # need at least this many days before the 90-day test set
_TEST_DAYS      = 90
_HORIZON_DAYS   = 365  # iterative forecast window (aggregated to monthly)
_Z80            = 1.282


# ── Daily time series ─────────────────────────────────────────────────────────

def _daily_series(df: pd.DataFrame) -> Optional[pd.Series]:
    """Return daily call counts indexed by date, or None if not possible."""
    if "_dt_created" in df.columns:
        dates = df["_dt_created"].dropna()
    else:
        df_n     = normalize_cols(df)
        date_col = resolve(df_n, "date_created") or resolve(df_n, "call_date")
        if not date_col:
            return None
        dates = pd.to_datetime(df_n[date_col], errors="coerce").dropna()

    if dates.empty:
        return None

    daily = dates.dt.normalize().value_counts().sort_index()
    daily.index = pd.DatetimeIndex(daily.index)
    full_range = pd.date_range(daily.index.min(), daily.index.max(), freq="D")
    daily = daily.reindex(full_range, fill_value=0)
    return daily


# ── Feature engineering ───────────────────────────────────────────────────────

def _engineer_features(daily: pd.Series) -> pd.DataFrame:
    """Build a feature DataFrame aligned with *daily*."""
    df = pd.DataFrame({"calls": daily.values}, index=daily.index)

    # Lag features
    for lag in (1, 2, 3, 7, 14, 30):
        df[f"Lag_{lag}"] = df["calls"].shift(lag)

    # Rolling statistics
    df["Rolling_7_mean"]  = df["calls"].shift(1).rolling(7,  min_periods=1).mean()
    df["Rolling_7_std"]   = df["calls"].shift(1).rolling(7,  min_periods=2).std().fillna(0)
    df["Rolling_14_mean"] = df["calls"].shift(1).rolling(14, min_periods=1).mean()
    df["Rolling_30_mean"] = df["calls"].shift(1).rolling(30, min_periods=1).mean()

    # Calendar features
    idx = df.index
    df["Year"]         = idx.year
    df["Quarter"]      = idx.quarter
    df["IsWeekend"]    = (idx.dayofweek >= 5).astype(int)
    df["IsMonthStart"] = idx.is_month_start.astype(int)
    df["IsMonthEnd"]   = idx.is_month_end.astype(int)

    # Cyclical encodings
    df["Month_sin"]      = np.sin(2 * np.pi * idx.month      / 12)
    df["Month_cos"]      = np.cos(2 * np.pi * idx.month      / 12)
    df["DayOfWeek_sin"]  = np.sin(2 * np.pi * idx.dayofweek  / 7)
    df["DayOfWeek_cos"]  = np.cos(2 * np.pi * idx.dayofweek  / 7)
    df["DayOfYear_sin"]  = np.sin(2 * np.pi * idx.dayofyear  / 365)
    df["DayOfYear_cos"]  = np.cos(2 * np.pi * idx.dayofyear  / 365)

    return df.dropna()


# ── Model definitions ─────────────────────────────────────────────────────────

def _build_models() -> Dict[str, Any]:
    lr    = LinearRegression()
    ridge = Ridge(alpha=1.0)
    rf    = RandomForestRegressor(n_estimators=100, min_samples_leaf=5, random_state=42, n_jobs=-1)
    gb    = GradientBoostingRegressor(n_estimators=100, max_depth=3, learning_rate=0.05, random_state=42)

    voting  = VotingRegressor(estimators=[("lr", LinearRegression()), ("ridge", Ridge()), ("rf", rf)])
    stacking = StackingRegressor(
        estimators=[("lr", LinearRegression()), ("ridge", Ridge()), ("rf", rf)],
        final_estimator=Ridge(),
        cv=3,
        n_jobs=-1,
    )

    return {
        "LinearRegression":          Pipeline([("scl", StandardScaler()), ("mdl", lr)]),
        "Ridge":                     Pipeline([("scl", StandardScaler()), ("mdl", ridge)]),
        "GradientBoostingRegressor": gb,
        "RandomForestRegressor":     rf,
        "VotingRegressor":           voting,
        "StackingRegressor":         stacking,
    }


# ── Baseline moving average ───────────────────────────────────────────────────

def _moving_avg_predict(train: pd.Series, n_test: int, window: int = 7) -> np.ndarray:
    history = list(train.values.astype(float))
    preds   = []
    for _ in range(n_test):
        pred = np.mean(history[-window:])
        preds.append(pred)
        history.append(pred)
    return np.array(preds)


# ── Feature importance extraction ────────────────────────────────────────────

def _feature_importance(model: Any, feature_names: List[str]) -> List[Dict[str, Any]]:
    actual = model
    if hasattr(model, "named_steps"):
        actual = model.named_steps.get("mdl", model)
    if hasattr(actual, "feature_importances_"):
        imps = actual.feature_importances_
    elif hasattr(actual, "coef_"):
        imps = np.abs(actual.coef_)
    else:
        return []
    pairs = sorted(zip(feature_names, imps), key=lambda t: t[1], reverse=True)
    total = sum(v for _, v in pairs) or 1.0
    return [
        {"feature": f, "importance": round(float(v / total), 4)}
        for f, v in pairs[:10]
    ]


# ── Iterative forecast ────────────────────────────────────────────────────────

def _iterative_forecast(
    model: Any,
    feature_matrix: pd.DataFrame,
    last_known: pd.Series,
    n_days: int,
) -> np.ndarray:
    """
    Forecast *n_days* into the future by iterating the trained model.
    New predictions are fed back as lag / rolling features.
    """
    feature_cols = [c for c in feature_matrix.columns if c != "calls"]
    history      = list(last_known.values.astype(float))
    last_date    = last_known.index[-1]
    predictions  = []

    for i in range(n_days):
        future_date = last_date + pd.Timedelta(days=i + 1)
        n_hist      = len(history)

        row: Dict[str, float] = {}
        for lag in (1, 2, 3, 7, 14, 30):
            row[f"Lag_{lag}"] = history[-lag] if n_hist >= lag else 0.0

        def _roll_mean(w: int) -> float:
            return float(np.mean(history[-w:])) if n_hist >= 1 else 0.0

        def _roll_std(w: int) -> float:
            sl = history[-w:] if n_hist >= 2 else []
            return float(np.std(sl, ddof=1)) if len(sl) >= 2 else 0.0

        row["Rolling_7_mean"]  = _roll_mean(7)
        row["Rolling_7_std"]   = _roll_std(7)
        row["Rolling_14_mean"] = _roll_mean(14)
        row["Rolling_30_mean"] = _roll_mean(30)
        row["Year"]            = future_date.year
        row["Quarter"]         = future_date.quarter
        row["IsWeekend"]       = int(future_date.dayofweek >= 5)
        row["IsMonthStart"]    = int(future_date.is_month_start)
        row["IsMonthEnd"]      = int(future_date.is_month_end)
        row["Month_sin"]       = np.sin(2 * np.pi * future_date.month     / 12)
        row["Month_cos"]       = np.cos(2 * np.pi * future_date.month     / 12)
        row["DayOfWeek_sin"]   = np.sin(2 * np.pi * future_date.dayofweek / 7)
        row["DayOfWeek_cos"]   = np.cos(2 * np.pi * future_date.dayofweek / 7)
        row["DayOfYear_sin"]   = np.sin(2 * np.pi * future_date.dayofyear / 365)
        row["DayOfYear_cos"]   = np.cos(2 * np.pi * future_date.dayofyear / 365)

        x_row = np.array([[row.get(c, 0.0) for c in feature_cols]])
        pred  = max(0.0, float(model.predict(x_row)[0]))
        predictions.append(pred)
        history.append(pred)

    return np.array(predictions)


# ── Monthly aggregation ───────────────────────────────────────────────────────

def _daily_to_monthly(daily_vals: np.ndarray, start_date: pd.Timestamp) -> Dict[str, Any]:
    dates  = pd.date_range(start=start_date + pd.Timedelta(days=1), periods=len(daily_vals), freq="D")
    series = pd.Series(daily_vals, index=dates)
    monthly_sum = series.resample("ME").sum()
    monthly_sum.index = monthly_sum.index.to_period("M").astype(str)
    return monthly_sum.to_dict()


# ── Prediction interval via residual bootstrap ────────────────────────────────

def _pi_from_residuals(
    point_vals: List[float],
    residuals: np.ndarray,
    z: float = _Z80,
) -> tuple:
    std  = float(np.std(residuals, ddof=1)) if len(residuals) > 1 else 0.0
    lo   = [max(0.0, round(v - z * std, 1)) for v in point_vals]
    hi   = [max(0.0, round(v + z * std, 1)) for v in point_vals]
    return lo, hi


# ── Main forecasting function ─────────────────────────────────────────────────

def _forecast_call_volume(
    df: pd.DataFrame,
    horizon: int = 12,
) -> Dict[str, Any]:
    """
    Build a daily time series, engineer features, evaluate candidate models,
    select the winner by MAE, and return a 12-month forecast with explanation.
    """
    daily = _daily_series(df)
    if daily is None or len(daily) < _MIN_TRAIN_DAYS + _TEST_DAYS:
        return {
            "error": (
                f"Insufficient data for ML forecasting — need at least "
                f"{_MIN_TRAIN_DAYS + _TEST_DAYS} days, got "
                f"{len(daily) if daily is not None else 0}."
            )
        }

    feature_df   = _engineer_features(daily)
    feature_cols = [c for c in feature_df.columns if c != "calls"]

    X = feature_df[feature_cols].values
    y = feature_df["calls"].values

    n_test   = min(_TEST_DAYS, len(feature_df) // 4)
    n_train  = len(feature_df) - n_test
    X_train, X_test = X[:n_train], X[n_train:]
    y_train, y_test = y[:n_train], y[n_train:]
    dates_train     = feature_df.index[:n_train]
    daily_train     = daily.loc[daily.index <= feature_df.index[n_train - 1]]

    # ── Baseline: moving average ──────────────────────────────────────────
    ma_preds  = _moving_avg_predict(daily_train, n_test)
    ma_mae    = float(mean_absolute_error(y_test, ma_preds))
    ma_rmse   = float(np.sqrt(mean_squared_error(y_test, ma_preds)))
    ma_r2     = float(r2_score(y_test, ma_preds))

    scores: Dict[str, Dict[str, float]] = {
        "MovingAverage": {"mae": round(ma_mae, 3), "rmse": round(ma_rmse, 3), "r2": round(ma_r2, 3)},
    }

    # ── Sklearn models ────────────────────────────────────────────────────
    fitted_models: Dict[str, Any] = {}
    for name, model in _build_models().items():
        try:
            model.fit(X_train, y_train)
            preds = model.predict(X_test)
            preds = np.clip(preds, 0, None)
            scores[name] = {
                "mae":  round(float(mean_absolute_error(y_test, preds)), 3),
                "rmse": round(float(np.sqrt(mean_squared_error(y_test, preds))), 3),
                "r2":   round(float(r2_score(y_test, preds)), 3),
            }
            fitted_models[name] = model
        except Exception as exc:  # pylint: disable=broad-exception-caught
            logger.warning("Model %s failed: %s", name, exc)

    # ── Select winner by MAE ──────────────────────────────────────────────
    ranked = sorted(scores.items(), key=lambda kv: kv[1]["mae"])
    winner_name, winner_scores = ranked[0]

    is_reliable      = winner_scores["r2"] >= 0.3
    reliability_warn = (
        None if is_reliable
        else f"R²={winner_scores['r2']:.2f} — model explains <30% of variance; "
             "forecasts should be treated as indicative only."
    )

    # ── Fit winner on full data ───────────────────────────────────────────
    if winner_name == "MovingAverage":
        # Use the linear trend as fallback for iterative generation
        daily_vals_fcast = _moving_avg_predict(daily, _HORIZON_DAYS, window=7)
        residuals        = y_test - ma_preds
        top_features_out: List[Dict[str, Any]] = []
        reason = f"Moving average (7-day) achieved lowest MAE={ma_mae:.2f} among all candidates."
    else:
        winner_model = fitted_models[winner_name]
        winner_model.fit(X, y)                         # retrain on all data
        daily_vals_fcast = _iterative_forecast(
            winner_model, feature_df, daily, _HORIZON_DAYS
        )
        preds_test   = fitted_models[winner_name].predict(X_test)
        residuals    = y_test - preds_test
        top_features_out = _feature_importance(winner_model, feature_cols)
        reason = (
            f"{winner_name} achieved lowest MAE={winner_scores['mae']:.2f} "
            f"(RMSE={winner_scores['rmse']:.2f}, R²={winner_scores['r2']:.2f}) "
            f"across {len(fitted_models) + 1} candidate models."
        )

    # ── Aggregate daily forecast to monthly ──────────────────────────────
    last_date  = daily.index[-1]
    monthly_fc = _daily_to_monthly(daily_vals_fcast, last_date)
    fcast_mos  = list(monthly_fc.keys())[:horizon]
    fcast_vals = [round(monthly_fc[m], 1) for m in fcast_mos]
    lo, hi     = _pi_from_residuals(fcast_vals, residuals)

    # Historical monthly (for chart)
    monthly_hist = (
        daily.resample("ME")
        .sum()
        .pipe(lambda s: s.set_axis(s.index.to_period("M").astype(str)))
        .to_dict()
    )

    # Trend direction from slope over last 90 days of daily data
    last_90 = daily.iloc[-90:].values.astype(float)
    slope   = float(np.polyfit(np.arange(len(last_90)), last_90, 1)[0])
    direction = "increasing" if slope > 0.2 else ("decreasing" if slope < -0.2 else "stable")

    return {
        "historical":         {str(k): int(v) for k, v in monthly_hist.items()},
        "trend_slope":        round(slope, 3),
        "trend_direction":    direction,
        "forecast_months":    fcast_mos,
        "forecast_values":    fcast_vals,
        "forecast_lower":     lo,
        "forecast_upper":     hi,
        "model_name":         winner_name,
        "model_reason":       reason,
        "model_scores":       scores,
        "top_features":       top_features_out,
        "is_reliable":        is_reliable,
        "reliability_warning": reliability_warn,
        "test_days":          n_test,
        "train_days":         n_train,
    }


# ── Attrition risk (unchanged logic) ─────────────────────────────────────────

def _attrition_risk(staffing_summary: Dict[str, Any]) -> Dict[str, Any]:
    risk: Dict[str, Any] = {"risk_level": "low", "indicators": []}
    ot_pct   = staffing_summary.get("overtime_pct", 0.0) or 0.0
    gap_days = len(staffing_summary.get("staffing_gaps", []))
    n_staff  = staffing_summary.get("unique_employees", 0) or 0
    score    = 0

    if ot_pct > 30:
        risk["indicators"].append(f"High overtime rate ({ot_pct}%) — burnout risk.")
        score += 2
    elif ot_pct > 15:
        risk["indicators"].append(f"Elevated overtime rate ({ot_pct}%).")
        score += 1

    if gap_days > 10:
        risk["indicators"].append(f"{gap_days} days with staffing below minimum — coverage gaps.")
        score += 2
    elif gap_days > 3:
        risk["indicators"].append(f"{gap_days} days with staffing below minimum.")
        score += 1

    if n_staff < 15:
        risk["indicators"].append(f"Small roster ({n_staff} staff) — single departure has high impact.")
        score += 1

    risk["risk_level"] = "high" if score >= 4 else ("medium" if score >= 2 else "low")
    return risk


# ── Public run() ─────────────────────────────────────────────────────────────

def run(
    dispatch_files: List[Dict[str, Any]],
    output_dir: str,
    staffing_summary: Optional[Dict[str, Any]] = None,
    cleaned_df: Optional[pd.DataFrame] = None,
    quality_report: Optional[Dict[str, Any]] = None,
    horizon: int = 12,
) -> Dict[str, Any]:
    """Generate call-volume forecast and attrition risk assessment."""
    if cleaned_df is not None and not cleaned_df.empty:
        source_df = cleaned_df
    else:
        frames: List[pd.DataFrame] = []
        for f in dispatch_files:
            path = f.get("upload_path", "")
            ext  = Path(path).suffix.lower()
            try:
                df_raw = pd.read_csv(path, low_memory=False) if ext == ".csv" else pd.read_excel(path)
                frames.append(df_raw)
            except Exception as exc:  # pylint: disable=broad-exception-caught
                logger.warning("Could not load %s: %s", path, exc)
        source_df = pd.concat(frames, ignore_index=True) if frames else pd.DataFrame()

    if source_df.empty:
        call_volume_forecast: Dict[str, Any] = {"error": "No dispatch data available for forecasting."}
    else:
        call_volume_forecast = _forecast_call_volume(source_df, horizon)

    attrition = _attrition_risk(staffing_summary or {})
    summary = {
        "module":                  "forecasting",
        "forecast_horizon_months": horizon,
        "call_volume_forecast":    call_volume_forecast,
        "attrition_risk":          attrition,
    }

    out_path = Path(output_dir) / "forecasting_summary.json"
    Path(output_dir).mkdir(parents=True, exist_ok=True)
    with open(out_path, "w", encoding="utf-8") as fh:
        json.dump(summary, fh, indent=2, default=str)

    logger.info(
        "Forecasting complete: model=%s, direction=%s, attrition=%s",
        call_volume_forecast.get("model_name", "n/a"),
        call_volume_forecast.get("trend_direction", "n/a"),
        attrition["risk_level"],
    )
    return summary
