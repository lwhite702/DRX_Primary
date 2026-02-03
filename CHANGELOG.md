# Changelog

All notable changes to DRX CRM will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Added

- **Compliance**: Phase 1 Stack Policy Audit. Added `docs/COMPLIANCE_AUDIT.md` with full stack inventory and violation list.
- **Governance**: Added `STACK.md` defining the authoritative Wrelik Modular Stack.
- **Governance**: Added `docs/decisions/0000-vendor-policy.md` banning direct vendor SDK imports.
- **Governance**: Added `CHECKLIST_PRECOMMIT.md` and `CHECKLIST_PRERELEASE.md`.
- **Config**: Added `.env.example` and `docs/ENV_MATRIX.md` for environment variable standardization.
- **Documentation**: Added comprehensive `docs/POST_PHASE2_REVIEW.md` revealing Phase 2 non-completion
- **Governance**: Added `docs/PHASE3_READINESS.md` with FAIL status blocking Phase 3 migrations
- **Documentation**: Added `docs/REVIEW_CORRECTIONS_SUMMARY.md` with validation results

### Changed

- **Review**: Updated CHANGELOG with Post-Phase 2 review findings (2026-02-28)
- **Config**: Fixed R2 environment variable naming from `R2_AccountId` to `R2_ACCOUNT_ID` for consistency
- **Docs**: Corrected wrelik package naming from `@wrelik/auth-next` to `@wrelik/auth/next`
- **Security**: Removed `.env.local` from git tracking to prevent secret exposure
- **Governance**: Added ESLint enforcement rules for banned vendor imports
- **Scripts**: Added compliance checking scripts for imports, secrets, and package manager consistency
- **Repo Hygiene**: Enforced single package manager (pnpm) by removing package-lock.json
- **Checklists**: Updated CHECKLIST_PRECOMMIT.md and CHECKLIST_PRERELEASE.md with compliance verification steps

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

- **Core**: Initial DRX CRM application with core features
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
