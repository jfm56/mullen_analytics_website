# Production system audit and analytics reconciliation

Audit date: 2026-10-08. Source: `c8dc4d0822910e5100718c7dbd98b92c09b098e4`.

## Status and scope

Completed: repository/deployment-evidence audit, data-path tracing, independent synthetic reconciliation. NOT completed: agency raw-data-to-live-dashboard reconciliation, authenticated production performance profiling, live AWS/account/configuration verification. No patient data accessed. No application behavior changed, infrastructure modified, sync initiated, production deployment, or feature activation performed.

The GitHub commit statuses report successful Vercel deployment at 13:20:33 UTC and Railway deployment at 13:21:37 UTC. User screenshot labels both production. This identifies the audited deployment candidate; it does not attest current runtime environment variables or data sources. The separate AWS infrastructure repository returned 404 through the connector and was not audited.

## Follow-up implementation on this branch

After the baseline audit, the branch adds a shared XML/CSV EMSCharts parser,
batched incident reconciliation, conservative partial-run watermark handling,
worker-owned database sessions, SQS/ECS dispatch, and database-enforced active
run/live snapshot invariants. These changes are code-only until reviewed and
verified; no AWS resource, production setting, DNS record, PHI source, or data
migration has been changed. See `docs/architecture/pipeline-worker.md` for the
AWS rollout gate and remaining legacy filesystem migration work.

## Architecture established from code

| Path | Source and processing | Dashboard |
|---|---|---|
| Legacy CSV portal | `data.py` writes uploads directly under the configured local uploads root -> `ems_cleaning_service.py` -> cleaned CSV plus compressed database copy -> `ems_analytics_service.py` -> EMSDashboardMetrics JSON | `portal/dashboard/page.jsx` calls legacy `dataUploads` endpoints through `/api/proxy` |
| Agency AWS pipeline | `emscharts.py` uses configured AWS S3 bucket/prefix -> validation/normalization -> agency-owned EMSIncident records -> analytics-v2 -> staged/validated/live snapshot | `/api/v1/agencies/.../emscharts` endpoints |
| Visitor analytics/outreach | `/api/proxy2` -> ONPREM_FASTAPI_URL, falling back to FASTAPI_URL | Admin visitor analytics; distinct from EMS operational analytics |

The repository contains multiple paths; the legacy portal does not automatically read agency S3 records. Its active upload handler writes through `pathlib` directly. The unused `storage_service.py` abstraction was removed in the subsequent dead-code cleanup. Actual database location is controlled by DATABASE_URL and cannot be inferred from code defaults. The proxy targets FASTAPI_URL. Railway configuration builds backend/Dockerfile and starts Uvicorn. A separate database-admin engine is used for provisioning; preserve runtime RLS and approved agency isolation.

## Reproduced reconciliation findings

Run `python backend/scripts/audit/reconcile.py`. Evidence: `synthetic-reconciliation.json`. Synthetic expected values are independent of production outputs and are not agency baselines.

| Priority | Finding | Evidence and consequence |
|---|---|---|
| High | Wrong unit for requested first-arriving metric | `_collapse_to_incidents` prefers earliest dispatch among responding rows. Two synthetic incidents have expected first-arriving dispatch-to-scene median 8.5 min, actual legacy value 14 min. |
| High | Missing arrival substitutes task duration | `compute_ems_metrics` falls back to dispatch -> clear for unit response series. Synthetic missing-arrival row produces 60-minute average response; expected unavailable. |
| High | Blank incident IDs collapse | Null IDs are converted into the same text value before deduplication. Three independent synthetic blank-ID records become one. |
| High | Forecast target differs from incident totals | Forecast daily series counts input rows, with no incident collapse in the predictive entry point. Synthetic three-unit dataset counts 3 versus 2 unique incidents. |
| High | Model evaluation protocols differ | Feature construction precedes chronological split. Subsequent test features use earlier actual test targets, while moving-average baseline forecasts recursively from the training cutoff. This can be valid for rolling one-day predictions, but cannot fairly rank against the recursive baseline or establish long-horizon accuracy. |
| High | Prediction intervals use refitted residuals | Winner object is refitted on all data, then `preds_test` is calculated using that same object, contaminating residuals used for intervals. Preserve out-of-sample residuals before refitting and validate interval coverage by horizon. |
| Medium | Metric definitions change across views | Legacy headline prefers enroute -> arrival (travel), units prefer dispatch -> arrival. Synthetic headline is 12 min versus requested first-arriving baseline 8.5. Both intervals are meaningful but must have explicit consistent labels and grains. |
| Medium | Refresh status can falsely imply real work | `dashboard_refresh.py` marks complete without ingestion/refresh implementation; registered in main.py. This is distinct from agency atomic snapshot refresh, which does perform calculations. |

Other code-review concerns: v2 call_volume and overall intervals are record-level, while first_arriving is a separate incident-level section; do not assume those represent the same denominator. First-arriving grouping uses incident_number alone, so repeated identifiers across years require source-specific review. Cleaning strips timezone offsets when serializing parsed dates and lacks an invalid-date exclusion ledger. The 600-minute duration cap is universal in legacy analytics, absent in v2; rules must be metric-specific and reconciled. Stacking uses ordinary cv=3 rather than a validated chronological stacking procedure. These require policy decisions and targeted examples before remediation.

## Performance evidence and limits

One unauthenticated external probe: homepage returned HTTP 200 in 12.273 seconds; Railway `/health` returned 200 with `healthy` in 3.266 seconds. These are single-client wall-clock samples, influenced by DNS/network/TLS and possible cold starts; they do not establish server latency, percentiles, user experience, or root cause. The health endpoint does not attest database or S3 reachability. No authenticated dashboard was accessed.

Synthetic 3,000-row local metrics execution took 0.0742 seconds in this environment. This does not benchmark production requests. It suggests measuring the complete network/database/model path before assuming basic descriptive calculations are the dominant delay.

Code candidates to profile: filtered dashboard CSV write/read round trip; CPU-bound predictive/model work called directly inside async handlers; unbounded process-local result cache and independent worker caches; whole-agency `.all()` metrics scans; proxy buffering and absent explicit upstream timeout. Maintain tenant-aware cache keys and permission checks. Background processing and saved versioned snapshots are candidates, not changes justified by measured production profiling yet.

## Ordered remediation and verification

1. Capture non-secret runtime configuration evidence: Vercel FASTAPI_URL and optional ONPREM_FASTAPI_URL hostnames; Railway deployed SHA, region, DATABASE_URL hostname/database name (never credentials), AUTH_MODE, AWS_REGION, AWS_S3_BUCKET, storage backend, volume mount, worker/memory settings; AWS dataset identity and last sync/snapshot IDs. Verify ownership and permitted environments.
2. Select one agency and explicit source version/date range. Preserve raw object version/checksum. Run within the authorized data environment; export only aggregate evidence or a genuinely de-identified fixture here. Keep synthetic and production results separate.
3. Agree grain: unique incidents versus unit responses; incident uniqueness key; timezone; emergency/IFT exclusions; missing/invalid timestamp treatment. Define dispatch-to-scene, turnout and travel separately. First-arriving requires earliest valid arrival, with explicit handling for missing dispatch and cancellations.
4. Independently calculate input/accepted/rejected/duplicate counts, incident and unit totals, eligible timed incidents, exclusions, mean/median/P90 and threshold percentages. Reconcile raw -> cleaned -> normalized -> snapshot -> API -> rendered values using identical filters. Counts should match exactly; numerical tolerance should follow display rounding.
5. Repair each proven defect on a separate reviewed branch with synthetic regression examples; preserve approved QA scoring, RLS, Super Admin, View-As and audit behavior. Reconcile again before promoting corrected metrics. Do not overwrite original datasets or silently replace historical metrics.
6. Re-evaluate forecasting at the intended horizon with consistent rolling cutoffs, recursive features where appropriate, equal baseline/model information, seasonal-naive and moving-average baselines, holdout MAE/RMSE and interval coverage. Model selection and final test evidence must be separated.
7. Profile cold/warm authenticated page/API/database timings with authorized synthetic tenant accounts, including concurrent requests, payload sizes, query counts and browser rendering. Set acceptance targets from that baseline; optimize only supported bottlenecks.

## Remaining blockers

No connected AWS/Railway/Vercel account tools or runtime credentials are available here. Production source records, source version, agency-specific snapshot/API outputs, authenticated browser timings, and runtime configurations were not provided. Therefore the end-to-end live reconciliation is OPEN, not passed. Account access or sanitized evidence is needed to complete it; do not paste passwords, access keys or complete DSNs.

Partner co-branding should share one validated analytics contract with backend-enforced agency membership. Its implementation is outside this audit. No approved architecture needs redesign solely because multiple data paths exist.
