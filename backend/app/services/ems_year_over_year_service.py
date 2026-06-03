"""
Year-over-Year EMS Analytics Service.

Reads per-upload EMSDashboardMetrics and aggregates them by reporting_year
within a dataset group so the UI can render trend charts and comparisons.
"""
from typing import Dict, List, Optional, Any
from uuid import UUID

from sqlalchemy.orm import Session

from ..models.data_upload import DataUpload, EMSDatasetGroup, EMSDashboardMetrics


# ---------------------------------------------------------------------------
# Internal helpers
# ---------------------------------------------------------------------------

def _get_group(group_id: UUID, db: Session) -> Optional[EMSDatasetGroup]:
    return db.query(EMSDatasetGroup).filter(EMSDatasetGroup.id == group_id).first()


def _group_uploads(group_id: UUID, db: Session) -> List[DataUpload]:
    """Return CLEANED uploads in the group, ordered by reporting_year."""
    return (
        db.query(DataUpload)
        .filter(
            DataUpload.dataset_group_id == group_id,
            DataUpload.upload_status == "CLEANED",
        )
        .order_by(DataUpload.reporting_year)
        .all()
    )


def _all_uploads(group_id: UUID, db: Session) -> List[DataUpload]:
    """Return ALL uploads (any status) ordered by reporting_year."""
    return (
        db.query(DataUpload)
        .filter(DataUpload.dataset_group_id == group_id)
        .order_by(DataUpload.reporting_year)
        .all()
    )


def _metrics_for_upload(upload_id: UUID, db: Session) -> Dict:
    row = (
        db.query(EMSDashboardMetrics)
        .filter(EMSDashboardMetrics.data_upload_id == upload_id)
        .first()
    )
    return row.metrics_json if row else {}


def _safe_avg(values: List[float]) -> Optional[float]:
    clean = [v for v in values if v is not None]
    return round(sum(clean) / len(clean), 2) if clean else None


def _pct_change(old: float, new: float) -> Optional[float]:
    if old is None or new is None or old == 0:
        return None
    return round((new - old) / old * 100, 2)


# ---------------------------------------------------------------------------
# Public API
# ---------------------------------------------------------------------------

def get_dataset_years(group_id: UUID, db: Session) -> Dict:
    """Return uploaded years, missing years, and coverage metadata."""
    group = _get_group(group_id, db)
    if not group:
        return {}

    uploads = _all_uploads(group_id, db)
    uploaded_years = sorted({u.reporting_year for u in uploads if u.reporting_year})
    cleaned_years  = sorted({u.reporting_year for u in uploads
                              if u.reporting_year and u.upload_status == "CLEANED"})

    start = group.start_year or (min(uploaded_years) if uploaded_years else None)
    end   = group.end_year   or (max(uploaded_years) if uploaded_years else None)

    missing_years: List[int] = []
    if start and end:
        missing_years = [y for y in range(start, end + 1) if y not in uploaded_years]

    return {
        "group_id":      str(group.id),
        "name":          group.name,
        "client_id":     str(group.client_id),
        "start_year":    start,
        "end_year":      end,
        "uploaded_years":uploaded_years,
        "cleaned_years": cleaned_years,
        "missing_years": missing_years,
        "upload_count":  len(uploads),
    }


def get_yearly_metrics(group_id: UUID, db: Session) -> List[Dict]:
    """Return one metrics dict per cleaned year in the group."""
    uploads = _group_uploads(group_id, db)
    result = []
    for upload in uploads:
        m = _metrics_for_upload(upload.id, db)
        year_data: Dict[str, Any] = {
            "year":              upload.reporting_year,
            "upload_id":         str(upload.id),
            "filename":          upload.original_filename,
            "row_count_cleaned": upload.row_count_cleaned,
            "row_count_original":upload.row_count_original,
            # Call Volume
            "total_calls":             m.get("total_calls") or m.get("total_incidents"),
            "calls_per_day":           m.get("avg_calls_per_day"),
            # Response Times
            "avg_response_time":       m.get("avg_response_time_seconds") or m.get("avg_response_time"),
            "median_response_time":    m.get("median_response_time_seconds") or m.get("median_response_time"),
            "p90_response_time":       m.get("p90_response_time_seconds") or m.get("p90_response_time"),
            "avg_dispatch_to_enroute": m.get("avg_dispatch_to_enroute_seconds") or m.get("avg_dispatch_to_enroute"),
            "avg_enroute_to_arrival":  m.get("avg_enroute_to_arrival_seconds") or m.get("avg_enroute_to_arrival"),
            # Incident breakdown
            "transports":              m.get("transports"),
            "refusals":                m.get("refusals"),
            "cancellations":           m.get("cancellations"),
            "ift_calls":               m.get("ift_count") or m.get("interfacility_count"),
            # Data quality
            "missing_dispatch_pct":    m.get("missing_dispatch_time_pct"),
            "missing_arrival_pct":     m.get("missing_arrival_time_pct"),
            "duplicate_count":         m.get("duplicate_count"),
            # Raw
            "calls_by_month":          m.get("calls_by_month", {}),
            "calls_by_day_of_week":    m.get("calls_by_day_of_week", {}),
            "calls_by_hour":           m.get("calls_by_hour", {}),
            "calls_by_unit":           m.get("calls_by_unit", {}),
            "calls_by_incident_type":  m.get("calls_by_incident_type", {}),
        }
        result.append(year_data)
    return result


def compare_years(
    group_id: UUID,
    year_a: int,
    year_b: int,
    db: Session,
    year_c: Optional[int] = None,
) -> Dict:
    """Side-by-side comparison of two (or three) years."""
    yearly = {y["year"]: y for y in get_yearly_metrics(group_id, db)}

    def _row(label: str, key: str, fmt: str = "number") -> Dict:
        va = yearly.get(year_a, {}).get(key)
        vb = yearly.get(year_b, {}).get(key)
        vc = yearly.get(year_c, {}).get(key) if year_c else None
        change_ab = _pct_change(va, vb)
        return {
            "metric":      label,
            str(year_a):   va,
            str(year_b):   vb,
            **({"change_pct": change_ab} if change_ab is not None else {}),
            **({str(year_c): vc} if year_c else {}),
            "format":      fmt,
        }

    rows = [
        _row("Total Calls",                   "total_calls"),
        _row("Avg Calls per Day",              "calls_per_day"),
        _row("Avg Response Time (s)",          "avg_response_time", "seconds"),
        _row("Median Response Time (s)",       "median_response_time", "seconds"),
        _row("P90 Response Time (s)",          "p90_response_time", "seconds"),
        _row("Avg Dispatch → Enroute (s)",     "avg_dispatch_to_enroute", "seconds"),
        _row("Avg Enroute → Arrival (s)",      "avg_enroute_to_arrival", "seconds"),
        _row("Transports",                     "transports"),
        _row("Refusals",                       "refusals"),
        _row("Cancellations",                  "cancellations"),
        _row("IFT Calls",                      "ift_calls"),
        _row("Missing Dispatch % ",            "missing_dispatch_pct", "pct"),
        _row("Missing Arrival %",              "missing_arrival_pct", "pct"),
        _row("Duplicate Incidents",            "duplicate_count"),
    ]

    return {
        "group_id":  str(group_id),
        "year_a":    year_a,
        "year_b":    year_b,
        "year_c":    year_c,
        "rows":      rows,
    }


def get_multi_year_dashboard(group_id: UUID, db: Session) -> Dict:
    """Full dashboard payload: metadata + per-year metrics + trend series."""
    coverage  = get_dataset_years(group_id, db)
    yearly    = get_yearly_metrics(group_id, db)

    if not yearly:
        return {**coverage, "yearly": [], "trends": {}}

    # Build recharts-friendly series: [{year, total_calls, avg_response_time, ...}]
    trend_series = [
        {
            "year":             y["year"],
            "total_calls":      y["total_calls"],
            "avg_response_time":y["avg_response_time"],
            "p90_response_time":y["p90_response_time"],
            "transports":       y["transports"],
            "ift_calls":        y["ift_calls"],
        }
        for y in yearly
    ]

    # Best/worst years
    call_vals = [(y["year"], y["total_calls"]) for y in yearly if y["total_calls"]]
    rt_vals   = [(y["year"], y["avg_response_time"]) for y in yearly if y["avg_response_time"]]

    return {
        **coverage,
        "yearly":       yearly,
        "trend_series": trend_series,
        "summary": {
            "highest_volume_year": max(call_vals, key=lambda x: x[1])[0] if call_vals else None,
            "lowest_volume_year":  min(call_vals, key=lambda x: x[1])[0] if call_vals else None,
            "best_response_year":  min(rt_vals,   key=lambda x: x[1])[0] if rt_vals   else None,
            "worst_response_year": max(rt_vals,   key=lambda x: x[1])[0] if rt_vals   else None,
            "avg_calls_per_year":  _safe_avg([y["total_calls"] for y in yearly]),
            "avg_response_time":   _safe_avg([y["avg_response_time"] for y in yearly]),
        },
    }
