# Data Contracts — EMS Analytics Dashboard

**Rule:** No number appears on the dashboard without an entry in this document.  
**Format per entry:** Metric name · What it measures · Formula · Inclusions/exclusions · Denominator · What it cannot tell you.

---

## Dispatch / Response Time Metrics

### D-01: Total Call Volume
**Measures:** Count of EMS calls in the reporting period.  
**Formula:** `COUNT(*)` of rows in the dispatch CSV after timestamp parse, where `Date Dispatched` is not null.  
**Includes:** All calls with a valid dispatch timestamp regardless of outcome.  
**Excludes:** Rows where `Date Dispatched` cannot be parsed to a datetime.  
**Denominator:** N/A — this is a count, not a percentage.  
**Cannot tell you:** Whether a call was BLS vs ALS; whether it was a true emergency; how many unique incidents vs. units (one incident may dispatch multiple units and appear as multiple rows).

---

### D-02: P90 Total Response Time
**Measures:** The 90th-percentile total response time — the threshold below which 90% of calls complete.  
**Formula:** `PERCENTILE(total_response_s, 0.90)` where `total_response_s = Date_Arrived − Date_Received` in seconds.  
**Includes:** Calls where `total_response_s` is between 0 and 3600 seconds (1 hour ceiling removes outliers).  
**Excludes:** Cancelled calls (no `Date Arrived`); calls where `Date Received` is null; calls where total_response_s < 0 (arrival before receipt — data error) or > 3600s.  
**Denominator:** Count of calls with valid `total_response_s` in [0, 3600]. This is smaller than total call volume.  
**Cannot tell you:** Why 10% of calls exceeded this threshold; whether late calls were rural vs. urban; whether the P90 represents a trend or a point-in-time snapshot.

---

### D-03: Median Total Response Time (P50)
**Measures:** The 50th-percentile total response time.  
**Formula:** `PERCENTILE(total_response_s, 0.50)` on the same filtered subset as D-02.  
**Same inclusions/exclusions as D-02.**  
**Cannot tell you:** Mean (which is more sensitive to outlier delays). Both are reported — P50 for typical performance, mean for budget/resource exposure.

---

### D-04: Mean (Average) Total Response Time
**Measures:** Arithmetic mean total response time.  
**Formula:** `MEAN(total_response_s)` on same filtered subset as D-02.  
**Note:** Because `Date Dispatched` timestamp resolution is 1 minute, all phase intervals have ±60s precision. Sub-minute differences between P50 and mean are within measurement error.

---

### D-05: NFPA 1710 Compliance Rate
**Measures:** Percentage of calls where total response time met the NFPA 1710 BLS standard.  
**Formula:** `COUNT(total_response_s <= 300) / COUNT(total_response_s in [0, 3600]) × 100`  
**NFPA 1710 target:** 90% of calls within 5:00 (300 seconds) for BLS first response.  
**Includes:** Same subset as D-02.  
**Excludes:** Same exclusions as D-02. Critically: cancelled calls are excluded from both numerator AND denominator.  
**Denominator:** Count of calls with valid arrival time and total_response_s in [0, 3600].  
**Cannot tell you:** Whether failures are concentrated in specific geographies, times, or units (those breakdowns are separate metrics). Does not distinguish BLS from ALS (this dataset is all BLS units).

---

### D-06: Call Processing Time (Median)
**Measures:** Median time from call receipt to dispatch (the "call processing" phase).  
**Formula:** `MEDIAN(Date_Dispatched − Date_Received)` in seconds, for rows where result is in [0, 3600].  
**NFPA target:** ≤ 64 seconds.  
**Important caveat:** Timestamps are minute-resolution. A result of "1:00" means anywhere from 1 second to 1 minute 59 seconds. Sub-minute precision is not available.  
**Cannot tell you:** Dispatcher workload, queue depth, or whether the interval was waiting time vs. active processing time.

---

### D-07: Turnout Time (Median)
**Measures:** Median time from dispatch to unit en route.  
**Formula:** `MEDIAN(Date_Enroute − Date_Dispatched)` in seconds, for rows where result is in [0, 600].  
**NFPA target:** ≤ 60 seconds.  
**Ceiling note:** 600-second (10-minute) ceiling used to exclude units that had `Date_Enroute` recorded hours later (administrative error).  
**Denominator:** Calls with both `Date_Dispatched` and `Date_Enroute` non-null and interval in [0, 600].

---

### D-08: Travel Time (Median)
**Measures:** Median time from en route to on scene.  
**Formula:** `MEDIAN(Date_Arrived − Date_Enroute)` in seconds, for rows where result is in [0, 3600].  
**NFPA target:** ≤ 240 seconds (4 minutes) for urban areas.  
**Denominator:** Calls with both `Date_Enroute` and `Date_Arrived` non-null and interval in [0, 3600].

---

### D-09: Phase Intervals — Sum Caveat
**Measures:** D-06 + D-07 + D-08 are displayed as a group alongside D-02 (total response median).  
**Critical note:** Each median is computed on an independent subset of calls that have valid timestamps for that specific phase. These subsets differ. Phase medians DO NOT arithmetically sum to total response median. This is statistically correct, not a calculation error.  
**Why:** A call missing `Date_Enroute` is excluded from the turnout median but may still contribute to the total response median if it has `Date_Arrived` and `Date_Received`.  
**Dashboard must display:** The disclaimer "Each interval computed on calls with valid timestamps for that phase; subsets differ."

---

### D-10: Call Volume by Day of Week
**Measures:** Count of calls per day of week.  
**Formula:** `COUNT(*) GROUP BY Day_of_Week_of_Dispatch` using the pre-computed `Day of Week of Dispatch` column.  
**Verified against:** `Date_Dispatched.dt.day_name()` — these should agree; verify in notebook 00, cell "call volume by day of week."  
**Cannot tell you:** Whether day-of-week patterns are consistent across years, or whether one year is driving the pattern.

---

### D-11: Call Volume by Incident Type
**Measures:** Count of calls per incident category.  
**Formula:** `COUNT(*) GROUP BY Patient_Category`  
**Source column:** `Patient Category` — NOT `Call Type` (which is ~100% null in this dataset).  
**Important distinction:** `Patient Category` is the **outcome classification** assigned by crew. It reflects what was found, not the dispatch complaint. "Trauma" means a trauma was treated; it doesn't mean the call was dispatched as a trauma.  
**Cannot tell you:** Dispatch priority by incident type; whether the incident type matches the caller-reported complaint.

---

### D-12: Units at Risk
**Measures:** Count of units whose P90 response time exceeds the NFPA 1710 target.  
**Formula:** `COUNT(units where response_p90 > 300 AND calls >= 20)`  
**Denominator:** Units with ≥ 20 calls in the reporting period (sparse units excluded to avoid misleading risk scores for units with 1–2 calls).  
**Threshold rationale:** 20-call minimum is arbitrary. A unit with 19 calls and P90 of 600s is excluded. This threshold should be reviewed with agency leadership.  
**Cannot tell you:** Whether a unit is at risk due to geography, deployment, simultaneous calls, or random variation.

---

## Staffing Metrics

### S-01: Unique Staff Count
**Measures:** Count of distinct employees with at least one shift record.  
**Formula:** `COUNT(DISTINCT employee_id)` from the staffing CSV.  
**Source file:** `SBEMS_Staffing_2022_2025.csv`  
**Includes:** All years in the file (2022–2025). This is a cumulative headcount, not a point-in-time headcount.  
**Cannot tell you:** How many staff are currently active (use roster for that); whether staff with a single shift are permanent, part-time, or a data entry artifact.

---

### S-02: By-Shift Breakdown
**Measures:** Count of shifts worked per shift type (Day / Evening / Night).  
**Formula:** `COUNT(*) GROUP BY shift` where shift is not null.  
**Unit:** Shifts worked, not employees. An employee who works 100 Day shifts contributes 100 to the Day count.  
**Source:** `shift` column — plain text: 'Day', 'Evening', 'Night'.  
**Caveat:** If shift names change in the source system (e.g., 'AM' instead of 'Day'), the new value creates a new category silently.

---

### S-03: Overtime Rate
**Measures:** Percentage of shifts that are classified as overtime.  
**Formula:** `COUNT(overtime == True) / COUNT(all rows with non-null hours) × 100`  
**Pipeline threshold:** `overtime = True` if `hours > 12` on that shift (12-hour shift standard).  
**Cross-check:** The `overtime` column in the source CSV should agree with the hours > 12 computation. See notebook 01 for verification.  
**Sustainable benchmark:** 10–15% overtime is generally considered sustainable for EMS operations. Above 20% indicates structural staffing gaps.  
**Cannot tell you:** Whether OT is voluntary or mandatory; which positions drove OT; cost impact (no pay rates available).

---

### S-04: Average Hours Per Shift
**Measures:** Arithmetic mean of shift duration across all shifts.  
**Formula:** `MEAN(hours)` where hours is numeric and > 0.  
**Caveat:** If the dataset mixes 8-hour, 10-hour, and 24-hour shifts, the mean is not meaningful as a single number. Always check the distribution (notebook 01, "shift length distribution" cell).

---

### S-05: Gap Days
**Measures:** Count of calendar dates where fewer than 2 employees appear in the staffing records.  
**Formula:** `COUNT(dates where COUNT(DISTINCT employee_id) < 2)` grouped by `date`.  
**Threshold:** 2 is the minimum crew for a BLS unit (driver + EMT). This threshold should be confirmed with agency protocols.  
**Caveat:** A gap day means fewer than 2 staff HAVE SHIFT RECORDS on that day. It does not mean the unit was unstaffed — it could mean shifts were not entered into the system. Absence of data ≠ absence of staffing.

---

## Predictive / Forecasting Metrics

### F-01: Attrition Risk Level
**Measures:** Qualitative risk classification (Low / Medium / High) of staff attrition likelihood.  
**Formula:** Computed by the forecasting module from:
- `overtime_pct` from staffing summary (if > 25%, adds a risk indicator)
- `staffing_gaps` count (if > 10 gap days, adds a risk indicator)
- Call volume growth trend (if increasing at > 0.3 calls/day, adds a risk indicator)  
**Risk mapping:** 0 indicators = Low; 1 indicator = Medium; 2+ indicators = High.  
**Valid only when:** At least one staffing file passes validation. This metric is GATED on `staffingCoreValid`.  
**Cannot tell you:** Individual employee attrition probability; root cause of risk; how many positions are at risk.  
**Known limitation:** Roster tenure data (which would significantly improve attrition prediction) is NOT currently fed into this model. See notebook 02, Section 6.

---

### F-02: Call Volume Trend
**Measures:** Direction and slope of the call volume trend over the available historical period.  
**Formula:** Linear regression (`scipy.stats.linregress`) on monthly call counts. Slope in calls/day.  
**Valid only when:** At least 210 days of dispatch data are available (7 months minimum).  
**Shown only when:** `trend_direction` is present and no forecast error occurred. Empty CALL TREND card suppressed when forecast unavailable.  
**Cannot tell you:** Why volume is changing; whether the trend will continue; seasonal vs. secular trend.

---

## Risk Score (Unit Performance Table)

### R-01: Unit Risk Score (0–100)
**Measures:** Composite operational risk for a given unit. Higher = worse.  
**Formula (three components, each capped independently):**

```
p90_component   = min(50, max(0, (p90_s − 300) / 300 × 50)
util_component  = min(30, utilisation_hours / 200 × 30)
vol_component   = min(20, call_count / 400 × 20)
risk_score      = round(min(100, p90_component + util_component + vol_component))
```

**Severity bands:**
- 0–40: LOW
- 41–60: MODERATE  
- 61–80: HIGH
- 81–100: CRITICAL

**Rationale for weights:** P90 excess (50 pts) is the primary driver because response time is the primary NFPA metric. Utilization (30 pts) reflects crew fatigue exposure. Call volume (20 pts) reflects raw demand pressure.  
**Denominator for util_component:** 200 hours is the assumed maximum sustainable utilization per unit per month. This is not evidence-based — verify with agency data.  
**Denominator for vol_component:** 400 calls is the assumed high-volume ceiling. Adjust if agency data shows higher peaks.  
**Cannot tell you:** Absolute operational safety; whether a CRITICAL unit needs immediate action vs. monitoring.

---

## What Is NOT on the Dashboard (and Why)

| Metric | Reason not shown |
|---|---|
| Cost per call | No per-employee pay rate data (payroll file is aggregate report only) |
| Overtime dollar cost | Hours available, pay rates not available |
| Mutual aid given vs. received | Mutual aid file not yet analyzed (notebook not yet built) |
| Demographic breakdown of patients | Not in dispatch data |
| Geographic heatmap | Lat/lon columns not yet parsed |
| Per-unit schedule adherence | Staffing CSV has no unit assignment per shift |

---

## Versioning

| Version | Date | Change |
|---|---|---|
| 1.0 | 2026-05-15 | Initial contracts for dispatch, staffing, roster, payroll files |
