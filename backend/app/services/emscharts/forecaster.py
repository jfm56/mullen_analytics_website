"""Call Volume Forecaster v2 — rigorous, leakage-audited daily call-volume forecasting.

This is the unified-platform predictive model. It is NOT wired into any Cognito
route or dashboard — it is deployed only after its candidate passes validation
(see docs/model-validation-report.md and scratchpad/forecaster_validate.py).

Design (leakage-safe):
- Target: daily incident count. Horizon: 14 days (direct, origin-level features).
- Features for a forecast day d are ALL available at the forecast origin t (d > t):
  calendar(d) [dow/doy sin+cos, is_weekend] + recent LEVEL/TREND computed strictly
  from data up to t (28- and 7-day means, 7-day slope). No future values, no target
  of day d, no post-incident fields.
- Preprocessing (StandardScaler) is fit on TRAINING data only.
"""
import numpy as np
import pandas as pd
from sklearn.linear_model import Ridge
from sklearn.preprocessing import StandardScaler

HORIZON = 14
MODEL_VERSION = "call-volume-forecaster-v2"
FEATURE_SCHEMA_VERSION = "cvf2-feat-1"
FEATURES = ["dow_sin", "dow_cos", "doy_sin", "doy_cos", "is_weekend",
            "level_28", "level_7", "slope_7"]


def _calendar(dates):
    dow = dates.dayofweek.values
    doy = dates.dayofyear.values
    return {
        "dow_sin": np.sin(2 * np.pi * dow / 7), "dow_cos": np.cos(2 * np.pi * dow / 7),
        "doy_sin": np.sin(2 * np.pi * doy / 365.25), "doy_cos": np.cos(2 * np.pi * doy / 365.25),
        "is_weekend": (dow >= 5).astype(float),
    }


def _level_at(series, upto_idx):
    """Level/trend from data STRICTLY BEFORE upto_idx (past-available at the origin)."""
    hist = series.iloc[max(0, upto_idx - 28):upto_idx]
    if len(hist) == 0:
        return 0.0, 0.0, 0.0
    level_28 = float(hist.mean())
    level_7 = float(hist.iloc[-7:].mean()) if len(hist) >= 1 else level_28
    if len(hist) >= 7:
        y = hist.iloc[-7:].values
        slope_7 = float(np.polyfit(np.arange(len(y)), y, 1)[0])
    else:
        slope_7 = 0.0
    return level_28, level_7, slope_7


def build_training_frame(series):
    """One row per day d (after a 28-day warmup): calendar(d) + level/trend from the
    window ending the day BEFORE d, target = y[d]. All features past-available."""
    rows, ys = [], []
    cal = _calendar(series.index)
    for i in range(28, len(series)):
        lvl28, lvl7, slope = _level_at(series, i)
        rows.append([cal["dow_sin"][i], cal["dow_cos"][i], cal["doy_sin"][i], cal["doy_cos"][i],
                     cal["is_weekend"][i], lvl28, lvl7, slope])
        ys.append(series.iloc[i])
    return pd.DataFrame(rows, columns=FEATURES, index=series.index[28:]), pd.Series(ys, index=series.index[28:])


def fit(series_train):
    """Fit scaler + Ridge on the training series only."""
    X, y = build_training_frame(series_train)
    scaler = StandardScaler().fit(X.values)
    model = Ridge(alpha=1.0).fit(scaler.transform(X.values), y.values)
    return {"scaler": scaler, "model": model}


def forecast(artifact, history, horizon=HORIZON):
    """Forecast the next `horizon` days after `history` (pd.Series). Level/trend are
    taken at the origin (end of history) and held across the horizon."""
    origin = len(history)
    lvl28, lvl7, slope = _level_at(history, origin)
    future_dates = pd.date_range(history.index[-1] + pd.Timedelta(days=1), periods=horizon, freq="D")
    cal = _calendar(future_dates)
    X = np.column_stack([cal["dow_sin"], cal["dow_cos"], cal["doy_sin"], cal["doy_cos"],
                         cal["is_weekend"], np.full(horizon, lvl28), np.full(horizon, lvl7),
                         np.full(horizon, slope)])
    pred = artifact["model"].predict(artifact["scaler"].transform(X))
    return pd.Series(np.clip(pred, 0, None), index=future_dates)
