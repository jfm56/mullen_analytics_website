"""
Membership / subscription plan catalog — the single source of truth for the
self-serve signup flow and the public pricing page (served via GET /api/plans).

Prices mirror the marketing pricing page. `self_serve` plans can be chosen at
public signup; everyone gets a 14-day trial on signup and paid tiers are then
activated by an admin (or, later, by Stripe subscription billing).
"""
from typing import Any, Dict, List, Optional

TRIAL_DAYS = 14

PLANS: List[Dict[str, Any]] = [
    {
        "slug": "free_trial",
        "name": "Free Trial",
        "price_display": "$0",
        "period": "14-day trial",
        "monthly_cents": 0,
        "blurb": "Prove the value on your own charts — no card required.",
        "features": ["500 charts", "2 users", "CSV upload", "Built-in QA rules", "Basic dashboard"],
        "badge": "14 days",
        "highlight": False,
    },
    {
        "slug": "starter",
        "name": "Starter Agency",
        "price_display": "$299",
        "period": "/mo",
        "monthly_cents": 29900,
        "blurb": "Volunteer & small agencies (under 5,000 calls/yr).",
        "features": ["Up to 1,000 charts / month", "5 users", "CSV + NEMSIS import",
                     "Basic analytics", "PDF reports", "Email support"],
        "badge": None,
        "highlight": False,
    },
    {
        "slug": "professional",
        "name": "Professional",
        "price_display": "$799",
        "period": "/mo",
        "monthly_cents": 79900,
        "blurb": "Agencies doing 5,000–25,000 calls/yr.",
        "features": ["Up to 5,000 charts / month", "15 users", "AI reviewer",
                     "Per-provider analytics", "Monthly QA reports", "Priority support"],
        "badge": "Most popular",
        "highlight": True,
    },
    {
        "slug": "enterprise",
        "name": "Enterprise",
        "price_display": "$1,999",
        "period": "/mo",
        "monthly_cents": 199900,
        "blurb": "Large agencies & hospital EMS systems.",
        "features": ["Up to 20,000 charts / month", "Unlimited users", "Vendor integrations",
                     "Executive dashboards", "API access", "Dedicated onboarding"],
        "badge": None,
        "highlight": False,
    },
]

PLAN_SLUGS = {p["slug"] for p in PLANS}


def get_plan(slug: Optional[str]) -> Optional[Dict[str, Any]]:
    return next((p for p in PLANS if p["slug"] == slug), None)


def is_valid_plan(slug: Optional[str]) -> bool:
    return slug in PLAN_SLUGS
