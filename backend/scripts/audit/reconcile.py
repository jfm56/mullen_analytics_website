"""Read-only synthetic reconciliation; no database, network, or patient data.

Run from repository root: python backend/scripts/audit/reconcile.py
Outputs evidence to stdout. Mismatches are audit findings, not expected passes.
"""
import importlib.util
import json
import sys
import tempfile
import time
from pathlib import Path

import pandas as pd

ROOT = Path(__file__).resolve().parents[3]
sys.path.insert(0, str(ROOT / 'backend'))
spec = importlib.util.spec_from_file_location('metrics', ROOT / 'backend/app/services/ems_analytics_service.py')
metrics = importlib.util.module_from_spec(spec)
spec.loader.exec_module(metrics)
from app.services.pipeline.forecasting import _daily_series, _engineer_features

rows = [
    {'incident_number': 'A', 'unit': 'Medic 1', 'dispatch_time': '2026-01-01 10:00:00', 'enroute_time': '2026-01-01 10:02:00', 'arrival_time': '2026-01-01 10:20:00'},
    {'incident_number': 'A', 'unit': 'Medic 2', 'dispatch_time': '2026-01-01 10:01:00', 'enroute_time': '2026-01-01 10:03:00', 'arrival_time': '2026-01-01 10:10:00'},
    {'incident_number': 'B', 'unit': 'Medic 1', 'dispatch_time': '2026-01-01 11:00:00', 'enroute_time': '2026-01-01 11:02:00', 'arrival_time': '2026-01-01 11:08:00'},
]
frame = pd.DataFrame(rows)
# Independent oracle: earliest valid arrival per incident, then that unit's dispatch-to-scene.
selected = {}
for row in rows:
    if row['incident_number'] not in selected or row['arrival_time'] < selected[row['incident_number']]['arrival_time']:
        selected[row['incident_number']] = row
durations = sorted((pd.Timestamp(r['arrival_time']) - pd.Timestamp(r['dispatch_time'])).total_seconds()/60 for r in selected.values())
baseline_median = sum(durations)/len(durations)  # Exactly two incidents: median equals their average.
findings = []
with tempfile.TemporaryDirectory() as directory:
    path = Path(directory)/'synthetic.csv'
    frame.to_csv(path, index=False)
    result = metrics.compute_ems_metrics(str(path), {}, {})
    findings.append({'check':'first-arriving dispatch-to-scene median', 'expected':baseline_median, 'actual':result['response_times']['dispatch_to_arrival_median']})
    findings.append({'check':'headline interval', 'expected':'dispatch_to_arrival (requested baseline)', 'actual':result['response_times']['metric'], 'headline_minutes':result['response_times']['median_minutes']})
    missing = pd.DataFrame([{'incident_number':'C','unit':'Medic 1','dispatch_time':'2026-01-01 12:00:00','clear_time':'2026-01-01 13:00:00'}])
    missing.to_csv(path,index=False)
    result = metrics.compute_ems_metrics(str(path), {}, {})
    findings.append({'check':'missing arrival unit response', 'expected':[], 'actual':result['unit_performance']['avg_response_time_by_unit']})
    blank = frame.copy()
    blank['incident_number'] = None
    findings.append({'check':'blank IDs retained as separate records', 'expected':3,'actual':len(metrics._collapse_to_incidents(blank))})
    # Timings are isolated local computation, NOT production request timings.
    large = pd.concat([frame.assign(incident_number=lambda d: d.incident_number + str(i)) for i in range(1000)],ignore_index=True)
    large.to_csv(path,index=False)
    start=time.perf_counter()
    metrics.compute_ems_metrics(str(path), {}, {})
    findings.append({'check':'local 3000-row metrics duration','seconds':round(time.perf_counter()-start,4),'production_measurement':False})

dated=frame.copy()
dated['_dt_created']=pd.to_datetime(dated['dispatch_time'])
findings.append({'check':'forecast daily volume grain','expected_unique_incidents':2,'actual_count':int(_daily_series(dated).sum())})
# Demonstrate test-period actuals enter subsequent test feature vectors.
daily=pd.Series(range(1,101),index=pd.date_range('2026-01-01',periods=100))
features=_engineer_features(daily)
findings.append({'check':'test features use previous actual test target','test_start':'2026-03-12','second_test_lag1':float(features.loc['2026-03-13','Lag_1']),'first_test_actual':int(daily.loc['2026-03-12'])})
print(json.dumps({'source_commit':'c8dc4d0822910e5100718c7dbd98b92c09b098e4','scope':'synthetic only; no live reconciliation','findings':findings},indent=2))
