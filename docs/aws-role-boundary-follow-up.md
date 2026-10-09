# AWS role-boundary release review — 2026-10-09

Base: release/aws-client-cutover at bb15fcd (PR #31; its checks passed before this change).
This supersedes the earlier role-boundary review draft. No AWS resources, live data,
service counts, frontend settings, or PHI gate were changed.

## Included corrections

- Preserve migrations 013–017 and 019 byte-for-byte. Add 018 for the dedicated
  app_platform role and per-command membership policies. Neither runtime role
  is SUPERUSER or BYPASSRLS; role memberships are stripped and checked.
- Add 020 to prevent ordinary app_user INSERT/UPDATE of users.platform_role.
  Changes require the table owner or app_platform. Normal registration with a
  null platform role remains allowed. This closes the path from forged database
  authorization records to the API's privileged platform connection.
- Require distinct credentials and validate API connections actually use app_user
  and app_platform. Initialize the platform pool lazily so worker imports do not
  require or receive the platform secret.
- Terraform creates a separate platform database secret and API execution role.
  API/migration tasks receive PLATFORM_DB_PASSWORD; the worker execution policy
  and worker container exclude it. Application task roles have no secret-reading
  permission. Extra secret mappings cannot override the platform environment keys.
- Register every core model before migration-runner grant provisioning, preserving
  the explicit table matrix. Restore QA grants when the complete QA schema exists.
- Keep password formatting server-side; preserve migration transactions/checksums.
  Remove database URL-prefix logging. API and worker startup validate before serving or polling the queue. They only
  read schema/security state; Cognito staging cannot enable DB_AUTO_PROVISION.
- Startup rejects unexpected policy names/commands, missing write predicates,
  incorrect connected roles, runtime-owned application tables, and a missing or
  disabled platform-role guard. Broader policy-expression checks remain heuristic.
- CI runs offline role regressions and fails on role-provisioning errors rather
  than treating those errors as successful skipped security tests.

## Verification here

- Thirteen offline role/configuration/model-registration regressions passed.
- Python compilation, workflow YAML parsing, and git diff whitespace checks passed.
- Full backend Pylint exited successfully (9.96/10); final changed-module lint
  exited successfully (9.95/10).
- Final Bandit scan: zero medium/high findings and zero scanner errors.
- Terraform formatting passed. Initialization downloaded signed providers, but
  validation then reported an AWS provider-cache checksum mismatch. No checksum
  check was bypassed, lock file changed, remote state accessed, or plan applied.
- PostgreSQL integration was NOT run locally: switching to an unprivileged OS
  account is unavailable. The complete synthetic PostgreSQL suite, the new guard
  behavior tests, and Terraform validation must pass on this patch in CI.
- Earlier source-session claims of 315 passing tests were not independently reproduced.

## Remaining production blockers

- Ordinary identity/agency context still uses application-asserted session settings.
  Arbitrary SQL as app_user can forge both a tenant and a known agency-admin actor,
  granting tenant reads and membership writes. Removing the platform bypass and
  protecting platform_role do not close that gap. Signed, database-verified context
  requires a separate implementation and integration review.
- Policy-expression validation checks content and expected command structure but
  does not prove equivalence to the canonical predicate. Password DDL must never
  be logged; PostgreSQL error context/SQL logging needs deployment-level review.
- Verify AWS account/BAA and approved frontend data boundary, immutable image commit,
  actual RDS migrations/grants, backup/restore, client inventory and every-client
  reconciliation before any real-data transfer. SBES migration remains unverified.

## Next operational steps

Apply this patch only to release/aws-client-cutover for PR #31 review and CI.
Keep the PR draft, ECS desired counts at zero, and PHI ingestion disabled.
Do not apply Terraform or run the AWS migration task from this review patch yet.
Once the remaining security work is complete, review a saved plan against the
existing account 224796773195/state with start_services=false. Deploy the matching
immutable image and updated secret wiring together; migrate and verify the database
before starting synthetic staging. A code merge does not migrate client data.

Status: reviewable code, NOT deployment approved or PHI-production-ready.
