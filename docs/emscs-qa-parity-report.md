# EMSCS QA Scoring Parity Report — Workbook → Application

Source: *EMSCS - WNY Chart Review September 2026* (de-identified fixture). Application engine: `app/services/emscs_qa/scoring.py` (deterministic; no AI). Formulas mirror the workbook cells exactly; **no formula was altered to force parity**.

## Verdict: ✅ FULL PARITY

- Charts compared: **60** · per-field mismatches: **0** · indicator-status mismatches: **0**

## Aggregate parity (vs workbook Dashboard)

| Metric | Workbook | Application | Diff |
|---|---|---|---|
| Charts reviewed | 60 | 60 | 0 |
| Avg Quality Score | 53.15 | 53.15 | +0 |
| Avg Indicator Compliance | 0.615647 | 0.615647 | +1.11022e-16 |
| Avg Composite | 55.674415 | 55.674415 | -1.42109e-14 |
| Overall Indicator Compliance (all rows) | 0.6375 | 0.6375 | +0 |
| Findings — Critical | 9 | 9 | 0 |
| Findings — Major | 102 | 102 | 0 |
| Findings — Minor | 99 | 99 | 0 |
| Findings — Commendation | 42 | 42 | 0 |
| Tier — Exemplary | 0 | 0 | 0 |
| Tier — Meets Standard | 0 | 0 | 0 |
| Tier — Needs Improvement | 6 | 6 | 0 |
| Tier — Focused Review | 54 | 54 | 0 |

## Per-chart parity (Workbook → Application → Diff)

| Chart | QS wb | QS app | IC wb | IC app | Comp wb | Comp app | Tier wb | Tier app | Maj+Crit wb/app | Commend wb/app | OK |
|---|---|---|---|---|---|---|---|---|---|---|---|
| WNY001 | 53 | 53 | 0.5333 | 0.5333 | 53.1 | 53.1 | Focused Review | Focused Review | 5/5 | 1/1 | ✅ |
| WNY002 | 66 | 66 | 0.6667 | 0.6667 | 66.2 | 66.2 | Focused Review | Focused Review | 4/4 | 1/1 | ✅ |
| WNY003 | 58 | 58 | 0.7273 | 0.7273 | 62.42 | 62.42 | Focused Review | Focused Review | 4/4 | 1/1 | ✅ |
| WNY004 | 41 | 41 | 0.64 | 0.64 | 47.9 | 47.9 | Focused Review | Focused Review | 5/5 | 1/1 | ✅ |
| WNY005 | 56 | 56 | 0.625 | 0.625 | 57.95 | 57.95 | Focused Review | Focused Review | 3/3 | 1/1 | ✅ |
| WNY006 | 73 | 73 | 0.8846 | 0.8846 | 77.64 | 77.64 | Needs Improvement | Needs Improvement | 0/0 | 1/1 | ✅ |
| WNY007 | 59 | 59 | 0.8148 | 0.8148 | 65.74 | 65.74 | Focused Review | Focused Review | 3/3 | 1/1 | ✅ |
| WNY008 | 60 | 60 | 0.6667 | 0.6667 | 62 | 62 | Focused Review | Focused Review | 2/2 | 1/1 | ✅ |
| WNY009 | 74 | 74 | 0.9231 | 0.9231 | 79.49 | 79.49 | Needs Improvement | Needs Improvement | 1/1 | 1/1 | ✅ |
| WNY010 | 55 | 55 | 0.75 | 0.75 | 61 | 61 | Focused Review | Focused Review | 3/3 | 1/1 | ✅ |
| WNY011 | 62 | 62 | 0.7586 | 0.7586 | 66.16 | 66.16 | Focused Review | Focused Review | 2/2 | 1/1 | ✅ |
| WNY012 | 53 | 53 | 0.72 | 0.72 | 58.7 | 58.7 | Focused Review | Focused Review | 2/2 | 1/1 | ✅ |
| WNY013 | 57 | 57 | 0.7143 | 0.7143 | 61.33 | 61.33 | Focused Review | Focused Review | 3/3 | 1/1 | ✅ |
| WNY014 | 43 | 43 | 0.4545 | 0.4545 | 43.74 | 43.74 | Focused Review | Focused Review | 3/3 | 1/1 | ✅ |
| WNY015 | 58 | 58 | 0.5625 | 0.5625 | 57.47 | 57.47 | Focused Review | Focused Review | 2/2 | 1/1 | ✅ |
| WNY016 | 44 | 44 | 0.5 | 0.5 | 45.8 | 45.8 | Focused Review | Focused Review | 3/3 | 0/0 | ✅ |
| WNY017 | 50 | 50 | 0.5 | 0.5 | 50 | 50 | Focused Review | Focused Review | 2/2 | 1/1 | ✅ |
| WNY018 | 53 | 53 | 0.6364 | 0.6364 | 56.19 | 56.19 | Focused Review | Focused Review | 2/2 | 1/1 | ✅ |
| WNY019 | 53 | 53 | 0.6923 | 0.6923 | 57.87 | 57.87 | Focused Review | Focused Review | 3/3 | 1/1 | ✅ |
| WNY020 | 58 | 58 | 0.6923 | 0.6923 | 61.37 | 61.37 | Focused Review | Focused Review | 2/2 | 1/1 | ✅ |
| WNY021 | 61 | 61 | 0.6842 | 0.6842 | 63.23 | 63.23 | Focused Review | Focused Review | 1/1 | 1/1 | ✅ |
| WNY022 | 38 | 38 | 0.6207 | 0.6207 | 45.22 | 45.22 | Focused Review | Focused Review | 3/3 | 0/0 | ✅ |
| WNY023 | 46 | 46 | 0.5882 | 0.5882 | 49.85 | 49.85 | Focused Review | Focused Review | 3/3 | 1/1 | ✅ |
| WNY024 | 49 | 49 | 0.5833 | 0.5833 | 51.8 | 51.8 | Focused Review | Focused Review | 2/2 | 1/1 | ✅ |
| WNY025 | 40 | 40 | 0.5294 | 0.5294 | 43.88 | 43.88 | Focused Review | Focused Review | 3/3 | 0/0 | ✅ |
| WNY026 | 57 | 57 | 0.6364 | 0.6364 | 58.99 | 58.99 | Focused Review | Focused Review | 1/1 | 1/1 | ✅ |
| WNY027 | 49 | 49 | 0.6875 | 0.6875 | 54.92 | 54.92 | Focused Review | Focused Review | 1/1 | 1/1 | ✅ |
| WNY028 | 43 | 43 | 0.3636 | 0.3636 | 41.01 | 41.01 | Focused Review | Focused Review | 1/1 | 0/0 | ✅ |
| WNY029 | 34 | 34 | 0.375 | 0.375 | 35.05 | 35.05 | Focused Review | Focused Review | 2/2 | 0/0 | ✅ |
| WNY031 | 65 | 65 | 0.75 | 0.75 | 68 | 68 | Focused Review | Focused Review | 1/1 | 1/1 | ✅ |
| WNY032 | 38 | 38 | 0.4545 | 0.4545 | 40.24 | 40.24 | Focused Review | Focused Review | 2/2 | 0/0 | ✅ |
| WNY033 | 77 | 77 | 0.8 | 0.8 | 77.9 | 77.9 | Needs Improvement | Needs Improvement | 0/0 | 1/1 | ✅ |
| WNY034 | 33 | 33 | 0.3636 | 0.3636 | 34.01 | 34.01 | Focused Review | Focused Review | 3/3 | 0/0 | ✅ |
| WNY035 | 51 | 51 | 0.5455 | 0.5455 | 52.06 | 52.06 | Focused Review | Focused Review | 1/1 | 0/0 | ✅ |
| WNY036 | 26 | 26 | 0.3125 | 0.3125 | 27.57 | 27.57 | Focused Review | Focused Review | 2/2 | 0/0 | ✅ |
| WNY037 | 29 | 29 | 0.2727 | 0.2727 | 28.48 | 28.48 | Focused Review | Focused Review | 2/2 | 0/0 | ✅ |
| WNY038 | 68 | 68 | 0.8 | 0.8 | 71.6 | 71.6 | Needs Improvement | Needs Improvement | 0/0 | 1/1 | ✅ |
| WNY039 | 49 | 49 | 0.5333 | 0.5333 | 50.3 | 50.3 | Focused Review | Focused Review | 2/2 | 0/0 | ✅ |
| WNY040 | 45 | 45 | 0.4615 | 0.4615 | 45.35 | 45.35 | Focused Review | Focused Review | 3/3 | 1/1 | ✅ |
| WNY041 | 62 | 62 | 0.7 | 0.7 | 64.4 | 64.4 | Focused Review | Focused Review | 1/1 | 1/1 | ✅ |
| WNY042 | 61 | 61 | 0.5882 | 0.5882 | 60.35 | 60.35 | Focused Review | Focused Review | 2/2 | 1/1 | ✅ |
| WNY043 | 50 | 50 | 0.6364 | 0.6364 | 54.09 | 54.09 | Focused Review | Focused Review | 1/1 | 0/0 | ✅ |
| WNY044 | 0 | 0 | 0 | 0 | 0 | 0 | Focused Review | Focused Review | 1/1 | 0/0 | ✅ |
| WNY045 | 65 | 65 | 0.8 | 0.8 | 69.5 | 69.5 | Focused Review | Focused Review | 1/1 | 1/1 | ✅ |
| WNY046 | 62 | 62 | 0.625 | 0.625 | 62.15 | 62.15 | Focused Review | Focused Review | 1/1 | 1/1 | ✅ |
| WNY047 | 64 | 64 | 0.75 | 0.75 | 67.3 | 67.3 | Focused Review | Focused Review | 1/1 | 1/1 | ✅ |
| WNY048 | 68 | 68 | 0.9 | 0.9 | 74.6 | 74.6 | Needs Improvement | Needs Improvement | 1/1 | 1/1 | ✅ |
| WNY049 | 49 | 49 | 0.5238 | 0.5238 | 50.01 | 50.01 | Focused Review | Focused Review | 2/2 | 0/0 | ✅ |
| WNY050 | 38 | 38 | 0.7 | 0.7 | 47.6 | 47.6 | Focused Review | Focused Review | 2/2 | 0/0 | ✅ |
| WNY051 | 53 | 53 | 0.625 | 0.625 | 55.85 | 55.85 | Focused Review | Focused Review | 2/2 | 1/1 | ✅ |
| WNY052 | 64 | 64 | 0.9 | 0.9 | 71.8 | 71.8 | Needs Improvement | Needs Improvement | 0/0 | 1/1 | ✅ |
| WNY054 | 60 | 60 | 0.619 | 0.619 | 60.57 | 60.57 | Focused Review | Focused Review | 1/1 | 0/0 | ✅ |
| WNY055 | 49 | 49 | 0.4 | 0.4 | 46.3 | 46.3 | Focused Review | Focused Review | 1/1 | 0/0 | ✅ |
| WNY056 | 68 | 68 | 0.7273 | 0.7273 | 69.42 | 69.42 | Focused Review | Focused Review | 1/1 | 1/1 | ✅ |
| WNY057 | 54 | 54 | 0.7 | 0.7 | 58.8 | 58.8 | Focused Review | Focused Review | 2/2 | 0/0 | ✅ |
| WNY058 | 50 | 50 | 0.5 | 0.5 | 50 | 50 | Focused Review | Focused Review | 1/1 | 1/1 | ✅ |
| WNY059 | 70 | 70 | 0.6471 | 0.6471 | 68.41 | 68.41 | Focused Review | Focused Review | 0/0 | 1/1 | ✅ |
| WNY060 | 58 | 58 | 0.7059 | 0.7059 | 61.78 | 61.78 | Focused Review | Focused Review | 2/2 | 1/1 | ✅ |
| WNY061 | 63 | 63 | 0.6667 | 0.6667 | 64.1 | 64.1 | Focused Review | Focused Review | 0/0 | 1/1 | ✅ |
| WNY062 | 57 | 57 | 0.4 | 0.4 | 51.9 | 51.9 | Focused Review | Focused Review | 1/1 | 1/1 | ✅ |
