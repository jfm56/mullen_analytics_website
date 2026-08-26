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

PLAN_SLUGS = {p["slug"] for p in PLANS}


def get_plan(slug: Optional[str]) -> Optional[Dict[str, Any]]:
    return next((p for p in PLANS if p["slug"] == slug), None)


def is_valid_plan(slug: Optional[str]) -> bool:
    return slug in PLAN_SLUGS


def features_for_plan(slug: Optional[str]) -> Dict[str, Any]:
    """Capability dict for a plan slug (copy). Legacy/unknown slugs → Essential."""
    return dict(PLAN_FEATURES.get(slug or "", PLAN_FEATURES["essential"]))


def resolve_features(profile) -> Dict[str, Any]:
    """Effective capabilities for a profile = its plan's features + any
    extra-dataset add-on slots."""
    f = features_for_plan(getattr(profile, "plan", None) or "free_trial")
    try:
        f["max_active_datasets"] = int(f["max_active_datasets"]) + int(getattr(profile, "extra_dataset_slots", 0) or 0)
    except Exception:  # noqa: BLE001
        pass
    return f
