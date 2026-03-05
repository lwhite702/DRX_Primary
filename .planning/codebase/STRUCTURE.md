# Codebase Structure

**Analysis Date:** 2026-03-05

## Directory Layout

```
DRX_Primary/
├── apps/                    # Deployable applications
│   ├── app/                 # Authenticated operator web app
│   ├── marketing/           # Public marketing site
│   └── mobile/              # Expo/React Native client
├── packages/                # Shared packages and vendored references
├── scripts/                 # Repo-level automation and test orchestration
├── docs/                    # Product, policy, and readiness documentation
├── tooling/                 # Shared config/tooling packages
├── .github/workflows/       # CI/CD pipelines
├── package.json             # Root scripts/dependencies/policies
├── pnpm-workspace.yaml      # Workspace package mapping
└── turbo.json               # Monorepo task pipeline config
```

## Directory Purposes

**apps/app:**
- Purpose: operator-facing transactional system
- Contains: Next.js routes, API handlers, lib/services, Prisma, tests
- Key files: `apps/app/app/`, `apps/app/middleware.ts`, `apps/app/prisma/schema.prisma`
- Subdirectories: `tests/`, `lib/`, `db/`, `supabase/`

**apps/marketing:**
- Purpose: marketing and product positioning surfaces
- Contains: Next.js routes, landing sections, canonical copy modules
- Key files: `apps/marketing/app/page.tsx`, `apps/marketing/lib/feature-canon.ts`
- Subdirectories: `components/marketing/landing/`, `app/product/`, `app/resources/`

**apps/mobile:**
- Purpose: mobile operator experience
- Contains: Expo routes/components/services
- Key files: `apps/mobile/app/(tabs)/`, `apps/mobile/src/services/apiClient.ts`

**scripts/testing:**
- Purpose: policy/readiness/perf/security/claims gate automation
- Key files: `run-full-gate.ts`, `policy-check.ts`, `marketing-claims-check.ts`

**docs:**
- Purpose: policy, release, testing, and integration documentation
- Key files: `README.md`, `WRELIK_AGENTS.md`, `docs/testing/*`

## Key File Locations

**Entry Points:**
- `apps/app/app/` - operator app pages + APIs
- `apps/marketing/app/` - marketing routes
- `apps/mobile/app/` - mobile routes

**Configuration:**
- `package.json` - root scripts/dependencies
- `apps/app/package.json`, `apps/marketing/package.json`, `apps/mobile/package.json`
- `turbo.json`, `pnpm-workspace.yaml`, `.nvmrc`, `.node-version`

**Core Logic:**
- `apps/app/lib/` - business/domain modules
- `apps/marketing/lib/feature-canon.ts` - canonical marketing data

**Testing:**
- `apps/app/tests/` - unit/integration/e2e/security/privacy/pos suites
- `scripts/testing/` - repo-level gate scripts

**Documentation:**
- `docs/` - testing + governance docs
- Root policy docs (`DEVELOPMENT_PROCESS.md`, `RELEASE_POLICY.md`, etc.)

## Naming Conventions

**Files:**
- TS/TSX in kebab-case for many modules
- React components in PascalCase or kebab-style depending on folder convention
- Tests use `*.test.ts`, `*.spec.ts`, and focused suffixes (`*.unit.test.ts`, `*.integration.test.ts`)

**Directories:**
- Feature/domain grouping under `app/` route segments and `lib/` modules
- Route grouping uses App Router conventions (`(app)`, `(tabs)`, `[id]`, `[[...rest]]`)

## Where to Add New Code

**New operator feature:**
- UI/routes: `apps/app/app/`
- Domain logic: `apps/app/lib/`
- Tests: `apps/app/tests/`

**New marketing section/content:**
- Route/composition: `apps/marketing/app/`
- Components: `apps/marketing/components/marketing/`
- Canonical copy/types: `apps/marketing/lib/feature-canon.ts`

**New gate/policy automation:**
- Script: `scripts/testing/`
- Docs output: `docs/testing/`

## Special Directories

**Generated/build artifacts:**
- `.next/`, `coverage/`, `playwright-report/`, `.turbo/`
- Purpose: build/test outputs
- Committed: no (artifact directories)

**Planning artifacts:**
- `.planning/` (created by GSD workflow)
- Purpose: project planning and codebase map documents
- Committed: depends on team workflow

---

*Structure analysis: 2026-03-05*
*Update when directories/routes are reorganized*
