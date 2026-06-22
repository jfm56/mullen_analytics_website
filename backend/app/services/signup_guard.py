"""
Lightweight abuse guards for the public self-serve signup endpoint.

Public registration is a spam/abuse vector (fake trials, throwaway inboxes,
scripted floods). These checks are intentionally simple and dependency-free:

  * In-process sliding-window rate limiting, keyed by client IP. The portal runs
    as a single uvicorn process, so an in-memory store is sufficient; it resets
    on restart and is not shared across replicas, which is an acceptable trade
    for a first line of defense (the email-verification gate is the real one).
  * A static blocklist of well-known disposable / throwaway email domains.

Neither check is authoritative — they raise the cost of casual abuse without
blocking legitimate users.
"""
from __future__ import annotations

import threading
import time
from collections import defaultdict, deque
from typing import Deque, Dict

# ---------------------------------------------------------------------------
# Sliding-window rate limiter
# ---------------------------------------------------------------------------

_hits: Dict[str, Deque[float]] = defaultdict(deque)
_lock = threading.Lock()


def check_rate_limit(key: str, max_calls: int, window_seconds: int) -> bool:
    """Return True if the call is allowed, False if `key` is over its limit.

    A call that returns True is counted against the window. Keys with an empty
    window are pruned so the store does not grow without bound.
    """
    if not key:
        key = "_unknown"

    now = time.time()
    cutoff = now - window_seconds

    with _lock:
        bucket = _hits[key]
        while bucket and bucket[0] < cutoff:
            bucket.popleft()

        if len(bucket) >= max_calls:
            if not bucket:
                _hits.pop(key, None)
            return False

        bucket.append(now)
        return True


def reset_rate_limits() -> None:
    """Clear all rate-limit state (used by tests)."""
    with _lock:
        _hits.clear()


# ---------------------------------------------------------------------------
# Disposable email domains
# ---------------------------------------------------------------------------

# A conservative set of well-known throwaway providers. Kept small on purpose —
# false positives block real customers, which is worse than letting a few
# disposable signups through (they still can't pass email verification to a
# real inbox they don't control).
DISPOSABLE_EMAIL_DOMAINS = frozenset({
    "mailinator.com",
    "guerrillamail.com",
    "guerrillamail.info",
    "grr.la",
    "sharklasers.com",
    "10minutemail.com",
    "10minutemail.net",
    "tempmail.com",
    "temp-mail.org",
    "throwawaymail.com",
    "yopmail.com",
    "getnada.com",
    "nada.email",
    "dispostable.com",
    "trashmail.com",
    "maildrop.cc",
    "fakeinbox.com",
    "mailnesia.com",
    "mintemail.com",
    "mohmal.com",
    "spam4.me",
    "tempinbox.com",
    "emailondeck.com",
    "moakt.com",
    "tmpmail.org",
})


def is_disposable_email(email: str) -> bool:
    """Return True if the email's domain is a known disposable/throwaway provider."""
    if not email or "@" not in email:
        return False
    domain = email.rsplit("@", 1)[1].strip().lower()
    return domain in DISPOSABLE_EMAIL_DOMAINS
