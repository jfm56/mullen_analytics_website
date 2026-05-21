"""
Module 8 — Municipality / Geographic Analyzer  (Operational+ tier).

Breaks down call volume and response times by municipality / jurisdiction,
producing coverage gap indicators and comparative response time tables.
"""
import json
import logging
from pathlib import Path
from typing import Any, Dict, List

import pandas as pd

from .columns import normalize_cols, resolve
from .response_times import NFPA_1710_TOTAL_SECONDS

logger = logging.getLogger(__name__)


def _safe_parse(series: pd.Series) -> pd.Series:
    return pd.to_datetime(series, errors="coerce")


def _muni_stats(df: pd.DataFrame) -> Dict[str, Any]:
    df = normalize_cols(df)

    muni_col  = resolve(df, "municipality")
    call_col  = resolve(df, "call_date")
    scene_col = resolve(df, "on_scene_time")
    type_col  = resolve(df, "incident_type")

    if not muni_col:
        return {"error": "No municipality/jurisdiction column detected."}

    munis: Dict[str, Any] = {}

    for muni, grp in df.groupby(muni_col):
        muni = str(muni).strip()
        if not muni or muni.lower() in ("nan", "none", ""):
            continue

        stat: Dict[str, Any] = {"calls": int(len(grp))}

        if call_col and scene_col:
            t_call  = _safe_parse(grp[call_col])
            t_scene = _safe_parse(grp[scene_col])
            secs    = (t_scene - t_call).dt.total_seconds()
            secs    = secs[(secs >= 0) & (secs < 86400)].dropna()
            if not secs.empty:
                stat["response_median"] = round(float(secs.median()), 1)
                stat["response_p90"]    = round(float(secs.quantile(0.90)), 1)
                within = float((secs <= NFPA_1710_TOTAL_SECONDS).mean() * 100)
                stat["nfpa_compliance_pct"] = round(within, 1)

        if type_col:
            top = grp[type_col].value_counts().head(3).to_dict()
            stat["top_incident_types"] = {str(k): int(v) for k, v in top.items()}

        if call_col:
            hours = _safe_parse(grp[call_col]).dt.hour.dropna()
            if not hours.empty:
                stat["busiest_hour"] = int(hours.mode().iloc[0])

        munis[muni] = stat

    # Sort by call volume descending
    munis = dict(sorted(munis.items(), key=lambda kv: kv[1]["calls"], reverse=True))

    # Flag munis with worst response times
    flagged = [
        m for m, s in munis.items()
        if s.get("nfpa_compliance_pct", 100) < 70
    ]

    # Highest/lowest call-volume municipalities
    top5    = list(munis.keys())[:5]
    bottom5 = list(munis.keys())[-5:] if len(munis) > 5 else []

    return {
        "municipalities":        munis,
        "total_municipalities":  len(munis),
        "flagged_municipalities": flagged,
        "highest_volume":        top5,
        "lowest_volume":         bottom5,
    }


def run(
    dispatch_files: List[Dict[str, Any]],
    output_dir: str,
    cleaned_df=None,
    quality_report=None,
) -> Dict[str, Any]:
    if cleaned_df is not None and not cleaned_df.empty:
        analysis = _muni_stats(cleaned_df)
        summary  = {"module": "municipality", **analysis}
    else:
        all_frames: List[pd.DataFrame] = []
        for f in dispatch_files:
            path = f.get("upload_path", "")
            ext  = Path(path).suffix.lower()
            try:
                df = pd.read_csv(path, low_memory=False) if ext == ".csv" else pd.read_excel(path)
                all_frames.append(df)
            except Exception as exc:  # pylint: disable=broad-exception-caught
                logger.warning("Could not load dispatch file %s: %s", path, exc)

        if not all_frames:
            summary = {"module": "municipality", "error": "No dispatch files loaded."}
        else:
            combined = pd.concat(all_frames, ignore_index=True)
            analysis = _muni_stats(combined)
            summary  = {"module": "municipality", **analysis}

    out_path = str(Path(output_dir) / "municipality_summary.json")
    Path(output_dir).mkdir(parents=True, exist_ok=True)
    with open(out_path, "w", encoding="utf-8") as fh:
        json.dump(summary, fh, indent=2, default=str)

    logger.info(
        "Municipality analysis complete: %d municipalities, %d flagged",
        summary.get("total_municipalities", 0),
        len(summary.get("flagged_municipalities", [])),
    )
    return summary
