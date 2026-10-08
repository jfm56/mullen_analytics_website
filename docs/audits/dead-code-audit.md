# Dead-code audit

Date: 2026-10-08  
Branch: `fix/analytics-reconciliation`  
Starting commit: `e4977de`

## Result

This is a conservative static audit. No application code was deleted. Next.js
files under `src/app` and the FastAPI `app.main` module were treated as production
entry points. Static imports were followed from those roots, then the candidates
were checked with repository-wide searches and framework conventions.

Run the repeatable inventory with:

```bash
npm run audit:dead-code
```

Static reachability does not prove that deletion is safe. Dynamic imports,
external API consumers, one-off administrative scripts, and planned but unwired
features require manual review.

## High-confidence removals completed

| Candidate | Evidence | Result |
|---|---|---|
| `src/app/admin/clients/[id]/page.jsx.old` | Tracked 486-line backup file; Next.js does not execute `.old` files; current `page.jsx` is different and active | Removed |
| `src/lib/email.js` | Four-line placeholder; no imports or callers | Removed |
| `src/lib/supabaseAdmin.js` | Mock compatibility module; no imports or callers | Removed |
| `src/data/testimonials.json` | No imports; the active site does not render it | Removed |
| `backend/app/services/storage_service.py` | No production, test, or script imports; superseded by `services/storage.py` and direct upload handling | Removed; audit documentation corrected |

## Unreachable frontend feature code — product decision required

These files have no reachable static import from the current Next.js app. They
may represent abandoned UI, but several are complete features or reusable
components, so they should be approved as a group before deletion.

- `src/components/HeroSection.jsx`
- `src/components/ResponseTimeRisk.jsx`
- `src/components/SectionHeader.jsx`
- `src/components/ServiceCard.jsx`
- `src/components/TestimonialCard.jsx`
- `src/components/ui/ConfirmDialog.jsx`
- `src/components/ui/EmptyState.jsx`
- `src/components/ui/FileUploadDropzone.jsx`
- `src/components/ui/PriorityBadge.jsx`
- `src/components/ui/QuickActionButton.jsx`
- `src/hooks/useLastLoginTracking.js`
- `src/hooks/useUnreadMessagesCount.js`
- `src/lib/nfpaStandards.js`

Important exceptions:

- `ResponseTimeRisk.jsx` is not mounted, but its backend endpoint is registered.
  Decide whether the feature should return to the dashboard before deleting it.
- `nfpaStandards.js` is not imported, while separate NFPA calculations exist in
  the backend. Removing the unused frontend copy would reduce conflicting
  definitions, but the backend definitions themselves need a separate clinical/
  standards validation rather than a dead-code decision.

## Backend modules outside the production graph

| Module | Classification |
|---|---|
| `backend/app/services/storage_service.py` | Removed in the high-confidence cleanup |
| `backend/app/services/saas_features.py` | Placeholder/roadmap code, not runtime code; move the roadmap notes to documentation or wire a single feature-gate implementation before deleting |
| `backend/app/services/emscharts/forecaster.py` | Retain: explicitly validation-gated Forecaster v2 |
| `backend/app/services/emscs_qa/synthetic_cases.py` | Retain: used by offline validation and demo-seeding scripts |

Python package `__init__.py` files are intentionally excluded from candidate
counts because they can be package markers or registration surfaces.

## Unused declarations inside active files

ESLint reports 72 unused imports, variables, functions, or parameters across 40
files. These are smaller than whole dead modules, but they add noise and can hide
real mistakes. Examples include unused chart helpers in `DataExplorer.jsx`,
unused imports in multiple admin pages, and unused values on the portal dashboard.

Recommended handling:

1. Remove only declarations reported by ESLint, in small batches.
2. Run `npm run lint` and `npm run build` after each batch.
3. Treat unused callback parameters separately; they may reveal an incomplete UI
   contract rather than disposable code.

## Dependency candidates

The reachable frontend graph has no static imports from these declared runtime
dependencies:

- `@supabase/supabase-js`
- `@visx/axis`
- `@visx/event`
- `@visx/grid`
- `@visx/group`
- `@visx/scale`
- `@visx/shape`
- `@visx/tooltip`
- `d3-array`

The installed folders total roughly 11.5 MB locally. Removing them primarily
reduces install time and dependency/security surface; it will not materially
speed pages because unreachable packages are not included in the production
bundle. Keep `react-dom`, which Next.js uses even though application source does
not import it directly.

## Safe removal sequence

1. ✅ Delete the `.old` page and four high-confidence dead modules/data files.
2. Remove the nine dependency candidates with the package manager so both
   `package.json` and `package-lock.json` stay synchronized.
3. Clean the 72 unused declarations in focused batches.
4. Decide whether the unmounted response-risk/NFPA UI should be restored or
   removed.
5. Before deleting any registered API route, use production request logs for at
   least one normal reporting cycle; frontend searches cannot detect partner or
   direct API consumers.
6. Require lint, production build, backend tests, and a synthetic portal smoke
   test before merging. Because `main` auto-deploys, do not merge a cleanup PR
   until those checks are green.

## High-confidence cleanup verification

Completed locally on `fix/analytics-reconciliation` without pushing or deploying:

- Repeatable audit: 13 unreachable frontend files, 9 dependency candidates,
  0 ignored backup artifacts, and 1 backend review candidate (`saas_features.py`).
- The two intentional modules remain protected: Forecaster v2 and synthetic QA fixtures.
- Six synthetic analytics reconciliation tests pass.
- Two proxy redirect/credential regression scenarios pass.
- Next.js production build passes all 95 routes.

The remaining candidates require separate product or dependency decisions. No
dependency, registered API route, Forecaster v2 code, QA fixture, or live data was
removed in this cleanup.
