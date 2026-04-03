# Architecture

**Analysis Date:** 2026-03-05

## Pattern Overview

**Overall:** Monorepo with multi-surface product architecture.

**Key Characteristics:**
- Workspace split between operator app, marketing site, and mobile client
- Next.js App Router for web runtime and route-level server/client composition
- Policy-driven release gates and branch promotion workflow
- Mixed data access model (adapter boundaries + transitional legacy modules)

## Layers

**Experience Layer:**
- Purpose: User-facing pages and interactive components
- Contains: route pages, UI components, marketing sections
- Depends on: domain/data services and auth/session helpers
- Used by: browser/mobile clients

**Domain/Service Layer:**
- Purpose: Business logic for POS, inventory, privacy, credit, and reporting
- Contains: modules under `apps/app/lib/**`, route actions, validation schemas
- Depends on: data/auth adapters
- Used by: API routes and server components

**Integration Layer:**
- Purpose: External service orchestration and adapter boundaries
- Contains: auth, database, analytics, error tooling wrappers
- Depends on: vendor SDKs and environment config
- Used by: domain/services and middleware

**Governance/Test Layer:**
- Purpose: enforce release readiness, policy rules, and quality thresholds
- Contains: `scripts/testing/**`, `docs/testing/**`, CI workflows
- Depends on: package scripts and test suites
- Used by: local/dev/CI pipelines

## Data Flow

**Web Request Flow (Operator App):**
1. Request enters Next route in `apps/app/app/**`
2. Middleware checks auth/redirect logic (`apps/app/middleware.ts`)
3. Route handler or server component validates payloads/sessions
4. Domain logic executes in `apps/app/lib/**`
5. Data operations occur through Supabase/Prisma paths
6. Response/UI state returns to client

**Marketing Page Flow:**
1. Request resolves in `apps/marketing/app/**`
2. Static/SSR composition pulls canonical marketing content from `apps/marketing/lib/feature-canon.ts`
3. UI sections render with status-aware claims

**State Management:**
- Mostly request-scoped server state
- Local component state for UI interactions
- Persistent state in Postgres/Supabase tables

## Key Abstractions

**Canonical Content Modules:**
- Purpose: keep marketing/public claims centralized and status-labeled
- Examples: `apps/marketing/lib/feature-canon.ts`
- Pattern: typed constants consumed by multiple pages/components

**Route Contract Validation:**
- Purpose: enforce payload and mode constraints
- Examples: POS and privacy schema modules under `apps/app/lib/**`
- Pattern: schema-first validation at API boundaries

**Readiness Gates:**
- Purpose: map release eligibility to explicit gate checks
- Examples: `scripts/testing/run-full-gate.ts`, `docs/testing/BETA_LAUNCH_CHECKLIST.md`
- Pattern: command-driven pass/fail aggregation

## Entry Points

**Web (Operator):**
- Location: `apps/app/app/`
- Trigger: Next.js route requests
- Responsibilities: authenticated app behavior, API handlers, dashboard/ops flows

**Web (Marketing):**
- Location: `apps/marketing/app/`
- Trigger: public marketing traffic
- Responsibilities: acquisition pages, product pages, resources/legal

**Mobile:**
- Location: `apps/mobile/app/`, `apps/mobile/src/`
- Trigger: Expo app runtime
- Responsibilities: mobile operator workflows

## Error Handling

**Strategy:**
- Boundary handling at route/API level with integration test coverage
- Monitoring via Sentry package integration
- Gate scripts surface failing commands for release decisions

**Patterns:**
- Schema validation before mutation paths
- Role/auth checks in middleware and route handlers
- Explicit status-aware API responses for operational flows

## Cross-Cutting Concerns

**Validation:**
- Zod-based schema validation in multiple modules

**Authentication:**
- Clerk with middleware-protected route behavior

**Observability:**
- Sentry + readiness/security/perf scripts in `scripts/testing/`

**Policy Governance:**
- Root policy docs drive branching, release, and versioning behavior

---

*Architecture analysis: 2026-03-05*
*Update when major routing/layering patterns change*
