# Analytics remediation status

Prepared on `fix/analytics-reconciliation`, based on production commit c8dc4d08. No push, merge or deployment. QA, RLS, Cognito, Super Admin and AWS infrastructure are unchanged.

## Implemented

- Legacy incident selection now uses earliest parseable arrival, with dispatch used to order records lacking arrivals for volume only.
- Blank/null incident IDs stay as separate records.
- Unit response time requires dispatch and arrival; task duration no longer substitutes for response.
- Shared `compute_ems_metrics_frame` separates calculation from file loading; filter requests calculate directly in memory instead of a temporary CSV round trip.
- Predictive demand/forecasting count incidents; coverage and busy-time estimates retain unit-level data.
- Candidate model scoring uses recursive fixed-origin holdout prediction, matching the baseline protocol.
- Holdout residuals are captured before the winner is refitted on all data.
- EMSCharts ingestion accepts supported XML and normalized CSV payloads through one parser contract; malformed files and missing dedup IDs are counted as validation/rejection outcomes instead of being silently treated as XML.
- Sync reconciliation batches existing-incident lookups, keeps partial runs from advancing the incremental watermark, and uses agency-scoped uniqueness plus an atomic live-snapshot swap.
- Pipeline triggers now use worker-owned database sessions. `JOB_BACKEND=sqs` provides an identifier-only SQS/ECS worker boundary with retry-visible failures; the default background mode remains available for local/Railway operation.
- `013_emscharts_tables.sql` makes the EMSCharts tables explicit in the migration chain, and `014_pipeline_invariants.sql` adds race-safe one-active-run/live-snapshot constraints while normalizing duplicates before index creation. AWS worker setup and the explicit production rollout gate are documented in `docs/architecture/pipeline-worker.md`.

## Verification

`python backend/scripts/audit/test_reconciliation.py`: six synthetic regression tests pass. Covers first arrival, blank IDs, invalid arrival selection, missing-arrival unit duration, forecast incident grain and training-only holdout scoring/residuals.

`python backend/scripts/audit/reconcile.py`: before/after evidence recorded separately. The corrected first-arriving dispatch-to-scene median is 8.5; missing-arrival unit metrics are unavailable; blank-ID record count is 3; forecast incident count is 2. The headline deliberately remains enroute-to-arrival where available (6.5 in this fixture), with the interval label supplied by the API. This is distinct from dispatch-to-scene and still needs clearer presentation.

Modified Python files compile and git diff whitespace checks pass. The full application/database/QA suite was not run: local startup fixtures require PostgreSQL/application dependencies. No broad suite success is claimed. Run required CI suites against an isolated synthetic test database before merging.

## Still open

- Live raw-AWS -> cleaned -> database -> API -> rendered-dashboard reconciliation and stale stored metric regeneration.
- Authenticated production timings and measured performance targets; no production speedup is claimed.
- Repeated incident identifiers across years; explicit timezone and exclusion policy; source identity/version propagation.
- Stacking's chronological training procedure and interval coverage at monthly/long horizons. Fixed-origin validation is an improvement, not final model qualification.
- Legacy placeholder refresh route, headline presentation, cache invalidation on mapping changes, and invalid-date logging.
- Fuller module/navigation organization, partner branding, and the remaining AWS storage/compute migration. The application job boundary is in place, but no AWS resources or production settings have been changed.

Do not merge until CI and synthetic staging review are complete; main auto-deploys. Recalculate saved legacy metrics deliberately after deployment, preserving old evidence and checking agency-specific reconciliation. No stored metrics have been changed by this code-only work.

## Additional repairs and partner preparation

- Predictive cache includes column mapping configuration.
- Main API proxy has a 60-second upstream timeout and rejects cross-origin redirects before forwarding session cookies. Two synthetic proxy regression scenarios pass. Proxy2 remains a separate review item.
- Legacy refresh trigger/retry return 501 instead of claiming a refresh was queued; fake-success worker removed. Database-backed route verification remains for CI.
- Portal/login/MFA branding uses centralized public deployment configuration. Partner domain setup and authenticated isolation acceptance remain open; no iframe support or runtime host-based brand selection is claimed.
- Next.js production build passes. Targeted ESLint has zero errors and three existing warnings (unused catch variables and effect-state update). Six analytics regression tests still pass.
- See docs/partner-deployment.md and docs/code-organization.md.
