# Repetitive-code audit

Date: 2026-10-08  
Branch: `fix/analytics-reconciliation`  
Scope: `src/**/*.{js,jsx,ts,tsx}` and `backend/app/**/*.py`

## Result

The initial repeatable exact-block scan found **63 maximal duplicate blocks** containing
at least 12 meaningful lines. Whitespace, blank lines and comment-only lines are
ignored. Run it with:

```bash
npm run audit:duplicates
```

After the safe consolidation work below, the same scan finds **39 blocks** (a
reduction of 24, or 38%). This is a conservative locator, not an automatic refactoring tool. Similar domain
logic can escape an exact scan, while framework boilerplate can be intentionally
repeated.

## Remediation completed

- Both API route surfaces now use one hardened proxy core, with regression cases
  for each route prefix and both relative and cross-host redirects.
- Admin and portal data-explorer pages now use one policy-driven presentation
  component while backend authorization remains authoritative.
- Biomedical, healthcare and first-responder pages now share hero, value-point,
  service, payoff and final-CTA components. Their copy, metadata, styling
  differences and healthcare-only secure-AI section remain explicit.
- The unused legacy EMSCharts `compute_metrics` implementation was removed;
  the active versioned analytics implementation remains unchanged.

## Ranked consolidation opportunities

| Priority | Area | Evidence | Recommendation |
|---|---|---|---|
| Done | Next.js API proxies | `proxy` and `proxy2` repeated method exports, body handling, cookie forwarding, redirect handling and response construction. Proxy2 had drifted from the main proxy's timeout and cross-origin redirect guard. | Implemented one tested `createApiProxy` core with thin route adapters and route-specific environment fallback. |
| Done | Industry marketing pages | Biomedical, healthcare and first-responder pages shared multiple exact blocks for value points, service cards, payoff sections and final CTAs. | Added data-driven presentation sections while keeping page-specific content, metadata and special inserts explicit. |
| Done | Admin/portal data explorer routes | The two pages were nearly identical; differences were access check, back link, error destination and `isAdmin`. | Added a shared route component with fixed route policies. Backend authorization remains authoritative. |
| P1 | Upload/data management screens | Admin data, portal data and portal uploads repeat fetch wrappers, upload validation, progress/result panels and file details in blocks of 12–24 lines. Together they exceed 1,390 lines. | Extract low-level upload form, accepted-file display and cleaning-result components first. Do not combine admin and client authorization or endpoints into one client-controlled switch. |
| P2 | User/profile schemas and CRUD | `users.py` and `profiles.py` contain a 32-line exact profile schema block and similar list/get/update handling. | Move shared response/update field definitions and serialization helpers into a schema module. Keep admin-only user lifecycle and self-profile authorization as separate route functions. |
| Done | EMSCharts metrics | `emscharts/pipeline.py:compute_metrics` repeated a subset of `emscharts/analytics.py:compute_metrics_v2`; repository search found no caller for the older function. | Removed the unused legacy helper after the reconciliation regression suite passed. |
| P2 | Emergency/IFT outlooks | Exact duplication is modest (16 lines), but both services repeat history-span, weekday denominator, hourly distribution and seasonal forecast mechanics. | Extract tested time-pattern utilities only. Keep classification, applicability thresholds and clinical/business interpretations in their separate services. |
| P3 | Repeated UI primitives | Settings pages, client tabs, dashboard pages and hotspot/risk cards repeat loading shells, form grids, cards and empty/error states. | Prefer small shared primitives after the P0/P1 work. Avoid a generic mega-component whose flags reproduce each page's entire logic. |

## Highest-risk current defect revealed by duplication

The highest-risk defect found by this audit has been remediated. Both proxy route
surfaces now apply the same timeout, redirect limit and same-host check before
preserving session cookies. Their different upstream environment configuration
remains in the thin route adapters.

## Patterns that should remain separate

- Backend agency authorization checks may look repetitive, but removing visible
  route-level checks without a single proven dependency can weaken RLS boundaries.
- Admin and portal routes must not trust a frontend `isAdmin` or partner-brand flag.
- Legacy CSV analytics and normalized agency analytics should share a metric
  contract before sharing implementations; they currently have different data
  grains and storage paths.
- QA deterministic scoring, Forecaster v2 and synthetic validation fixtures are
  outside this refactor unless their existing gates and evidence are preserved.

## Safe refactoring sequence

1. Extract upload UI primitives without changing endpoints or authorization.
2. Consolidate schemas/helpers in the Python routers without merging their
   different authorization rules.
3. Extract narrow EMS forecast utilities only after adding service-specific tests.
4. Re-run dead-code and duplicate scans; lint, build, analytics/proxy tests, and
   isolated database tests before merging. `main` auto-deploys, so keep this work
   on reviewed branches.

## Scanner limits

The audit detects exact normalized lines only. It does not identify renamed
variables, equivalent algorithms written differently, dynamically generated code
or duplication inside strings. Both the initial 63-block count and current
39-block count overlap: one repeated page
section can generate entries across several file pairs. It should not be used as
a percentage-of-code metric.
