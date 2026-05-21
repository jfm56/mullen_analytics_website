"""
ems_pipeline.py — EMS CAD dispatch pipeline.

Public API
----------
COLUMN_MAP : dict[str, str]
    Maps semantic field names → canonical column names expected in the input DataFrame.

run_pipeline(raw: pd.DataFrame) -> PipelineResult
    Clean, validate, and aggregate a raw dispatch DataFrame.
"""
from __future__ import annotations

import dataclasses
from typing import List, Optional

import numpy as np
import pandas as pd


# ---------------------------------------------------------------------------
# Column map
# ---------------------------------------------------------------------------
COLUMN_MAP: dict[str, str] = {
    "incident_id":     "Incident_ID",
    "date_created":    "Date_Created",
    "date_dispatched": "Date_Dispatched",
    "date_enroute":    "Date_Enroute",
    "date_arrived":    "Date_Arrived",
    "date_available":  "Date_Available",
    "unit":            "Unit",
    "service_type":    "Service_Type",
    "category":        "Category",
    "municipality":    "Municipality",
}


# ---------------------------------------------------------------------------
# Constants
# ---------------------------------------------------------------------------
_RT_HARD_MIN = 0.0          # minutes — anything ≤0 is impossible
_RT_HARD_MAX = 240.0        # minutes — beyond 4 h is almost certainly an error
_RT_BOUNDS_MIN = 0.5        # minutes — reportable out-of-bounds lower
_RT_BOUNDS_MAX = 60.0       # minutes — reportable out-of-bounds upper
_RT_WINSOR_LO = 1.0         # minutes — winsorise lower
_RT_WINSOR_HI = 45.0        # minutes — winsorise upper

_MIN_ROWS_DASHBOARD = 30
_MIN_DAYS_MODELS = 180

_DATE_MIN_VALIDITY = 0.50   # at least this fraction of a date col must be non-null to use it


# ---------------------------------------------------------------------------
# Data classes
# ---------------------------------------------------------------------------
@dataclasses.dataclass
class CleaningStats:
    raw_rows: int = 0
    duplicates_removed: int = 0
    datetime_parse_failures: int = 0
    rows_dropped_missing_timestamps: int = 0
    bls_units_kept: int = 0
    bls_units_dropped: int = 0
    response_time_out_of_bounds: int = 0
    response_time_winsorized: int = 0


@dataclasses.dataclass
class ValidationResult:
    critical_issues: List[str] = dataclasses.field(default_factory=list)
    warnings: List[str] = dataclasses.field(default_factory=list)


@dataclasses.dataclass
class QualityReport:
    reliability_score: float = 0.0
    reliability_band: str = "unreliable"
    validation: ValidationResult = dataclasses.field(default_factory=ValidationResult)
    cleaning: CleaningStats = dataclasses.field(default_factory=CleaningStats)
    reasoning: List[str] = dataclasses.field(default_factory=list)


@dataclasses.dataclass
class PipelineResult:
    quality: QualityReport
    can_render_dashboard: bool = False
    can_run_models: bool = False
    cleaned: Optional[pd.DataFrame] = None
    daily: Optional[pd.DataFrame] = None


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------

def _parse_datetimes(series: pd.Series) -> tuple[pd.Series, int]:
    """
    Coerce a series to datetime.  Returns (parsed_series, n_new_nulls).
    n_new_nulls counts values that *were* non-null but could not be parsed.
    """
    original_nulls = int(series.isna().sum())
    parsed = pd.to_datetime(series, errors="coerce")
    total_nat = int(parsed.isna().sum())
    n_failures = max(0, total_nat - original_nulls)
    return parsed, n_failures


def _is_response_unit(unit_series: pd.Series) -> pd.Series:
    """
    True  → BLS / ALS response unit  (keep)
    False → ops / maintenance unit   (drop)

    Heuristic: unit names matching r'^M\\d+$' are classified as M-units
    (maintenance / operations vehicles).  Everything else is kept.
    """
    normed = unit_series.fillna("").str.strip().str.upper()
    is_m_unit = normed.str.match(r"^M\d+$")
    is_empty = normed.str.len() == 0
    return ~is_m_unit & ~is_empty


# ---------------------------------------------------------------------------
# Main pipeline
# ---------------------------------------------------------------------------

def run_pipeline(raw: pd.DataFrame) -> PipelineResult:
    """Clean, validate, and aggregate a raw EMS dispatch DataFrame."""
    quality = QualityReport()
    stats = quality.cleaning
    validation = quality.validation
    reasoning = quality.reasoning

    # Convenience aliases
    C = COLUMN_MAP
    df = raw.copy()
    stats.raw_rows = len(df)

    # ------------------------------------------------------------------
    # 1. Deduplication on incident_id
    # ------------------------------------------------------------------
    if C["incident_id"] in df.columns:
        before = len(df)
        df = df.drop_duplicates(subset=[C["incident_id"]])
        stats.duplicates_removed = before - len(df)
        if stats.duplicates_removed:
            pct = stats.duplicates_removed / before * 100
            msg = f"Removed {stats.duplicates_removed:,} duplicate incident rows ({pct:.1f}% of input)"
            reasoning.append(msg)
            if pct > 10:
                validation.warnings.append(msg)
    else:
        validation.critical_issues.append(f"Missing required column: {C['incident_id']}")

    # ------------------------------------------------------------------
    # 2. Parse all datetime columns; tally failures
    # ------------------------------------------------------------------
    for col_key in ("date_created", "date_dispatched", "date_enroute",
                    "date_arrived", "date_available"):
        col = C[col_key]
        if col not in df.columns:
            if col_key in ("date_dispatched", "date_arrived"):
                validation.critical_issues.append(
                    f"Missing required datetime column: {col}"
                )
            continue
        parsed, n_fail = _parse_datetimes(df[col])
        df[col] = parsed
        stats.datetime_parse_failures += n_fail
        if n_fail:
            pct = n_fail / len(df) * 100
            fail_msg = f"{col}: {n_fail:,} values ({pct:.1f}%) failed datetime parsing"
            if pct > 50:
                validation.critical_issues.append(fail_msg)
                reasoning.append(
                    f"{col} has {pct:.0f}% parse failures — likely a data export or format issue"
                )
            else:
                validation.warnings.append(fail_msg)

    # ------------------------------------------------------------------
    # 3. Drop rows with NaT in the two critical timestamp columns
    # ------------------------------------------------------------------
    critical_ts = [c for c in (C["date_dispatched"], C["date_arrived"])
                   if c in df.columns]
    if critical_ts:
        before = len(df)
        df = df.dropna(subset=critical_ts)
        stats.rows_dropped_missing_timestamps = before - len(df)
        if stats.rows_dropped_missing_timestamps:
            reasoning.append(
                f"Dropped {stats.rows_dropped_missing_timestamps:,} rows missing "
                f"critical timestamps ({', '.join(critical_ts)})"
            )

    # ------------------------------------------------------------------
    # 4. BLS / response-unit filter
    # ------------------------------------------------------------------
    if C["unit"] in df.columns:
        response_mask = _is_response_unit(df[C["unit"]])
        stats.bls_units_kept = int(response_mask.sum())
        stats.bls_units_dropped = int((~response_mask).sum())
        if stats.bls_units_dropped:
            total = stats.bls_units_kept + stats.bls_units_dropped
            pct_drop = stats.bls_units_dropped / total * 100
            bls_msg = (
                f"BLS/response filter removed {stats.bls_units_dropped:,} rows "
                f"({pct_drop:.0f}% — classified as non-response/M-units)"
            )
            if pct_drop > 50:
                validation.critical_issues.append(bls_msg)
                reasoning.append(
                    f"Unit column has {pct_drop:.0f}% non-response entries — "
                    f"verify that response-unit naming convention is correct"
                )
            else:
                validation.warnings.append(bls_msg)
        df = df[response_mask].copy()
    else:
        validation.warnings.append(
            f"Missing unit column '{C['unit']}' — BLS/response filter skipped"
        )

    # ------------------------------------------------------------------
    # 5. Response-time computation, bounds check, winsorisation
    # ------------------------------------------------------------------
    disp_col = C["date_dispatched"]
    arrv_col = C["date_arrived"]
    if disp_col in df.columns and arrv_col in df.columns:
        rt = (df[arrv_col] - df[disp_col]).dt.total_seconds() / 60.0
        df["_Response_Time_Min"] = rt

        # Hard-drop impossible values (negative or > 4 h)
        impossible = (rt <= _RT_HARD_MIN) | (rt > _RT_HARD_MAX)
        df = df[~impossible].copy()
        rt = df["_Response_Time_Min"]

        # Count reportable out-of-bounds
        oob = (rt < _RT_BOUNDS_MIN) | (rt > _RT_BOUNDS_MAX)
        stats.response_time_out_of_bounds = int(oob.sum())
        if stats.response_time_out_of_bounds:
            pct = stats.response_time_out_of_bounds / len(df) * 100
            validation.warnings.append(
                f"Response time: {stats.response_time_out_of_bounds:,} values "
                f"({pct:.1f}%) outside [{_RT_BOUNDS_MIN}, {_RT_BOUNDS_MAX}] min"
            )

        # Winsorise
        winsor_mask = (rt < _RT_WINSOR_LO) | (rt > _RT_WINSOR_HI)
        stats.response_time_winsorized = int(winsor_mask.sum())
        df["_Response_Time_Min"] = rt.clip(lower=_RT_WINSOR_LO, upper=_RT_WINSOR_HI)

    # ------------------------------------------------------------------
    # 6. Daily aggregation
    # ------------------------------------------------------------------
    daily: Optional[pd.DataFrame] = None
    if "_Response_Time_Min" in df.columns:
        # Pick the best available date column (prefer created, fall back to dispatched)
        date_col: Optional[str] = None
        for candidate in (C["date_created"], C["date_dispatched"]):
            if candidate in df.columns:
                validity = df[candidate].notna().mean()
                if validity >= _DATE_MIN_VALIDITY:
                    date_col = candidate
                    break

        if date_col:
            df["_Date"] = df[date_col].dt.normalize()
            daily = (
                df.dropna(subset=["_Date"])
                .groupby("_Date", sort=True)
                .agg(
                    Call_Volume=("_Date", "count"),
                    Avg_Response_Time=("_Response_Time_Min", "mean"),
                    Median_Response_Time=("_Response_Time_Min", "median"),
                )
                .reset_index()
                .rename(columns={"_Date": "Date"})
            )

    # ------------------------------------------------------------------
    # 7. Quality scoring
    # ------------------------------------------------------------------
    score = 1.0

    # Parse failures (applied to *raw* row count so partial-column failures are weighted fairly)
    parse_fail_frac = stats.datetime_parse_failures / max(stats.raw_rows, 1)
    if parse_fail_frac > 0.50:
        score -= 0.50
        reasoning.append(f"Score −0.50: {parse_fail_frac:.0%} datetime parse failures")
    elif parse_fail_frac > 0.10:
        penalty = round(parse_fail_frac * 0.40, 2)
        score -= penalty
        reasoning.append(f"Score −{penalty:.2f}: {parse_fail_frac:.0%} datetime parse failures")

    # BLS filter gutting the dataset
    survived_frac = len(df) / max(stats.raw_rows, 1)
    if survived_frac < 0.20:
        score -= 0.40
        reasoning.append(
            f"Score −0.40: only {survived_frac:.0%} of rows survived cleaning pipeline"
        )
    elif survived_frac < 0.50:
        score -= 0.15
        reasoning.append(
            f"Score −0.15: {survived_frac:.0%} of rows survived cleaning pipeline"
        )

    # Duplicates
    dup_frac = stats.duplicates_removed / max(stats.raw_rows, 1)
    if dup_frac > 0.10:
        score -= 0.15
        reasoning.append(f"Score −0.15: {dup_frac:.0%} duplicate rows")

    # Missing critical columns / parse failures
    score -= len(validation.critical_issues) * 0.10

    score = float(np.clip(score, 0.0, 1.0))
    quality.reliability_score = score

    if score >= 0.80:
        quality.reliability_band = "high"
    elif score >= 0.60:
        quality.reliability_band = "medium"
    elif score >= 0.35:
        quality.reliability_band = "low"
    else:
        quality.reliability_band = "unreliable"

    if not reasoning:
        reasoning.append("No significant data quality issues detected")

    # ------------------------------------------------------------------
    # 8. Dashboard / model capability flags
    # ------------------------------------------------------------------
    can_render = len(df) >= _MIN_ROWS_DASHBOARD and score >= 0.30
    can_model = (
        daily is not None
        and len(daily) >= _MIN_DAYS_MODELS
        and score >= 0.55
    )

    return PipelineResult(
        quality=quality,
        can_render_dashboard=can_render,
        can_run_models=can_model,
        cleaned=df if len(df) > 0 else None,
        daily=daily,
    )
