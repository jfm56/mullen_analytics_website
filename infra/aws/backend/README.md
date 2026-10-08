# AWS backend production stack

This stack replaces Railway for the authenticated API and processing worker.
It is designed for a workload that may handle PHI, but deploying it does **not**
by itself establish HIPAA compliance or approve PHI ingestion.

## Architecture

- Public Application Load Balancer with TLS 1.2/1.3 and AWS WAF
- API and worker ECS Fargate services in private subnets across two AZs
- Multi-AZ, KMS-encrypted RDS PostgreSQL in isolated subnets
- KMS-encrypted S3 bucket for agency raw objects
- KMS-encrypted EFS access point for legacy uploads/reports that still use paths
- KMS-encrypted SQS queue and dead-letter queue for durable processing
- Secrets Manager injection; no static AWS access keys or database DSNs
- VPC endpoints for AWS service traffic, VPC Flow Logs, Container Insights
- CloudWatch alarms, encrypted SNS topic, RDS automated backups and AWS Backup
- Deletion protection on RDS, the load balancer and protected data resources

The public marketing site can remain on Vercel only if it does not receive,
maintain, proxy or log PHI. Pointing Vercel's server-side `/api/proxy/*` route at
this API keeps Vercel in the PHI request path; either execute a Vercel BAA or
move the authenticated portal frontend into the approved AWS boundary.

## Mandatory prerequisites

1. Confirm the AWS BAA covers the target account/organization.
2. Independently verify every selected AWS service is currently HIPAA eligible.
3. Use an encrypted, versioned S3 Terraform state bucket and DynamoDB lock table.
4. Confirm account root MFA, organization CloudTrail, GuardDuty, Security Hub,
   AWS Config, IAM Access Analyzer and centralized security alerting. These are
   account controls and intentionally are not created by this application stack.
5. Issue an ACM certificate for the API hostname.
6. Confirm the alarm mailbox and incident-response owner.
7. Do not place PHI, credentials, patient identifiers or complete DSNs in
   Terraform variables, state, tags, logs, queue messages or image layers.

## Two-stage deployment

Never cut DNS or migrate production data during the foundation apply.

### 1. Foundation

```bash
cp backend.hcl.example backend.hcl
cp terraform.tfvars.example terraform.tfvars
terraform init -backend-config=backend.hcl
terraform plan -out=foundation.tfplan
terraform apply foundation.tfplan
```

Keep these values during foundation creation:

```hcl
deploy_services      = false
start_services       = false
enable_phi_ingestion = false
```

Review the plan for the exact AWS account and region before applying. The stack
creates two NAT gateways and several interface endpoints for availability and
private AWS API traffic; these have ongoing cost.

### 2. Build and scan the application image

Build from the `backend/` directory using `Dockerfile.aws`. Tag the image with
the Git commit SHA, push it to the `ecr_repository_url` output, and review the
ECR enhanced/basic scan findings. Do not deploy `latest`.

Update the variables with the immutable image URI, ACM certificate, Cognito
identifiers and confirmed alarm mailbox, then set:

```hcl
deploy_services      = true
start_services       = false
enable_phi_ingestion = false
```

Run a new saved plan and apply it. Both services start with PHI writes blocked.

## Database migration

The service apply creates a one-off migration task definition but never runs it
automatically. Run that task in the private application subnets with the API
security group and wait for a successful exit. `scripts/run_migrations.py`
uses a PostgreSQL advisory lock and records a SHA-256 checksum for each applied
SQL migration. A changed historical migration fails closed.

After the migration task exits successfully, apply once more with
`start_services = true`. This ordering prevents API replicas from racing ahead
of the schema. Keep `enable_phi_ingestion = false` during all synthetic checks.

For an existing imported database, reconcile its schema with the migration
ledger in an isolated restore first. Do not blindly apply migration `001` over a
production dump.

## Required staging evidence before cutover

- API and worker tasks stable with zero crash loops
- `/health` succeeds through the load balancer
- SQL migrations `001` through `014` recorded with matching checksums
- synthetic upload reaches encrypted storage and the SQS worker
- retry test reaches the DLQ and triggers the alarm
- two synthetic agencies pass cross-tenant isolation tests
- raw → normalized → snapshot → API → dashboard reconciliation matches
- RDS and EFS backup restoration succeeds in an isolated target
- no request bodies, patient identifiers, tokens or DSNs appear in logs
- WAF, RDS, ECS, SQS and backup alarms reach an attended mailbox
- vulnerability scan and application penetration-test findings are resolved

Only after evidence review may `enable_phi_ingestion` change to `true`. Apply
that change before moving any real data, then perform a controlled migration and
reconciliation. DNS cutover is a separate, explicitly approved change.

## Rollback

Keep Railway restricted to synthetic/read-only operation during validation.
Before cutover, take verified database and file backups and record counts and
checksums. If AWS validation fails, stop the AWS services and investigate; do
not route PHI back through a provider without an executed BAA. DNS rollback is
not a compliant fallback unless the destination is independently approved.
