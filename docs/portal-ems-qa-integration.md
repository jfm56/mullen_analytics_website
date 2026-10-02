# Portal ↔ EMS QA integration (one login, one frontend)

This document describes the integration that lets a single portal login reach the
EMS QA screens, how to configure it (env var **names** only — never commit
secrets), how to deploy and roll back, and the security posture.

Companion doc (EMS QA side): `mullen-ems-qa/docs/sso-setup.md`.

---

## 1. What was built

The **client portal** (`mullen_analytics_website`) is the single auth authority.
EMS QA (`mullen-ems-qa`) remains a separate service with its own database, AI, and
storage — nothing was merged. The portal reaches it two ways:

1. **In-portal QA screens** (`/portal/qa/*`) — the QA Dashboard, Analytics,
   Imports, Findings, My Corrections, and Settings render natively inside the
   portal shell. Their data flows **same-origin** through a guarded chain:

   ```
   browser  /api/proxy/qa/<path>              (Next.js route handler; forwards the
                                               portal `session` cookie only)
     → portal FastAPI  /api/qa/<path>         (routers/qa_proxy.py — allow-lists
                                               the QA surface; enforces portal
                                               session + EMS-QA entitlement + MFA)
     → identity bridge                        (services/ems_qa_bridge.py — mints a
                                               single-use Ed25519 SSO ticket and
                                               exchanges it SERVER-SIDE for an EMS
                                               QA session; caches it in-process)
     → EMS QA  /api/<path>                    (verifies the ticket; enforces agency
                                               membership + role via its own
                                               session + Postgres RLS)
   ```

   The browser never holds an EMS QA cookie or any secret. EMS QA independently
   enforces agency/role on every request — the portal adds **no** new auth path
   there.

2. **Legacy full-app SSO launch** (kept as a rollout fallback) — the "Open full QA
   app" link still mints a ticket and hands the browser off to the standalone EMS
   QA app (top-level `POST` to EMS QA `/api/auth/sso`).

**MFA.** Because EMS QA required MFA, the portal (the one login) now enforces TOTP
MFA. QA is gated on it: a QA-entitled member must enrol TOTP and pass the challenge
before any `/portal/qa/*` screen or `/api/qa/*` call succeeds.

---

## 2. Environment variables (names only)

> Secrets are never committed. Set these in each platform's secret store
> (Railway / Vercel / the Hetzner host's `.env` or compose `environment:` block).

### 2a. Portal backend — FastAPI on Railway

| Variable | Purpose |
|---|---|
| `SSO_PRIVATE_KEY` | Ed25519 **private** key, PEM. Signs SSO tickets. Portal only. |
| `SSO_ISSUER` | Ticket `iss`. Must equal EMS QA `SSO_ISSUER` (default `mullen-portal`). |
| `SSO_AUDIENCE` | Ticket `aud`. Must equal EMS QA `SSO_AUDIENCE` (default `mullen-ems-qa`). |
| `SSO_TOKEN_TTL_SECONDS` | Ticket lifetime (default `60`). Keep short. |
| `EMS_QA_API_BASE` | EMS QA backend origin for the server-side bridge, e.g. `https://app.mullenanalytics.com` (prod) / `http://localhost:8000` (dev). When empty the QA proxy returns 503 — the integration is off. |
| `EMS_QA_SSO_URL` | EMS QA `/api/auth/sso` URL for the legacy browser launch. |

(Existing session vars still apply: `SECRET_KEY`, `SESSION_COOKIE_SECURE`,
`ACCESS_TOKEN_EXPIRE_MINUTES`, etc.)

### 2b. Portal frontend — Next.js on Vercel

| Variable | Purpose |
|---|---|
| `FASTAPI_URL` | Portal FastAPI origin the `/api/proxy/*` route handler forwards to. |

No EMS QA URL or secret is exposed to the browser.

### 2c. EMS QA — FastAPI on the Hetzner host (docker compose)

| Variable | Purpose |
|---|---|
| `SSO_ENABLED` | Must be `true` to accept tickets. Ships `false`. |
| `SSO_PUBLIC_KEY` | Ed25519 **public** key, PEM (the pair of the portal's private key). Inject via the compose `environment:` block (multi-line YAML block scalar) — `env_file` can't carry newlines. |
| `SSO_ISSUER` / `SSO_AUDIENCE` | Must match the portal (`mullen-portal` / `mullen-ems-qa`). |
| `SSO_DEFAULT_ROLE` | Role for SSO-provisioned members (default `qa_reviewer`). |
| `SSO_TOKEN_MAX_AGE_SECONDS` | Hard cap on accepted ticket age (default `60`). |
| `SSO_AUTO_CREATE_AGENCY` | `false` in prod — the agency (by slug) must already exist. |

### 2d. Generating the Ed25519 keypair

```bash
openssl genpkey -algorithm ed25519 -out sso_private.pem     # -> portal SSO_PRIVATE_KEY
openssl pkey -in sso_private.pem -pubout -out sso_public.pem # -> EMS QA SSO_PUBLIC_KEY
```

Store the **private** key only in the portal's secret store; the **public** key
only in EMS QA. Never commit either. To rotate: generate a new pair, update EMS QA
`SSO_PUBLIC_KEY` first, then the portal `SSO_PRIVATE_KEY` (brief overlap means some
in-flight tickets fail and are re-minted automatically).

### 2e. Per-member fields (portal `profiles` table, set by admins)

`ems_qa_enabled` (bool), `ems_agency_slug` (the EMS QA agency slug), `ems_role`
(the member's QA role). Managed in the admin client overview; they drive the QA nav
visibility and the ticket claims.

---

## 3. Local development

Run three processes (note the port split — portal API and EMS QA both default to
8000, so move one):

| Component | Command | Port |
|---|---|---|
| EMS QA stack | `docker compose up -d` (in `mullen-ems-qa`) | 8000 |
| Portal FastAPI | `uvicorn app.main:app --port 8001` (in `.../backend`) | 8001 |
| Portal Next.js | `npm run dev` (with `FASTAPI_URL=http://localhost:8001`) | 3000 |

Portal env for local bridge: `EMS_QA_API_BASE=http://localhost:8000`,
`SSO_PRIVATE_KEY=<dev private PEM>`. EMS QA local SSO: a gitignored
`docker-compose.override.yml` with `SSO_ENABLED=true` + `SSO_PUBLIC_KEY` (the
matching public PEM). See `mullen-ems-qa/docs/sso-setup.md`.

A member needs `ems_qa_enabled=true` + `ems_agency_slug` pointing at an existing
EMS QA agency. First QA request auto-provisions that user in EMS QA by email.

---

## 4. Deployment (staging first; do not deploy to prod without sign-off)

Order matters — enable verification on the SP (EMS QA) before the portal starts
minting against prod.

1. **EMS QA (Hetzner):** add `SSO_PUBLIC_KEY` to the compose `environment:` block,
   set `SSO_ENABLED=true`, matching issuer/audience, `SSO_AUTO_CREATE_AGENCY=false`.
   `docker compose up -d api`. Confirm `POST /api/auth/sso` with a bad token → 401
   (not 404 → means SSO is on; not 500 → means PyJWT is present in the image —
   rebuild if needed).
2. **Portal backend (Railway):** set `SSO_PRIVATE_KEY`, `EMS_QA_API_BASE`,
   issuer/audience, `SSO_TOKEN_TTL_SECONDS`. Deploy. The MFA columns self-heal on
   startup (idempotent `ALTER … ADD COLUMN IF NOT EXISTS` in `app/main.py`; mirrors
   `migrations/012_add_mfa.sql`).
3. **Portal frontend (Vercel):** ensure `FASTAPI_URL` points at the backend.
   Deploy.
4. **Smoke test** (a QA-entitled test member): sign in → prompted to enrol TOTP →
   enrol → open `/portal/qa/dashboard` → data loads → open another agency's id in a
   URL → denied (403). Confirm the browser never receives an EMS QA `session`
   cookie (DevTools → Application → Cookies).

---

## 5. Rollback

The integration is **feature-flag isolated** — you can disable it without reverting
code:

- **Disable the whole QA integration (fastest):** unset `EMS_QA_API_BASE` on the
  portal backend and redeploy. `/api/qa/*` returns 503; the QA nav still shows but
  screens report "not available." Or set `SSO_ENABLED=false` on EMS QA to reject
  all tickets at the source.
- **Disable per member:** set `ems_qa_enabled=false` on the profile — the QA nav
  and proxy access disappear for that member immediately.
- **Disable MFA enforcement on a locked-out account:** an admin/DB operator can set
  `users.totp_enabled=false` (and clear `totp_secret`) for that user; they'll be
  asked to re-enrol next time they open QA.
- **Full code rollback:** revert the feature branch commits (Phase 1 bridge →
  Phase 2 screens → Phase 3 MFA) and redeploy. MFA columns are additive and safe to
  leave in place; no destructive migration to undo.

---

## 6. Security posture

- **Single authority:** the portal owns login, sessions, and MFA. EMS QA trusts
  only a short-lived (≤60s), single-use (jti-burned in Redis) Ed25519 ticket, and
  still enforces agency membership + role (RLS + `require_roles`) on every call.
- **No secret or cross-service cookie in the browser:** the EMS QA session lives
  only server-side in the bridge cache; the proxy strips `set-cookie` and hop-by-hop
  headers from upstream responses.
- **Least privilege:** the QA proxy allow-lists `agencies/*`, `auth/me`,
  `auth/me/agencies` only. The EMS QA operator console (`admin/*`), billing, and raw
  auth (`auth/login|logout|sso`) are blocked through the portal.
- **MFA:** TOTP (RFC-6238) with one-time, hashed recovery codes; QA requires it.
- **CSRF:** the session cookie is `SameSite=Lax`, which blocks the cross-site POST
  vector for the state-changing routes. See deferred items for token-based CSRF.

---

## 7. Verification performed (local)

- Live bridge E2E against the running EMS QA stack: one portal-minted ticket →
  live EMS QA session + agency id; `/auth/me` + `/auth/me/agencies` prove identity
  and membership; own-agency read = 200; **cross-agency read = 403** (EMS QA RLS);
  allow-list blocks admin/billing/raw-auth.
- `next build` compiles all `/portal/qa/*` + `/portal/security` routes; eslint clean.
- Backend `pytest`: full suite green, plus new `test_mfa.py` (enrol / login
  challenge / recovery single-use / disable) and `test_qa_proxy.py` (allow-list +
  MFA-gate denials + non-entitled denial).

---

## 8. Deferred / known follow-ups

- **Token-based CSRF.** Current protection is `SameSite=Lax` cookies (adequate for
  the cross-site POST vector). Adding per-request CSRF tokens would harden the whole
  portal but touches every existing form — a portal-wide change to schedule
  deliberately, not fold into this feature.
- **EMS QA `field_crew` role.** `charts/mark-corrected` is restricted to
  `admin`/`field_crew`, but `field_crew` isn't an assignable SSO role yet, so a
  pure `qa_reviewer` can't mark corrections. Reconcile the role matrix on the EMS QA
  side.
- **Multi-instance bridge cache.** The EMS QA session is cached in-process (fine for
  Railway's single persistent instance). For horizontal scaling, move it to a shared
  store (portal Postgres or Redis), keyed + encrypted per user.
