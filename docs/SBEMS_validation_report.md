# SBEMS vs. Platform — Analytics Validation Report

**Subject:** South Branch EMS (SBES) · **Date:** 2026-06-16
**Programs compared:**
- **A — SBEMS** (`github.com/jfm56/SBEMS`): the original Jupyter-notebook analytics + comprehensive report.
- **B — Platform** (`mullen_analytics_website`): the EMS analytics platform (EMSDashboard, Predictive Analytics, and the new weather/traffic + IFT forecasts).

**Method:** Both programs were compared against the **raw 2022 EMSCharts export** (the ground truth), analyzed directly with pandas — not against each other's summaries. 2022 is the clean like-for-like window (the platform's loaded upload); SBEMS report figures span 2022–2025, so cross-period comparisons are approximate.

---

## Executive summary

The two programs are **structurally and spatially consistent** — same geographic demand distribution, same peak hour, same prediction methodology. They diverge on **definitions**, not correctness:

| Dimension | Verdict |
|---|---|
| Geographic distribution | ✅ Strong agreement |
| Peak hour / temporal pattern | ✅ Agree (2 PM peak) |
| Prediction methodology | ✅ Same family (ML on calendar + lag features) |
| **Call volume** | ⚠ Differ ~1.9× — **platform is correct**; SBEMS's headline undercounts |
| **Response time** | ⚠ Differ ~2 min — **both correct, different intervals** (platform = total response; SBEMS = travel only) |
| **Staffing** | ⚠ Differed 2 vs 5–6 — **SBEMS was right; platform fixed** |

---

## 1. Call volume — *the platform is correct*

Ground truth, raw 2022 export:

| Measure | Value |
|---|---|
| Dispatched response rows | **4,977** |
| Unique `dispatch_id` | 4,196 (dedup removes only ~16%) |
| Emergency Response (Primary) | 4,020 |
| Emergency Response (Mutual Aid) | 501 |
| Facility transfers (IFT) | ~357 |
| Standby / other | ~99 |

- The platform counts **4,977** dispatched responses (method: `dispatch_datetime_not_null`) — directly verifiable from the rows. SBEMS's own by-scene file (~4,600/yr, BLS-only) **matches** the platform.
- SBEMS's **report headline of 2,626 for 2022** (10,093 across 2022–2025) is **not reproducible** from the raw data by any single clean filter, and conflicts with SBEMS's own by-scene file. It appears to undercount via an unstated filter.
- **There is no incident-number column** in the export, so calls cannot be deduplicated to "incidents" — `dispatch_id` is the finest grain (one row per unit dispatch).

**Conclusion:** the platform's volume is accurate for *dispatched responses*. A legitimate *smaller* view is **emergency-only** (exclude mutual aid + transfers + standby ≈ 4,000–4,500) — still well above 2,626.

---

## 2. Response time — *both correct, different intervals*

Computed directly from the raw timestamps (2022):

| Interval | Mean | Median | P90 | Reported by |
|---|---|---|---|---|
| Dispatch → arrival (total response) | **8.5** | 7.0 | 14.0 | **Platform** (8.08) |
| En route → arrival (travel) | **6.3** | 5.0 | 11.0 | ≈ **SBEMS report** (5.93 / 5.22 / 10.12) |
| Dispatch → en route (turnout) | 2.6 | 2.0 | 4.0 | — (the difference) |

- SBEMS's notebook explicitly measures the **en-route / travel** interval and labels it "response time," **understating response by the turnout time** (~2.5 min).
- The platform's **dispatch→arrival** is the conventional, complete "response time."

**Conclusion:** neither is wrong; they measure different things. The platform reports *total response time*; SBEMS reports *travel time*. **Recommendation:** label both explicitly (see §5).

---

## 3. Geographic distribution — *agreement*

| Area | SBEMS (by-scene) | Platform (2022) |
|---|---|---|
| Township of Clinton | 30.0% | 31.0% |
| Union Township | 19.5% | 20.9% |
| Town of Clinton | 10.2% | 8.7% |
| High Bridge Borough | 6.3% | 6.5% |
| Raritan Township | 6.0% | 7.6% |

Same ranking, within ~1–2 points — strong evidence both read the same data correctly.

---

## 4. Staffing — *SBEMS was right; platform fixed*

| | Peak units | Basis |
|---|---|---|
| SBEMS | **5–6** | 60.7-min call duration, 30% utilization, **coverage across 7 stations** |
| Platform (before) | **2** | peak-hour concurrency only |
| Platform (after fix) | **4** | `max(demand, active-station coverage)`, UHU 0.23 |

The platform's original model was **volume-only** and ignored geographic coverage — it under-staffed a 44k-population, 7-station rural system ~3×. **Fixed** (`1ddb762`): peak units = `max(concurrent demand, active stations ≥3% of calls)`, using the **actual** call duration and reporting projected unit-hour utilization. SBES 2022 now recommends **4 units** (coverage-bound, 23% utilization) — consistent with SBEMS and the agency's 8-unit deployment.

---

## 5. Fixes & recommendations

| Item | Status |
|---|---|
| **Coverage-driven staffing model** | ✅ Implemented (`1ddb762`) |
| **Emergency-only / incident counting toggle** — let users count dispatched responses, emergency-only, or unique dispatches so headline numbers can match an external reference | ✅ Addressed in this release |
| **Response-vs-travel time labeling** — show both *total response* (dispatch→on-scene) and *travel* (en route→on-scene) with explicit labels | ✅ Addressed in this release |
| **IFT route/facility scheduling** — predict transfers by origin→destination facility | ⛔ **Blocked by data**: the EMSCharts export has no destination/receiving-facility column (20 fields; only `Scene Grid` = scene township). Requires an export that includes the receiving-facility field. IFT scheduling currently operates at day/hour/transfer-type level. |

---

## Appendix — IFT (interfacility transport) outlook for SBES 2022

359 IFTs (7.2% of volume), midday weekday clustering (Tue/Fri highest, Sun lowest). A dedicated transport crew **Mon–Fri 9 AM–5 PM** would cover **~58%** of all transfers (~0.8/weekday). See the portal's *Scheduling* tab.

*Report generated by the platform validation pass; figures verified against the raw 2022 EMSCharts export.*
