"""Synthetic regression tests with no application startup or database access."""
import sys
import unittest
from pathlib import Path
from unittest.mock import patch

import numpy as np
import pandas as pd

sys.path.insert(0, str(Path(__file__).resolve().parents[2]))
from app.services.ems_analytics_service import _collapse_to_incidents, compute_ems_metrics_frame
from app.services.pipeline import forecasting


class ReconciliationTests(unittest.TestCase):
    def frame(self):
        return pd.DataFrame([
            {'incident_number':'A','unit':'M1','dispatch_time':'2026-01-01 10:00','arrival_time':'2026-01-01 10:20'},
            {'incident_number':'A','unit':'M2','dispatch_time':'2026-01-01 10:01','arrival_time':'2026-01-01 10:10'},
            {'incident_number':'B','unit':'M1','dispatch_time':'2026-01-01 11:00','arrival_time':'2026-01-01 11:08'},
        ])

    def test_first_arriving(self):
        result=compute_ems_metrics_frame(self.frame(),{}, {})
        self.assertEqual(result['response_times']['dispatch_to_arrival_median'],8.5)
        self.assertEqual(result['incident_collapse']['incidents'],2)

    def test_blank_ids(self):
        df=self.frame()
        for value in [None,np.nan,'','  ','null']:
            df['incident_number']=value
            self.assertEqual(len(_collapse_to_incidents(df)),3)

    def test_invalid_arrival_does_not_win(self):
        df=self.frame()
        df.loc[0,'arrival_time']='invalid'
        self.assertEqual(_collapse_to_incidents(df).query("incident_number == 'A'").iloc[0]['unit'],'M2')

    def test_missing_arrival_not_task_time(self):
        df=pd.DataFrame([{'unit':'M1','dispatch_time':'2026-01-01 12:00','clear_time':'2026-01-01 13:00'}])
        self.assertEqual(compute_ems_metrics_frame(df,{}, {})['unit_performance']['avg_response_time_by_unit'],[])

    def test_forecast_incident_grain(self):
        df=self.frame()
        df['_dt_created']=pd.to_datetime(df.dispatch_time)
        self.assertEqual(forecasting._daily_series(df).sum(),2)

    def test_forecast_holdout_before_refit(self):
        class Model:
            def __init__(self): self.fit_sizes=[]; self.predicted_fit_sizes=[]
            def fit(self,x,y): self.fit_sizes.append(len(y)); return self
            def predict(self,x):
                self.predicted_fit_sizes.append(self.fit_sizes[-1])
                return np.full(len(x),5.0)
        model=Model()
        dates=pd.date_range('2025-01-01',periods=250)
        df=pd.DataFrame({'_dt_created':np.repeat(dates,5)})
        with patch.object(forecasting,'_build_models',return_value={'Synthetic':model}), patch.object(forecasting,'_moving_avg_predict',side_effect=lambda d,n,**k:np.zeros(n)):
            result=forecasting._forecast_call_volume(df,1)
        self.assertEqual(result['model_name'],'Synthetic')
        self.assertEqual(len(model.fit_sizes),2)
        train,full=model.fit_sizes
        self.assertLess(train,full)
        # Scoring and interval residuals use only the train-fitted model;
        # full-data model is used exclusively for the final 400-day forecast.
        self.assertTrue(all(n==train for n in model.predicted_fit_sizes[:-400]))
        self.assertTrue(all(n==full for n in model.predicted_fit_sizes[-400:]))


if __name__=='__main__': unittest.main()
