d# DRX Help Center Reconstruction Runbook

This folder holds export, audit, rewritten docs, and publish logs for DRX help-center operations.

## Structure

- `raw/` live Featurebase exports and legacy seed snapshots
- `reviewed/` staging area for manual review
- `final/` production-ready markdown articles
- `changelog/` customer-facing changelog markdown
- `roadmap/` customer-facing roadmap markdown
- `reports/` audit, gap, strategy, and publish reports

## Required env

- `FEATUREBASE_API_KEY` (required for export/import scripts)
- Optional:
  - `FEATUREBASE_API_BASE` (default `https://do.featurebase.app/v2`)
  - `FEATUREBASE_VERSION` (default `2026-01-01.nova`)

## Commands

### Audit

- `pnpm docs:audit:features`
- `pnpm docs:audit:gaps`

### Export from Featurebase

- `pnpm featurebase:export:help-center`
- `pnpm featurebase:export:changelog`
- `pnpm featurebase:export:roadmap`

### Import to Featurebase

- `pnpm featurebase:import:help-center:dry`
- `pnpm featurebase:import:help-center`
- `pnpm featurebase:import:changelog:dry`
- `pnpm featurebase:import:changelog`
- `pnpm featurebase:import:roadmap:dry`
- `pnpm featurebase:import:roadmap`
- `pnpm featurebase:reorder:help-center:dry`
- `pnpm featurebase:reorder:help-center`

Note: current Featurebase API version does not accept an `order` field for help-center collection/article updates, so ordering changes are logged but not applied by API.

## Recommended release workflow

1. Run feature audit and gap checks.
2. Update `final/`, `changelog/`, and `roadmap/`.
3. Run dry-run imports first.
4. Run live imports.
5. Re-export from Featurebase and confirm IDs/slugs/states.
6. Update `reports/publish-results.md` with outcomes.
