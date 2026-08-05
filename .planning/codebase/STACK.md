# Technology Stack

**Analysis Date:** 2026-03-05

## Languages

**Primary:**
- TypeScript 5.x - Application code across `apps/app`, `apps/marketing`, and `apps/mobile`

**Secondary:**
- JavaScript - Build/tooling scripts and config files
- SQL - Schema and migrations in `apps/app/prisma/` and `apps/app/db/migrations/`
- Markdown - Product, policy, and testing docs under `docs/`

## Runtime

**Environment:**
- Node.js `20.19.0` required via `package.json` engines and `.nvmrc`
- React 19 runtime in Next.js apps (`apps/app`, `apps/marketing`)
- Deno runtime for Supabase Edge Functions in `apps/app/supabase/functions/`

**Package Manager:**
- pnpm `9.15.9`
- Lockfile: `pnpm-lock.yaml`
- Workspace: `pnpm-workspace.yaml`

## Frameworks

**Core:**
- Next.js 16 (App Router) for web surfaces in `apps/app` and `apps/marketing`
- React 19 for UI rendering
- Expo/React Native in `apps/mobile`

**Testing:**
- Vitest for unit/integration tests (`apps/app/tests/**`)
- Playwright for E2E and a11y checks (`apps/app/tests/e2e/**`)

**Build/Dev:**
- Turborepo for monorepo task orchestration (`turbo.json`)
- Tailwind CSS v4 for styling (`apps/marketing/app/globals.css`, `apps/app/styles/`)
- Prisma for schema/client generation in app package scripts

## Key Dependencies

**Critical:**
- `next` - Web application runtime and routing
- `@clerk/nextjs` - Authentication and identity
- `@supabase/supabase-js` / `@supabase/ssr` - Data access and SSR session integration
- `@prisma/client` + `prisma` - ORM and migration tooling
- `zod` - Runtime schema validation for API boundaries

**Infrastructure:**
- `@sentry/nextjs` - Error monitoring and release instrumentation
- `posthog-js` - Analytics event tracking
- `@playwright/test` - Browser automation and E2E checks
- `vitest` - Fast TS-native test runner

## Configuration

**Environment:**
- Root `.env` and app-level environment variables
- Clerk keys and redirect config used by auth routes (`apps/app/app/login/[[...rest]]/page.tsx`)
- Supabase URLs/service keys used by APIs and edge functions
- Optional `doppler run` integration in app dev script (`apps/app/package.json`)

**Build:**
- Root `tsconfig` and package-level `tsconfig.json`
- `turbo.json` for pipeline behavior
- Next configs in each app package
- Workflow configs in `.github/workflows/*.yml`

## Platform Requirements

**Development:**
- macOS/Linux/Windows with Node + pnpm
- Local Next dev servers for app and marketing
- Optional Supabase local tooling for DB/edge testing

**Production:**
- Vercel-style Next.js deployments (see `vercel.json`, `.vercel/` metadata)
- GitHub Actions CI for gate/version/release workflows
- Managed external services for auth/data/monitoring/analytics

---

*Stack analysis: 2026-03-05*
*Update after major dependency or runtime changes*
