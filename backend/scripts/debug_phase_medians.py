"""
debug_phase_medians.py — Phase interval median audit script.

Usage (from backend/ directory):
    python scripts/debug_phase_medians.py <path_to_dispatch_csv>

Prints per-phase medians on their individual valid-timestamp subsets, then
repeats on the intersection subset (calls with ALL four phases valid) and
shows the sum check to confirm whether the medians are arithmetically consistent.
"""
import sys
from pathlib import Path

import pandas as pd


PHASES = {
    "call_processing": ("call_date",     "dispatch_time"),
    "turnout":         ("dispatch_time", "en_route_time"),
    "travel":          ("en_route_time", "on_scene_time"),
    "total_response":  ("call_date",     "on_scene_time"),
}

# Column aliases that the pipeline normalises to
COL_ALIASES = {
    "call_date":     ["call_date", "incident_date", "call_time", "received_time"],
    "dispatch_time": ["dispatch_time", "dispatched_time", "time_dispatched"],
    "en_route_time": ["en_route_time", "enroute_time", "time_enroute"],
    "on_scene_time": ["on_scene_time", "onscene_time", "time_onscene", "arrived_time"],
}


def _resolve_col(df: pd.DataFrame, canonical: str) -> str | None:
    for alias in COL_ALIASES[canonical]:
        if alias in df.columns:
            return alias
    return None


def run(csv_path: str) -> None:
    df = pd.read_csv(csv_path, low_memory=False)
    print(f"\nLoaded {len(df):,} rows from {csv_path}\n")

    # Resolve column names
    col_map: dict[str, str | None] = {k: _resolve_col(df, k) for k in COL_ALIASES}
    missing = [k for k, v in col_map.items() if v is None]
    if missing:
        print(f"WARNING: Could not find columns for: {missing}")

    # Parse timestamps
    for canonical, actual in col_map.items():
        if actual:
            df[canonical] = pd.to_datetime(df[actual], errors="coerce")

    # ── Per-phase medians (individual subsets) ──────────────────────────────
    print(f"{'Phase':<22} {'n_valid':>8}  {'median (s)':>12}  {'median (fmt)':>14}")
    print("-" * 62)

    phase_medians: dict[str, float] = {}
    for phase, (start_col, end_col) in PHASES.items():
        s = col_map.get(start_col)
        e = col_map.get(end_col)
        if not s or not e:
            print(f"{phase:<22} {'N/A':>8}  {'N/A':>12}  {'N/A':>14}")
            continue
        delta = (df[end_col] - df[start_col]).dt.total_seconds()
        valid = delta[(delta > 0) & (delta < 7200)]          # 0 < duration < 2 hrs
        med = valid.median() if len(valid) else float("nan")
        phase_medians[phase] = med
        fmt = _fmt(med)
        print(f"{phase:<22} {len(valid):>8,}  {med:>12.1f}  {fmt:>14}")

    # ── Intersection subset ──────────────────────────────────────────────────
    print("\n── Intersection subset (all four phases valid) ──")
    masks = []
    for phase, (start_col, end_col) in PHASES.items():
        s = col_map.get(start_col)
        e = col_map.get(end_col)
        if not s or not e:
            continue
        delta = (df[end_col] - df[start_col]).dt.total_seconds()
        masks.append((delta > 0) & (delta < 7200))

    if masks:
        combined = masks[0]
        for m in masks[1:]:
            combined = combined & m
        sub = df[combined].copy()
        print(f"Rows with all phases valid: {len(sub):,}\n")
        print(f"{'Phase':<22} {'n_valid':>8}  {'median (s)':>12}  {'median (fmt)':>14}")
        print("-" * 62)
        sub_medians: dict[str, float] = {}
        for phase, (start_col, end_col) in PHASES.items():
            e_col = col_map.get(end_col)
            s_col = col_map.get(start_col)
            if not s_col or not e_col:
                continue
            delta = (sub[end_col] - sub[start_col]).dt.total_seconds()
            med = delta.median() if len(delta) else float("nan")
            sub_medians[phase] = med
            print(f"{phase:<22} {len(delta):>8,}  {med:>12.1f}  {_fmt(med):>14}")

        # Sum check
        comp_sum = sum(
            sub_medians.get(p, 0)
            for p in ("call_processing", "turnout", "travel")
        )
        total = sub_medians.get("total_response", float("nan"))
        diff = abs(comp_sum - total)
        print(f"\nSum check (intersection subset):")
        print(f"  call_processing + turnout + travel = {comp_sum:.1f}s  ({_fmt(comp_sum)})")
        print(f"  total_response                     = {total:.1f}s  ({_fmt(total)})")
        print(f"  Difference                         = {diff:.1f}s")
        if diff < 30:
            print("  ✓ Medians are arithmetically consistent (within 30s).")
            print("  NOTE: Display is statistically correct. Phase medians computed on")
            print("        overlapping but non-identical subsets — they do not sum in general.")
        else:
            print("  ⚠ Gap >30s — verify timestamp parsing or pipeline logic.")


def _fmt(s: float) -> str:
    if s != s:
        return "—"
    m, r = divmod(round(s), 60)
    return f"{m}m {r:02d}s" if m else f"{r}s"


if __name__ == "__main__":
    if len(sys.argv) < 2:
        print("Usage: python scripts/debug_phase_medians.py <dispatch_csv>")
        sys.exit(1)
    run(sys.argv[1])
