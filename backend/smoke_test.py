import sys
sys.path.insert(0, ".")

import numpy as np
import pandas as pd
from ems_pipeline import run_pipeline, COLUMN_MAP


def make_healthy(n_days=1095, seed=7):
    rng = np.random.default_rng(seed)
    rows = []
    base = pd.Timestamp("2022-01-01")
    for d in range(n_days):
        day = base + pd.Timedelta(days=d)
        n_calls = rng.poisson(12)
        for c in range(n_calls):
            hour = int(np.clip(rng.normal(13, 5), 0, 23))
            created = day + pd.Timedelta(hours=hour, minutes=int(rng.integers(0, 60)))
            dispatched = created + pd.Timedelta(seconds=int(rng.integers(30, 240)))
            response_min = float(np.clip(rng.normal(8.5, 3.0), 0.5, 60))
            arrived = dispatched + pd.Timedelta(minutes=response_min)
            enroute = dispatched + pd.Timedelta(minutes=float(np.clip(rng.normal(1.2, 0.5), 0.1, 30)))
            available = arrived + pd.Timedelta(minutes=float(np.clip(rng.normal(45, 20), 5, 180)))
            unit = f"BLS{rng.integers(1, 12):02d}"
            rows.append({
                COLUMN_MAP["incident_id"]:     f"INC{d:05d}_{c:03d}",
                COLUMN_MAP["date_created"]:    created,
                COLUMN_MAP["date_dispatched"]: dispatched,
                COLUMN_MAP["date_enroute"]:    enroute,
                COLUMN_MAP["date_arrived"]:    arrived,
                COLUMN_MAP["date_available"]:  available,
                COLUMN_MAP["unit"]:            unit,
                COLUMN_MAP["service_type"]:    rng.choice(["Primary", "Mutual Aid", "Transfer"]),
                COLUMN_MAP["category"]:        rng.choice(["Medical", "Trauma", "Non-Emergency Transport"], p=[0.7, 0.2, 0.1]),
            })
    return pd.DataFrame(rows)


def make_broken(seed=7):
    healthy = make_healthy(n_days=400, seed=seed)
    rng = np.random.default_rng(seed)
    healthy[COLUMN_MAP["date_created"]] = healthy[COLUMN_MAP["date_created"]].astype(object)
    bad_mask = rng.random(len(healthy)) < 0.85
    healthy.loc[bad_mask, COLUMN_MAP["date_created"]] = "??not_a_date??"
    munit_mask = rng.random(len(healthy)) < 0.80
    healthy.loc[munit_mask, COLUMN_MAP["unit"]] = [
        f"M{rng.integers(1, 9):02d}" for _ in range(int(munit_mask.sum()))
    ]
    n_dupes = int(len(healthy) * 0.12)
    dupes = healthy.sample(n=n_dupes, random_state=seed).copy()
    return pd.concat([healthy, dupes], ignore_index=True)


def print_report(label, raw):
    sep = "=" * 72
    print(f"\n{sep}\n  {label}\n{sep}")
    print(f"Input rows: {len(raw):,}")
    result = run_pipeline(raw)
    q = result.quality

    print(f"\n-> can_render_dashboard: {result.can_render_dashboard}")
    print(f"-> can_run_models:       {result.can_run_models}")
    print(f"-> reliability_band:     {q.reliability_band}")
    print(f"-> reliability_score:    {q.reliability_score:.3f}")

    if q.validation.critical_issues:
        print("\n--- CRITICAL ISSUES ---")
        for i in q.validation.critical_issues:
            print(f"  * {i}")
    if q.validation.warnings:
        print("\n--- WARNINGS ---")
        for i in q.validation.warnings:
            print(f"  * {i}")

    print("\n--- REASONING ---")
    for r in q.reasoning:
        print(f"  * {r}")

    if result.cleaned is not None:
        print(f"\n--- CLEANED ---  rows={len(result.cleaned):,}")
        print(f"  BLS kept / dropped: {q.cleaning.bls_units_kept:,} / {q.cleaning.bls_units_dropped:,}")
        print(f"  RT out-of-bounds:   {q.cleaning.response_time_out_of_bounds:,}")
        print(f"  RT winsorized:      {q.cleaning.response_time_winsorized:,}")
    if result.daily is not None:
        print(f"\n--- DAILY ---  rows={len(result.daily)}")
        print(f"  Avg RT across all days: {result.daily['Avg_Response_Time'].mean():.2f} min")


if __name__ == "__main__":
    print_report("HEALTHY DATASET", make_healthy())
    print_report("BROKEN DATASET (reproduces all symptoms)", make_broken())
