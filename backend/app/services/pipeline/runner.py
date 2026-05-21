"""
Pipeline Orchestrator.

Coordinates all analysis modules in sequence, updates the pipeline_run
record throughout, and writes all outputs to the agency's processed/ folder.
"""
import logging
import uuid
from datetime import datetime, timezone
from pathlib import Path
from typing import Any, Dict, List, Optional

from sqlalchemy.orm import Session

from ...models.agency import AgencyFile, PipelineRun
from ...services.audit import log_action
from . import (
    data_quality, validator, call_volume, response_times,
    staffing, forecasting, unit_performance, municipality, report,
    incidents_export,
)

logger = logging.getLogger(__name__)

# ── Payroll filename heuristic ────────────────────────────────────────────────
# Files classified as 'staffing' but whose name matches these terms are
# aggregate payroll reports, not per-row timekeeping/roster files.
# They are logged as warnings and excluded from the staffing module.
_PAYROLL_INDICATORS = frozenset([
    "payroll", "pay_roll", "wages", "compensation", "salary", "w-2", "w2",
])


def _is_payroll_filename(filename: str) -> bool:
    """Return True if the filename strongly suggests an aggregate payroll report."""
    name = filename.lower()
    return any(ind in name for ind in _PAYROLL_INDICATORS)


# TODO (SaaS v2): Move TIER_MODULES to a subscription-aware FeatureGate service.
# Each tier should map to a set of enabled features, allow per-agency overrides,
# and enforce limits (e.g. max run frequency, max file size).
TIER_MODULES = {
    "essential":   ["data_quality", "validator", "call_volume", "response_times", "report"],
    "operational": ["data_quality", "validator", "call_volume", "response_times", "staffing",
                    "unit_performance", "municipality", "report"],
    "predictive":  ["data_quality", "validator", "call_volume", "response_times", "staffing",
                    "unit_performance", "municipality", "forecasting", "report"],
    "enterprise":  ["data_quality", "validator", "call_volume", "response_times", "staffing",
                    "unit_performance", "municipality", "forecasting", "report"],
}


def _set_status(db: Session, run: PipelineRun, status: str, error: Optional[str] = None) -> None:
    run.status = status
    if status == "running":
        run.started_at = datetime.now(timezone.utc)
    elif status in ("completed", "failed"):
        run.completed_at = datetime.now(timezone.utc)
    if error:
        run.error_message = error
    db.commit()


def _get_files(db: Session, agency_id: str, file_type: Optional[str] = None) -> List[Dict[str, Any]]:
    query = db.query(AgencyFile).filter(AgencyFile.agency_id == agency_id)
    if file_type:
        query = query.filter(AgencyFile.file_type == file_type)
    rows = query.all()
    return [
        {
            "id":                str(r.id),
            "original_filename": r.original_filename,
            "file_type":         r.file_type,
            "upload_path":       r.upload_path,
            "status":            r.status,
        }
        for r in rows
    ]


def execute(
    db: Session,
    run_id: str,
    agency_id: str,
    agency_name: str,
    subscription_tier: str,
    storage_root: str,
    triggered_by: Optional[str] = None,
    column_map: Optional[Dict[str, str]] = None,
    analytics_config: Optional[Dict[str, Any]] = None,
) -> None:
    """
    Main pipeline entry point — intended to be called from a BackgroundTask.
    All exceptions are caught so the run record is always updated.
    """
    run = db.query(PipelineRun).filter(PipelineRun.id == run_id).first()
    if not run:
        logger.error("Pipeline run %s not found.", run_id)
        return

    processed_dir = str(
        Path(storage_root) / "agencies" / agency_id / "processed" / run_id
    )
    Path(processed_dir).mkdir(parents=True, exist_ok=True)

    _set_status(db, run, "running")
    logger.info("[pipeline:%s] started for agency %s", run_id[:8], agency_id)

    modules = TIER_MODULES.get(subscription_tier, TIER_MODULES["essential"])

    try:
        all_files = _get_files(db, agency_id)

        # Route payroll-named files away from the staffing module
        payroll_routed = [
            f for f in all_files
            if f["file_type"] == "staffing" and _is_payroll_filename(f["original_filename"])
        ]
        for pf in payroll_routed:
            logger.warning(
                "[pipeline:%s] '%s' (file_type=staffing) looks like a payroll report — "
                "excluded from staffing analysis. Reclassify to file_type='payroll' or 'other'.",
                run_id[:8], pf["original_filename"],
            )

        staffing_files = [
            f for f in all_files
            if f["file_type"] == "staffing" and not _is_payroll_filename(f["original_filename"])
        ]
        dispatch_files = [f for f in all_files if f["file_type"] == "dispatch"]

        validation_result   = {}
        quality_result      = {}
        call_vol_result     = {}
        resp_times_result   = {}
        staffing_result     = {}
        unit_perf_result    = {}
        municipality_result = {}
        forecast_result     = {}

        # ── Data Quality — always first; produces the cleaned DataFrame ────
        cleaned_df   = None
        quality_report_dict: Dict[str, Any] = {}
        if "data_quality" in modules:
            logger.info("[pipeline:%s] running data_quality (%d dispatch files)", run_id[:8], len(dispatch_files))
            cleaned_df, quality_report_dict = data_quality.clean_dispatch(
                dispatch_files, column_map=column_map or {}
            )
            quality_result = {"module": "data_quality", **quality_report_dict}

        # ── Compact incident export — always after data_quality ────────────
        if cleaned_df is not None and not cleaned_df.empty:
            try:
                incidents_export.export_compact_incidents(
                    cleaned_df, quality_report_dict, processed_dir
                )
            except Exception as _exc:  # pylint: disable=broad-exception-caught
                logger.warning("[pipeline:%s] incidents_export failed (non-fatal): %s", run_id[:8], _exc)

        if "validator" in modules:
            logger.info("[pipeline:%s] running validator (%d files)", run_id[:8], len(all_files))
            validation_result = validator.run(all_files, processed_dir)

        if "call_volume" in modules:
            logger.info("[pipeline:%s] running call_volume (%d dispatch files)", run_id[:8], len(dispatch_files))
            call_vol_result = call_volume.run(
                dispatch_files, processed_dir,
                cleaned_df=cleaned_df,
                quality_report=quality_report_dict,
            )

        if "response_times" in modules:
            logger.info("[pipeline:%s] running response_times", run_id[:8])
            resp_times_result = response_times.run(
                dispatch_files, processed_dir,
                cleaned_df=cleaned_df,
                quality_report=quality_report_dict,
            )

        if "staffing" in modules and staffing_files:
            logger.info("[pipeline:%s] running staffing (%d files)", run_id[:8], len(staffing_files))
            staffing_result = staffing.run(staffing_files, processed_dir)

        if "unit_performance" in modules:
            logger.info("[pipeline:%s] running unit_performance", run_id[:8])
            unit_perf_result = unit_performance.run(
                dispatch_files, processed_dir,
                cleaned_df=cleaned_df,
                quality_report=quality_report_dict,
            )

        if "municipality" in modules:
            logger.info("[pipeline:%s] running municipality", run_id[:8])
            municipality_result = municipality.run(
                dispatch_files, processed_dir,
                cleaned_df=cleaned_df,
                quality_report=quality_report_dict,
            )

        if "forecasting" in modules:
            logger.info("[pipeline:%s] running forecasting", run_id[:8])
            forecast_result = forecasting.run(
                dispatch_files=dispatch_files,
                output_dir=processed_dir,
                staffing_summary=staffing_result or None,
                cleaned_df=cleaned_df,
                quality_report=quality_report_dict,
            )

        if "report" in modules:
            logger.info("[pipeline:%s] generating report", run_id[:8])
            report.build(
                agency_id=agency_id,
                agency_name=agency_name,
                subscription_tier=subscription_tier,
                validation=validation_result,
                data_quality=quality_result,
                call_volume=call_vol_result,
                response_times=resp_times_result,
                staffing=staffing_result,
                unit_performance=unit_perf_result,
                municipality=municipality_result,
                forecasting=forecast_result,
                analytics_config=analytics_config or {},
                output_dir=processed_dir,
            )

        run.output_path = processed_dir
        run.report_path = str(Path(processed_dir) / "executive_report.json")
        _set_status(db, run, "completed")

        _mark_files_processed(db, agency_id)

        log_action(
            db,
            action="pipeline_completed",
            user_id=triggered_by,
            agency_id=agency_id,
            resource_type="pipeline_run",
            resource_id=run_id,
            details={
                "total_files":    len(all_files),
                "dispatch_files": len(dispatch_files),
                "output_dir":     processed_dir,
            },
        )
        logger.info("[pipeline:%s] completed successfully", run_id[:8])

    except Exception as exc:  # pylint: disable=broad-exception-caught
        logger.exception("[pipeline:%s] failed: %s", run_id[:8], exc)
        _set_status(db, run, "failed", error=str(exc))
        log_action(
            db,
            action="pipeline_failed",
            user_id=triggered_by,
            agency_id=agency_id,
            resource_type="pipeline_run",
            resource_id=run_id,
            details={"error": str(exc)},
        )


def _mark_files_processed(db: Session, agency_id: str) -> None:
    db.query(AgencyFile).filter(
        AgencyFile.agency_id == agency_id,
        AgencyFile.status == "uploaded",
    ).update({"status": "processed"})
    db.commit()
