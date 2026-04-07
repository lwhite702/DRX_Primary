# DRX Publish Results

Generated: 2026-04-03 (America/New_York)

## Summary

- Help center collections: 14 created
- Help center articles: 16 created (all live)
- Changelog entries: 3 created and published live
- Roadmap items (Feature Request board posts): 3 created

## Help center collections

| Item title | Item type | Result | Destination ID/slug | Notes |
|---|---|---|---|---|
| Getting Started | collection | created | `2241034` | New collection |
| Dashboard | collection | created | `1636653` | New collection |
| Quick POS | collection | created | `0659914` | New collection |
| Sales | collection | created | `5595577` | New collection |
| Inventory | collection | created | `5902160` | New collection |
| Customers | collection | created | `7112199` | New collection |
| Front / Balances | collection | created | `7752792` | New collection |
| Reports | collection | created | `5089813` | New collection |
| Roles and Permissions | collection | created | `3562121` | New collection |
| Settings | collection | created | `6854042` | New collection |
| Privacy and Security | collection | created | `9474440` | New collection |
| DRX Intelligence | collection | created | `3312590` | New collection |
| Troubleshooting | collection | created | `5925303` | New collection |
| Admin Tools | collection | created | `0152347` | New collection |

## Help center articles

| Item title | Item type | Result | Destination ID/slug | Notes |
|---|---|---|---|---|
| Getting Started: Your First Week in DRX | article | created | `8714259` / `8714259-getting-started-your-first-week-in-drx` | Live |
| Dashboard: Daily Check in 2 Minutes | article | created | `3509274` / `3509274-dashboard-daily-check-in-2-minutes` | Live |
| Quick POS: Run a Sale Fast | article | created | `0437126` / `0437126-quick-pos-run-a-sale-fast` | Live |
| Sales History and Receipt Checks | article | created | `7021669` / `7021669-sales-history-and-receipt-checks` | Live |
| Inventory: Manage Stock Without Guessing | article | created | `3332319` / `3332319-inventory-manage-stock-without-guessing` | Live |
| Inventory Audit: Fix Count Problems Fast | article | created | `9933421` / `9933421-inventory-audit-fix-count-problems-fast` | Live |
| Customers: Profiles and History | article | created | `5915437` / `5915437-customers-profiles-and-history` | Live |
| Front / Balances: Credit and Payment Workflow | article | created | `7032351` / `7032351-front-balances-credit-and-payment-workflow` | Live |
| Reports and Operations Insights | article | created | `7196078` / `7196078-reports-and-operations-insights` | Live |
| Roles and Permissions: Keep Access Tight | article | created | `8545428` / `8545428-roles-and-permissions-keep-access-tight` | Live |
| Settings and Aliases: Keep Workflows Clean | article | created | `2928800` / `2928800-settings-and-aliases-keep-workflows-clean` | Live |
| Privacy and Security: Daily Controls + RTBF | article | created | `3325200` / `3325200-privacy-and-security-daily-controls-rtbf` | Live |
| DRX Intelligence: Using AI Support Features | article | created | `7834199` / `7834199-drx-intelligence-using-ai-support-features` | Live |
| Workspaces and Tenant Context | article | created | `4751642` / `4751642-workspaces-and-tenant-context` | Live |
| Troubleshooting: Fast Fixes First | article | created | `2575724` / `2575724-troubleshooting-fast-fixes-first` | Live |
| Admin Tools Overview | article | created | `6950478` / `6950478-admin-tools-overview` | Live |

## Changelog

| Item title | Item type | Result | Destination ID/slug | Notes |
|---|---|---|---|---|
| v0.5.4: Help Center and POS Flow Quality Updates | changelog | created + published | `69cf49c92ff26b229bdcff90` / `v054-help-center-and-pos-flow-quality-updates` | Live URL: `https://deelrx.featurebase.app/en/changelog/v054-help-center-and-pos-flow-quality-updates` |
| v0.5.3: Route Guard and Operations Stability Improvements | changelog | created + published | `69cf49cb4d46f8992fce3aef` / `v053-route-guard-and-operations-stability-improvements` | Live URL: `https://deelrx.featurebase.app/en/changelog/v053-route-guard-and-operations-stability-improvements` |
| v0.5.0: Major DRX App Surface Milestone | changelog | created + published | `69cf49cc2dfafafa9e08d513` / `v050-major-drx-app-surface-milestone` | Live URL: `https://deelrx.featurebase.app/en/changelog/v050-major-drx-app-surface-milestone` |

## Roadmap

| Item title | Item type | Result | Destination ID/slug | Notes |
|---|---|---|---|---|
| Now: Quick POS flow hardening | roadmap post | created | `69cf49ccf76e6ed9d00f8c8b` | Board `Feature Request` (`69cf42dd741c82c3d7b9269e`) |
| Next: Reporting and insights depth | roadmap post | created | `69cf49cc3677ea1c9259d291` | Board `Feature Request` (`69cf42dd741c82c3d7b9269e`) |
| Later: Extended privacy automation | roadmap post | created | `69cf49cd3677ea1c9259d2bb` | Board `Feature Request` (`69cf42dd741c82c3d7b9269e`) |

## Skipped items

- Help center collection/article display order updates were skipped by API constraint (details below).

## Failures and exact error details

These errors were encountered during initial publish attempts and then resolved:

1. Changelog publish payload mismatch:
   - Error: `Validation error: body: Unrecognized key(s) in object: 'locale', 'sendEmailNotification'`
   - Fix: Switched to supported keys `sendEmail` and `locales`.
2. Changelog state patch misuse:
   - Error: `Validation error: body: Unrecognized key(s) in object: 'state'`
   - Fix: Used dedicated publish endpoint `POST /v2/changelogs/{id}/publish`.
3. Script env validation:
   - Error: `Missing FEATUREBASE_API_KEY in environment.`
   - Fix: Passed API key as runtime env var when running export scripts.
4. Help center order updates not writable via API:
   - Error: `Validation error: body: Unrecognized key(s) in object: 'order'` on both:
     - `PATCH /v2/help_center/collections/{id}`
     - `PATCH /v2/help_center/articles/{id}`
   - Impact: Category and article ordering must be adjusted in Featurebase UI (or a future API endpoint), not via current public API.
   - Evidence log: `docs/help-center-export/reports/reorder-help-center-results.json`

## Supporting machine-readable logs

- `docs/help-center-export/reports/publish-live-articles.json`
- `docs/help-center-export/reports/publish-live-changelog-roadmap.json`
- `docs/help-center-export/reports/reorder-help-center-results.json`
- `docs/help-center-export/raw/featurebase-articles.json`
- `docs/help-center-export/raw/featurebase-changelogs.json`
- `docs/help-center-export/raw/featurebase-posts.json`
