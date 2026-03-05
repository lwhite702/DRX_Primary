# Coding Conventions

**Analysis Date:** 2026-03-05

## Naming Patterns

**Files:**
- TypeScript-first (`.ts`/`.tsx`) throughout apps
- Route files follow Next conventions: `page.tsx`, `route.ts`, dynamic `[id]`, catch-all `[[...rest]]`
- Tests use explicit suffixes: `*.test.ts`, `*.spec.ts`, `*.unit.test.ts`, `*.integration.test.ts`

**Functions:**
- `camelCase` for regular functions and handlers
- Action/handler naming aligned to domain intent (checkout, audit, policy check)

**Variables & Constants:**
- `camelCase` for locals
- `UPPER_SNAKE_CASE` for env-like constants and script-level fixed tokens

**Types:**
- `PascalCase` for interfaces/types
- Literal unions used for strict mode/status typing where practical

## Code Style

**Formatting:**
- ESLint + TypeScript checks drive style consistency
- Tailwind utility-heavy JSX with shared global class utilities in marketing/app CSS
- Semicolon usage is consistent across TS modules

**Linting:**
- Root: `pnpm lint`
- Package-specific lint scripts in app/marketing/mobile package manifests

## Import Organization

**Observed pattern:**
1. External imports
2. Internal alias imports (`@/`)
3. Relative imports

**Path Aliases:**
- `@/` alias is used heavily in app and marketing packages

## Error Handling

**Patterns:**
- Validate input/schema near boundaries (routes/actions)
- Return explicit HTTP status mapping in API handlers
- Use integration tests for auth/middleware/data-path regressions

**Error Surfacing:**
- Readiness gate scripts aggregate failing commands into report files
- Monitoring packages (Sentry) available for runtime issue capture

## Logging

**Approach:**
- Script-level console output for gate and audit scripts
- API-level error handling focuses on structured response behavior

## Comments

**Usage:**
- Sparse and intent-focused comments in production code
- Heavier explanatory comments in scripts/tests/templates

## Function Design

**Patterns:**
- Small focused route handlers + domain modules
- Explicit return payloads (especially for API response contracts)
- Guard clauses common in validation/auth paths

## Module Design

**Exports:**
- Named exports predominant for reusable modules
- Canonical constants collected in focused modules (example: feature canon)

**Separation:**
- UI composition in components/routes
- Domain behavior in `lib/`
- Script automation in `scripts/testing/`

---

*Convention analysis: 2026-03-05*
*Update when lint rules or dominant coding patterns change*
