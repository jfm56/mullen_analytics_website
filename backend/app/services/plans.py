"""
Membership / subscription plan catalog + capability map — the single source of
truth for self-serve signup, the pricing page (GET /api/plans), and feature
gating (GET /api/plans/me + plan_access.py).

Tiers (monthly): Essential $249 · Professional $599 · Enterprise $1,499, plus a
30-day free trial and an "extra active dataset" add-on ($99/mo each). The value
gates that distinguish tiers:
  • max_active_datasets — how many cleaned datasets/dashboards can be live
  • data_explorer        — ad-hoc filtering / slice-and-dice
  • compare_years        — year-over-year dataset groups + Compare Years
  • preferences          — PHI-hiding, exclusions, default date/grouping controls
"""
from typing import Any, Dict, List, Optional

TRIAL_DAYS = 30

PLANS: List[Dict[str, Any]] = [
    {
        "slug": "free_trial",
        "name": "Free Trial",
        "price_display": "$0",
        "period": "30-day trial",
        "monthly_cents": 0,
        "blurb": "Full access for 30 days on your own data — no card required.",
        "features": ["Clean + dashboard your data", "Data Explorer", "Up to 3 active datasets", "No credit card"],
        "badge": "30 days",
        "highlight": False,
    },
    {
        "slug": "essential",
        "name": "Essential",
        "price_display": "$249",
        "period": "/mo",
        "monthly_cents": 24900,
        "blurb": "Clean data + a live dashboard.",
        "features": [
            "One active dataset at a time",
            "Dashboard + downloadable cleaned files",
            "Email & portal notifications",
            "Support via portal messaging & feedback",
        ],
        "badge": None,
        "highlight": False,
    },
    {
        "slug": "professional",
        "name": "Professional",
        "price_display": "$599",
        "period": "/mo",
        "monthly_cents": 59900,
        "blurb": "Self-service analysis and more datasets.",
        "features": [
            "Everything in Essential",
            "Up to 5 active datasets / dashboards",
            "Data Explorer (ad-hoc slice-and-dice)",
            "Preference controls (PHI hiding, exclusions, defaults)",
            "Same-business-day support",
        ],
        "badge": "Most popular",
        "highlight": True,
    },
    {
        "slug": "enterprise",
        "name": "Enterprise",
        "price_display": "$1,499",
        "period": "/mo",
        "monthly_cents": 149900,
        "blurb": "Continuous reporting + management comparisons.",
        "features": [
            "Everything in Professional",
            "Year-over-year groups + Compare Years",
            "Higher dataset limits (fair-use)",
            "Custom deliverables on a cadence",
            "Dedicated account manager + monthly check-in",
        ],
        "badge": None,
        "highlight": False,
    },
]

# Optional upsell knob — scales volume without new tiers.
ADDONS: List[Dict[str, Any]] = [
    {
        "slug": "extra_dataset",
        "name": "Extra active dataset",
        "price_display": "$99",
        "period": "/mo each",
        "blurb": "Add another active cleaned dataset beyond your plan's limit.",
    },
]

# Capability map → drives feature gating. Unknown/legacy slugs fall back to Essential.
PLAN_FEATURES: Dict[str, Dict[str, Any]] = {
    "free_trial":   {"max_active_datasets": 3,  "data_explorer": True,  "compare_years": False, "preferences": True},
    "essential":    {"max_active_datasets": 1,  "data_explorer": False, "compare_years": False, "preferences": False},
    "professional": {"max_active_datasets": 5,  "data_explorer": True,  "compare_years": False, "preferences": True},
    "enterprise":   {"max_active_datasets": 50, "data_explorer": True,  "compare_years": True,  "preferences": True},
}

# ---------------------------------------------------------------------------
# Product MODULES — the separately-licensable parts of the combined platform.
# Access is "tiers + per-client overrides": the tier grants a default set of
# modules (PLAN_MODULES); Profile.module_overrides ({module: bool}) flips any
# individual module on/off for a specific client regardless of tier.
#   analytics   — the operational dashboard (Overview + Compare Dates)
#   predictive  — Predictions + Scheduling (forecasts, staffing, turnover)
#   geographic  — Geographic predictions (weather/traffic day×area, heat maps)
#   qa          — the EMS QA app (also keyed by Profile.ems_qa_enabled, kept in
#                 sync so the SSO proxy / QA nav gate continue to work unchanged)
# ---------------------------------------------------------------------------
MODULES: List[str] = ["analytics", "predictive", "geographic", "qa"]

MODULE_LABELS: Dict[str, str] = {
    "analytics": "Analytics dashboard",
    "predictive": "Predictive analytics",
    "geographic": "Geographic predictions",
    "qa": "EMS QA",
}

# Default module bundle per tier. Jim edits these to match the product packaging;
# per-client overrides are the primary control. (Mirrors the Cascade quote:
# Essential = the analytics dashboard; higher tiers add predictive/geographic; QA
# is its own product, typically granted per client via the override / ems_qa.)
# Dashboard modules bundled by each tier. QA is intentionally NOT tier-granted:
# it needs per-client config (agency slug + role) and is controlled by the QA
# toggle (Profile.ems_qa_enabled) / a per-client override.
PLAN_MODULES: Dict[str, List[str]] = {
    "free_trial":   ["analytics", "predictive", "geographic"],
    "essential":    ["analytics"],
    "professional": ["analytics", "predictive", "geographic"],
    "enterprise":   ["analytics", "predictive", "geographic"],
}

PLAN_SLUGS = {p["slug"] for p in PLANS}


def enabled_modules(profile) -> Dict[str, bool]:
    """Effective module access for a profile = the tier's default bundle, then
    per-client overrides (Profile.module_overrides). QA also honors the legacy
    Profile.ems_qa_enabled flag so existing QA clients keep access."""
    plan = getattr(profile, "plan", None) or "free_trial"
    base = set(PLAN_MODULES.get(plan, PLAN_MODULES["essential"]))
    overrides = getattr(profile, "module_overrides", None)
    if not isinstance(overrides, dict):
        overrides = {}
    legacy_qa = bool(getattr(profile, "ems_qa_enabled", False))
    out: Dict[str, bool] = {}
    for m in MODULES:
        if m in overrides:
            out[m] = bool(overrides[m])
        elif m == "qa":
            # QA is controlled by its own toggle (ems_qa_enabled), not tiers.
            out[m] = legacy_qa
        else:
            out[m] = m in base
    return out


def get_plan(slug: Optional[str]) -> Optional[Dict[str, Any]]:
    return next((p for p in PLANS if p["slug"] == slug), None)


def is_valid_plan(slug: Optional[str]) -> bool:
    return slug in PLAN_SLUGS


def features_for_plan(slug: Optional[str]) -> Dict[str, Any]:
    """Capability dict for a plan slug (copy). Legacy/unknown slugs → Essential."""
    return dict(PLAN_FEATURES.get(slug or "", PLAN_FEATURES["essential"]))


def resolve_features(profile) -> Dict[str, Any]:
    """Effective capabilities for a profile = its plan's features + any
    extra-dataset add-on slots + the effective product modules (flat booleans
    `analytics`/`predictive`/`geographic`/`qa` plus a `modules` dict)."""
    f = features_for_plan(getattr(profile, "plan", None) or "free_trial")
    try:
        f["max_active_datasets"] = int(f["max_active_datasets"]) + int(getattr(profile, "extra_dataset_slots", 0) or 0)
    except Exception:  # noqa: BLE001
        pass
    mods = enabled_modules(profile)
    f["modules"] = mods
    f.update(mods)  # flat keys for easy nav/tab gating on the frontend
    return f
