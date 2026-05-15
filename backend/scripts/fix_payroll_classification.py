"""
One-time fix: reclassify payroll-named files from file_type='staffing' to file_type='other'.

The file "2025 Year Payroll no benefits.xlsx" was uploaded as file_type='staffing',
but it is an aggregate payroll summary report (not a per-row roster/timekeeping file).
It must not be concatenated with staffing CSV files in the pipeline.

Run once:
    cd backend
    python scripts/fix_payroll_classification.py

After running, trigger a new pipeline run to regenerate clean output.
"""
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))

from sqlalchemy.orm import Session
from app.database import Base, engine
from app.models.agency import AgencyFile

# Keywords that identify payroll aggregate reports
PAYROLL_INDICATORS = ["payroll", "pay_roll", "wages", "compensation", "salary"]


def main() -> None:
    with Session(engine) as db:
        candidates = (
            db.query(AgencyFile)
            .filter(AgencyFile.file_type == "staffing")
            .all()
        )

        reclassified = []
        for f in candidates:
            name_lower = f.original_filename.lower()
            if any(ind in name_lower for ind in PAYROLL_INDICATORS):
                print(f"  Reclassifying: {f.original_filename!r}  [{f.id}]")
                f.file_type = "other"
                reclassified.append(f.original_filename)

        if reclassified:
            db.commit()
            print(f"\n✓ Reclassified {len(reclassified)} file(s) to file_type='other':")
            for name in reclassified:
                print(f"   - {name}")
            print("\nNext step: trigger a new pipeline run for affected agencies.")
        else:
            print("No payroll-named staffing files found. Nothing to do.")


if __name__ == "__main__":
    main()
