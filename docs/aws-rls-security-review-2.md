# Exported security review and follow-up

The supplied format-patch identifies source commit `a165709`. Its exporting session
reported 315 passing synthetic PostgreSQL tests and clean Bandit results. Those
results are historical claims, not results independently reproduced in this workspace.

The imported change introduces a dedicated `app_platform` database role, separate
Super Admin sessions, per-command membership policies, and startup validation.
The follow-up changes and outstanding blockers are recorded in
[aws-role-boundary-follow-up.md](aws-role-boundary-follow-up.md).

Do not use the original patch to rewrite an already-applied migration 017.
Do not label this change PHI-production-ready or deploy it from the reported counts.
