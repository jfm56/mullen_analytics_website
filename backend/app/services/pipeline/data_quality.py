"""
Data Quality Layer.

Centralises file loading, column mapping, datetime parsing, bounds
enforcement, and derived feature creation for dispatch data.

Every downstream module (call_volume, response_times, forecasting …)
receives the cleaned DataFrame produced here instead of re-loading
and re-parsing files independently.

Chart flags returned in the quality report tell the frontend which
visualisations have enough valid data to render.
"""
import json
import logging
import re
from pathlib import Path
from typing import Any, Dict, List, Optional, Tuple

import numpy as np
import pandas as pd

from .columns import normalize_cols, resolve, DISPATCH_COLUMNS

logger = logging.getLogger(__name__)

# ── Bounds for computed interval columns (minutes) ───────────────────────────
INTERVAL_BOUNDS: Dict[str, Tuple[float, float]] = {
    "_dispatch_to_enroute_min": (0.0, 30.0),
    "_response_time_min":       (0.0, 60.0),
    "_call_duration_min":       (0.0, 180.0),
}

# Semantic → ordered list of source canonical fields to try
_DT_SOURCES: Dict[str, List[str]] = {
    "_dt_created":    ["date_created", "call_date"],
    "_dt_dispatched": ["date_dispatched", "dispatch_time"],
    "_dt_enroute":    ["date_enroute", "en_route_time"],
    "_dt_arrived":    ["date_arrived", "on_scene_time"],
    "_dt_available":  ["date_available", "clear_time"],
}

# Map from pipeline _dt_* key → user-facing column_map key
_DT_CANON_TO_USER_KEY: Dict[str, str] = {
    "_dt_created":    "date_created",
    "_dt_dispatched": "date_dispatched",
    "_dt_enroute":    "date_enroute",
    "_dt_arrived":    "date_arrived",
    "_dt_available":  "date_available",
}


# ── Helpers ───────────────────────────────────────────────────────────────────

_SUPPORTED_EXTS = {".csv", ".xlsx", ".xls", ".json", ".parquet"}


def _load_file(path: str) -> Optional[pd.DataFrame]:
    ext = Path(path).suffix.lower()
    if ext not in _SUPPORTED_EXTS:
        return None  # caller marks as skipped, not failed
    try:
        if ext == ".csv":
            return pd.read_csv(path, low_memory=False)
        if ext in (".xlsx", ".xls"):
            return pd.read_excel(path)
        if ext == ".json":
            return pd.read_json(path)
        if ext == ".parquet":
            return pd.read_parquet(path)
        return None
    except Exception as exc:  # pylint: disable=broad-exception-caught
        logger.warning("Could not load %s: %s", path, exc)
        return None


def _parse_dt(df: pd.DataFrame, col: str, coerced_counts: Dict[str, int]) -> pd.Series:
    """Parse *col* as datetime, count newly null (coerced) values."""
    before = int(df[col].isna().sum())
    parsed = pd.to_datetime(df[col], errors="coerce")
    after  = int(parsed.isna().sum())
    delta  = after - before
    if delta > 0:
        coerced_counts[col] = coerced_counts.get(col, 0) + delta
    return parsed


def _minutes_between(a: Optional[pd.Series], b: Optional[pd.Series]) -> pd.Series:
    if a is None or b is None:
        return pd.Series(dtype=float)
    return (b - a).dt.total_seconds() / 60.0


def _resolve_nonnull(
    df: pd.DataFrame,
    semantic: str,
    null_threshold: float = 0.95,
) -> Optional[str]:
    """
    Like resolve(), but skips candidates that are >{null_threshold*100}% null.
    Prevents picking a dead column (e.g. 'call_type' at 100% null) when a
    populated alternative (e.g. 'patient_category') exists later in the list.
    """
    candidates = DISPATCH_COLUMNS.get(semantic, [semantic])
    col_lower   = {c.lower().strip(): c for c in df.columns}
    for candidate in candidates:
        matched = col_lower.get(candidate.lower())
        if matched is None:
            continue
        null_pct = df[matched].isna().mean()
        if null_pct <= null_threshold:
            return matched
        logger.debug("_resolve_nonnull: skipping '%s' (%.0f%% null)", matched, null_pct * 100)
    return None


def _infer_unit_pattern(unit_series: pd.Series) -> Optional[str]:
    """
    Detect the dominant alphabetic prefix(es) in unit IDs.
    Returns a regex pattern string (not compiled) or None if no clear pattern.

    Examples:
      BLS3651, BLS3652, BLS3653  ->  r'^(?:BLS)-?\\d+$'   (100% BLS)
      M-62, M-61, R-65, R-67    ->  r'^(?:M|R)-?\\d+$'   (M 71%, R 29%)
    """
    clean = unit_series.dropna().astype(str).str.strip()
    if len(clean) == 0:
        return None
    total  = len(clean)
    # Extract leading alpha prefix only (letters before digits/dashes)
    prefixes = clean.str.extract(r'^([A-Za-z]+)', expand=False)
    prefixes = prefixes.dropna().str.upper()
    if len(prefixes) == 0:
        return None
    counts = prefixes.value_counts()
    # Keep any prefix that represents ≥10% of all unit records
    dominant = [p for p, n in counts.items() if n / total >= 0.10]
    if not dominant:
        return None
    alts = '|'.join(re.escape(p) for p in dominant)
    pattern = rf'^(?:{alts})-?\d+$'
    logger.info("Detected unit prefix pattern: %s (prefixes: %s)", pattern, dominant)
    return pattern


# ── Public API ────────────────────────────────────────────────────────────────

def clean_dispatch(
    dispatch_files: List[Dict[str, Any]],
    column_map: Optional[Dict[str, str]] = None,
) -> Tuple[pd.DataFrame, Dict[str, Any]]:
    """
    Load, clean, and enrich all dispatch files.

    Returns
    -------
    df : pd.DataFrame
        Combined, cleaned DataFrame with ``_dt_*``, interval, and
        calendar feature columns prefixed with ``_``.
    qr : dict
        Quality report — passed to the executive report and used by
        the frontend to conditionally render charts.
    """
    qr: Dict[str, Any] = {
        "files_loaded":          0,
        "files_failed":          0,
        "files_skipped":         0,
        "skipped_files":         [],
        "total_rows_raw":        0,
        "total_rows_clean":      0,
        "rows_dropped":          0,
        "rows_repaired":         0,
        "coerced_counts":        {},
        "bounds_clipped":        {},
        "missing_critical":      [],
        "field_map":             {},
        "detected_unit_pattern": None,
        "datetime_all_zero_hour": False,
        "warnings":              [],
        "chart_flags": {
            "response_time":         None,
            "call_volume_by_hour":   None,
            "call_volume_by_date":   None,
            "unit_performance":      None,
        },
    }

    # ── Load files ────────────────────────────────────────────────────────
    frames: List[pd.DataFrame] = []
    for f in dispatch_files:
        path = f.get("upload_path", "")
        fname = f.get("original_filename", path)
        ext = Path(path).suffix.lower()
        if ext not in _SUPPORTED_EXTS:
            qr["files_skipped"] += 1
            qr["skipped_files"].append(fname)
            logger.info("Skipped unsupported file type (%s): %s", ext, fname)
            continue
        df = _load_file(path)
        if df is None:
            qr["files_failed"] += 1
            qr["warnings"].append(f"Could not load file: {fname}")
        else:
            qr["files_loaded"] += 1
            frames.append(df)

    if not frames:
        qr["warnings"].append("No dispatch files could be loaded.")
        return pd.DataFrame(), qr

    # Data is loaded — flags start True; specific checks below will flip to False.
    qr["chart_flags"] = {
        "response_time":       True,
        "call_volume_by_hour": True,
        "call_volume_by_date": True,
        "unit_performance":    True,
    }

    combined = pd.concat(frames, ignore_index=True)
    qr["total_rows_raw"] = int(len(combined))
    combined = normalize_cols(combined)
    logger.info("clean_dispatch: normalized columns = %s", sorted(combined.columns.tolist()))

    _cmap = column_map or {}

    # ── Map canonical non-temporal fields ─────────────────────────────────
    # Accept both new ColumnPicker keys and legacy keys as overrides.
    _FIELD_ALIASES = {
        "incident_number": ["incident_number", "incident_id"],
        "incident_type":   ["incident_type",   "category"],
        "unit_id":         ["unit_id",          "unit"],
        "priority":        ["priority"],
        "municipality":    ["municipality"],
    }
    for sem, alias_keys in _FIELD_ALIASES.items():
        # User override: try each alias key in the column_map
        user_col = next(
            (_cmap[k] for k in alias_keys if _cmap.get(k) and _cmap[k] in combined.columns),
            None,
        )
        if user_col:
            qr["field_map"][sem] = user_col
        else:
            # Skip columns that are >95% null to avoid dead fields (e.g. call_type)
            col = _resolve_nonnull(combined, sem)
            if col:
                qr["field_map"][sem] = col

    # ── Detect operational unit prefix pattern from data ─────────────────────
    unit_col = qr["field_map"].get("unit_id")
    if unit_col and unit_col in combined.columns:
        qr["detected_unit_pattern"] = _infer_unit_pattern(combined[unit_col])

    # ── Parse all datetime columns ────────────────────────────────────────
    dt_series: Dict[str, Optional[pd.Series]] = {}
    for canon, sources in _DT_SOURCES.items():
        resolved_col: Optional[str] = None

        # User-provided mapping takes priority
        user_key = _DT_CANON_TO_USER_KEY.get(canon)
        if user_key and _cmap.get(user_key) and _cmap[user_key] in combined.columns:
            resolved_col = _cmap[user_key]
            logger.debug("column_map override: %s → %s", canon, resolved_col)

        if not resolved_col:
            for src in sources:
                c = resolve(combined, src)
                if c and c in combined.columns:
                    resolved_col = c
                    break

        if resolved_col:
            qr["field_map"][canon] = resolved_col
            parsed = _parse_dt(combined, resolved_col, qr["coerced_counts"])
            combined[canon] = parsed
            dt_series[canon] = combined[canon]
        else:
            dt_series[canon] = None

    qr["rows_repaired"] = sum(qr["coerced_counts"].values())

    # ── Critical field check ──────────────────────────────────────────────
    dt_created = dt_series.get("_dt_created")
    if dt_created is None or dt_created.isna().all():
        qr["missing_critical"].append("call_date / date_created")
        qr["chart_flags"]["call_volume_by_date"] = False
        qr["chart_flags"]["call_volume_by_hour"] = False
        qr["warnings"].append(
            "call_date: critical field missing or entirely null — "
            "date-based and hour charts disabled."
        )
    else:
        # All-zero hour check (date-only data, no time component)
        valid_hours = dt_created.dt.hour.dropna()
        if len(valid_hours) > 0 and (valid_hours == 0).mean() > 0.95:
            qr["datetime_all_zero_hour"] = True
            qr["chart_flags"]["call_volume_by_hour"] = False
            qr["warnings"].append(
                "call_date: >95% of records show hour=0 — datetime field "
                "appears to be date-only; hourly distribution chart disabled."
            )

    # ── Compute response-time intervals (minutes) ─────────────────────────
    combined["_dispatch_to_enroute_min"] = _minutes_between(
        dt_series.get("_dt_dispatched"), dt_series.get("_dt_enroute")
    )
    combined["_response_time_min"] = _minutes_between(
        dt_series.get("_dt_enroute"), dt_series.get("_dt_arrived")
    )
    combined["_call_duration_min"] = _minutes_between(
        dt_series.get("_dt_created"), dt_series.get("_dt_available")
    )

    # ── Apply bounds ──────────────────────────────────────────────────────
    for col, (lo, hi) in INTERVAL_BOUNDS.items():
        if col not in combined.columns:
            continue
        before_valid = int(combined[col].notna().sum())
        mask_valid   = combined[col].between(lo, hi)
        combined.loc[combined[col].notna() & ~mask_valid, col] = np.nan
        after_valid  = int(combined[col].notna().sum())
        clipped      = before_valid - after_valid
        if clipped > 0:
            qr["bounds_clipped"][col] = clipped

    # Detect all-zero response_time_min: timestamps were date-only (no HH:MM:SS)
    if "_response_time_min" in combined.columns:
        rt = combined["_response_time_min"]
        rt_notna = rt.dropna()
        if len(rt_notna) > 0 and (rt_notna == 0.0).mean() > 0.95:
            combined["_response_time_min"] = np.nan
            qr["chart_flags"]["response_time"] = False
            qr["chart_flags"]["unit_performance"] = False
            qr["warnings"].append(
                "response_time_min: >95% of computed values are exactly 0 — "
                "date_enroute / date_arrived appear to be date-only fields with no "
                "time component. Response time analysis disabled. Check for a "
                "separate full-datetime column (e.g. time_enroute, time_arrived)."
            )

    # Cap response_time_min at 99th percentile
    if "_response_time_min" in combined.columns:
        p99 = combined["_response_time_min"].quantile(0.99)
        if pd.notna(p99) and p99 > 0:
            above_cap = int((combined["_response_time_min"] > p99).sum())
            combined["_response_time_min"] = combined["_response_time_min"].clip(upper=float(p99))
            if above_cap:
                qr["bounds_clipped"]["_response_time_p99_cap"] = above_cap
            qr["field_map"]["_response_time_p99_cap_min"] = round(float(p99), 2)

    # ── Chart flag: response time ─────────────────────────────────────────
    rt_valid = (
        "_response_time_min" in combined.columns
        and combined["_response_time_min"].notna().sum() > 0
    )
    if not rt_valid:
        qr["chart_flags"]["response_time"] = False
        qr["warnings"].append(
            "response_time_min: no valid values after bounds enforcement — "
            "response-time chart disabled. Check that date_enroute and "
            "date_arrived columns exist and are parseable."
        )

    # ── Chart flag: unit performance ──────────────────────────────────────
    if not rt_valid or not qr["field_map"].get("unit_id"):
        qr["chart_flags"]["unit_performance"] = False
        if not qr["field_map"].get("unit_id"):
            qr["warnings"].append(
                "unit_id: column not found — unit performance chart disabled."
            )

    # ── Calendar / time features from _dt_created ─────────────────────────
    if dt_created is not None and dt_created.notna().any():
        dt = dt_created
        week = dt.dt.isocalendar().week.astype("Int64")
        combined["_year"]          = dt.dt.year
        combined["_month"]         = dt.dt.month
        combined["_day_of_week"]   = dt.dt.dayofweek        # 0=Mon
        combined["_day_of_year"]   = dt.dt.dayofyear
        combined["_week_of_year"]  = week
        combined["_quarter"]       = dt.dt.quarter
        combined["_hour"]          = dt.dt.hour
        combined["_is_weekend"]    = (dt.dt.dayofweek >= 5).astype(int)
        combined["_is_month_start"] = dt.dt.is_month_start.astype(int)
        combined["_is_month_end"]   = dt.dt.is_month_end.astype(int)

    qr["total_rows_clean"] = int(len(combined))
    qr["rows_dropped"]     = qr["total_rows_raw"] - qr["total_rows_clean"]

    return combined, qr


def run(dispatch_files: List[Dict[str, Any]], output_dir: str) -> Dict[str, Any]:
    """Standalone runner: produce data_quality_report.json."""
    _, qr = clean_dispatch(dispatch_files)
    summary = {"module": "data_quality", **qr}
    out_path = Path(output_dir) / "data_quality_report.json"
    Path(output_dir).mkdir(parents=True, exist_ok=True)
    with open(out_path, "w", encoding="utf-8") as fh:
        json.dump(summary, fh, indent=2, default=str)
    logger.info(
        "Data quality: %d rows clean (raw %d), warnings: %d",
        qr["total_rows_clean"], qr["total_rows_raw"], len(qr["warnings"]),
    )
    return summary
