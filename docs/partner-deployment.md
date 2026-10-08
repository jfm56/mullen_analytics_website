# Partner portal deployment

The portal shell and login/MFA screens use `src/lib/portalBrand.js`. Public build-time configuration:

| Variable | Default |
|---|---|
| NEXT_PUBLIC_PORTAL_BRAND_NAME | Mullen Analytics |
| NEXT_PUBLIC_PORTAL_LABEL | Client Portal |
| NEXT_PUBLIC_PORTAL_LOGO | /navbar-logo.png |
| NEXT_PUBLIC_PORTAL_HOME_URL | / |
| NEXT_PUBLIC_PORTAL_ATTRIBUTION | Powered by Mullen Analytics |

Place logo assets in public/ and specify a local root-relative path. Rebuild after public environment changes. FASTAPI_URL is server-only and points to the authorized backend; never expose credentials in public variables.

Recommended integration: partner website links to a custom subdomain serving the portal. One codebase can support separately branded frontend deployments sharing the authorized backend. This initial implementation is deployment-wide branding, not runtime per-host brand selection. Marketing/admin pages and every ancillary portal page are not fully white-labeled yet.

Provision partner consultants through existing approved membership/capability controls. Brand, hostname, URL parameters and logo configuration MUST NOT grant access or select an agency. Agency authorization remains backend-enforced. Cross-brand navigation must not imply shared sessions; each frontend host should use host-scoped secure cookies and the existing MFA flow. Validate password reset, email verification, cookie settings, redirects and logout for every host. Cognito callback/logout URLs require explicit registration where Cognito applies.

No iframe embedding is enabled by this work. If required later, add a narrowly scoped CSP frame-ancestors allowlist, validate third-party-cookie behavior and review authenticated content handling. Do not open framing globally. A custom-domain portal with a normal website link is the first supported deployment pattern to validate.

Staging acceptance: login/MFA, reset and verification links, correct branding, no console/build errors, allowed agency access, denied unrelated agency access, logout, audit actor retention, exports, and identical metric versions between brands. Use synthetic tenants. PHI production gate remains NOT READY. No DNS or account provisioning has occurred.
