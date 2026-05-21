import os
os.environ['DATABASE_URL'] = 'postgresql://postgres:postgres@localhost:5432/mullen_analytics'

import sys
sys.path.insert(0, '.')

from app.services.pipeline.validator import validate_file

tests = [
    {
        'id': '1',
        'original_filename': 'SBEMS_Staffing_2022_2025.csv',
        'file_type': 'staffing',
        'upload_path': r'D:\MullenAnalytics\ClientData\agencies\81d6f2e6-300a-48d0-b7b6-9250937d17fb\raw\ec8927db_SBEMS_Staffing_2022_2025.csv',
    },
    {
        'id': '2',
        'original_filename': 'User Roster EMT Only for FS 2.3.26.xlsx',
        'file_type': 'staffing',
        'upload_path': r'D:\MullenAnalytics\ClientData\agencies\81d6f2e6-300a-48d0-b7b6-9250937d17fb\raw\e6532050_User Roster EMT Only for FS 2.3.26.xlsx',
    },
    {
        'id': '3',
        'original_filename': '2025 Year Payroll no benefits.xlsx',
        'file_type': 'staffing',
        'upload_path': r'D:\MullenAnalytics\ClientData\agencies\81d6f2e6-300a-48d0-b7b6-9250937d17fb\raw\cd939c1d_2025 Year Payroll no benefits.xlsx',
    },
]

for t in tests:
    r = validate_file(t)
    name = t['original_filename'][:52]
    print(f"{name:<52}  passed={r['passed']}  missing={r['missing_required']}")
    for w in r['warnings']:
        print(f"  WARN: {w[:110]}")
