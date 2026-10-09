# AWS migration and release checkpoint — 2026-10-09

Status: AWS STAGING INFRASTRUCTURE EXISTS; API/WORKER STOPPED; CLIENT DATA MIGRATION NOT VERIFIED.

## Verified release state

- GitHub main: `ed98bdda865b02eb6505aaff2980f1780effe667`, AWS preparation PR #29.
- PR #30 merged into `feat/aws-backend-migration` at `c2a9983`, not main.
- `fix/website-admin-review`: `060ed5d`; its tree matches the locally reviewed
  admin cleanup. It is not in main as of this checkpoint.
- The role-boundary follow-up is a local draft; do not deploy it on the strength
  of offline tests. Read `docs/aws-role-boundary-follow-up.md` in that draft.
- User's CloudShell account `681225014038` lists no ECS clusters or RDS instances
  in us-east-1/us-east-2. This is not an inventory of all AWS services/regions.
- The authorized desktop uses account `224796773195`. Its Terraform default
  workspace records the existing staging infrastructure in us-east-1. ECS
  cluster `mullen-analytics-staging` exists, and the same-named RDS instance is
  available. API and worker services both have desired/running counts of zero.
- API task revision 8 uses image tag `v6` by immutable digest, RDS, S3 storage,
  Cognito auth, and `PHI_INGESTION_ENABLED=false`. The image's source commit is
  not yet established. Recent migration logs show 001–014 already applied,
  015–016 being applied, then runtime-role/RLS provisioning. They do not verify
  017, successful client-data transfer, or SBES reconciliation.
- Draft PR #31 targets main from `release/aws-client-cutover` at `a61cf7a`.
  Frontend build and Terraform validation passed. Backend CI failed because
  its fresh test database lacked the prerequisite `app_user` role for 017.
  The workflow fix provisions a non-login test role without changing 017;
  a new CI run is still required to validate the remaining steps.
- A Railway backend has a Railway PostgreSQL DATABASE_URL. Vercel's saved secret
  FASTAPI_URL has not been independently read or correlated to that service.

## Establish the actual deployment workspace first

Run on the authorized Windows desktop, in the existing repository. Read-only:

```powershell
Set-Location "C:\Users\jmull\CascadeProjects\mullen_analytics_website"
git branch --show-current
git status --short
aws sts get-caller-identity --query Account --output text
Set-Location "infra\aws\backend"
terraform workspace show
terraform state list
```

Share only resource identifiers/statuses, never state contents, plan JSON,
tfvars, connection strings, tokens, or secret values. A state list can identify
resources previously deployed in another account/region. Do not reinitialize
or apply against a different state backend until this discrepancy is resolved.

## Target for existing and future clients

- API/worker: AWS ECS, immutable tested image.
- Users, memberships, file metadata, normalized analytics and QA records: RDS.
- Chart raw objects: the configured encrypted S3 bucket.
- Existing path-based uploads, processed files, reports and model artifacts:
  persistent AWS EFS mounted at the existing Terraform runtime paths.
- Temporary processing files may exist on ephemeral disk; durable client files
  must not depend on a desktop drive or container filesystem.
- Cognito and database profiles require a deliberate authentication migration;
  copying SQL users does not automatically create Cognito login identities.
- Vercel's authenticated proxy remains in the data path. Resolve the approved
  frontend/BAA boundary before routing real PHI through it.

## Execution order and evidence

1. Rotate the database credential exposed in a screenshot; keep updates private
   and verify the current backend still connects.
2. Use the verified desktop account and existing Terraform state; review the
   update plan and its cost/deletion actions. Do not create a duplicate stack.
3. Inventory every client using stable IDs, not display names: users/profiles,
   memberships, uploads, agency files, incidents, snapshots, QA decisions,
   exports, reports, logos, model artifacts and any remaining external stores.
   Record counts and date ranges without exporting client content into reports.
4. Resolve role-boundary draft blockers and run real PostgreSQL integration
   tests. Provision distinct platform/runtime credentials, wire Secrets Manager
   and ECS, validate ordinary-user isolation and authorized platform View-As.
5. Build/push a commit-tagged image; deploy foundation and migration task using
   the stack README. Never edit an already-applied migration or replay initial
   schema files blindly over an imported database.
6. Start synthetic staging only. Verify signup/login/MFA, two-agency isolation,
   S3/EFS persistence, worker queue/retry/DLQ, and dashboard reconciliation.
7. Take restorable source DB/file backups. Perform a rehearsed isolated restore.
   Pause writes for final transfer or use a validated replication procedure;
   otherwise new users and uploads can be missed between copy and cutover.
8. Transfer database and files inside the approved boundary. Reconcile EVERY
   client, including SBES: row counts, relationships, date ranges, totals,
   file checksums and retrievability; map old filesystem references to EFS.
   Preserve passwords/MFA/session semantics or explicitly migrate identities.
9. Release reviewed website/admin fixes through protected-main CI; confirm
   deployment commit IDs. Update frontend connection settings only after the
   AWS API is ready, then redeploy the frontend so it uses the new environment.
10. Verify a synthetic new user/upload appears only in AWS and survives service
    restart. Verify each existing client's authorized views and analytics.
    Keep source backup/read-only systems until the retention decision is made.

Do not mark the migration complete from infrastructure existence or SELECT 1.
The application health endpoint is diagnostics, not a migration certificate.
No live cutover, real-data transfer, AWS account mutation or PHI gate change was
performed while preparing this checkpoint.
