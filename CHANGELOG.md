# Changelog

All notable changes to Deelrx CRM will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Added

- **Mobile internal testing companion**: Added a private-index guided web checklist for authorized iOS and Android testers with made-up-data safeguards, a broad phone and tablet picker, a dedicated first-time onboarding test, step-by-step transaction help, responsive progress controls, automatic local save-and-return, and local-only copy/download reporting. Every tester is also guided through a required phone-browser parity pass on the same device. Refreshed the public Resources page around current app, testing, help, privacy, and terms destinations (WRE-49).

- **Fractional product setup**: Add Product and the guided first-product flow expose opt-in fractional sales, selling units, separate minimum/increment, precision, and dollar/quantity presets. Web creates the product and transitional commerce rules in one audited transaction; native iOS and Expo creation pass the same validated rules to the canonical product mutation. Onboarding explains per-product setup and the web first-product action opens creation directly (WRE-89). Web/backend deployed on 2026-08-31; authenticated cross-client/device verification and native distribution remain pending.

### Changed

- **Minor release preparation**: Synchronized product metadata to 1.1.0 for the approved plain-language DRX content system. Native build identifiers are unchanged; production deployment, native store distribution, and provider-controlled copy publication remain separately verified outcomes (WRE-107).

- **Plain-language product vocabulary**: Replaced complex public privacy labels with `Privacy`, `Hide details`, `Protect details`, `What's saved`, and `Delete old records`; aligned navigation, sales, stock, payment, onboarding, help, marketing, Expo, and native iOS copy through a shared DRX content catalog. Provider-controlled copy remains draft-only pending publication approval (WRE-107).

- **Major release preparation**: Synchronized product metadata to 1.0.0 for the approved platform-administration boundary. Native build identifiers are unchanged; production deployment and native store distribution remain separately verified outcomes.

- WRE-87: Add a private platform sign-in screen behind the configured entry value. Signed-out platform bookmarks lead through authentication back to the separately authorized console; ordinary business login is unchanged.
- WRE-87: Separate platform administration from business ownership with explicit server-side platform grants, dedicated navigation, operational registry metrics, and a persistent red platform banner. Retire `/admin` without redirecting; the replacement entry requires server-only `PLATFORM_CONSOLE_SLUG` configuration. Business approvals and audits move to `/inventory/approvals` and `/settings/audit`.
- WRE-87: Reject tenant roles and permission overrides on global user, business, identity-deletion and notification operations. Platform role changes require a selected business and cannot grant platform access; business team management remains tenant-scoped. The production candidate remains subject to exact-SHA deployment and credentialed role-boundary verification.

- **Patch release preparation**: Synchronized product metadata to 0.7.2 for the WRE-97 native launch repair. Native build identifiers remain unchanged; TestFlight distribution and physical-device verification are still pending approval.

- **Patch release preparation**: Synchronized product metadata to 0.7.1 for the approved WRE-89 product-dialog deployment. Native build identifiers are unchanged; store distribution and full cross-platform acceptance are not implied.

- **Release preparation**: Synchronized product metadata to 0.7.0 for the approved WRE-89 web/backend deployment. Native build identifiers are unchanged; store distribution and cross-platform acceptance are not implied.

- **Cross-Surface Brand Voice**: Aligned marketing, web, onboarding, Expo, and native iOS copy around one operator-first vocabulary, corrected unsupported availability and report-label claims, and added an automated copy voice gate.

### Fixed

- **Business approvals (WRE-87):** Keep all pending inventory approvals visible independently of the recent completed-history limit, with both reads scoped to the authorized business.
- **Business page loading (WRE-87):** Remove nested brand links that caused hydration errors and keep route content available while the optional onboarding interface loads.
- **Admin access (WRE-83):** Replaced the nonexistent business-role model lookup with the supported role store and avoided unnecessary business lookups for existing platform administrators.
- **Reporting correctness (WRE-83):** Include active transitional web sales alongside canonical commerce, preserve source identity and mirrored-order deduplication, and label partial reports and exports when a ledger cannot be read. Report availability does not imply complete accounting coverage.
- **Checkout retries (WRE-83):** Restore the completed web-sale lookup before canonical checkout so configuration changes cannot replay an already completed web sale into the canonical ledger.
- **Checkout error privacy (WRE-83):** Return a fixed retry-verification error without exposing database/provider details when the completed-sale lookup fails.
- **Inventory test gate (WRE-80):** Initialize inventory route fixtures inside the hoisted mock factory so the regression suite can execute.

- **Native iOS launch configuration**: Missing or malformed optional Sentry/PostHog settings no longer block an installed production app from opening. Release/archive preparation now rejects missing or invalid telemetry before distribution, while local development uses disabled telemetry stubs (WRE-97).

- **Login field visibility**: Raised the unfocused Clerk login-field boundary contrast above 3:1 and aligned the higher-priority global Clerk overrides with the shared auth theme, strengthening field and placeholder separation from the surrounding dark panel so email and password boxes remain visible across display conditions (WRE-98).

- **Product dialog usability**: New products with a generated SKU use Add product copy instead of Edit product. The expanded fractional-selling form scrolls within the viewport while its header and Close control remain visible; Cancel, Close, and Escape dismiss without reopening from the onboarding link (WRE-89).

- **Commerce authentication compatibility**: Web commerce settings, fractional checkout, and canonical reporting use the current Clerk/Convex session-token integration while retaining support for legacy JWT templates. Token-provider failures fail closed without logging provider details (WRE-84).
- **Commerce settings access and recovery**: Fractional-selling, bulk-pricing, loyalty, and delivery configuration now use the selected business’s existing owner and role permissions. Failed settings loads show an actionable error and a read-only retry instead of an endless loading message (WRE-84).
- **Commerce tenant safety**: Disabled businesses and mismatched web/mobile business contexts are denied before settings reads or writes; saves revalidate business access before changing canonical settings (WRE-84).

## [0.6.12] - 2026-08-30

### Fixed

- **Single Ledger Commerce & Reporting Architecture**: Transitioned `/api/reports/commerce-delivery` to single authoritative ledger execution with direct local store fallback, removing the legacy dual-read requirement and eliminating the 503 "Combined reporting is unavailable until both canonical and legacy ledgers can be read" failure mode.
- **Unified POS Checkout Pipeline**: Removed dual-ledger cross-checking in `checkoutCanonicalCommerce` to establish single-ledger transactions across all checkout modes.


### Fixed

- **Brand Discipline & Contact Alignment**: Replaced forbidden `DRX CRM` brand reference with `Deelrx CRM` on public contact page and codified strict naming rules across brand governance.
- **Brand Voice & Pre-Release Posture**: Updated canonical brand strategy to codify `Deelrx CRM` / `DRX` split, pre-release beta status, and bounded marketing copy rules.


### Fixed

- **Native iOS Release Compilation**: Resolved `fullName` internal accessibility error in `DashboardView.swift` by implementing a public `formattedFullName` extension over `firstName` and `lastName` on ClerkKit `User`.


### Added

- **Mintlify Documentation Hub**: Established canonical documentation hub at `https://docs.deelrxcrm.com` covering delivery fulfillment, fractional/bulk pricing, native mobile apps, and operator runbooks. Added `pnpm test:docs:mintlify` verifying 22 documentation pages (WRE-59).
- **Native iOS Dashboard Identity & Switching**: Added `IdentityHeaderCard` displaying operator name, primary role badge, and active business name, with `UserIdentitySheet` for secure operator sign out and cache flushing (WRE-36).
- **Support & Communication Alignment**: Preserved Help Scout (`support@deelrxcrm.com` / inbox 372443) for email/contact support across web, mobile, and iOS, with Loops dedicated strictly to marketing communications.
- **Mobile Touch & PWA Resilience**: Hardened 44x44px touch targets, sticky mobile POS cart bar, and clean PWA service worker lifecycle updates (WRE-77).

## [0.6.8] - 2026-08-24

### Fixed

- **Quick POS Navigation & Store State**: Converted `PosLayoutShell` to direct static import and removed destructive sub-tree remounting in `AppShell` to preserve in-memory cart and register state during `/pos/sale` $\leftrightarrow$ `/pos/payment` route transitions.
- **Quote Breakdown Resilience**: Added safe fallback parsing for `merchandiseTaxAmount`, `taxAmount`, `deliveryRevenue`, `deliveryTaxAmount`, and `vendorDeliveryExpense` in `QuickPosPaymentPage` to prevent render errors when optional quote fields are omitted.
- **Monorepo Build and E2E Test Suite**: Configured Tailwind oxide and LightningCSS native bindings for isolated pnpm workspaces, defaulted Playwright web server to Webpack for deterministic compilation, and added marketing unit test configuration to exclude Playwright specs from Vitest runs.


### Fixed

- **Administration Access**: Updated Admin layout authorization to recognize business owners, administrators, and local bypass sessions with an explicit access-denied fallback rather than looping back to `/dashboard`.
- **Tour Highlight & Popover Buffer**: Added outline offset buffer (`outline-offset: 6px`) to `.tour-target-highlight` to prevent clipping target text and enlarged Tour popover internal padding and typography.
- **Credit Tab & Contrast**: Replaced un-themed light `bg-slate-50` containers and `bg-white` cards in `CreditExposureDashboard`, `AICreditPanel`, and Customer Detail Credit tab with high-contrast `#161616` dark theme cards and badges, eliminating white-on-white text.
- **Navigation & Loading State Transitions**: Prevented Quick Sale and navigation item pop-in during async permission loading, and added fluid Apple-style route content transitions keyed to `pathname`.

## [0.6.6] - 2026-08-23

### Fixed

- **Authentication & Clerk Input Legibility**: Enhanced input background contrast (`#1E1E1E`/`#242424`), distinct border styling, and high-visibility neon lime caret (`caret-color: #CCFF00`, `cursorColor`) across Web Clerk themes, global form inputs, auth visual fixtures, React Native mobile login/signup, and native SwiftUI theme tokens.

## [0.6.5] - 2026-08-23

### Fixed

- **Expo SDK 54 & Metro Configuration**: Aligned `expo`, `expo-constants`, `expo-file-system`, `@types/react`, and `@sentry/react-native` versions across monorepo dependencies and pnpm overrides, deduplicated native modules, and preserved Expo default `watchFolders` in `metro.config.js`.

## [0.6.4] - 2026-08-23

### Fixed

- **iOS TestFlight and Xcode Cloud Automation**: Hardened `ci_post_clone.sh`, `ci_pre_xcodebuild.sh`, and `ci_post_xcodebuild.sh` with root wrapper scripts, graceful Sentry token handling, fast Homebrew installs, and aligned Expo iOS bundle identifier `com.wrelik.drx` with EAS build profiles.

## [0.6.3] - 2026-08-23

### Fixed

- **Quick POS Bootstrap Resilience**: Guarded `deliveryPolicy` and `creditPolicy` with optional chaining in `/pos/sale` page loader to prevent unhandled TypeError from aborting favorites rendering when policy payload fields are omitted.
- **E2E Test Stability**: Added `test.setTimeout(60000)` and complete bootstrap mock schemas in `quick-pos-required.spec.ts` and `help-center-smoke.spec.ts` to accommodate cold server compilation on CI runners.

## [0.6.2] - 2026-08-23

### Fixed

- **Build Tooling and Test Runner**: Aligned esbuild and platform binary dependencies for seamless Vitest unit test suite execution across macOS ARM64 environments.

## [0.6.1] - 2026-08-23

### Changed

- **Release and Deployment Policy**: Established automated continuous deployment from `main` with unique versioning and monotonic build numbers on every push.

### Fixed

- **Web Offline Sync (WRE-74)**: Hardened `OfflineSyncManager` against IndexedDB connection lifecycle events (`onversionchange`, `onclose`, `InvalidStateError`) with automatic reconnection and retry.
- **Root Layout Analytics (WRE-75)**: Removed unconfigured third-party Vexo analytics script from `RootLayout` resolving 400 Bad Network Call errors across web and iOS WKWebView.
- **Sentry Client Extension Noise Filtering (WRE-76)**: Filtered browser extension `runtime.sendMessage()` disconnect and port closure rejections in Sentry client.
- **iOS TestFlight Build Isolation**: Fixed Swift 6 actor isolation conformance on `DRXNotificationDelegate` and test bundle Foundation imports.

## [0.6.0] - 2026-08-23

### Added

- **Release integrity (WRE-68)**: Added a model-invoked release-governance skill, six executable behavioral fixtures, exact SemVer and leading-`[Unreleased]` PR gates, repository-local CI dependency enforcement, safe release preparation and verification commands, and dry-run-first Featurebase projections.
- **Fractional and value-based checkout (WRE-69, WRE-71, WRE-72, WRE-73)**: Added server-authoritative fractional quantities, reciprocal dollar/quantity entry, suggested presets, ordered bulk-price tiers, and spend-based loyalty with merchant-selected stack or best-benefit behavior across web, iOS, and Android.
- **Delivery fulfillment (WRE-70, WRE-71, WRE-72, WRE-73)**: Added encrypted-address delivery checkout, atomic sale linkage, vendor-fee allocation and tax treatment, tenant-scoped operator queues, assignment and shift handoff, audited status events and address access, required Uber wait time, server-owned reminders and manager escalation, and durable Android reminder recovery.
- **Delivery accounting and reporting (WRE-70, WRE-71)**: Added separate merchandise and delivery revenue, vendor delivery expense, delivery tax, discounts, COGS, capped customer-fee and delivery-tax refunds, vendor credits, and gross-profit reconciliation with a sanitized aggregate CSV export.

### Changed

- **Cross-client runtime hardening (WRE-65)**: Added the iOS launch/auth routing experience and accessible lime primary-button style, synchronized programmatic tab changes, removed duplicate web identity controls, and hardened credit, customer, inventory, report, realtime, feedback, and AI response handling.
- **Pre-RC operator UX**: Simplified dashboard density, preserved the application shell during route changes, added domain-specific skeletons and non-blocking refresh status, and replaced automatic chunk reloads with an explicit recovery action.
- **Runtime and observability**: Standardized local, CI, container, web, marketing, and mobile tooling on Node `22.23.1`; moved Sentry client setup to `instrumentation-client.ts` and disabled default PII and replay capture.
- **Release metadata**: Synchronized product-version surfaces to planned version `0.6.0` while preserving iOS build `31` as an independent source build number.
- **Release-record correction**: Removed the unsupported `0.6.0-rc.1` release section and stale build-20 customer claims. Repository and provider evidence did not establish that candidate as a tagged or distributed release.
- **TestFlight Pipeline Note**: Local archive export remains blocked on environments without loaded Apple account and distribution signing material; full TestFlight upload requires a logged-in Xcode account and valid team `L8R42BJ54K` signing assets.

### Fixed

- **Feedback fallback**: All in-app bug-report entry points now open the Featurebase Help Center when the Sentry feedback widget is unavailable or fails to initialize.
- **Quick POS Recovery**: Route complete sales through the canonical checkout API with idempotent retries and allow authenticated operators to exit when no manager PIN is configured.

## [0.5.7] - 2026-07-22

### Fixed

- **Web Onboarding**: Force a fresh dashboard navigation after durable onboarding completion so production sessions cannot remain stuck on the onboarding page.

## [0.5.6] - 2026-06-21

### Fixed

- **Testing**: Fixed Vitest alias resolution for monorepo root execution by introducing `vitest.workspace.ts`.

## [0.5.5] - 2026-05-31

### Added

- **Supabase Decommissioning & Native Next.js AI Routes**: Fully decommissioned Supabase Edge Functions and migrated to native Next.js AI route handlers for inventory-health and pricing-inventory.
- **Inventory Ledger Hardening**: Scaffolded the new inventory mutation engine and implemented transactional, audit-safe ledger updates including unique intake batch mapping for strict FIFO integrity.
- **Privacy-Native Customer Identity**: Rolled out ephemeral profile support and privacy-native customer cleanup queue routes with PostHog flag parity gates.
- **Testing & Release Gate**: Added deterministic ownership map (`docs/testing/TEST_OWNERSHIP.json`), matrix validator (`scripts/testing/validate-matrix.ts`), cross-surface smoke checks (`scripts/testing/smoke-surfaces.ts`), and testing governance policy (`docs/testing/TESTING_POLICY.md`).
- **CI/CD**: Added unified `.github/workflows/ci-gate.yml` fail-fast workflow with artifacts for audit, E2E, security, performance, and readiness reporting.
- **E2E Coverage**: Added Playwright accessibility and visual regression suites (`apps/app/tests/e2e/a11y.spec.ts`, `apps/app/tests/e2e/visual-regression.spec.ts`).
- **Mobile Sentry Integration**: Added `@sentry/react-native` via `@wrelik/errors/react-native` to mobile app.
- **Mobile Analytics Dependencies**: Added `@wrelik/analytics` and `@wrelik/errors` workspace packages to mobile app.
- **Production Launch Checklist**: Added `docs/PRODUCTION_LAUNCH_CHECKLIST.md` with complete launch sequence.
- **@wrelik/analytics Client Module**: Added client browser-side PostHog wrapper (`initAnalytics`, `identify`, `capture`, etc.).
- **@wrelik/errors Enhanced Config**: Added full server/client options to `initErrors`.
- **Analytics Identity Hook**: Added `useAnalyticsIdentity` hook.
- **Marketing IA & Content Model**: Added full marketing route map and content mapping with shared site rendering primitives.

### Fixed

- **Unit Test Suite Stability**: Fixed pos-baseline and validate-credit unit test failures to ensure all 231 tests pass cleanly.
- **Build System**: Fixed root package.json build script to correctly delegate to apps/app for monorepo builds.
- **Dependencies**: Updated @wrelik/* packages to use workspace protocol for proper monorepo resolution.
- **Marketing App**: Added missing UI component re-exports for Button component from @deelrx/ui package.
- **Versioning**: Synchronized version numbers across VERSION file, root package.json, and apps/app/package.json (0.5.5).
- **Dashboard**: Resolved persistent loading spinner by optimizing Clerk organization loading logic in `useBusiness` and `useUserRole` hooks.
- **Sentry Feedback**: Fixed runtime crash on Help page by guarding feedback initialization when Sentry client is unavailable.
- **Type/Test Stability**: Resolved app typecheck failures and aligned unit/integration tests with current adapter and schema contracts.
- **Production Build**: Removed the duplicate `/help` page to avoid Next.js deployment route collision.
- **Auth Adapter**: Replaced broken `@wrelik/auth/server` dependency path with local Clerk session normalization for successful production compilation.

### Changed

- **Analytics Compliance**: Migrated PostHog initialization from direct `posthog-js` SDK to `@wrelik/analytics/client` adapter.
- **Error Tracking Compliance**: Migrated Sentry initialization from direct `@sentry/nextjs` SDK to `@wrelik/errors/server` and `@wrelik/errors/client` adapters.
- **Feature Flags**: Migrated feature flag hook from Supabase-based flags to PostHog feature flags via `@wrelik/analytics/client`.
- **User Identification**: Added automatic user identification in PostHog when users authenticate.
- **Build Scripts**: Added `build:marketing` and `build:all` scripts to root package.json for comprehensive build support.
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
