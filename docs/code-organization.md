# Code organization and next repairs

Keep domain modules distinct: legacy CSV analytics, normalized agency analytics, QA scoring, public visitor analytics/outreach, and partner presentation. Both analytics paths need a common documented metric contract before consolidation; do not merge unrelated models/authentication systems blindly.

Implemented boundary: `compute_ems_metrics_frame` accepts a DataFrame and computes metrics without storage access. `compute_ems_metrics` is the CSV adapter. Filter calculations call the in-memory boundary. Portal presentation reads one public brand configuration. Predictive cache keys include column mappings. API proxy redirect handling rejects another origin before forwarding credentials and uses a 60-second overall upstream timeout.

The processing boundary is now explicit as well: API routers create durable
state, `services/jobs.py` dispatches metadata-only jobs, and
`backend/worker.py` owns long-running database sessions when SQS/ECS is enabled.
`services/emscharts/pipeline.py` is the single XML/CSV normalization and
reconciliation path, while `014_pipeline_invariants.sql` protects active-run
and live-snapshot state at the database level. Migrations `013_emscharts_tables.sql`
and `014_pipeline_invariants.sql` make that dependency explicit for clean
database provisioning.

Next priorities:
1. Formalize versioned metric definitions, source checksums and exclusion counts before replacing stored snapshots.
2. Move the remaining legacy filesystem/report artifacts behind the durable task/result interface after production timing measurements; the SQS/ECS boundary now exists for the processing jobs.
3. Extract common proxy request/response handling for proxy and proxy2, preserving their different origins and authorization behavior. Proxy2 still requires equivalent redirect review.
4. Split oversized data.py by uploads, cleaning, dashboards, comparisons and insights; keep route paths and dependencies stable. Extract services first, then routers with regression coverage.
5. Split EMSDashboard into interval, volume, quality and unit sections sharing formatters; label travel versus dispatch-to-scene explicitly.
6. Implement the legacy refresh job adapter: trigger/retry now return 501 without mutating upload state; the fake-success worker has been removed.
7. Validate chronological stacking, multi-year incident IDs, missing dates, timezone conversion and long-horizon uncertainty.

Current changes do not establish production latency improvements, complete runtime partner routing, migrate AWS hosting or enable production patient-data use.
