# DRX Help Center Gap Analysis

Generated: 2026-04-03  
Audit sources:
- `docs/help-center-export/reports/drx-feature-audit.md`
- `apps/app` route/component/API/schema inspection
- `apps/app/scripts/help-center-data.ts` legacy docs seed

## Executive summary

- Legacy help set exists (50 seeded articles), but large sections are outdated against current DRX UI labels and route structure.
- Critical end-user surfaces are under-documented or undocumented in legacy seed:
  - Dashboard behavior and key metrics
  - Quick POS multi-step flow (`/pos/sale` -> `/pos/payment` -> `/pos/complete`)
  - Reports and operations insights split
  - Workspace switching and tenant context
  - Admin feature controls and approvals
  - AI Intelligence page behavior
  - Current settings split (`/settings`, `/settings/profile`, `/settings/team`, `/settings/inventory/aliases`)
- Terminology drift is significant (legacy docs reference paths/actions not aligned with current nav labels).

## Detailed gaps

### Outdated articles

- Multiple legacy “Getting Started” and “POS” articles mention setup paths that do not match the current settings hierarchy.
- “Importing Products via CSV” language appears in legacy related links but current app structure centers inventory intake/audit/adjust flows; CSV workflow is not the primary surfaced path.
- “Offline Sales” behavior is over-asserted in old wording vs observable route/API behavior in this audit context.

### Wrong terminology and wrong steps

- Legacy docs use broad “POS screen” language where app now has explicit route steps.
- Role docs are generic and conflict with mixed permission key usage currently present in code.
- Privacy docs do not fully reflect available RTBF endpoint and admin/privacy boundaries.

### Missing or weak docs

- Missing docs for:
  - Dashboard daily operations view
  - Reports page workflow and interpretation
  - Operations Insights usage
  - Workspaces page and tenant context switching
  - AI Intelligence page use cases
  - Help center in-app surfaces and Featurebase embed behavior
  - Admin tools overview (for eligible roles)
- Existing docs are too thin in:
  - Troubleshooting
  - What happens next
  - Common mistakes and recovery paths

### Duplicate/split/merge recommendations

- Merge many narrow legacy seed articles into route-anchored operational guides to reduce fragmentation.
- Keep high-value focused docs separate:
  - Quick POS run-sale flow
  - Inventory intake/adjust/audit
  - Credit + payment workflows
  - Privacy/security and RTBF

## Content disposition model used

- `rewrite`: legacy topic retained with new structure and route-accurate steps.
- `merge`: multiple thin/overlapping legacy docs consolidated into one stronger operational doc.
- `archive`: legacy content obsolete or duplicates current consolidated docs.
- `new`: not present in legacy set but clearly shipped/visible in app.

## Undocumented but shipped features addressed in final docs

- Dashboard operational KPIs
- Reports page and export/reading behavior
- Workspaces and tenant context
- AI Intelligence feature surface
- Admin feature controls (where visible by role)
- RTBF/privacy handling path

## Planned/future boundaries

- Features that appear scaffolded but not clearly customer-ready are logged in reports and roadmap as planned/in-progress, not documented as fully live flows.
