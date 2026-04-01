# Compliance Audit: Wrelik Modular Stack

**Date:** 2026-02-02
**Status:** DRAFT
**Auditor:** Antigravity

## 1. Executive Summary

The current DRX repository is significantly out of compliance with the Wrelik Modular Stack. The application heavily relies on Supabase for Authentication, Database, and Storage, which violates the requirement to use Clerk, Neon+Prisma, and Cloudflare R2 respectively. Additionally, third-party services like Sentry and PostHog are accessed via direct SDKs rather than through `@wrelik/*` adapters.

**Compliance Score:** 0/100 (Critical Hardening Required)

## 2. Vendor Inventory & Status

| Category      | Current Implementation    | Authoritative Stack                   | Status      | Violation                                  |
| :------------ | :------------------------ | :------------------------------------ | :---------- | :----------------------------------------- |
| **Auth**      | Supabase Auth             | **Clerk**                             | 🔴 Critical | Direct SDK use, wrong vendor.              |
| **Database**  | Supabase Postgres         | **Neon + Prisma**                     | 🔴 Critical | Wrong vendor, no Prisma, Supabase SDK use. |
| **Storage**   | Supabase Storage (likely) | **Cloudflare R2**                     | 🔴 Critical | Wrong vendor, likely component coupling.   |
| **Analytics** | PostHog (direct SDK)      | **PostHog** (via `@wrelik/analytics`) | 🟠 Major    | Direct SDK usage.                          |
| **Errors**    | Sentry (direct SDK)       | **Sentry** (via `@wrelik/errors`)     | 🟠 Major    | Direct SDK usage.                          |
| **Email**     | Unknown / Supabase?       | **Resend** (via `@wrelik/email`)      | 🔴 Critical | Mechanism undefined/non-compliant.         |
| **Jobs**      | Unknown                   | **Inngest** (via `@wrelik/jobs`)      | 🔴 Critical | Mechanism undefined/non-compliant.         |
| **Payments**  | None detected             | **Stripe**                            | ⚪️ N/A      | Only if required.                          |

## 3. Detailed Violations

### 3.1 Authentication (Supabase -> Clerk)

**Violating Files:**

- `lib/supabase/*` (client, server, admin clients)
- `lib/auth/server-guards.ts`
- `hooks/use-user-role.ts`
- `middleware.ts` (likely contains Supabase session handling)
- `components/onboarding/*`

**Remediation:**

- Remove `@supabase/ssr`, `@supabase/supabase-js`.
- Install `@wrelik/auth`.
- Implement Clerk middleware.
- Rewrite `useUserRole` and server guards to use Wrelik Auth.

### 3.2 Database (Supabase -> Neon + Prisma)

**Violating Files:**

- `lib/supabase/client.ts`
- `lib/utils/*-engine.ts` (business logic coupled to Supabase queries)
- `scripts/*` (direct DB scripts)
- `db/migrations_combined.sql` (Supabase specific)

**Remediation:**

- Install `@wrelik/db` (which wraps Prisma).
- Introspect current DB or define canonical `schema.prisma`.
- Replace all `supabase.from(...)` calls with `wrelikDb.model.findMany(...)`.
- Point `DATABASE_URL` to Neon.

### 3.3 Storage (Supabase -> R2)

**Violating Files:**

- Likely `components/crm/*` (file uploads)
- `lib/supabase/*`

**Remediation:**

- Install `@wrelik/storage`.
- Replace file upload logic with R2 presigned URLs.

### 3.4 Direct SDK Usage (Banned Imports)

**Violating Files:**

- `package.json`: `@sentry/nextjs`, `posthog-js`, `@vercel/analytics`.
- `instrumentation.ts`: Sentry init.
- `components/providers/posthog-provider.tsx`: Direct Provider.

**Remediation:**

- Uninstall direct SDKs.
- Initialize via `@wrelik/config` or specific adapter init functions.
- Replace usage with generic Wrelik interfaces.

## 4. Migration Plan

### Phase 2: Wrelik Kit Integration

1.  **Install dependencies**: Add all `@wrelik/*` packages.
2.  **Shim Adapters**: Create local wrappers if full migration is too large, OR strict cutover. _Decision: Strict cutover required._
3.  **Replace Imports**:
    - `posthog-js` -> `@wrelik/analytics`
    - `@sentry/nextjs` -> `@wrelik/errors`
4.  **CI Enforcement**: Add `eslint-plugin-no-restricted-imports` to ban `supabase`, `sentry`, `posthog`.

### Phase 3: Core Modular Stack

1.  **DB & Auth (The Big Shift)**:
    - Define Prisma Schema.
    - Setup Clerk.
    - Refactor all Data Access Layer (DAL) to use Prisma via `@wrelik/db`.
    - Refactor Auth Layer to use Clerk via `@wrelik/auth`.
2.  **Storage**: Move assets to R2.

### Phase 4: Hardening

1.  Remove Supabase project completely.
2.  Verify tenant isolation.
3.  Full regression test.

## 5. Risks and Rollback

**Risks:**

- **Data Loss**: Migrating DB and Storage.
- **Downtime**: Auth switch will log everyone out.
- **Feature Breaks**: Complex queries in Supabase might not map 1:1 to Prisma without effort.

**Rollback Strategy:**

- Keep Supabase project active until Phase 4 definition of done is met.
- Use feature flags for new Wrelik code where possible (though unlikely for base auth/db).
- **Primary Rollback**: Revert git branch to `chore/stack-policy-audit`.

## 6. Definition of Done

- [ ] No `supabase` imports exist in userland code.
- [ ] No `sentry`, `posthog` imports in userland code.
- [ ] `package.json` contains only `@wrelik/*` and UI libs.
- [ ] Application boots with `DATABASE_URL` pointing to Neon.
- [ ] Auth flows work with Clerk.
- [ ] `npm run build` passes.
