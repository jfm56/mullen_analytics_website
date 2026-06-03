"""
EMS Filter Service

Provides filtered analytics and comparison mode for EMSCharts dashboards.

Key features:
- Interfacility transport detection (defensive, multi-column)
- Call volume de-duplication by incident/call number
- Dashboard filter presets
- Side-by-side group comparison with full metrics
- Column settings integration (ignored columns excluded by default)
"""

from __future__ import annotations

import logging
import math
from pathlib import Path
from typing import Any, Dict, List, Optional, Tuple
from uuid import UUID

import pandas as pd
from sqlalchemy.orm import Session

from ..config import get_settings
from ..models.data_upload import AnalyticsColumnSettings, DataUpload, DataCleaningResult
from ..services.ems_analytics_service import detect_column, detect_mapped_column, _safe, _minutes_between, _value_counts_top
from ..services.ems_column_mapping_service import get_column_overrides

logger = logging.getLogger(__name__)
settings = get_settings()

# ---------------------------------------------------------------------------
# Interfacility transport detection
# ---------------------------------------------------------------------------

_IFT_KEYWORDS = [
    "interfacility", "inter facility", "inter-facility",
    "ift", "i/f", "i.f.t",
    "transfer", "bls transfer", "als transfer",
    "interfacility transport", "facility transfer",
]

_IFT_COLUMNS = ["call_type", "incident_type", "nature", "complaint",
                 "disposition", "transport_type", "call_nature", "type_of_call"]


def detect_interfacility_rows(df: pd.DataFrame) -> pd.Series:
    """Return a boolean mask — True where row appears to be an interfacility transport."""
    mask = pd.Series(False, index=df.index)
    for col_candidate in _IFT_COLUMNS:
        actual = detect_column(df, col_candidate) or (col_candidate if col_candidate in df.columns else None)
        if actual and actual in df.columns:
            col_str = df[actual].astype(str).str.lower().str.strip()
            for kw in _IFT_KEYWORDS:
                mask |= col_str.str.contains(kw, na=False, regex=False)
    return mask


def classify_call_category(df: pd.DataFrame) -> pd.Series:
    """Return a Series of string categories: 'interfacility' | 'emergency' | 'other'."""
    ift_mask = detect_interfacility_rows(df)
    return pd.Series(
        ["interfacility" if ift else "emergency" for ift in ift_mask],
        index=df.index,
    )


# ---------------------------------------------------------------------------
# Call-volume de-duplication
# ---------------------------------------------------------------------------

_INCIDENT_ID_COLS = ["incident_number", "incident_no", "incident_nbr", "incidentnumber",
                     "call_number", "call_no", "incident_id"]


def calculate_dispatched_call_volume(df: pd.DataFrame) -> Dict[str, Any]:
    """
    Compute call volume without double-counting incidents.

    Method priority:
    1. Unique incident/call numbers (if column exists)
    2. Rows with a valid dispatch time/status
    3. Row count fallback
    """
    # 1. Unique incident number
    inc_col = detect_column(df, "incident_number")
    if inc_col:
        unique_ids = df[inc_col].astype(str).str.strip().replace("", pd.NA).dropna().unique()
        return {
            "total": int(len(unique_ids)),
            "method": "unique_incident_numbers",
            "column_used": inc_col,
        }

    # 2. Rows with a dispatch time
    dispatch_col = detect_column(df, "dispatch_time")
    if dispatch_col:
        has_dispatch = df[dispatch_col].astype(str).str.strip().replace("", pd.NA).notna()
        return {
            "total": int(has_dispatch.sum()),
            "method": "dispatched_rows",
            "column_used": dispatch_col,
        }

    # 3. Row count
    return {
        "total": int(len(df)),
        "method": "row_count",
        "column_used": None,
    }


# ---------------------------------------------------------------------------
# File loading
# ---------------------------------------------------------------------------

def _load_cleaned_df(upload: DataUpload, db: Session) -> Optional[pd.DataFrame]:
    result = (
        db.query(DataCleaningResult)
        .filter(DataCleaningResult.data_upload_id == upload.id)
        .order_by(DataCleaningResult.created_at.desc())
        .first()
    )
    if not result or not result.cleaned_file_path:
        return None
    p = Path(result.cleaned_file_path)
    if not p.exists():
        return None
    try:
        return pd.read_csv(p, dtype=str, low_memory=False)
    except Exception as exc:
        logger.error("Failed to load cleaned CSV for upload %s: %s", upload.id, exc)
        return None


def _get_ignored_columns(upload_id: UUID, db: Session) -> set:
    rows = (
        db.query(AnalyticsColumnSettings)
        .filter(
            AnalyticsColumnSettings.data_upload_id == upload_id,
            AnalyticsColumnSettings.is_ignored == True,
        )
        .all()
    )
    return {r.column_name for r in rows}


# ---------------------------------------------------------------------------
# Dashboard filter options
# ---------------------------------------------------------------------------

def build_filter_options(upload: DataUpload, db: Session) -> Dict[str, Any]:
    """Return distinct values for each filterable dimension."""
    df = _load_cleaned_df(upload, db)
    if df is None:
        return {"error": "Cleaned file not available"}

    ignored = _get_ignored_columns(upload.id, db)
    overrides = get_column_overrides(upload, db)

    def _unique(col: Optional[str]) -> List[str]:
        if not col or col in ignored:
            return []
        vals = df[col].astype(str).str.strip().replace("", pd.NA).dropna().unique()
        return sorted(str(v) for v in vals if str(v) not in ("nan", "None", ""))[:200]

    unit_col     = detect_mapped_column(df, "unit",          overrides)
    muni_col     = detect_mapped_column(df, "municipality",  overrides)
    type_col     = detect_mapped_column(df, "incident_type", overrides)
    date_col     = detect_mapped_column(df, "incident_date", overrides)

    ift_count = int(detect_interfacility_rows(df).sum())
    vol = calculate_dispatched_call_volume(df)

    date_range = {}
    if date_col:
        parsed = pd.to_datetime(df[date_col], errors="coerce").dropna()
        if len(parsed):
            date_range = {
                "min": str(parsed.min().date()),
                "max": str(parsed.max().date()),
            }

    return {
        "units":               _unique(unit_col),
        "municipalities":      _unique(muni_col),
        "call_types":          _unique(type_col),
        "date_range":          date_range,
        "interfacility_count": ift_count,
        "total_call_volume":   vol,
        "columns_available":   [c for c in df.columns if c not in ignored],
    }


# ---------------------------------------------------------------------------
# Apply dashboard filters to a DataFrame
# ---------------------------------------------------------------------------

def apply_dashboard_filters(df: pd.DataFrame, filters: Dict[str, Any]) -> Tuple[pd.DataFrame, List[str]]:
    """
    Apply dashboard filters dict to *df*. Returns (filtered_df, applied_filter_descriptions).

    filters keys (all optional):
      date_range: [start_str, end_str]
      units:      [str, ...]
      municipalities: [str, ...]
      call_types: [str, ...]
      exclude_interfacility: bool
      emergency_only: bool
    """
    applied: List[str] = []
    original_len = len(df)

    # Date range
    date_range = filters.get("date_range")
    if date_range and len(date_range) == 2:
        date_col = detect_column(df, "incident_date")
        if date_col:
            parsed = pd.to_datetime(df[date_col], errors="coerce")
            start = pd.to_datetime(date_range[0], errors="coerce")
            end   = pd.to_datetime(date_range[1], errors="coerce")
            if pd.notna(start):
                df = df[parsed >= start]
            if pd.notna(end):
                df = df[pd.to_datetime(df[date_col], errors="coerce") <= end]
            applied.append(f"date_range: {date_range[0]} – {date_range[1]}")

    # Units (case-insensitive)
    units = filters.get("units")
    if units:
        unit_col = detect_column(df, "unit")
        if unit_col:
            lower_units = {u.lower() for u in units}
            df = df[df[unit_col].astype(str).str.strip().str.lower().isin(lower_units)]
            applied.append(f"units: {units}")

    # Municipalities (case-insensitive)
    munis = filters.get("municipalities")
    if munis:
        muni_col = detect_column(df, "municipality")
        if muni_col:
            lower_munis = {m.lower() for m in munis}
            df = df[df[muni_col].astype(str).str.strip().str.lower().isin(lower_munis)]
            applied.append(f"municipalities: {munis}")

    # Call types (case-insensitive)
    call_types = filters.get("call_types")
    if call_types:
        type_col = detect_column(df, "incident_type")
        if type_col:
            lower_types = {t.lower() for t in call_types}
            df = df[df[type_col].astype(str).str.strip().str.lower().isin(lower_types)]
            applied.append(f"call_types: {call_types}")

    # Exclude interfacility / emergency only
    exclude_ift = filters.get("exclude_interfacility", False)
    emergency_only = filters.get("emergency_only", False)

    if exclude_ift or emergency_only:
        ift_mask = detect_interfacility_rows(df)
        df = df[~ift_mask]
        applied.append("excluded interfacility transports")

    logger.debug("Filters applied: %d → %d rows (%s)", original_len, len(df), applied)
    return df, applied


# ---------------------------------------------------------------------------
# Compute a filtered metrics snapshot (reusable for both filter and compare)
# ---------------------------------------------------------------------------

def _compute_filtered_metrics(df: pd.DataFrame, label: str) -> Dict[str, Any]:
    """Compute a full metrics snapshot for a (filtered) DataFrame."""
    if df.empty:
        return {"label": label, "empty": True, "total_calls": 0}

    vol = calculate_dispatched_call_volume(df)
    # Normalize call_volume keys to match regular dashboard format
    if isinstance(vol, dict):
        if vol.get("total_calls") is None:
            vol["total_calls"] = vol.get("total", len(df))
        if "avg_calls_per_day" not in vol:
            date_col_v = detect_column(df, "incident_date")
            if date_col_v:
                try:
                    _dates = pd.to_datetime(df[date_col_v], errors="coerce").dt.date
                    _n_days = _dates.nunique()
                    vol["avg_calls_per_day"] = _safe(round(len(df) / _n_days, 1)) if _n_days else None
                except Exception:
                    pass

    # Response times
    dispatch_col = detect_column(df, "dispatch_time")
    arrival_col  = detect_column(df, "arrival_time")
    clear_col    = detect_column(df, "clear_time")
    enroute_col  = detect_column(df, "enroute_time")
    received_col = detect_column(df, "received_time") or detect_column(df, "call_received_time")

    rt_minutes: Optional[pd.Series] = None
    rt_label = ""
    if dispatch_col and arrival_col:
        rt_minutes = _minutes_between(df, dispatch_col, arrival_col)
        rt_label = "dispatch_to_arrival"
    elif dispatch_col and clear_col:
        rt_minutes = _minutes_between(df, dispatch_col, clear_col)
        rt_label = "dispatch_to_clear"
    elif enroute_col and arrival_col:
        rt_minutes = _minutes_between(df, enroute_col, arrival_col)
        rt_label = "enroute_to_arrival"

    rt: Dict[str, Any] = {"available": False, "reason": "no time columns"}
    if rt_minutes is not None and rt_minutes.notna().sum() > 0:
        rt = {
            "available": True,
            "metric": rt_label,
            "median_minutes": _safe(round(float(rt_minutes.median()), 2)),
            "mean_minutes":   _safe(round(float(rt_minutes.mean()),   2)),
            "p90_minutes":    _safe(round(float(rt_minutes.quantile(0.90)), 2)),
            "max_minutes":    _safe(round(float(rt_minutes.max()), 2)),
        }
        # Add breakdown medians to match regular dashboard
        if dispatch_col and enroute_col:
            _d2e = _minutes_between(df, dispatch_col, enroute_col)
            if _d2e is not None and _d2e.notna().sum() > 0:
                rt["dispatch_to_enroute_median"] = _safe(round(float(_d2e.median()), 2))
        if enroute_col and arrival_col:
            _e2a = _minutes_between(df, enroute_col, arrival_col)
            if _e2a is not None and _e2a.notna().sum() > 0:
                rt["enroute_to_arrival_median"] = _safe(round(float(_e2a.median()), 2))
        if received_col and dispatch_col:
            _r2d = _minutes_between(df, received_col, dispatch_col)
            if _r2d is not None and _r2d.notna().sum() > 0:
                rt["received_to_dispatch_median"] = _safe(round(float(_r2d.median()), 2))
        if dispatch_col and arrival_col:
            rt["dispatch_to_arrival_median"] = _safe(round(float(rt_minutes.median()), 2))

    # By day
    date_col = detect_column(df, "incident_date")
    by_day: Any = {"available": False}
    if date_col:
        try:
            dates = pd.to_datetime(df[date_col], errors="coerce").dt.date
            vc = dates.dropna().value_counts().sort_index()
            by_day = [{"date": str(d), "count": int(c)} for d, c in vc.items()]
        except Exception:
            pass

    # By hour
    dt_col = detect_column(df, "dispatch_time") or detect_column(df, "incident_date")
    by_hour: Any = {"available": False}
    if dt_col:
        try:
            hours = pd.to_datetime(df[dt_col], errors="coerce").dt.hour
            if hours.notna().sum() > 0:
                vc = hours.dropna().astype(int).value_counts().sort_index()
                by_hour = [{"hour": int(h), "count": int(c)} for h, c in vc.items()]
        except Exception:
            pass

    # By municipality
    muni_col = detect_column(df, "municipality")
    by_muni: Any = {"available": False}
    if muni_col:
        by_muni = _value_counts_top(df[muni_col], 20)

    # By unit
    unit_col = detect_column(df, "unit")
    by_unit: Any = {"available": False}
    avg_rt_by_unit: List[Dict] = []
    if unit_col:
        by_unit = _value_counts_top(df[unit_col], 30)
        if rt_minutes is not None:
            tmp = pd.DataFrame({"unit": df[unit_col].astype(str).str.strip(), "rt": rt_minutes})
            avg = tmp.groupby("unit")["rt"].mean().dropna().sort_values().head(30)
            avg_rt_by_unit = [
                {"unit": k, "avg_response_time_minutes": _safe(round(float(v), 2))}
                for k, v in avg.items()
            ]

    # By call type
    type_col = detect_column(df, "incident_type")
    by_call_type: Any = {"available": False}
    if type_col:
        by_call_type = _value_counts_top(df[type_col], 20)

    # Busiest hour
    busiest_hour = None
    if isinstance(by_hour, list) and by_hour:
        busiest_hour = max(by_hour, key=lambda x: x["count"])["hour"]

    # Top call type
    top_call_type = None
    if isinstance(by_call_type, list) and by_call_type:
        top_call_type = by_call_type[0]["label"]

    # IFT count
    ift_mask = detect_interfacility_rows(df)
    ift_count = int(ift_mask.sum())

    return {
        "label": label,
        "call_volume": vol,
        "response_times": rt,
        "busiest_hour": busiest_hour,
        "top_call_type": top_call_type,
        "interfacility_count": ift_count,
        "by_day": by_day,
        "by_hour": by_hour,
        "by_municipality": by_muni,
        "by_unit": by_unit,
        "by_call_type": by_call_type,
        "avg_response_time_by_unit": avg_rt_by_unit,
    }


# ---------------------------------------------------------------------------
# Public API
# ---------------------------------------------------------------------------

def filtered_dashboard(upload: DataUpload, db: Session, filters: Dict[str, Any]) -> Dict[str, Any]:
    """Return dashboard metrics for a single filtered view."""
    df = _load_cleaned_df(upload, db)
    if df is None:
        return {"error": "Cleaned file not available"}

    df, applied = apply_dashboard_filters(df, filters)
    metrics = _compute_filtered_metrics(df, label="filtered")
    metrics["filters_applied"] = applied
    metrics["row_count"] = len(df)
    return metrics


def compare_dashboard(
    upload: DataUpload,
    db: Session,
    group_a_label: str,
    group_a_filters: Dict[str, Any],
    group_b_label: str,
    group_b_filters: Dict[str, Any],
) -> Dict[str, Any]:
    """Return side-by-side metrics for two filter groups + difference summary."""
    df_base = _load_cleaned_df(upload, db)
    if df_base is None:
        return {"error": "Cleaned file not available"}

    df_a, applied_a = apply_dashboard_filters(df_base.copy(), group_a_filters)
    df_b, applied_b = apply_dashboard_filters(df_base.copy(), group_b_filters)

    metrics_a = _compute_filtered_metrics(df_a, label=group_a_label)
    metrics_b = _compute_filtered_metrics(df_b, label=group_b_label)

    metrics_a["filters_applied"] = applied_a
    metrics_b["filters_applied"] = applied_b

    # Diff summary for key numeric fields
    def _pct_change(a: Optional[float], b: Optional[float]) -> Optional[float]:
        if a is None or b is None or a == 0:
            return None
        return _safe(round((b - a) / abs(a) * 100, 1))

    def _extract_rt(m: Dict) -> Dict[str, Optional[float]]:
        rt = m.get("response_times", {})
        if not rt.get("available"):
            return {}
        return {
            "median": rt.get("median_minutes"),
            "mean":   rt.get("mean_minutes"),
            "p90":    rt.get("p90_minutes"),
        }

    rt_a = _extract_rt(metrics_a)
    rt_b = _extract_rt(metrics_b)

    calls_a = metrics_a.get("call_volume", {}).get("total", 0)
    calls_b = metrics_b.get("call_volume", {}).get("total", 0)

    diff = {
        "calls": {
            "group_a": calls_a,
            "group_b": calls_b,
            "difference": calls_b - calls_a,
            "pct_change": _pct_change(calls_a, calls_b),
        },
        "response_time_median": {
            "group_a": rt_a.get("median"),
            "group_b": rt_b.get("median"),
            "difference": _safe((rt_b.get("median") or 0) - (rt_a.get("median") or 0))
                          if rt_a.get("median") and rt_b.get("median") else None,
            "pct_change": _pct_change(rt_a.get("median"), rt_b.get("median")),
        },
        "response_time_p90": {
            "group_a": rt_a.get("p90"),
            "group_b": rt_b.get("p90"),
            "difference": _safe((rt_b.get("p90") or 0) - (rt_a.get("p90") or 0))
                          if rt_a.get("p90") and rt_b.get("p90") else None,
            "pct_change": _pct_change(rt_a.get("p90"), rt_b.get("p90")),
        },
    }

    return {
        "group_a": metrics_a,
        "group_b": metrics_b,
        "diff": diff,
    }


# ---------------------------------------------------------------------------
# Column settings helpers
# ---------------------------------------------------------------------------

VALID_ROLES = frozenset({
    "analytics", "ignore", "sensitive", "id", "datetime", "unit", "category",
})


def get_column_settings(upload_id: UUID, db: Session) -> List[Dict[str, Any]]:
    rows = (
        db.query(AnalyticsColumnSettings)
        .filter(AnalyticsColumnSettings.data_upload_id == upload_id)
        .all()
    )
    return [
        {
            "id": str(r.id),
            "column_name": r.column_name,
            "is_ignored": r.is_ignored,
            "role": r.role,
            "reason": r.reason,
            "updated_at": r.updated_at.isoformat() if r.updated_at else None,
        }
        for r in rows
    ]


def _upsert_column_setting(
    upload: DataUpload,
    column_name: str,
    is_ignored: bool,
    reason: Optional[str],
    db: Session,
    role: Optional[str] = None,
) -> None:
    if role and role not in VALID_ROLES:
        role = None
    if role == "ignore":
        is_ignored = True
    existing = (
        db.query(AnalyticsColumnSettings)
        .filter(
            AnalyticsColumnSettings.data_upload_id == upload.id,
            AnalyticsColumnSettings.column_name == column_name,
        )
        .first()
    )
    if existing:
        existing.is_ignored = is_ignored
        existing.role = role if role is not None else existing.role
        existing.reason = reason
        existing.updated_at = __import__("datetime").datetime.utcnow()
    else:
        db.add(AnalyticsColumnSettings(
            data_upload_id=upload.id,
            client_id=upload.client_id,
            project_id=upload.project_id,
            column_name=column_name,
            is_ignored=is_ignored,
            role=role,
            reason=reason,
        ))


def patch_column_settings(
    upload: DataUpload,
    patches: List[Dict[str, Any]],
    db: Session,
) -> List[Dict[str, Any]]:
    """Upsert a list of {column_name, is_ignored, role?, reason?} patches."""
    for p in patches:
        _upsert_column_setting(
            upload,
            p["column_name"],
            p["is_ignored"],
            p.get("reason"),
            db,
            role=p.get("role"),
        )
    db.commit()
    return get_column_settings(upload.id, db)


def bulk_ignore_columns(
    upload: DataUpload,
    column_names: List[str],
    reason: Optional[str],
    db: Session,
) -> List[Dict[str, Any]]:
    for name in column_names:
        _upsert_column_setting(upload, name, True, reason, db)
    db.commit()
    return get_column_settings(upload.id, db)


def restore_columns(
    upload: DataUpload,
    column_names: List[str],
    db: Session,
) -> List[Dict[str, Any]]:
    for name in column_names:
        _upsert_column_setting(upload, name, False, None, db)
    db.commit()
    return get_column_settings(upload.id, db)
