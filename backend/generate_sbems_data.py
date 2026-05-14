"""Generate synthetic SBEMS dispatch + staffing data for pipeline testing."""
import warnings
warnings.filterwarnings("ignore")

import pandas as pd
import numpy as np

rng = np.random.default_rng(42)

# ── municipalities (weighted by population) ──────────────────────────────────
municipalities = [
    "Clinton Township", "Town of Clinton", "Lebanon Borough",
    "High Bridge Borough", "Hampton Borough", "Glen Gardner Borough",
    "Franklin Twp (Hun.)", "Union Township", "Bethlehem Township",
    "Tewksbury Township",
]
muni_weights = np.array([13347, 2784, 1664, 3501, 1612, 493, 6278, 5021, 2083, 1819], dtype=float)
muni_weights /= muni_weights.sum()

units = ["M-61", "M-62", "M-63", "M-64", "R-65", "M-66", "R-67"]
incident_types = [
    "Medical Emergency", "Cardiac Arrest", "MVA", "Fall Patient",
    "Respiratory Distress", "Chest Pain", "Stroke", "Diabetic Emergency",
    "Unconscious Person", "Trauma", "Allergic Reaction", "Abdominal Pain",
]
inc_weights = np.array([25, 5, 15, 18, 10, 8, 5, 4, 3, 4, 2, 1], dtype=float)
inc_weights /= inc_weights.sum()

priorities   = ["P1", "P2", "P3"]
pri_weights  = np.array([0.35, 0.45, 0.20])

# ── generate dispatch records 2022-2025 ──────────────────────────────────────
rows = []
call_num = 1000
for year in range(2022, 2026):
    n_calls = int(rng.integers(3800, 4400))
    base    = pd.Timestamp(f"{year}-01-01")
    seconds_in_year = 365 * 24 * 3600
    offsets = np.sort(rng.integers(0, seconds_in_year, n_calls))

    for offset in offsets:
        dt       = base + pd.Timedelta(seconds=int(offset))
        priority = rng.choice(priorities, p=pri_weights)
        muni     = rng.choice(municipalities, p=muni_weights)
        unit     = rng.choice(units)
        inc_type = rng.choice(incident_types, p=inc_weights)

        if priority == "P1":
            chute  = max(20, int(rng.normal(45, 20)))
            travel = max(60, int(rng.normal(210, 80)))
        elif priority == "P2":
            chute  = max(30, int(rng.normal(65, 25)))
            travel = max(90, int(rng.normal(280, 100)))
        else:
            chute  = max(45, int(rng.normal(90, 40)))
            travel = max(120, int(rng.normal(360, 120)))

        total_rt  = chute + travel
        on_scene  = max(300, int(rng.normal(1200, 600)))
        transport = bool(rng.choice([True, False], p=[0.65, 0.35]))

        rows.append({
            "call_number":            f"SBEMS-{year}-{call_num:05d}",
            "incident_date":          dt.strftime("%Y-%m-%d"),
            "incident_time":          dt.strftime("%H:%M:%S"),
            "dispatch_time":          dt.strftime("%H:%M:%S"),
            "unit_dispatched_time":   (dt + pd.Timedelta(seconds=chute)).strftime("%H:%M:%S"),
            "unit_enroute_time":      (dt + pd.Timedelta(seconds=chute)).strftime("%H:%M:%S"),
            "unit_onscene_time":      (dt + pd.Timedelta(seconds=total_rt)).strftime("%H:%M:%S"),
            "unit_id":                unit,
            "incident_type":          inc_type,
            "priority":               priority,
            "municipality":           muni,
            "chute_time_seconds":     chute,
            "travel_time_seconds":    travel,
            "response_time_seconds":  total_rt,
            "on_scene_seconds":       on_scene,
            "transported":            transport,
            "year":                   year,
        })
        call_num += 1

dispatch = pd.DataFrame(rows)
dispatch_path = r"D:\MullenAnalytics\ClientData\agencies\SBEMS\SBEMS_Dispatch_2022_2025.csv"
dispatch.to_csv(dispatch_path, index=False)
print(f"Dispatch: {len(dispatch):,} records → {dispatch_path}")
print("Year breakdown:")
print(dispatch.groupby("year").size())
p1 = dispatch[dispatch["priority"] == "P1"]
print(f"P1 NFPA compliance (<=480s): {(p1['response_time_seconds'] <= 480).mean():.1%}")
print(f"Overall avg response: {dispatch['response_time_seconds'].mean():.0f}s")

# ── generate staffing shift data from real roster ─────────────────────────────
roster = pd.read_excel(
    r"D:\MullenAnalytics\ClientData\agencies\SBEMS\User Roster EMT Only for FS 2.3.26.xlsx"
)
active = roster[roster["Term Date"].isna() | (roster["Term Date"] > pd.Timestamp("2022-01-01"))].copy()
active["employee_id"] = active["Badge Number"].fillna(0).astype(int).astype(str)
active["full_name"]   = active["First Name"].str.strip() + " " + active["Last Name"].str.strip()

shifts    = ["Day", "Evening", "Night"]
positions = {
    "Team Leader":          "Paramedic",
    "Team Member":          "EMT",
    "Team Member - Driver": "EMT",
    "Rescue Operator - EMT":"EMT",
    "Life Active EMT":      "EMT",
    "Captain":              "Captain",
    "Battalion Chief":      "Battalion Chief",
    "Deputy Chief":         "Deputy Chief",
    "Chief":                "Chief",
    "Associate":            "EMT",
}

staff_rows = []
date_range = pd.date_range("2022-01-01", "2025-12-31", freq="D")

for _, emp in active.iterrows():
    emp_id   = emp["employee_id"]
    name     = emp["full_name"]
    status   = emp["Status"]
    position = positions.get(emp["Skill / Rank"], "EMT")
    hire_dt  = pd.to_datetime(emp["Hire Date"], errors="coerce")
    term_dt  = pd.to_datetime(emp["Term Date"], errors="coerce") if pd.notna(emp["Term Date"]) else None

    if status in ("Full Time", "Salaried"):
        work_prob = 0.71   # ~5 days/7
        hrs = 12.0
    elif status == "Part Time":
        work_prob = 0.35
        hrs = 10.0
    else:                  # PRN/Vol
        work_prob = 0.15
        hrs = 8.0

    for d in date_range:
        if pd.notna(hire_dt) and d < hire_dt:
            continue
        if term_dt is not None and d > term_dt:
            continue
        if rng.random() > work_prob:
            continue

        shift = rng.choice(shifts, p=[0.45, 0.35, 0.20])
        ot    = rng.random() < 0.08

        staff_rows.append({
            "employee_id": emp_id,
            "name":        name,
            "shift":       shift,
            "date":        d.strftime("%Y-%m-%d"),
            "position":    position,
            "hours":       hrs + (4 if ot else 0),
            "overtime":    ot,
        })

staffing = pd.DataFrame(staff_rows)
staffing_path = r"D:\MullenAnalytics\ClientData\agencies\SBEMS\SBEMS_Staffing_2022_2025.csv"
staffing.to_csv(staffing_path, index=False)
print(f"\nStaffing: {len(staffing):,} shift records → {staffing_path}")
print(f"Unique employees: {staffing['employee_id'].nunique()}")
print(f"OT rate: {staffing['overtime'].mean():.1%}")
print("\nDone.")
