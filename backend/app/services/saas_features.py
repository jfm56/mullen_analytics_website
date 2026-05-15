"""
SaaS feature gating — placeholder module.

TODO (SaaS v2): Implement full subscription-aware feature gating.

Planned features per tier:
  essential:   data quality, call volume, response times, basic report
  operational: + staffing, unit performance, municipality breakdown
  predictive:  + forecasting, attrition risk, call volume trends
  enterprise:  + multi-agency comparison, scheduled runs, white-label reports

Planned infrastructure:
  - Monthly automated pipeline runs via APScheduler or Celery beat
  - Scheduled report delivery via email (nodemailer, already in frontend deps)
  - Per-agency run frequency limits (e.g. essential: 1/month, enterprise: unlimited)
  - Multi-agency comparison dashboard at /platform/admin/compare
  - Agency-level feature flag overrides stored in Agency.subscription_features (JSON)
  - Stripe webhook handler to update subscription_tier on plan change
"""
from typing import Any, Dict

# TODO (SaaS v2): Move TIER_FEATURES here from runner.TIER_MODULES
# and extend with non-pipeline features (reports, exports, API access, etc.)
TIER_FEATURES: Dict[str, Dict[str, Any]] = {
    "essential": {
        "pipeline_modules":    ["data_quality", "validator", "call_volume", "response_times", "report"],
        "max_runs_per_month":  2,
        "export_pdf":          True,
        "report_builder":      False,
        "ai_assistant":        False,
        "scheduled_runs":      False,    # TODO: implement
        "multi_agency":        False,    # TODO: implement
    },
    "operational": {
        "pipeline_modules":    ["data_quality", "validator", "call_volume", "response_times",
                                "staffing", "unit_performance", "municipality", "report"],
        "max_runs_per_month":  10,
        "export_pdf":          True,
        "report_builder":      True,
        "ai_assistant":        False,
        "scheduled_runs":      False,    # TODO: implement
        "multi_agency":        False,    # TODO: implement
    },
    "predictive": {
        "pipeline_modules":    ["data_quality", "validator", "call_volume", "response_times",
                                "staffing", "unit_performance", "municipality", "forecasting", "report"],
        "max_runs_per_month":  30,
        "export_pdf":          True,
        "report_builder":      True,
        "ai_assistant":        True,
        "scheduled_runs":      False,    # TODO: implement
        "multi_agency":        False,    # TODO: implement
    },
    "enterprise": {
        "pipeline_modules":    ["data_quality", "validator", "call_volume", "response_times",
                                "staffing", "unit_performance", "municipality", "forecasting", "report"],
        "max_runs_per_month":  -1,       # unlimited
        "export_pdf":          True,
        "report_builder":      True,
        "ai_assistant":        True,
        "scheduled_runs":      True,     # TODO: implement
        "multi_agency":        True,     # TODO: implement
    },
}


def is_feature_enabled(tier: str, feature: str) -> bool:
    """Return True if the given subscription tier includes the named feature."""
    tier_config = TIER_FEATURES.get(tier, TIER_FEATURES["essential"])
    value = tier_config.get(feature, False)
    if isinstance(value, bool):
        return value
    if isinstance(value, int):
        return value != 0
    return bool(value)


def get_tier_config(tier: str) -> Dict[str, Any]:
    """Return the full feature config for a tier."""
    return TIER_FEATURES.get(tier, TIER_FEATURES["essential"])


# TODO (SaaS v2): Implement scheduled run dispatcher
# def schedule_monthly_runs(db: Session) -> None:
#     """Trigger pipeline runs for all agencies due for their monthly report."""
#     ...

# TODO (SaaS v2): Implement multi-agency comparison aggregation
# def build_comparison_report(agency_ids: list[str], db: Session) -> dict:
#     """Aggregate key metrics across multiple agencies for comparison dashboard."""
#     ...
