# EMS Analytics — Source Data Notebooks

**Rule:** Every data file ingested by the pipeline has a notebook here.  
Run the notebook before the file goes near the app. Never add a metric to the dashboard  
without a corresponding entry in `DATA_CONTRACTS.md`.

## Notebooks

| # | File | Source data | Status |
|---|---|---|---|
| 00 | `00_dispatch_analysis.ipynb` | `Output_of_.csv` (dispatch CAD export) | Ready to run |
| 01 | `01_staffing_csv_analysis.ipynb` | `SBEMS_Staffing_2022_2025.csv` | Ready to run |
| 02 | `02_roster_xlsx_analysis.ipynb` | `User Roster EMT Only for FS 2.3.26.xlsx` | Ready to run |
| 03 | `03_payroll_xlsx_analysis.ipynb` | `2025 Year Payroll no benefits.xlsx` | Ready to run |

## Setup

```
pip install jupyter pandas numpy openpyxl
cd notebooks
jupyter notebook
```

## Workflow for a new data file

1. Copy this template structure into a new notebook numbered sequentially.
2. Answer all 7 sections: load, sample, profile, validate, clean, verify metrics, caveats.
3. Add one entry per new metric to `DATA_CONTRACTS.md`.
4. Only then implement the metric in the backend pipeline.
5. The notebook is the audit trail. Keep it checked in alongside the code.

## Key findings from current notebooks

- **Payroll XLSX (`03`)**: Aggregate report — not a per-row data file. Cannot be used for  
  per-employee analysis. Reclassify from `file_type=staffing` to `file_type=other` in the DB.  
  Request a per-employee payroll ledger export from the agency to unlock cost metrics.

- **Dispatch timestamps (`00`)**: Minute-resolution only. Phase intervals have ±60s precision.  
  Do not report sub-minute intervals as if they are exact.

- **Incident type (`00`)**: `Patient Category` is used as incident type. `Call Type` is ~100% null.  
  `Patient Category` is outcome classification (what was found), not dispatch reason (what was reported).

- **Phase median sum (`00`)**: Phase interval medians (call processing + turnout + travel) do NOT  
  sum to total response median. Each is computed on a different valid-timestamp subset. This is  
  correct behavior documented in `DATA_CONTRACTS.md` entry D-09.

- **Staffing join key (`01`, `02`)**: `employee_id` in staffing CSV = `Badge Number` in roster.  
  124 roster employees, 122 with staffing history. 2 employees in roster have no shift records.
