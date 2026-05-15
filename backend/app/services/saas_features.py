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


# ---------------------------------------------------------------------------
# SECURITY WARNING — multi-agency comparison
# ---------------------------------------------------------------------------
# Before is_feature_enabled("multi_agency") is wired to any data endpoint:
#
#   1. Every query MUST filter by agency_id IN (list of agencies the requesting
#      user is entitled to).  A missing WHERE clause leaks one customer's
#      incidents/staffing data to another customer.  This is a HIPAA/data-
#      confidentiality issue, not just a product bug.
#
#   2. The entitlement list must be derived from AgencyMembership rows for the
#      current user, NOT from a client-supplied parameter.
#
#   3. Before merging: add tests/test_isolation.py covers this.  Run it and
#      extend it for every new cross-agency endpoint.
# ---------------------------------------------------------------------------
# TODO (SaaS v2): Implement multi-agency comparison aggregation
# def build_comparison_report(agency_ids: list[str], user_id: str, db: Session) -> dict:
#     """Aggregate key metrics across agencies the user is entitled to see.
#
#     NEVER accept agency_ids from the client directly.  Derive them from DB:
#         allowed = {m.agency_id for m in db.query(AgencyMembership)
#                    .filter(AgencyMembership.user_id == user_id)}
#         safe_ids = [aid for aid in agency_ids if aid in allowed]
#     """
#     ...


# ---------------------------------------------------------------------------
# SECURITY WARNING — Stripe webhooks
# ---------------------------------------------------------------------------
# Before wiring Stripe plan-change webhooks:
#
#   1. IDEMPOTENCY IS NON-NEGOTIABLE.  Stripe retries on 5xx.  Without dedup,
#      a transient DB error causes double-grant of a subscription tier.
#      Implement a processed_webhooks table: (event_id PK, received_at).
#      At handler entry: INSERT ... ON CONFLICT DO NOTHING; if 0 rows inserted,
#      return 200 immediately.
#
#   2. Verify the webhook signature via stripe.Webhook.construct_event() before
#      touching any DB state.  An unsigned POST to the webhook URL can forge
#      tier upgrades.
#
#   3. Handle checkout.session.completed AND customer.subscription.deleted
#      (downgrade path).  A subscription that lapses must revert the tier;
#      otherwise former customers retain Predictive/Enterprise features.
# ---------------------------------------------------------------------------
# TODO (SaaS v2): Implement Stripe webhook handler
# def handle_stripe_webhook(payload: bytes, sig_header: str, db: Session) -> None:
#     ...

