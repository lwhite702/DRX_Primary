# Featurebase Export Index

Generated: 2026-04-03 (America/New_York)

## Export method

- Source of truth for app behavior: DRX codebase (`apps/app`).
- Featurebase API schema source: Featurebase MCP (`Featurebase API` docs, version `2026-01-01.nova`).
- Live content export attempt path:
  - `GET /v2/help_center/collections`
  - `GET /v2/help_center/articles?state=all&limit=100`
  - `GET /v2/changelogs?state=all&limit=100`
  - Roadmap content via posts/boards model (`/v2/boards`, `/v2/posts`) if configured.

## Authentication status

- Local env files do not include a persisted `FEATUREBASE_API_KEY`.
- A valid API key was provided at execution time and used for live export/import.
- Existing repo sync script (`apps/app/scripts/sync-help-center.ts`) remains compatible with bearer API key flow.

## Extracted content snapshots used for reconstruction

### Live Featurebase export (executed)

- Collections exported: **14**
- Help center articles exported: **16**
- Changelogs exported: **3**
- Roadmap/posts exported: **3**

Raw live exports:

- `docs/help-center-export/raw/featurebase-collections.json`
- `docs/help-center-export/raw/featurebase-articles.json`
- `docs/help-center-export/raw/featurebase-changelogs.json`
- `docs/help-center-export/raw/featurebase-boards.json`
- `docs/help-center-export/raw/featurebase-posts.json`

### In-repo legacy baseline (used for migration context)

- `apps/app/scripts/help-center-data.ts`
- Total seeded articles: **50**
- Seed categories:
  - `getting-started` (8)
  - `pos` (9)
  - `inventory` (12)
  - `products` (8)
  - `customers` (4)
  - `credit` (5)
  - `roles` (3)
  - `privacy` (2)

## Raw export files generated

- `docs/help-center-export/raw/help-center-seed-index.md`
- `docs/help-center-export/raw/changelog-seed.md`
- `docs/help-center-export/raw/roadmap-seed.md`

## Notes

- This index separates:
  - exported live Featurebase content,
  - and legacy in-repo seed content.
- Publish/import outcomes are recorded in:
  - `docs/help-center-export/reports/publish-results.md`
- Publish and re-export verification results are logged in:
  - `docs/help-center-export/reports/publish-results.md`
