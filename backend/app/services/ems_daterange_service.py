"""
Date-range comparison across "like" files.

Pools cleaned uploads that share the SAME column structure — so only compatible
EMSCharts exports get combined; odd/one-off files with different columns stay in
their own group and never contaminate the pool. The pool is de-duplicated by
incident id, then the full dashboard metrics are computed for each user-defined
FROM/TO window, letting windows be compared side-by-side even when their rows
span multiple files.

FROM/TO are inclusive by calendar day (TO covers the entire day), sliced on the
dispatch datetime.
"""
from __future__ import annotations

import logging
import os
import tempfile
from typing import Any, Dict, List, Optional

import pandas as pd

from ..models.data_upload import DataUpload
from .ems_analytics_service import compute_ems_metrics, detect_column, detect_mapped_column
from .ems_filter_service import _load_cleaned_df

logger = logging.getLogger(__name__)

def _norm(c: str) -> str:
    return str(c).strip().lower()


def _schema_sig(cols) -> str:
    """Order-independent signature of a column set, so re-ordered but otherwise
    identical exports still group together."""
    return "|".join(sorted(_norm(c) for c in cols))


def _date_col(df: pd.DataFrame) -> Optional[str]:
    """Dispatch datetime is the reference for slicing; fall back to a generic
    incident date if dispatch isn't present."""
    return detect_mapped_column(df, "dispatch_time", None) or detect_column(df, "incident_date")


def _bounds(df: pd.DataFrame) -> tuple[Optional[str], Optional[str]]:
    col = _date_col(df)
    if not col:
        return None, None
    parsed = pd.to_datetime(df[col], errors="coerce").dropna()
    if not len(parsed):
        return None, None
    return str(parsed.min().date()), str(parsed.max().date())


def combinable_groups(uploads: List[DataUpload], db) -> List[Dict[str, Any]]:
    """Group cleaned uploads by identical column structure ("like files")."""
    groups: Dict[str, Dict[str, Any]] = {}
    for up in uploads:
        df = _load_cleaned_df(up, db)
        if df is None or df.empty:
            continue
        sig = _schema_sig(df.columns)
        g = groups.setdefault(sig, {"columns": sorted(_norm(c) for c in df.columns), "files": []})
        dmin, dmax = _bounds(df)
        g["files"].append({
            "upload_id": str(up.id),
            "filename": up.original_filename,
            "rows": int(len(df)),
            "date_min": dmin,
            "date_max": dmax,
            "uploaded_at": up.created_at.isoformat() if up.created_at else None,
        })

    out: List[Dict[str, Any]] = []
    # Largest groups first — the real EMSCharts exports rise to the top.
    ordered = sorted(groups.values(), key=lambda x: -sum(f["rows"] for f in x["files"]))
    for i, g in enumerate(ordered):
        mins = [f["date_min"] for f in g["files"] if f["date_min"]]
        maxs = [f["date_max"] for f in g["files"] if f["date_max"]]
        out.append({
            "group_id": f"g{i}",
            "file_count": len(g["files"]),
            "total_rows": sum(f["rows"] for f in g["files"]),
            "column_count": len(g["columns"]),
            "date_min": min(mins) if mins else None,
            "date_max": max(maxs) if maxs else None,
            "files": sorted(g["files"], key=lambda f: (f.get("date_min") or "", f["filename"])),
            "columns_preview": g["columns"][:14],
        })
    return out


def _slice_window(pooled: pd.DataFrame, frm: Optional[str], to: Optional[str]) -> pd.DataFrame:
    """Inclusive-by-day slice on the dispatch datetime (TO covers the whole day)."""
    col = _date_col(pooled)
    if not col or (not frm and not to):
        return pooled
    parsed = pd.to_datetime(pooled[col], errors="coerce")
    mask = parsed.notna()
    if frm:
        start = pd.to_datetime(frm, errors="coerce")
        if pd.notna(start):
            mask &= parsed >= start
    if to:
        end = pd.to_datetime(to, errors="coerce")
        if pd.notna(end):
            # +1 day, exclusive → the entire TO calendar day is included.
            mask &= parsed < (end + pd.Timedelta(days=1))
    return pooled[mask]


def _metrics_for(df: pd.DataFrame, label: str) -> Optional[Dict[str, Any]]:
    if df.empty:
        return None
    fd, tmp = tempfile.mkstemp(suffix=".csv")
    os.close(fd)
    try:
        df.to_csv(tmp, index=False)
        m = compute_ems_metrics(
            tmp,
            {"file_name": label, "row_count_original": len(df), "row_count_cleaned": len(df)},
            {"duplicate_rows_count": 0, "removed_rows_count": 0, "missing_values_summary": {}},
            None,
        )
        return m if isinstance(m, dict) and not m.get("error") else None
    except Exception as exc:  # noqa: BLE001
        logger.warning("daterange: metrics failed for %s: %s", label, exc)
        return None
    finally:
        try:
            os.remove(tmp)
        except Exception:  # noqa: BLE001
            pass


def daterange_compare(uploads: List[DataUpload], windows: List[Dict[str, Any]], db) -> Dict[str, Any]:
    """Pool the given uploads (de-duped by incident) and compute full metrics for
    each FROM/TO window."""
    dfs: List[pd.DataFrame] = []
    for up in uploads:
        df = _load_cleaned_df(up, db)
        if df is not None and not df.empty:
            dfs.append(df)
    if not dfs:
        return {"error": "No cleaned data available for the selected files."}

    pooled = pd.concat(dfs, ignore_index=True, sort=False)
    rows_pooled = len(pooled)
    deduped = 0
    if len(dfs) > 1:
        # Only when pooling MULTIPLE files: drop EXACT duplicate rows (the same record
        # appearing in two overlapping exports). This never collapses legitimate
        # multi-unit / multi-patient rows (they differ in other columns). A single
        # file is used as-is so its slices match the dashboard's own numbers exactly.
        pooled = pooled.drop_duplicates()
        deduped = rows_pooled - len(pooled)

    pmin, pmax = _bounds(pooled)

    results: List[Dict[str, Any]] = []
    for w in windows:
        frm, to = (w.get("from") or None), (w.get("to") or None)
        label = w.get("label") or f"{frm or '…'} → {to or '…'}"
        sliced = _slice_window(pooled, frm, to)
        results.append({
            "label": label,
            "from": frm,
            "to": to,
            "row_count": int(len(sliced)),
            "empty": bool(sliced.empty),
            "metrics": _metrics_for(sliced, label),
        })

    return {
        "windows": results,
        "pool": {
            "files": len(dfs),
            "rows_pooled": rows_pooled,
            "rows_used": int(len(pooled)),
            "deduped": int(deduped),
            "date_min": pmin,
            "date_max": pmax,
        },
    }


def combined_dashboard(uploads: List[DataUpload], db) -> Dict[str, Any]:
    """Pool every 'like' cleaned upload (the largest compatible schema group),
    de-duplicate, and compute ONE set of dashboard metrics over the union — so a
    client with many monthly/yearly EMSCharts exports sees all their data at once.

    Overlapping exports are handled two ways: exact-duplicate rows are dropped, and
    call volume stays correct regardless because _call_volume counts unique
    incident/dispatch ids (not rows). Files whose columns don't match the main
    group are left out rather than contaminating the pool.
    """
    by_sig: Dict[str, List[pd.DataFrame]] = {}
    files_by_sig: Dict[str, List[Dict[str, Any]]] = {}
    for up in uploads:
        df = _load_cleaned_df(up, db)
        if df is None or df.empty:
            continue
        sig = _schema_sig(df.columns)
        by_sig.setdefault(sig, []).append(df)
        files_by_sig.setdefault(sig, []).append(
            {"upload_id": str(up.id), "filename": up.original_filename, "rows": int(len(df))}
        )
    if not by_sig:
        return {"error": "No cleaned data available to combine."}

    # Largest compatible group by total rows = the real EMSCharts exports.
    best = max(by_sig, key=lambda s: sum(len(d) for d in by_sig[s]))
    dfs = by_sig[best]
    pooled = pd.concat(dfs, ignore_index=True, sort=False)
    rows_pooled = len(pooled)
    deduped = 0
    if len(dfs) > 1:
        pooled = pooled.drop_duplicates()
        deduped = rows_pooled - len(pooled)
    pmin, pmax = _bounds(pooled)

    metrics = _metrics_for(pooled, "Combined - all datasets")
    if not metrics:
        return {"error": "Could not compute combined metrics."}

    return {
        "metrics": metrics,
        "generated_at": None,
        "pool": {
            "files_combined": len(dfs),
            "files_total": sum(len(v) for v in files_by_sig.values()),
            "files_skipped": sum(len(v) for k, v in files_by_sig.items() if k != best),
            "rows_pooled": rows_pooled,
            "rows_used": int(len(pooled)),
            "deduped": int(deduped),
            "date_min": pmin,
            "date_max": pmax,
            "files": files_by_sig[best],
        },
    }
