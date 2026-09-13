# DRX Production Environment and Integration Audit (2026)

Tracking: Linear [WRE-8](https://linear.app/wrelik/issue/WRE-8/complete-the-production-environment-and-integration-audit)  
Milestone: Functional beta readiness (Release Gate)  
Audited Branch: `lee/wre-8-complete-the-production-environment-and-integration-audit`  
Target Systems: Web (`apps/app`), Marketing (`apps/marketing`), Mobile (`apps/mobile`, `apps/ios`), Convex Backend (`apps/app/convex`), GitHub Workflows (`.github/workflows`)

---

## 1. Executive Summary & Verdict

**AUDIT STATUS: VERIFIED / PROCEED TO LIVE PROOF**

Every production dependency, environment contract, and secret configuration required by the DRX beta rollout has been systematically audited against repository contracts, security policies, and deployment configurations. No unredacted secret, private token, customer PII, or unrestricted production payload was exposed.

### Key Audit Findings:
1. **Convex Sole-Ledger Architecture**: The application has fully transitioned to Convex as the primary server-authoritative operational database. Legacy relational stores (Neon/Prisma, Supabase) have been safely isolated or retired from active business request paths.
2. **Production Secret Configuration**: GitHub Actions production and staging environment secrets have been verified via GitHub CLI metadata (`gh secret list --env production`, `gh secret list --env staging`). All mandatory keys required by `scripts/release/deploy-preflight.mjs` are present.
3. **Host Topology & Auth Boundaries**: Domain classification in `apps/app/proxy.ts` strictly routes marketing (`deelrxcrm.com`), app (`deelrxcrm.app`), and auth (`accounts.deelrxcrm.app`). Webhooks bypass frontend auth checks but forward raw signed envelopes to Convex where Svix HMAC signatures are verified before ingestion.
4. **Least-Privilege Platform Administration**: In compliance with `WRE-87`, platform staff console access is guarded by a private slug (`PLATFORM_CONSOLE_SLUG`) requiring 32-64 lowercase hex characters and explicit platform grants, isolating platform tools from merchant tenant data.
5. **Privacy & Telemetry Hardening**: Sentry client, server, and edge configurations enforce `sendDefaultPii: false` with recursive regex scrubbing of sensitive keys. PostHog client excludes authentication and platform control paths from telemetry.

---

## 2. Environment Variable Contract & Secret Audit

### 2.1 Contract Parity & Automated Validation
The repository enforces strict environment variable parity between runtime code and documented templates.

- **Check Command**: `pnpm test:env-contract`
- **Result**: PASSED (43 runtime keys verified across `.env.example` and `apps/app/.env.example`)
- **Documentation**: Synchronized in `docs/ENV_MATRIX.md`.

### 2.2 GitHub Deployment Environment Secrets
Deployment pipelines (`deploy-production.yml` and `deploy-staging.yml`) enforce strict preflight validation via `scripts/release/deploy-preflight.mjs`.

#### Production Environment (`github.com/lwhite702/DRX_Primary` -> `production`)
| Secret Name | Present | Purpose | Verified Date |
| :--- | :---: | :--- | :--- |
| `CONVEX_DEPLOY_KEY` | YES | Convex function deployment to production | 2026-08-20 |
| `VERCEL_TOKEN` | YES | Vercel deployment CLI authentication | 2026-08-20 |
| `VERCEL_ORG_ID` | YES | Vercel organization scoping | 2026-08-20 |
| `VERCEL_PROJECT_ID_PRODUCTION` | YES | Vercel production project target | 2026-08-20 |
| `VERCEL_SCOPE` | YES | Team / account scope | 2026-08-20 |

#### Staging Environment (`github.com/lwhite702/DRX_Primary` -> `staging`)
| Secret Name | Present | Purpose | Verified Date |
| :--- | :---: | :--- | :--- |
| `CONVEX_DEPLOY_KEY_STAGING` | YES | Convex function deployment to staging | 2026-09-11 |
| `VERCEL_TOKEN_STAGING` | YES | Vercel deployment CLI authentication | 2026-09-11 |
| `VERCEL_ORG_ID_STAGING` | YES | Vercel organization scoping | 2026-09-11 |
| `VERCEL_PROJECT_ID_STAGING` | YES | Vercel staging project target | 2026-09-11 |
| `VERCEL_SCOPE_STAGING` | YES | Team / account scope | 2026-09-11 |

*Note: All secret values remain confidential within GitHub Secret storage and are never printed to build logs.*

---

## 3. Host Topology & Clerk Authentication Routing

### 3.1 Domain Scoping (`apps/app/lib/auth/route-classification.ts`)
The edge middleware resolves traffic according to the configured host:
- **Marketing**: `deelrxcrm.com`, `deelrx.com` (routes to waitlist or marketing views)
- **App**: `deelrxcrm.app`, `deelrx.app`, `localhost` (authenticated POS and CRM dashboard)
- **Auth**: `accounts.deelrxcrm.app`, `accounts.deelrx.app` (Clerk hosted authentication components)

### 3.2 Route Protection & Public Allowlist
- **Public Routes**: `/waitlist`, `/login`, `/register`, `/sign-in`, `/sign-up`, `/sso-callback`, `/privacy`, `/terms`, `/brand`, `/api/public/*`, `/api/webhooks/*`
- **Protected Routes**: `/dashboard`, `/inventory`, `/pos`, `/customers`, `/reports`, `/settings`
- **Unauthenticated Handling**: Unauthenticated web navigation redirects to `/login?redirect_url=...`. Unauthenticated API calls return HTTP `401 Unauthorized`.
- **Readiness Probe**: `/api/health` queries `api.health.readiness` over `ConvexHttpClient` with a strict 10s timeout, returning boolean health without exposing internal error stacks, URLs, or tenant data.

---

## 4. Backend Persistence & Tenant Isolation

### 4.1 Convex Sole Ledger
- **Status**: Sole application database for business operations (products, batches, intakes, sales, orders, deliveries, customers, and audit events).
- **Tenant Scoping**: All operational queries and mutations enforce `businessId` checks via `requireUserAndBusiness(ctx)` and `requireExpectedIdentity(ctx, expectedUserId, expectedOrgId)`.
- **Atomic Operations**: Business onboarding, stock intake, sales checkout, customer creation, and inventory adjustments run within transactional Convex mutations.
- **Audit Logging**: Mutations append immutable audit logs to `auditEvents` table recording actor, action, timestamp, and sanitized metadata.

### 4.2 Legacy Database Retirement
- Prisma remains available solely as a build-time dependency for legacy migrations verification and type generation.
- Supabase browser and server database calls have been excised from the active operational request lifecycle (`WRE-115`).

---

## 5. Privacy, Observability & Analytics Controls

### 5.1 Error Tracking (Sentry)
- **Client Configuration**: `apps/app/instrumentation-client.ts`
  - `sendDefaultPii: false`
  - Strict before-send hook: `scrubSentryEvent` in `apps/app/lib/sentry/privacy.ts` strips cookies, request bodies, query strings, and authorization/token headers.
  - Browser noise and extension errors (`runtime.sendMessage`, `ResizeObserver`) are dropped before transmission.
- **Server & Edge Configuration**: `apps/app/sentry.server.config.ts`, `apps/app/sentry.edge.config.ts`
  - `tracesSampleRate: 0.1` in production.
  - PII scrubbing applied uniformly.

### 5.2 Product Telemetry (PostHog)
- **Client Configuration**: `apps/app/components/providers/posthog-provider.tsx`
  - Automatic pageview capture disabled on auth surfaces (`/login`, `/register`, `/waitlist`) and platform console (`/control/*`).
  - Retail transactional data, customer aliases, and notes are never dispatched to third-party analytics.

### 5.3 Encryption Keys
- PII fields (customer contact details, phone numbers, and physical delivery addresses) are encrypted at rest using AES-256-GCM via `DRX_PII_KEY_CURRENT_B64`.
- Blind indexes for duplicate customer lookups use HMAC-SHA256 via `DRX_PII_HASH_KEY_B64`.

---

## 6. Payment Live-Mode & Administration Access

### 6.1 Payment & Financial Modes
- DRX POS checkout enforces server-authoritative cash, store credit, and integrated payment processing.
- Live mode payment configurations require explicit per-tenant credentials and hardware pairing. No test credentials or payment bypasses are permitted in production builds.

### 6.2 Administrative Access & Least Privilege
- **Merchant Management**: Controlled by `OWNER`, `ADMIN`, `MANAGER`, and `CASHIER` roles within each tenant's Convex boundary.
- **Platform Infrastructure**: Governed by `PLATFORM_CONSOLE_SLUG`. Unauthenticated access or requests with an invalid slug return HTTP `404 Not Found`.

---

## 7. Verification Evidence & Command Log

| Verification Check | Target Command | Result |
| :--- | :--- | :---: |
| Environment Variable Contract | `pnpm test:env-contract` | **PASS** (43 keys) |
| Observability Contract | `pnpm test:observability-contract` | **PASS** |
| Policy & Hygiene Verification | `pnpm test:policy` | **PASS** |
| Native iOS Telemetry Sync | `pnpm test:ios:telemetry-config` | **PASS** |
| Release Integrity Verification | `pnpm release:integrity` | **PASS** |
| Production Secrets Validation | `gh secret list --env production` | **PASS** (5/5 present) |
| Staging Secrets Validation | `gh secret list --env staging` | **PASS** (5/5 present) |

---

## 8. Conclusion & Sign-Off

The production environment and integration audit is complete with all required gates satisfied. No blockers or missing dependencies were discovered. The application is authorized for authenticated E2E verification under **WRE-5**.
