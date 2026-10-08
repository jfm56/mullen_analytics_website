# Durable pipeline worker boundary

The API and the processing worker now share one job contract. This keeps the
local/Railway fallback usable while providing an AWS deployment path that does
not run CPU-heavy cleaning, reconciliation, or forecasting in the request
process.

## Job flow

1. An authorized API request creates the run/upload record and commits its
   state before dispatching work.
2. With `JOB_BACKEND=background` (the default), the API schedules the worker-
   owned `SessionLocal` task after the response is accepted.
3. With `JOB_BACKEND=sqs`, the API sends a small metadata-only message to
   `PIPELINE_QUEUE_URL`. Raw files stay in their configured storage system.
4. An ECS service runs `python -m worker`, processes the message, and deletes
   it only after the job returns successfully. Failed worker jobs remain
   visible to SQS retry/DLQ policy.

Supported job types are `agency_pipeline`, `legacy_upload_process`, and
`emscharts_sync`.

## AWS runtime settings

Set these on both the API task and worker task, using the same deployment
environment:

| Setting | Required | Purpose |
| --- | --- | --- |
| `JOB_BACKEND` | yes | `sqs` on AWS; leave `background` for local/Railway fallback |
| `PIPELINE_QUEUE_URL` | yes for SQS | Main queue URL |
| `AWS_REGION` | yes | Region for S3 and SQS clients |
| `AWS_S3_BUCKET` | yes for EMSCharts | KMS-encrypted raw object bucket |
| `SQS_ENDPOINT_URL` | no | LocalStack/dev only; blank uses AWS |
| `JOB_VISIBILITY_TIMEOUT_SECONDS` | yes | Must exceed the longest expected job or be extended by the worker |
| `DATA_STORAGE_ROOT` / `DATA_UPLOADS_ROOT` | legacy only | The legacy pipeline still uses filesystem paths; migrate those paths to S3 before enabling those job types in a multi-task deployment |

The worker image is the same `backend/Dockerfile.aws` image with an ECS command
override of `python -m worker`. Give the API task `sqs:SendMessage`, S3 access
limited to the agency raw prefix, and give the worker task receive/delete plus
the same S3 and database permissions. Store database credentials and any
source-system credentials in Secrets Manager or the task secret mechanism; do
not put them in queue messages.

## Invariants and retries

- PostgreSQL partial unique indexes allow only one queued/running legacy
  pipeline per agency, one running EMSCharts sync per agency, and one live
  analytics snapshot per agency.
- `backend/migrations/014_pipeline_invariants.sql` normalizes pre-existing
  duplicates before creating those indexes.
- EMSCharts syncs are idempotent on `(agency_id, source_record_id)` and only a
  fully clean run advances the incremental watermark. A partial run remains
  visible and is eligible for review/retry.
- Analytics uses a staged/validated snapshot swap, so a failed refresh keeps
  the last known-good live snapshot.
- Do not lower the queue visibility timeout below the longest measured job.
  Add a heartbeat/visibility extension before introducing jobs that can exceed
  that bound.

## Rollout gate

This repository change adds the application boundary; it does not create AWS
queues, ECS services, IAM roles, KMS keys, database migrations, DNS records, or
production data movement. Before enabling `JOB_BACKEND=sqs` in production:

1. Apply migrations `001` through `014` to an isolated staging database.
2. Build and scan `Dockerfile.aws`; start one API task and one worker task.
3. Use synthetic agencies to verify enqueue, retry/DLQ, duplicate suppression,
   live snapshot atomicity, and agency isolation.
4. Compare raw-object, run, snapshot, API, and rendered-dashboard counts for a
   selected fixture.
5. Capture the queue, task-definition, IAM, and migration run IDs for review.
6. Obtain explicit approval before changing production environment variables,
   enabling PHI ingestion, or starting an AWS data migration.
