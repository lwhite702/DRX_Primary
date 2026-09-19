---
name: documentation-management
description: Maintain Mintlify user documentation, public roadmap, and customer changelogs when system or workflow changes occur. Use when modifying operator-facing features, altering UI/settings, cutting a release, updating roadmap priorities, or refreshing Help Center articles and screenshots.
---

# Documentation management

Keep user documentation, customer changelogs, and public roadmap synchronized with system behavior in real time.

## Core principles & systems of record

- **Canonical User Documentation & Help Center**: Mintlify at `https://docs.deelrxcrm.com`.
- **Customer Support Platform**: Help Scout via `support@deelrxcrm.com`.
- **Decommissioned Platforms**: Featurebase has been completely retired; do not reference or reintroduce Featurebase links, scripts, or embeds.
- **Source of Truth**: Canonical help guides originate in `app-docs/` and are built into `mintlify/` via `scripts/docs/build-mintlify-help.mjs`.

## Operator voice & tone standards

All customer-facing documentation, changelogs, and roadmap descriptions must speak directly to retail operators (cashiers, store managers, and business owners):

- **Calm, direct, and practical**: Focus on what the operator sees, needs to decide, or must do during a shift.
- **Zero developer jargon**: Never mention Convex, Clerk, Sentry, PostHog, Next.js, React, Swift, PR numbers, commit hashes, Linear ticket IDs (`WRE-xxx`), mutations, database tables/schemas, APIs, or endpoints.
- **Brand naming**: Formal name is **Deelrx CRM**; short and in-app name is **DRX**.
- **Forbidden phrases**:
  - `"DRX CRM"` (use "DRX" or "Deelrx CRM")
  - `"Business CRM Mode"`
  - `"secure terminal access"`
  - `"system entry"`
  - `"streamline your operations"`
  - `"unlock growth"`
  - `"all-in-one platform"`
- **Accurate capability disclaimers**: Clearly mark early access and beta capabilities (`(beta)`). Explicitly disclaim unavailable workflows (such as unverified purchase orders, camera-based barcode scanning on web, or offline checkout guarantees) rather than implying full support.

## Updating documentation when system changes are made

Follow these ordered steps whenever a code change alters an operator workflow, UI screen, settings control, permission, or retail calculation:

### 1. Identify affected guides

Examine `app-docs/` and `mintlify/` for articles covering the modified surface:
- **Getting Started** (`mintlify/start/`): Onboarding, dashboard, reports, support entry.
- **Privacy & Security** (`mintlify/privacy/`): Privacy presets, retention cleanup, data boundaries.
- **Workspaces & Access** (`mintlify/access/`): Workspace switching, team roles, permission checks.
- **Customers & Store Credit** (`mintlify/customers/`): Customer lookup, alias management, balances, payment recording.
- **Inventory & Stock** (`mintlify/inventory/`): Intake, count adjustments, stock history, AI suggestions, purchase orders.
- **POS & Sales** (`mintlify/sales/`): Quick Sale cart, discounts, payments, delivery tasks, barcode scanning.

### 2. Update source articles

Edit the source file in `app-docs/` (as mapped in `docs/featurebase/help-center-manifest.json`):
- Update steps to match the exact live UI labels and button names.
- Document any new requirements, disclaimers, or field validations.
- Ensure all internal cross-references point to valid routes.

### 3. Compile Mintlify help center

Compile the canonical articles into `mintlify/`:
```bash
pnpm docs:mintlify:build
```
Verify the output matches source:
```bash
pnpm docs:mintlify:check
```

### 4. Review screenshots & visual assets

Inspect whether the UI change renders any existing screenshots or diagrams obsolete:
- Check `docs/mintlify/GEMINI_SCREENSHOT_BRIEF.md` for required capture specifications.
- Ensure fictional tenant data is used exclusively: `Northstar Demo Shop`, `Sam Reed`, `ALP-101`. Never use real PII, customer records, or live tokens.
- **Enforce the capture hold**: Do NOT capture screenshots for unreleased or beta AI surfaces (`DRX Intelligence`, `Purchase orders (beta)`, `Troubleshoot AI Intelligence`).
- If an illustrative fixture is used, include the caption: `Illustrative screen with fictional data.`

## Maintaining changelogs

DRX maintains two distinct changelog streams:

### 1. Customer changelog (`mintlify/CHANGELOG.mdx`)

Customer-facing release history at `https://docs.deelrxcrm.com/CHANGELOG`. Mirror identical entries in `docs/help-center-export/changelog/customer-changelog.md`.
- Group by release version and date: `## YYYY-MM-DD — vX.Y.Z`.
- Use operator categories: `### New`, `### Improved`, `### Fixed`.
- Write in pure operator voice: explain how the change improves cashier speed, stock accuracy, or store management.
- Exclude technical PR details, internal refactors, test suites, or developer tooling.

### 2. Technical changelog (Root `CHANGELOG.md`)

Engineering SemVer record:
- Tracks `[Unreleased]` changes during development.
- Moves to release headings upon release cut.
- Documents technical details, PR links, ticket references (`WRE-xxx`), schema migrations, and API updates.

## Maintaining the public roadmap

Files: `mintlify/roadmap.mdx` and `docs/help-center-export/roadmap/customer-roadmap.md`.
- Group by clear time horizons:
  - `## Now (In Active Development)`
  - `## Next (Planned)`
  - `## Later (In Research)`
- Ground entries in approved Google Drive product documents and active Linear sprint goals.
- Group by operational domains: Checkout & Cashiering, Inventory & Catalog, Customer Privacy & Balances, Hardware & Device Access.
- Do not promise firm dates or publish internal ticket IDs.

## Verification checklist

Before completing any documentation, changelog, or roadmap work:

1. `pnpm docs:mintlify:build` — Compiles canonical help guides.
2. `pnpm test:docs:mintlify` — Runs full audit:
   - Validates all 25 navigation pages in `mintlify/docs.json`.
   - Checks 19 canonical guides and 20 visual assets.
   - Confirms zero broken internal links or missing images.
   - Enforces zero forbidden phrases.
   - Validates capture brief keys and capture holds.
3. `pnpm release:integrity` — Confirms SemVer parity, changelog heading consistency, and release metadata.
