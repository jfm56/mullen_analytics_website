-- Enforce the state invariants relied on by the worker and live dashboard.
-- Existing duplicate rows are normalized before the unique partial indexes are
-- created so this migration is safe on databases that predate the constraints.

WITH ranked AS (
    SELECT id,
           ROW_NUMBER() OVER (
               PARTITION BY agency_id
               ORDER BY created_at DESC NULLS LAST, id DESC
           ) AS rn
    FROM pipeline_runs
    WHERE status IN ('queued', 'running')
)
UPDATE pipeline_runs p
SET status = 'failed',
    completed_at = COALESCE(completed_at, CURRENT_TIMESTAMP),
    error_message = COALESCE(error_message, 'Superseded by a newer active pipeline run during invariant migration.')
FROM ranked r
WHERE p.id = r.id AND r.rn > 1;

WITH ranked AS (
    SELECT id,
           ROW_NUMBER() OVER (
               PARTITION BY agency_id
               ORDER BY computed_at DESC NULLS LAST, id DESC
           ) AS rn
    FROM ems_analytics_snapshots
    WHERE status = 'live'
)
UPDATE ems_analytics_snapshots s
SET status = 'superseded'
FROM ranked r
WHERE s.id = r.id AND r.rn > 1;

CREATE UNIQUE INDEX IF NOT EXISTS uq_pipeline_runs_active_agency
    ON pipeline_runs (agency_id)
    WHERE status IN ('queued', 'running');

WITH ranked AS (
    SELECT id,
           ROW_NUMBER() OVER (
               PARTITION BY agency_id
               ORDER BY started_at DESC NULLS LAST, id DESC
           ) AS rn
    FROM sync_runs
    WHERE final_status = 'running'
)
UPDATE sync_runs s
SET final_status = 'failed',
    ended_at = COALESCE(ended_at, CURRENT_TIMESTAMP),
    error = COALESCE(error, 'Superseded by a newer active sync during invariant migration.')
FROM ranked r
WHERE s.id = r.id AND r.rn > 1;

CREATE UNIQUE INDEX IF NOT EXISTS uq_sync_runs_active_agency
    ON sync_runs (agency_id)
    WHERE final_status = 'running';

CREATE UNIQUE INDEX IF NOT EXISTS uq_ems_analytics_live_agency
    ON ems_analytics_snapshots (agency_id)
    WHERE status = 'live';
