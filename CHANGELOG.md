# Changelog

All notable changes to Deelrx CRM will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Fixed

- **Build System**: Fixed root package.json build script to correctly delegate to apps/app for monorepo builds.
- **Dependencies**: Updated @wrelik/* packages to use workspace protocol for proper monorepo resolution.
- **Marketing App**: Added missing UI component re-exports for Button component from @deelrx/ui package.
- **Versioning**: Synchronized version numbers across VERSION file, root package.json, and apps/app/package.json (0.5.2).

### Changed

- **Build Scripts**: Added `build:marketing` and `build:all` scripts to root package.json for comprehensive build support.

- **Dashboard**: Resolved persistent loading spinner by optimizing Clerk organization loading logic in `useBusiness` and `useUserRole` hooks.
- **Sentry Feedback**: Fixed runtime crash on Help page by guarding feedback initialization when Sentry client is unavailable.
- **Type/Test Stability**: Resolved app typecheck failures and aligned unit/integration tests with current adapter and schema contracts.

### Added

- **Marketing IA**: Added full marketing route map for product, use-cases, resources, beta, and legal sections.
- **Marketing Content Model**: Added `marketing.content-map.json` and shared site rendering primitives for page framing and tracked links.
- **Testing Gate**: Added repository audit, test matrix generation, policy enforcement, data-integrity check, security scan, performance smoke check, and full readiness report generators under `scripts/testing/*`.
- **CI/CD**: Added unified `.github/workflows/ci-gate.yml` fail-fast workflow with artifacts for audit, E2E, security, performance, and readiness reporting.
- **E2E Coverage**: Added Playwright accessibility and visual regression suites (`apps/app/tests/e2e/a11y.spec.ts`, `apps/app/tests/e2e/visual-regression.spec.ts`).
- **Testing & Release Gate**: Added deterministic ownership map (`docs/testing/TEST_OWNERSHIP.json`), matrix validator (`scripts/testing/validate-matrix.ts`), cross-surface smoke checks (`scripts/testing/smoke-surfaces.ts`), and testing governance policy (`docs/testing/TESTING_POLICY.md`).

### Changed

- **Marketing Landing**: Refreshed the homepage experience with new landing sections, interactive demo primitives, and updated CTA/layout styling.
- **Marketing Routing**: Updated legacy `/privacy` and `/terms` paths to align with legal hub routes.
- **Marketing Trust Copy**: Updated footer/security language to avoid unsupported absolute claims and remove dead-link security route references.
- **Test Config**: Hardened Vitest coverage thresholds (90% lines/branches/functions/statements) and expanded Playwright retention/reporting for CI diagnostics.
- **Package Scripts**: Added canonical root testing scripts (`test:unit`, `test:integration`, `test:e2e:web`, `test:a11y`, `test:security`, `test:perf`, `test:regression`, `test:all`, `test:matrix`, `test:policy`, `test:readiness`).
- **CI Gate**: Hardened `.github/workflows/ci-gate.yml` with matrix validation, shard-aware E2E smoke runs, deterministic artifacts, and fail-fast gate ordering.
- **Nightly Gate**: Added `.github/workflows/ci-nightly-full-gate.yml` for full E2E/security/perf/data-integrity runs outside PR runtime budget.
- **Supabase Migration**: Removed runtime legacy `apps/app/lib/supabase/client.ts` usage from production paths and introduced adapter-first replacements under `apps/app/lib/data/`.

### Removed

- **Legacy Artifacts**: Removed stale tracked CI/testing artifacts and legacy TestSprite suites from version control.

## [0.5.5] - 2026-04-09

### Changed

- **Analytics Compliance**: Migrated PostHog initialization from direct `posthog-js` SDK to `@wrelik/analytics/client` adapter.
- **Error Tracking Compliance**: Migrated Sentry initialization from direct `@sentry/nextjs` SDK to `@wrelik/errors/server` and `@wrelik/errors/client` adapters.
- **Feature Flags**: Migrated feature flag hook from Supabase-based flags to PostHog feature flags via `@wrelik/analytics/client`.
- **User Identification**: Added automatic user identification in PostHog when users authenticate.

### Added

- **@wrelik/analytics Client Module**: Added `./client` export with browser-side PostHog wrapper including:
  - `initAnalytics()` - Initialize client-side analytics
  - `identify()` - Identify authenticated users
  - `capture()` - Track custom events
  - `capturePageView()` - Track page views
  - `isFeatureEnabled()` - Check feature flags
  - `getFeatureFlag()` - Get multivariate flag values
  - `onFeatureFlags()` - Subscribe to flag changes
  - `reset()` - Reset analytics on sign-out
- **@wrelik/errors Enhanced Config**: Added full configuration options to `initErrors()` for both server and client:
  - Environment, trace sampling, replay sampling, PII settings
  - `addBreadcrumb()` and `captureMessage()` functions
- **Documentation**: Added `docs/@wrelik-kit-usage.md` - Comprehensive guide for using @wrelik/* packages
- **Documentation**: Added `docs/feature-flags.md` - Feature flag system guide with naming conventions and best practices
- **Analytics Identity Hook**: Added `useAnalyticsIdentity` hook for manual user identification

## [0.5.4] - 2026-03-11

### Fixed

- **Production Build**: Removed the duplicate `/help` page so Next.js no longer resolves two routes to the same path during deployment.
- **Auth Adapter**: Replaced the broken `@wrelik/auth/server` dependency path in the app server adapter with local Clerk session normalization so production compilation succeeds.

## [0.5.1] - 2026-02-14

### Added

- **Auth/Waitlist**: Added app-hosted Clerk waitlist route at `/waitlist` with branded DRX styling for seamless marketing-to-app handoff.
- **Onboarding**: Added onboarding action + layout gate and persisted onboarding completion metadata for post-auth access control.

### Changed

- **Middleware**: Enforced onboarding gating for authenticated users and added explicit webhook bypass handling for `/api/webhooks/*`.
- **Marketing Conversion**: Repointed primary marketing waitlist CTAs to app waitlist endpoint (`${NEXT_PUBLIC_APP_URL}/waitlist?source=marketing`).
- **Visual Continuity**: Aligned app and marketing neon token values (`#050505` base, `#BFFF00` accent) and updated auth legal/beta links.

## [0.5.0] - 2026-02-14

### Added

- **Quick POS**: Added isolated Quick POS mini-app under `/pos` with dedicated layout and fixed flow (`/pos/sale`, `/pos/payment`, `/pos/complete`).
- **Quick POS API**: Added `/api/pos/*` endpoints for bootstrap, product search, customer phone lookup/quick create, checkout, and exit PIN verification.
- **Quick POS UI**: Added POS-specific component set and local state model to prevent main-app UI leakage.
- **Quick POS Launch**: Added `Quick POS` entry in sidebar and dashboard quick actions.
- **Testing**: Added unit tests for Quick POS selectors/store/route guards and a Playwright Quick POS flow spec.

## [0.4.11] - 2026-02-12

### Added

- **Compliance**: Phase 1 Stack Policy Audit. Added `docs/COMPLIANCE_AUDIT.md` with full stack inventory and violation list.
- **Governance**: Added `STACK.md` defining authoritative Wrelik Modular Stack.
- **Governance**: Added `docs/decisions/0000-vendor-policy.md` banning direct vendor SDK imports.
- **Governance**: Added `CHECKLIST_PRECOMMIT.md` and `CHECKLIST_PRERELEASE.md`.
- **Config**: Added `.env.example` and `docs/ENV_MATRIX.md` for environment variable standardization.
- **Documentation**: Added comprehensive `docs/POST_PHASE2_REVIEW.md` revealing Phase 2 non-completion.
- **Governance**: Added `docs/PHASE3_READINESS.md` with FAIL status blocking Phase 3 migrations.
- **Documentation**: Added `docs/REVIEW_CORRECTIONS_SUMMARY.md` with validation results.

### Changed

- **Review**: Updated CHANGELOG with Post-Phase 2 review findings (2026-02-28).
- **Config**: Fixed R2 environment variable naming from `R2_AccountId` to `R2_ACCOUNT_ID`.
- **Docs**: Corrected wrelik package naming from `@wrelik/auth-next` to `@wrelik/auth/next`.
- **Security**: Removed `.env.local` from git tracking.
- **Governance**: Added ESLint enforcement rules for banned vendor imports.
- **Scripts**: Added compliance checking scripts for imports, secrets, and package manager consistency.
- **Repo Hygiene**: Enforced single package manager (pnpm).

### Fixed

- **Build/Prerender**: Resolved major build failure caused by Clerk authentication dependencies during static generation.
  - Implemented global `force-dynamic` rendering at the root layout level for the app.
  - Refactored `/admin`, `/settings/team`, and `/workspaces` to use dynamic server component wrappers.
  - Fixed property access lint errors in `WorkspacesClient`.
- **Cleanup**: Purged unused Geist/Geist_Mono font variables and imports from root layout.

## [0.4.10] - 2026-02-09

### Fixed

- **404 Handling**: Added custom `not-found.tsx` page to handle missing routes and improve debugging.
- **PWA**: Temporarily disabled PWA configuration to investigate 404/caching issues.

## [0.4.9] - 2026-02-09

### Fixed

- **Dashboard**: Fixed infinite loading screen on dashboard by correctly handling missing business ID in `useDashboardData`.

## [0.4.5] - 2026-02-05

### Changed

- **Branding**: Enforced strict "Deelrx CRM" naming convention across all apps.
- **Copy**: Rewrote Homepage with "Operator" voice and added Mental Load Relief section.
- **Microcopy**: Established strict microcopy guidelines in `docs/MICROCOPY.md`.
- **License**: Updated entity name to "Wrelik Brands LLC".

## [0.4.4] - 2026-02-02

### Changed

- **Meta**: Removed "v0.app" generator tag and updated project name in `package.json` to `deelrx-crm` to fully alias the application.

## [0.4.3] - 2026-02-02

### Fixed

- **Build**: Synced `pnpm-lock.yaml` with `package.json` to resolve Vercel CI "frozen-lockfile" error.

## [0.4.2] - 2026-02-02

### Changed

- **Branding**: Updated primary logo to "DRX Wordmark Color" (`/brand/DRX Wordmark Color.svg`) across the site.
  - Replaced logo in `AppLogo`, `MarketHeader`, `Footer`, and Landing Page.
  - Adjusted container dimensions to fit the wordmark format.
  - Removed redundant "DeelRx" text next to the new wordmark to avoid duplication.

## [0.4.1] - 2026-02-02

### Changed

- **Cleanup**: Removed legacy debug scripts and large artifact files.
- **Infrastructure**: Added `pre-push` hook to enforce versioning policy.
- **Docs**: Updated checklists to reflect strict versioning requirements.

## [0.4.0] - 2026-02-02

### Changed

- **Authentication**: Migrated from Supabase Auth to Clerk.
  - Implemented `ClerkProvider` and `clerkMiddleware`.
  - Replaced custom login forms with Clerk components.
  - Updated server-side auth guards to use `auth()`.
- **Database**: Migrated from Supabase (Postgres) to Prisma ORM.
  - Added `prisma/schema.prisma` configured for PostgreSQL (Neon/Doppler).
  - Implemented `lib/db.ts` singleton client.
  - Refactored all API routes to use Prisma for data access.
  - Added `businessId` checks for multi-tenancy.
- **API**: Refactored core Admin, Inventory, and Team API routes.
  - Removed dependency on `supabase-js` client in API handlers.
  - Implemented transactional logic using Prisma.
- **Storage**: Scaffolded migration to Cloudflare R2 / AWS S3 SDK.
  - Created `lib/storage.ts` interface.
  - Removed legacy Supabase Storage dependencies.

### Added

- **Scripts**: Added `scripts/verify-db.ts` for connection testing.
- **Docs**: Added `migration_guide.md` for manual database provisioning.

## [0.3.3] - 2025-02-28

### Fixed

- **Versioning**: Created VERSION file at repo root as single source of truth
- **Versioning**: Fixed inconsistent version display across UI components (sidebar, bottom-nav, admin)
- **Versioning**: Added version display to admin console header
- **Versioning**: Added version display to application footer

## [0.3.2] - 2026-02-01

### Changed

- **Branding**: Complete site rebranding to DRX / DeelRx.
- **UI**: Replaced all logos and icons with new transparent neon-lime assets (`drx-mark`, `favicon`).
- **Assets**: Purged legacy placeholder images and SVGs.
- **Metadata**: Updated OpenGraph images and PWA manifest icons.

## [0.3.1] - 2026-02-01

### Changed

- **Refactor**: Modernized `SalesPage` by decomposing it into smaller sub-components (`ProductSearch`, `CartItems`, etc.) and extracting logic to `useSalesCart` hook.
- **Refactor**: Modularized `BusinessSetupWizard` into distinct step components for better maintainability.
- **Scripts**: Converted build and utility scripts (`scripts/*.js`) to TypeScript to improve type safety and fix lint errors.
- **Cleanup**: Removed unused variables and imports across the codebase.

## [0.3.0] - 2026-01-31

### Added

- **Inventory**: Product Unit Aliases (nicknames) for custom weights and quantities.
- **Settings**: Management UI for adding, enabling, and resetting product aliases.
- **POS**: Dynamic alias support in weight entry modal for quick selection.
- **Architecture**: Separated Landing Page from App Shell using Next.js route groups.
- **Automation**: TestSprite integration for automated PRD and test plan generation.
- **Compliance**: Implemented Right to be Forgotten (RTBF) API with PII masking and role removal.
- **Security**: Enhanced Audit Logs with tenant isolation and advanced filtering (action/type/date).
- **Security**: Enforced Role Hierarchy in User Management (Managers restricted from assigning Owner roles).
- **Testing**: Added local Vitest integration suite covering Audit, Hierarchy, and RTBF flows (`tests/integration/`).
- **DevOps**: Regenerated TestSprite test plan for backend compliance verification.
- **Featurebase**: Added Featurebase SSO and Help Center Sync.

### Changed

- Updated middleware to support custom domain routing for landing page vs app shell.

## [0.2.0] - 2026-01-30

### Added

- **Docs**: Versioning and Release Process documentation (`7b10364`)
- **Mobile**: Modern mobile bottom navigation with central FAB and bounce animation (`d3fd1dc`)
- **Pricing**: Advanced pricing features (Fixed price/gram, Product Intake, AI Mock) (`f7c6c57`)
- **Security**: Authentication & RBAC for Team/Notifications APIs (`8ac669c`)
- **API**: Comprehensive endpoints for inventory, credit, and admin management (`80d5aa4`)
- **Schema**: Aligned schema, brand, and UX with native app (`b2f0966`)

### Changed

- Reconstructed changelog to reflect true version history based on git commits.

## [0.1.1] - 2026-01-11

### Fixed

- **Remediation**: Fixes for invalid login tests, POS fractional quantities, and Credit search (`ab21d77`)
- **Security**: Hardened RLS policies, secured function search paths (`ab21d77`)
- **Performance**: Optimized RLS caching and added missing indexes (`ab21d77`)
- **Tests**: Remediation of testsprite findings (rpc, pos, credit, admin) (`57dfd73`)
- **RLS**: Consolidate RLS policies for `inventory_intakes` (`880ae39`)

### Changed

- Bumped version to 0.1.1 (`2bdbaeb`)
- Removed unused imports (`df5bf7a`)

## [0.1.0] - 2025-12-28

### Added

- **Core**: Initial Deelrx CRM application with core features
- **Admin**: Business creation API and refactored admin page (`24fd609`)
- **UI**: Modern mobile menu component (`d74a1c9`)
- **UI**: Version number display (`ad7d8f6`)
- **Workflow**: Inventory intake approvals system (`83c6175`)
- **Automation**: Version management system (`dc90faa`)

### Changed

- **Navigation**: Center Sales in mobile navigation (`5f5ce6c`)
- **Design**: Updated logos and branding (`e3ee4a8`, `212f76f`)
- **Performance**: Optimized RLS policies (`1288aee`)
- **CI/CD**: Improved Supabase startup reliability (`373f4a2`)

### Fixed

- **Lint**: Fixed various lint errors and warnings (`fc460e5`, `33816f2`)
- **Tests**: Fixed E2E test env vars (`a00b640`)
- **RLS**: Fixed policies for admin access (`0c19fb2`)

### 2026-02-27 07:19 ET

- [adapters] Migrated DRX app-layer Wrelik imports to runtime subpaths (`@wrelik/*/server` and `@wrelik/*/shared`) in adapter and storage consumers.
- [infra] Added temporary Wrelik compatibility shim layer under `apps/app/lib/wrelik-shims/*` plus TS path aliases in `apps/app/tsconfig.json` to bridge current published package exports.
- [types] Added ambient declaration for `@wrelik/analytics` in `apps/app/wrelik.d.ts` to support typed shim usage until upstream package types are published.
- [lint] Extended `apps/app/eslint.config.mjs` with a targeted `no-restricted-imports` exception for shim files only.
- [docs] Added branch handoff artifact `docs/internal/handoff/main-wrelik-runtime-subpath-handoff-2026-02-27.md` with scope, validation evidence, risks, rollback protocol, and next-branch prerequisites.

### 2026-02-27 09:29 ET

- [deps] Upgraded `@wrelik/auth`, `@wrelik/config`, `@wrelik/errors`, `@wrelik/storage`, `@wrelik/db`, `@wrelik/email`, `@wrelik/jobs`, and `@wrelik/analytics` to `2.0.0` in root/app/mobile dependency manifests.
- [infra] Removed temporary DRX shim bridge under `apps/app/lib/wrelik-shims/*` after confirming official `./server|./client|./shared` exports are now published.
- [config] Removed app-level TS path alias shims and shim-specific ESLint exception from `apps/app/tsconfig.json` and `apps/app/eslint.config.mjs`.
- [adapters] Updated DRX adapter compatibility for Wrelik 2.0 API surface (`loadServerConfig({})` and jobs adapter singleton export replacement).
- [mobile] Switched mobile auth adapter imports to official subpaths (`@wrelik/auth/client` and `@wrelik/auth/shared`) and refreshed mobile README integration notes.
- [docs] Added `docs/internal/handoff/main-wrelik-v2-cutover-2026-02-27.md` with validation evidence, risks, and rollback protocol.
