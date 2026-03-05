# External Integrations

**Analysis Date:** 2026-03-05

## APIs & External Services

**Auth & Identity:**
- Clerk - session/auth widgets and server auth checks
  - SDK/Client: `@clerk/nextjs`, `@clerk/testing`
  - Auth config surfaces: `apps/app/app/login/[[...rest]]/page.tsx`, `apps/app/middleware.ts`
  - Test hooks: `apps/app/tests/e2e/global.setup.ts`

**Analytics:**
- PostHog - product analytics/events
  - SDK/Client: `posthog-js`
  - Usage present in dependency graph; event surfaces are app-level

**Error Monitoring:**
- Sentry - error tracking + release pipeline
  - SDK/Client: `@sentry/nextjs`
  - Workflow: `.github/workflows/sentry-release.yml`

## Data Storage

**Database:**
- PostgreSQL via Supabase + Prisma pathways
  - Supabase client usage in app APIs and scripts
  - Prisma schema at `apps/app/prisma/schema.prisma`
  - SQL migrations in `apps/app/db/migrations/` and `apps/app/supabase/migrations/`

**Edge Function Data Access:**
- Supabase Edge Functions (`apps/app/supabase/functions/**`) use service role access
  - Examples: `credit_risk`, `ai_insights`, `inventory_health`

## Authentication & Identity

**Primary Provider:**
- Clerk for user/session lifecycle
  - Protected routing and redirect enforcement in `apps/app/middleware.ts`
  - Auth routes with catch-all pages: `apps/app/app/login/[[...rest]]/page.tsx`, `apps/app/app/register/[[...rest]]/page.tsx`

## Monitoring & Observability

**Error Tracking:**
- Sentry package configured at root/app dependency level

**Analytics:**
- PostHog JS package present for client analytics capture

**Operational Readiness Artifacts:**
- Gate and readiness reports produced under `docs/testing/`
  - `PRODUCTION_READINESS_REPORT.md`
  - `FULL_GATE_RESULTS.json`

## CI/CD & Deployment

**Hosting:**
- Vercel deployment target (`vercel.json`, `.vercel/` metadata)

**CI Pipeline:**
- GitHub Actions workflows:
  - `ci-gate.yml` - quality/readiness gates
  - `version.yml` - version discipline
  - `sentry-release.yml` - release telemetry on main

## Environment Configuration

**Development:**
- `.env` at repo root
- Node/pnpm version policy enforced
- Clerk + Supabase keys required for full auth/data behavior

**Staging/Production:**
- Branch-driven deployment governance in policy docs (`DEVELOPMENT_PROCESS.md`, `RELEASE_POLICY.md`)
- Environment variables managed through deployment platform and CI secrets

## Webhooks & Callbacks

**Incoming:**
- Clerk webhook endpoint in `apps/app/app/api/webhooks/clerk/route.ts`

**Potential additional callback surfaces:**
- Auth route callbacks under `/api/auth/*` structure in `apps/app/app/api/auth/`

---

*Integration audit: 2026-03-05*
*Update when adding/removing vendors or endpoint integrations*
