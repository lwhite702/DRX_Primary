# Testing Patterns

**Analysis Date:** 2026-03-05

## Test Framework

**Runner:**
- Vitest for unit/integration/regression suites
- Playwright for end-to-end and accessibility flows

**Assertion Library:**
- Built-in `expect` from Vitest / Playwright test runner

**Run Commands:**
```bash
pnpm test
pnpm test:unit
pnpm test:integration
pnpm test:e2e:web
pnpm test:a11y
pnpm test:security
pnpm test:perf
pnpm test:readiness
```

## Test File Organization

**Location:**
- Primary test tree: `apps/app/tests/`
- Scripted gate checks: `scripts/testing/`

**Sub-areas in app tests:**
- `apps/app/tests/auth/`
- `apps/app/tests/integration/`
- `apps/app/tests/e2e/`
- `apps/app/tests/pos/`
- `apps/app/tests/quick-pos/`
- `apps/app/tests/privacy/`
- `apps/app/tests/security/`
- `apps/app/tests/regression/`

**Naming:**
- Unit-style: `*.unit.test.ts`
- Integration-style: `*.integration.test.ts`
- E2E specs: `*.spec.ts`

## Test Structure

**Suite Organization:**
- `describe` + `it/test` style in Vitest suites
- Dedicated folders per concern/domain

**Patterns:**
- Mock external dependencies for unit/integration isolation
- Use dedicated e2e setup for Clerk testing tokens where needed
- Keep readiness gates as command-based aggregate checks

## Mocking

**Framework:**
- Vitest mocks via `vi.mock(...)`

**What gets mocked frequently:**
- Clerk server/auth modules
- Supabase client wrappers
- External side effects in integration boundaries

## Coverage

**Approach:**
- Coverage commands available at root and package level
- Coverage is used as a signal, while release gating is primarily pass/fail command based

## Test Types

**Unit:**
- Business logic and utility behavior in isolation

**Integration:**
- Route/middleware/auth/data interactions with controlled mocks

**E2E:**
- Browser-level user flows with Playwright, including auth route behavior and accessibility smoke checks

**Readiness Gates:**
- `scripts/testing/run-full-gate.ts` maps Gate 0-6 and produces report artifacts

## Common Patterns

**Auth testing:**
- Clerk token setup in Playwright global setup
- Middleware redirect assertions in dedicated tests

**Policy/claim testing:**
- Policy checks via `scripts/testing/policy-check.ts`
- Marketing claim consistency checks via `scripts/testing/marketing-claims-check.ts`

---

*Testing analysis: 2026-03-05*
*Update when frameworks, gate definitions, or test topology change*
