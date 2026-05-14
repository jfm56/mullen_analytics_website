"""
Module 1 — Data Validator.

Loads each uploaded file, detects its format, resolves column names,
and reports quality issues without modifying the source data.
"""
import json
import logging
from pathlib import Path
from typing import Any, Dict, List, Optional

import pandas as pd

from .columns import normalize_cols, resolve, DISPATCH_COLUMNS, STAFFING_COLUMNS

logger = logging.getLogger(__name__)

REQUIRED_BY_TYPE: Dict[str, List[str]] = {
    "dispatch": ["incident_number", "date_created", "incident_type", "unit_id"],
    "staffing": ["employee_id", "date"],
    "termination": ["employee_id", "name"],
    "payroll": ["employee_id", "hours"],
    "mutual_aid": ["incident_number", "date_created"],
    "population": [],
    "other": [],
}


_SUPPORTED_EXTS = {".csv", ".xlsx", ".xls", ".json", ".parquet"}


def _load_file(path: str) -> Optional[pd.DataFrame]:
    ext = Path(path).suffix.lower()
    if ext not in _SUPPORTED_EXTS:
        return None  # caller checks extension first
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
        logger.error("Failed to load %s: %s", path, exc)
        return None


def validate_file(file_record: Dict[str, Any]) -> Dict[str, Any]:
    """
    Validate a single uploaded file record.

    Returns a validation result dict with keys:
      - file_id, original_filename, file_type
      - rows, columns
      - missing_required: list of unresolvable required fields
      - null_pct: {col: pct} for all detected columns
      - warnings: list of human-readable warnings
      - passed: bool
    """
    file_type = file_record.get("file_type", "other")
    path = file_record.get("upload_path", "")
    fname = file_record.get("original_filename", path)
    ext = Path(path).suffix.lower()

    result: Dict[str, Any] = {
        "file_id": str(file_record.get("id", "")),
        "original_filename": fname,
        "file_type": file_type,
        "rows": 0,
        "columns": 0,
        "missing_required": [],
        "null_pct": {},
        "warnings": [],
        "passed": False,
        "skipped": False,
    }

    if ext not in _SUPPORTED_EXTS:
        result["skipped"] = True
        result["warnings"].append(
            f"Unsupported file type ({ext}) — skipped. Only CSV and XLSX are accepted as data sources."
        )
        return result

    df = _load_file(path)
    if df is None:
        result["warnings"].append(f"Could not load file: {fname}")
        return result

    df = normalize_cols(df)
    result["rows"] = int(len(df))
    result["columns"] = int(len(df.columns))

    if len(df) == 0:
        result["warnings"].append("File contains no data rows.")
        return result

    required = REQUIRED_BY_TYPE.get(file_type, [])
    for field in required:
        col = resolve(df, field, file_type)
        if col is None:
            result["missing_required"].append(field)

    null_pct = {}
    mapping = DISPATCH_COLUMNS if file_type == "dispatch" else STAFFING_COLUMNS
    for semantic, candidates in mapping.items():
        col = resolve(df, semantic, file_type)
        if col:
            pct = float(df[col].isnull().mean() * 100)
            null_pct[semantic] = round(pct, 1)
            if pct > 50:
                result["warnings"].append(
                    f"Column '{semantic}' is {pct:.0f}% null — check data quality."
                )

    result["null_pct"] = null_pct

    if result["missing_required"]:
        result["warnings"].append(
            f"Missing required fields: {', '.join(result['missing_required'])}"
        )

    result["passed"] = len(result["missing_required"]) == 0

    return result


def run(files: List[Dict[str, Any]], output_dir: str) -> Dict[str, Any]:
    """Run validation on all uploaded files and write validation_report.json."""
    results = [validate_file(f) for f in files]
    skipped = [r for r in results if r.get("skipped")]
    checked  = [r for r in results if not r.get("skipped")]
    passed   = sum(1 for r in checked if r["passed"])
    summary = {
        "module": "validator",
        "files_validated": len(checked),
        "files_passed":    passed,
        "files_failed":    len(checked) - passed,
        "files_skipped":   len(skipped),
        "skipped_files":   [r["original_filename"] for r in skipped],
        "results": checked,
    }
    out_path = str(Path(output_dir) / "validation_report.json")
    Path(output_dir).mkdir(parents=True, exist_ok=True)
    with open(out_path, "w", encoding="utf-8") as fh:
        json.dump(summary, fh, indent=2, default=str)
    logger.info("Validation complete: %d/%d passed", passed, len(results))
    return summary
