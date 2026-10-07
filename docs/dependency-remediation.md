# Dependency Vulnerability Remediation — backend/requirements.txt

**Date:** 2026-10-07 · **Trigger:** the `ci-security` GitHub Actions workflow ran
`pip-audit -r requirements.txt --strict` on every push and reported **96 known
vulnerabilities across 17 packages**. This is the CI security gate working as
intended (a failing dependency scan blocks the build). This document records how
each finding was handled. **No check was weakened merely to go green**: everything
with a safe fix was upgraded, three unused CVE-bearing packages were removed, and
only genuinely-residual advisories are ignored — each listed and justified below.

## 1. Removed unused packages (best fix — eliminates the CVE entirely)
Verified by `grep` across the whole backend that nothing imports these:

| Package | Was | Why removed | CVEs eliminated |
|---|---|---|---|
| `aiosmtplib` | 3.0.1 | email is sent via SendGrid over httpx (`app/services/email.py`); never imported | PYSEC-2026-2338, PYSEC-2026-3805 |
| `python-jose` | 3.3.0 | all JWT work uses **PyJWT** (`app/auth/cognito.py`, `app/routers/sso.py`); never imported | PYSEC-2024-232, PYSEC-2024-233, **PYSEC-2025-185 (no upstream fix)** |
| `ecdsa` | 0.19.2 | only pulled transitively by python-jose; never imported (`rsa`/`pyasn1` stay — google-auth needs them) | **PYSEC-2026-1325 (Minerva, no upstream fix)** |

Removing these cleared **both no-fix advisories** without ignoring anything.

## 2. Upgraded to fixed versions (safe, resolver-verified, test-validated)

| Package | Was → Now | Advisories cleared |
|---|---|---|
| anyio | 4.13.0 → 4.14.2 | PYSEC-2026-4024, 4025 |
| click | 8.3.2 → 8.3.3 | PYSEC-2026-2132 |
| cryptography | 46.0.7 → 50.0.2 | GHSA-537c-gmf6-5ccf, PYSEC-2026-3552, 3553, 3554 |
| fastapi | 0.109.0 → 0.118.3 | PYSEC-2024-38 (+ enables starlette/multipart fixes) |
| idna | 3.11 → 3.20 | PYSEC-2026-215 |
| Jinja2 | 3.1.3 → 3.1.6 | PYSEC-2026-1471, 1472, 1474, 1475 |
| Mako | 1.3.11 → 1.3.12 | PYSEC-2026-2617 |
| pyasn1 | 0.6.3 → 0.6.4 | PYSEC-2026-3455, 3456, 3457 |
| PyJWT | 2.9.0 → 2.15.1 | PYSEC-2026-120, 175, 176, 177, 178, 179, 4140, 4141, 4144, 4145, 4147, 4148, 4149, 4152, 4183 |
| python-dotenv | 1.0.1 → 1.2.2 | PYSEC-2026-2270 |
| python-multipart | 0.0.6 → 0.0.32 | PYSEC-2024-38, PYSEC-2026-1850, 1851, 1852, 3036, 3037, 3038, 3039, 3040 |
| scikit-learn | 1.4.2 → 1.5.2 | PYSEC-2024-110 |
| starlette | 0.35.1 → 0.48.0 | PYSEC-2026-1941, 1943 |

The framework cluster (fastapi / starlette / python-multipart / httpx / pydantic)
was resolved together (`pip install --dry-run`) to a coherent, conflict-free set.
**pydantic/pydantic-settings were intentionally left at 2.6.0/2.1.0** so the env
parsing behavior is unchanged; this is why fastapi stops at 0.118.3 (the newest
line that supports pydantic 2.6) rather than 0.142.

## 3. Accepted residuals (explicitly ignored in CI, with justification)
Configured as individual `--ignore-vuln` entries in `.github/workflows/ci-security.yml`
so `--strict` still blocks on anything else:

| Advisory | Package | Why accepted (for now) |
|---|---|---|
| PYSEC-2025-183 | PyJWT 2.15.1 | **No upstream fix exists** in the advisory DB; pinned to the latest release. |
| PYSEC-2026-1845 | pytest 7.4.4 | **Dev/test-only** dependency, not reachable from the application runtime. Fix (9.0.3) requires a pytest-asyncio major upgrade — tracked separately. |
| PYSEC-2026-161, 2280, 2281, 248, 249 | starlette 0.48.0 | Fixed only in the **starlette 1.x** line, which requires a FastAPI ≥0.119 + **pydantic 2.9+** upgrade (a cascade that changes env parsing). Tracked as a separate, reviewed framework upgrade before production. Not PHI-exposing; the EMSCS trial is synthetic/no-PHI and staging sits behind CloudFront/ALB. |

## 4. Follow-up tracked for production (NOT part of the trial gate)
A dedicated, reviewed **FastAPI 0.142 + Starlette 1.x + pydantic 2.9+** upgrade of
the live portal would clear the 5 starlette residuals. It is deferred because it
cascades into pydantic/pydantic-settings (env-parsing behavior) and deserves its
own regression pass against the full portal surface — not a side effect of closing
the CI item. This branch's upgrade (fastapi 0.118.3) is itself a framework change
that should be reviewed before merging to `main`/deploying to production.
