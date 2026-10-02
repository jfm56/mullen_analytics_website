"""TOTP multi-factor auth for the client portal (the single auth authority).

pyotp verifies the standard RFC-6238 6-digit codes; segno renders the enrollment
QR server-side as an inline SVG (pure-python, no Pillow). Recovery codes are shown
once at enrollment and stored only as sha256 hashes, consumed one-time.
"""
from __future__ import annotations

import hashlib
import secrets

import pyotp
import segno

ISSUER = "Mullen Analytics"
_RECOVERY_COUNT = 10


def generate_secret() -> str:
    """A fresh base32 TOTP secret."""
    return pyotp.random_base32()


def provisioning_uri(secret: str, account_email: str) -> str:
    """otpauth:// URI for authenticator apps (Google Authenticator, 1Password, …)."""
    return pyotp.TOTP(secret).provisioning_uri(name=account_email, issuer_name=ISSUER)


def qr_svg_data_uri(uri: str) -> str:
    """Render the provisioning URI as an SVG data URI for <img src=…>.

    Uses segno's svg_data_uri, which emits a standalone SVG WITH the xmlns
    namespace. (svg_inline omits xmlns — fine when inlined into HTML, but it does
    not render as a standalone image in an <img> tag.)
    """
    return segno.make(uri, error="m").svg_data_uri(scale=5)


def verify_totp(secret: str, code: str) -> bool:
    """Verify a 6-digit code, allowing ±1 time step for clock skew."""
    if not secret or not code:
        return False
    return pyotp.TOTP(secret).verify(code.strip().replace(" ", ""), valid_window=1)


def generate_recovery_codes(n: int = _RECOVERY_COUNT) -> list[str]:
    """Human-friendly one-time recovery codes, e.g. '3f9a-21c7' (shown once)."""
    out = []
    for _ in range(n):
        raw = secrets.token_hex(4)  # 8 hex chars
        out.append(f"{raw[:4]}-{raw[4:]}")
    return out


def hash_recovery_code(code: str) -> str:
    """Stable sha256 of a normalized recovery code (for storage + comparison)."""
    norm = code.strip().lower().replace(" ", "").replace("-", "")
    return hashlib.sha256(norm.encode("utf-8")).hexdigest()


def hash_recovery_codes(codes: list[str]) -> list[str]:
    return [hash_recovery_code(c) for c in codes]
