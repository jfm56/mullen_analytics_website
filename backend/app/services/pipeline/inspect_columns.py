"""
Column Inspection Service.

Reads a preview of an uploaded CSV/XLSX and returns per-column metadata
so the frontend can render a column-picker with smart defaults.

Roles returned map 1-to-1 with the pipeline's canonical field names so
the user selection can be sent directly as the ``column_map`` override
to ``data_quality.clean_dispatch()``.
"""
from __future__ import annotations

import logging
from pathlib import Path
from typing import Any, Dict, List, Optional

import pandas as pd

logger = logging.getLogger(__name__)

# Roles that the pipeline actively uses — auto-checked in the UI.
# Must match ROLE_TO_MAP_KEY keys in ColumnPicker.jsx.
PIPELINE_ROLES = {
    "date_dispatched",
    "date_enroute",
    "date_arrived",
    "date_available",
    "date_received",
    "unit",
    "incident_id",
    "category",
    "service_type",
}

# Roles that are pre-derived by the pipeline — auto-unchecked.
DERIVED_ROLES = {"derived_hour", "derived_dow", "derived_month"}

# Mullen Analytics CAD export: normalized column names that uniquely identify this schema.
# normalize = lower + spaces→_ + dashes→_
_MULLEN_SIGNATURE = {
    "dispatch_id", "date_dispatched", "date_enroute",
    "date_arrived", "date_available", "patient_category",
}

# Generic snake_case CAD exports (e.g. incident_number, call_date, unit_id)
_SNAKE_CASE_SIGNATURE = {
    "incident_number", "call_date", "unit_id", "incident_type",
}

# ── Heuristic name hints ──────────────────────────────────────────────────────
# Ordered most-specific first.  Each entry is (role, list_of_substrings).
# A column name must contain ANY one of the substrings (after normalisation).

_ROLE_HINTS: List[tuple[str, list[str]]] = [
    # Specific timestamp roles
    ("date_dispatched", ["dispatch", "dispatched"]),
    ("date_enroute",    ["enroute", "en_route", "responding"]),
    ("date_arrived",    ["arrived", "arrive", "on_scene", "onscene", "scene"]),
    ("date_available",  ["available", "clear", "cleared", "avail"]),
    ("date_received",   ["received", "created", "call_date", "call_datetime",
                          "reported", "incident_date", "alarm_date"]),
    # Identifiers & categories
    ("unit",         ["unit", "vehicle", "apparatus", "resource", "truck"]),
    ("incident_id",  ["incident", "dispatch_id", "cad_id", "call_id",
                       "event_id", "case_no", "case_num", "call_number"]),
    ("category",     ["patient_category", "chief_complaint", "call_category",
                       "nature_of_call", "call_type", "incident_type",
                       "category", "nature", "problem"]),
    ("service_type", ["service_type", "type_of_service", "service_level",
                       "ems_type", "service"]),
    ("disposition",  ["disposition", "outcome", "result", "final_disposition"]),
    # Pre-computed temporal breakdowns — pipeline re-derives these
    ("derived_hour",  ["hour_of_day", "hour_dispatched", "dispatch_hour"]),
    ("derived_dow",   ["day_of_week", "dow", "weekday", "day_dispatched"]),
    ("derived_month", ["month_of_year", "month_year", "call_month"]),
    # Geography
    ("geography",    ["address", "location", "latitude", "longitude",
                       "lat", "lon", "lng", "zip", "zipcode"]),
]


def _guess_role(col_name: str, series: pd.Series) -> str:
    n = col_name.lower().replace(" ", "_").replace("-", "_").replace("(", "").replace(")", "").replace("/", "_")

    for role, hints in _ROLE_HINTS:
        if any(h in n for h in hints):
            # Timestamp roles: verify values actually parse as datetime
            if role.startswith("date_"):
                sample = series.dropna().head(100).astype(str)
                if len(sample):
                    parsed = pd.to_datetime(sample, errors="coerce")
                    if parsed.notna().mean() < 0.5:
                        continue  # name matched but values don't parse
            return role

    # Content-based datetime fallback
    sample = series.dropna().head(100).astype(str)
    if len(sample):
        parsed = pd.to_datetime(sample, errors="coerce")
        if parsed.notna().mean() > 0.80:
            return "date_received"

    if pd.api.types.is_numeric_dtype(series):
        return "numeric"
    if series.nunique(dropna=True) <= max(20, int(len(series) * 0.05)):
        return "categorical"
    return "unknown"


def _detect_schema(norm_cols: set) -> str:
    """
    Identify the CAD export schema from the normalised column set.
    Normalisation: lower + spaces→_ + dashes→_
    """
    mullen_hits = len(norm_cols & _MULLEN_SIGNATURE)
    if mullen_hits >= 3:
        return "mullen_analytics_cad"
    snake_hits = len(norm_cols & _SNAKE_CASE_SIGNATURE)
    if snake_hits >= 2:
        return "generic_snake_case"
    return "unknown"


def _read_preview(path: Path, nrows: int = 1000) -> pd.DataFrame:
    ext = path.suffix.lower()
    if ext == ".csv":
        return pd.read_csv(path, nrows=nrows, low_memory=False)
    if ext in (".xlsx", ".xls"):
        return pd.read_excel(path, nrows=nrows)
    raise ValueError(f"Unsupported file type for inspection: {ext}")


def inspect(path: str) -> Dict[str, Any]:
    """
    Return JSON-serialisable column metadata for the given file.

    Each column entry includes:
      suggested_role     — pipeline canonical key or utility role
      suggested_selected — True only for pipeline-useful, non-derived, non-null cols
      note               — human-readable warning when a better alternative exists

    Top-level keys:
      schema_hint — 'mullen_analytics_cad' | 'generic_snake_case' | 'unknown'
    """
    from collections import defaultdict

    p = Path(path)
    try:
        df = _read_preview(p)
    except Exception as exc:  # pylint: disable=broad-exception-caught
        logger.error("inspect_columns: failed to read %s — %s", path, exc)
        raise

    # ── Per-column metadata (no notes yet) ───────────────────────────────────
    columns: List[Dict[str, Any]] = []
    for col in df.columns:
        s        = df[col]
        role     = _guess_role(col, s)
        null_pct = round(float(s.isna().mean() * 100), 1)
        columns.append({
            "name":               str(col),
            "dtype":              str(s.dtype),
            "null_pct":           null_pct,
            "unique_count":       int(s.nunique(dropna=True)),
            "sample_values":      [str(v) for v in s.dropna().head(3).tolist()],
            "suggested_role":     role,
            "suggested_selected": role in PIPELINE_ROLES and null_pct < 95.0,
            "note":               None,
        })

    # ── Note generation: flag columns that lose to a better alternative ───────
    # Group by suggested_role; within each role find the column with lowest null_pct.
    # Any other column sharing the same role gets a note if its null_pct is
    # significantly higher (≥10pp difference).
    role_groups: Dict[str, List[Dict[str, Any]]] = defaultdict(list)
    for c in columns:
        role_groups[c["suggested_role"]].append(c)

    for role, cols in role_groups.items():
        if len(cols) <= 1 or role in ("numeric", "categorical", "unknown", "ignore", "geography", "disposition"):
            continue
        best = min(cols, key=lambda c: c["null_pct"])
        for c in cols:
            if c is best:
                continue
            diff = c["null_pct"] - best["null_pct"]
            if diff >= 10.0:
                c["note"] = (
                    f"'{best['name']}' has lower null rate "
                    f"({best['null_pct']}% vs {c['null_pct']}%)"
                )
                c["suggested_selected"] = False  # demote the inferior column

    # Derived columns are always unchecked (pipeline re-derives them)
    for c in columns:
        if c["suggested_role"] in DERIVED_ROLES:
            c["suggested_selected"] = False

    # ── Schema detection ─────────────────────────────────────────────────────
    norm_cols = {
        str(col).strip().lower().replace(" ", "_").replace("-", "_")
        for col in df.columns
    }
    schema_hint = _detect_schema(norm_cols)

    return {
        "file":          p.name,
        "preview_rows":  int(len(df)),
        "total_columns": len(columns),
        "columns":       columns,
        "schema_hint":   schema_hint,
    }
