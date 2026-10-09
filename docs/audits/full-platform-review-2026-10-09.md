# Website and web app review — 2026-10-09

## Scope and evidence

Reviewed repository `jfm56/mullen_analytics_website`, starting at main commit
`ed98bdd` (AWS migration PR #29). Inventoried 88 page files and examined static
navigation/asset references across 191 frontend modules. Inspected 293 ordinary
FastAPI route declarations plus the legacy QA proxy. Ran the existing dead-code,
duplicate-block and proxy regression audits. HTTP GET checks covered 37 public
pages/assets/metadata/login endpoints and 18 additional outbound/service/error
URLs. No form submission, real data upload, patient data access, infrastructure
apply or production configuration change was performed.

Live browser spot checks: homepage, desktop Services dropdown, Business Analytics
navigation and client portal login. Login completed its anonymous session check
and displayed the sign-in form. The public chatbot and cookie banner were visibly
present on that login page. Desktop Services click initially closed the menu as
its hover and click handlers fought; keyboard Enter opened it and the Business
Analytics link navigated correctly.

HTTP 200 establishes reachability, not functional completeness, correctness of
analytics, accessibility, or a valid booking/social account. External calendar,
company LinkedIn, Facebook, GitHub, app login and trial links returned 200. Two
calendar URLs resolve to different appointment schedules; owner confirmation is
needed before consolidating them. Network timings include this audit environment's
proxy and cannot be interpreted as user latency or Core Web Vitals.

## Findings and corrections in this branch

| Priority | Finding | Evidence | Correction |
| --- | --- | --- | --- |
| High | Marketing Google tags, first-party visitor tracker, public LLM chat and Speed Insights mounted globally on private app routes | Root layout; Analytics emitted full URL including query; browser showed public chat on portal login | Shared segment-based private-route boundary excludes these tools from portal/admin/platform/signup; existing Google tag is disabled/revoked on private soft navigation; manual pageviews/referrer omit queries |
| High | PHI kill switch missed legacy QA proxy writes | `/api/qa/agencies/...` accepted POST/PATCH outside guarded prefixes | Guard covers `/api/qa` and legacy project-report generation; exact segment matching avoids unrelated prefix collisions; default remains false |
| High | Project report action returned success for a PDF that was never rendered or saved | `projects.py` created a Document row with a fabricated storage path | Auth/ownership checked, then clear 501; no Document is created; UI surfaces the returned message; regression tests added |
| Medium | Four broken assets on `/connect` | Live 404 for brochure PDF, capability PDF, preview image and demo MP4 | Existing services/capabilities pages replace missing downloads; real portfolio image replaces missing preview; synthetic dashboard and private-demo request replace non-existent video |
| Medium | Two placeholder social destinations | `YOUR-LINKEDIN`, `YOUR-COMPANY` in Connect footer | Removed fabricated personal profile link; real company and existing GitHub links retained |
| Medium | Four broken images on Technology page | Asset lookup with URL decoding: automation, delivery platforms, emerging technology, accelerators | References now use existing relevant public assets |
| Medium | Unknown service slugs returned HTTP 200 | Live `/services/does-not-exist` returned 200 | Uses Next `notFound()` with recovery links |
| Medium | Invoice API failures could cause rendering errors or false login redirects | JSON error objects stored as array; catch redirected every failure | Check status and array shape; show inline error with retry |
| Medium | Contact form could stay at “Sending…” after network failure and allow duplicate submissions | No catch/finally or pending-state disable | Catch/finally, visible server errors, pending disable; labels associated with inputs |
| Medium | CAPTCHA verification was skipped when server secret absent | API accepted any nonempty token; frontend fallback `no-captcha` | Missing verification secret returns 503 with email fallback; request uses URLSearchParams |
| Low | Private route roots not excluded by robots rules; no noindex response header | Only `/portal/` and `/admin/`; client layouts lacked robots metadata | Prefix rules cover roots; private routes receive X-Robots-Tag noindex/nofollow |
| Low | Sitemap included intentionally noindex drone/environmental pages | Both page metadata and sitemap inspected | Excluded from sitemap |
| Low | No app-level recoverable error page | No error.jsx | Generic retry page avoids exposing exception details; custom 404 provides useful navigation |
| Low | Shared API client failed on successful 204 and hid kill-switch error text | unconditional response.json; no error.error fallback | Handle 204; surface backend error field |
| Low | Desktop dropdown hover/click conflict and missing keyboard dismissal | Browser click vs Enter and Navbar handlers | Click-controlled dropdown, Escape dismissal and close when keyboard focus exits |

These corrections are proposed code changes, not deployed changes. The marketing
boundary is not evidence that all third-party egress is eliminated: a tag loaded
on an earlier public page may retain its own listeners, and GA enhanced measurement
or account configuration needs an actual network capture. Fresh private-page
loads do not mount the marketing bundle. Use separate marketing/app origins and
approved providers as the stronger production boundary.

## Remaining gaps requiring focused follow-up

1. **Real file and report lifecycle.** `uploads.py` returns raw storage paths
   instead of presigned download URLs. `ClientDocumentsTab` can fabricate storage
   paths without uploading a file. Upload/document delete endpoints contain
   unimplemented storage cleanup. Legacy dashboard-refresh and project report
   generation are unavailable. Prioritize a complete synthetic upload → durable
   worker → report file → authorized download → retention/delete acceptance test.
2. **Embedded dashboards.** `TableauEmbed.jsx` parses stored HTML and executes
   embedded script tags, including inline code, in the portal document. The project
   page also uses raw `dangerouslySetInnerHTML`. Replace with validated URLs and
   isolated/sandboxed embedding based on the real deployment requirements. Do not
   blindly strip scripts without validating supported Tableau integration.
3. **Errors/telemetry.** `ClientErrorReporter` sends raw message and stack text and
   private route paths to the backend. Review structured redaction and route-ID
   normalization. Confirm third-party marketing tags have no private egress by
   browser network capture, including soft navigation and reset/verify-email URLs.
4. **Backend integrations.** QuickBooks service methods for OAuth exchange/refresh,
   invoice/customer operations are NotImplemented. Do not present sync/billing
   controls as operational until a configured sandbox integration passes.
5. **Partner readiness.** Portal branding exists but marketing metadata, public
   domain, chat copy and contact details remain Mullen-specific. Co-branding is
   presentation, not tenancy. Verify per-partner hostname routing, cookies, CORS,
   logout, invite/reset links, embedding policy, tenant isolation and allowed
   external dashboard destinations before a partner rollout.
6. **Auth/session architecture.** Shells and pages repeatedly request sessions;
   several screens repeat unread-message calls and copy their own API handling.
   Centralize session/agency state and query caching, while preserving server-side
   RLS, MFA and role checks. Do not consolidate Cognito and legacy session auth
   without an explicit migration design.
7. **Claims/feature inventory.** EMS QA marketing describes policy RAG, self-tuning
   rules, imports and hosting guarantees. Some features live in a separate QA app
   and cannot be verified from this repo. Reconcile public claims with deployed
   feature flags and acceptance evidence. An empty dashboard configured for no
   project is a valid empty state, not automatically a broken link.
8. **Deployment/PHI gate.** A successful build or green CI does not prove live AWS
   account controls, BAA/provider coverage, schema migrations, queue delivery,
   reconciliation, backup restore or data isolation. Current live backend and AWS
   state were not inspected in this audit. Independently verify the active request
   path and complete synthetic rollout tests before changing ingestion flags.

## Organization and performance recommendations

The repo is viable as one application repository. More Git branches alone will
not organize the code. Use short-lived branches per reviewed change and keep
marketing, client portal, platform administration, analytics and QA domains clear.

The static audit identified 13 unreachable frontend modules, nine dependency
candidates and one backend service candidate (`saas_features.py`). These are
candidates, not proof that deletion is safe: offline tools and runtime imports
need review. Forecaster and synthetic QA fixtures are intentionally offline.
There are 39 maximal exact duplicate blocks (at least 12 meaningful lines).

Extract shared profile updates from backend `profiles.py`/`users.py`, data-upload
flows from admin/portal pages, account settings, year-over-year charts and document
formatters. Extract small domain services first; preserve endpoints and isolation
contracts. Move transport/error handling to a shared API module and domain APIs
under `src/lib/api/`. Keep route files as composition, session state in a provider,
and business calculations in domain modules.

Largest frontend modules:

| Module | Approximate lines |
| --- | ---: |
| EMSDashboard.jsx | 1,202 |
| DataExplorer.jsx | 1,094 |
| lib/api.js | 916 |
| portal/dashboard/page.jsx | 730 |
| admin/users/page.jsx | 664 |

Split dashboard panels and explorer tools, lazy-load chart/map panels, avoid
recomputing unchanged filters and consolidate duplicate API calls. Measure first:
LCP/INP/CLS on marketing pages, backend p50/p95 per endpoint, DB query count,
upload-to-snapshot time and portal interaction timings with synthetic tenants.
This review does not claim a measured production speed improvement.

## Validation

- Added `npm run audit:links`: AST-based check of literal JSX links/images/posters
  and navigation object links against public assets and route inventory, with
  service-slug validation and decoded asset names. Final result: 238 references,
  zero missing targets. Dynamic IDs, configuration-based destinations, anchors,
  external availability and endpoint semantics require separate checks.
- Local production HTTP checks confirmed Connect and Technology return 200,
  unknown service slugs return 404, portal/admin login carry noindex headers,
  and fresh private login responses contain no Google tag script. The link audit
  is also included in frontend CI.
- ESLint entire src: zero errors, 102 warnings after changes (103 baseline).
- Webpack production build completed successfully; TypeScript and all 95 generated
  pages completed. Default Turbopack build failed in Next's internal Google-font
  resolver; successful webpack build does not establish that default build is
  repaired. Keep the normal CI build as a separate required check.
  A subsequent build after the final navigation edit compiled, passed TypeScript,
  and generated all 95 pages, but failed cleaning `.next/export` with ENOTEMPTY.
  A clean-cache retry was stopped during Google Fonts network retries. Therefore
  the final committed revision still requires a complete CI production build.
- Four existing proxy regression scenarios passed.
- Ten assertions cover the private-route boundary, including similar public
  prefixes that must not be classified as private.
- Both PHI guard predicate test bodies executed and passed; production default
  remains false. Full middleware/request integration requires CI.
- Report function evaluated with isolated query doubles: owned project returns
  501 without add/commit; missing project returns 404. New database-backed endpoint
  tests are included for CI; they have not run locally.
- Python compileall and git diff --check passed.
- Authenticated user/admin/client/agency journeys, mobile visual testing, actual
  email delivery, QA imports, real invoices, payment and end-to-end analytics were
  not exercised. No live form was submitted and no patient data was used.

## Ordered next work

1. Review this branch and run normal CI, including database tests and default build.
2. Complete synthetic client/admin/QA acceptance flows against the intended AWS
   deployment, then reconcile raw data, snapshots, API responses and dashboards.
3. Fix real file downloads/report generation and safe embedding before partner use.
4. Centralize session/API state, remove verified dead dependencies and split the
   largest domain modules; measure speed before and after.
5. Repeat live link and browser-network checks after deployment. Restore brochure
   PDFs/demo video only when real approved assets exist.

Evidence files: `live-route-audit.json`, `outbound-and-service-links.json`,
`static-link-audit.json` in this directory. HTTP evidence captures the original
live deployment and therefore still shows assets corrected in this branch.
