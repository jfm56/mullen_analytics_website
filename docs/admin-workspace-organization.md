# Admin workspace organization

The admin overview and navigation are organized around existing workflows. This
change does not change backend permissions, RLS, MFA, agency switching, View-As,
QA scoring, billing or data processing. The platform layout's super-admin gate
remains unchanged. The new platform link is labelled as requiring that role.

## Navigation

- Overview: cross-client totals and outstanding work.
- Client work: clients, projects, messages and invoices.
- Data & analytics: uploads, datasets/year comparisons, analytics workspace,
  explorer, mapping and QA review.
- Website activity: visitor analytics and tool usage, distinct from client data.
- Administration: users, monitoring, issues, audit, settings and platform admin.

Shared configuration in `src/lib/adminNavigation.mjs` supplies destinations and
labels. The longest matching route selects one active link, so a dataset page
no longer selects both Uploads and Datasets. Known route prefixes supply titles;
breadcrumbs avoid links to nonexistent intermediate paths and raw identifiers.
Desktop navigation scrolls independently. Small screens use a native expandable
navigation menu, with labelled links and current-page state. Desktop collapsed
links retain accessible names. The account menu supports Escape/focus dismissal.

## Overview

Totals and attention counters are separate. Client issues appear before upload
history. Four quick actions replace the nine repeated shortcuts. The apparent
pipeline stepper is replaced with workflow links: aggregate upload counts cannot
prove individual processing stages completed. Initial loading/errors do not show
fabricated zero-count success states. Refresh errors retain the last snapshot and
show its timestamp. Unknown environments are no longer labelled Local.

The API's `dashboards_ready` field counts CLEANED uploads, so the UI labels it
Cleaned Uploads. Reported service status explicitly identifies its source and is
not an end-to-end health check. The API still contains fallback counts and some
hardcoded health fields; telemetry semantics need a separate backend change.

`/admin/dashboard` is now an analytics workspace linking to existing functional
routes rather than a placeholder. Upload-level analytics links open their actual
explorer instead of passing an unused query to the old placeholder.

## Verification and limits

- Navigation assertions cover all 19 destinations, nested datasets/explorer,
  platform subpage titles and similar-prefix collisions.
- Static link audit covers `.mjs` configuration as well as JSX/TS files:
  247 references checked, zero missing targets.
- Targeted admin/component lint: no errors; four existing warnings in the broader
  component set (including the pre-existing shell effect and unused tab props).
- Webpack production build passed compilation, TypeScript and all 95 pages.
- No authenticated production session, real client data or mobile browser visual
  acceptance test was performed. Review desktop/mobile with a synthetic admin
  account before deploying. Normal CI/default Turbopack build remains required.

This branch builds on the earlier full-platform audit fixes. The combined patch
contains the website and admin changes reconciled onto AWS/security merge
`c2a9983` on `feat/aws-backend-migration`. Both commits applied without conflicts;
frontend source matches the previously tested version. Apply the updated patch
once on a clean review branch based on that merge or a compatible descendant.
The changes have not been deployed.
