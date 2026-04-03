# DRX Next Wrelik Runtime Subpath Migration Handoff

**Date:** 2026-02-27 07:19 ET  
**Branch:** main  
**PRD Alignment:** Confirmed

## Final Scope

This handoff covers the DRX Next.js migration to consume Wrelik adapters through runtime subpaths in app code:

- `@wrelik/*/server`
- `@wrelik/*/shared`

Because currently published `@wrelik/*` packages do not yet expose `./server|./client|./shared`, this change includes a temporary shim layer in `apps/app/lib/wrelik-shims/*` to preserve runtime behavior while enforcing import policy in app-layer code.

## Files and Systems Changed

### App import migration

- `apps/app/lib/adapters/auth/server.ts`
- `apps/app/lib/adapters/auth.ts`
- `apps/app/lib/adapters/index.ts`
- `apps/app/lib/adapters/errors.ts`
- `apps/app/lib/adapters/analytics.ts`
- `apps/app/lib/adapters/jobs.ts`
- `apps/app/lib/adapters/email.ts`
- `apps/app/lib/adapters/storage.ts`
- `apps/app/lib/storage.ts`
- `apps/app/check_duplicates.ts`

### Compatibility + typing

- `apps/app/tsconfig.json` (path aliases for `@wrelik/*/server|shared`)
- `apps/app/wrelik.d.ts` (ambient types for `@wrelik/analytics`)
- `apps/app/lib/wrelik-shims/auth/server.ts`
- `apps/app/lib/wrelik-shims/auth/shared.ts`
- `apps/app/lib/wrelik-shims/config/server.ts`
- `apps/app/lib/wrelik-shims/db/server.ts`
- `apps/app/lib/wrelik-shims/email/server.ts`
- `apps/app/lib/wrelik-shims/jobs/server.ts`
- `apps/app/lib/wrelik-shims/storage/server.ts`
- `apps/app/lib/wrelik-shims/analytics/server.ts`
- `apps/app/lib/wrelik-shims/errors/server.ts`
- `apps/app/lib/wrelik-shims/errors/shared.ts`

### Guardrails

- `apps/app/eslint.config.mjs` (shim-folder exception so bridge files can import legacy roots)

## Validation Evidence

### Import policy scan

- Root import scan in `apps/app` (excluding shims) shows no direct root `@wrelik/*` runtime imports remaining.

### Lint check

- Targeted ESLint run on changed files completed with no errors.
- Existing warnings remain in adapter files for `no-explicit-any` / unused variable; no new lint error introduced by migration.

### TypeScript check

- Migration-specific TypeScript issues were resolved (subpath resolution + analytics shim typing).
- `tsc --noEmit` still reports pre-existing unrelated strictness errors:
  - `apps/app/app/(app)/workspaces/_components/WorkspacesClient.tsx`
  - `apps/app/components/layout/business-switcher.tsx`
  - `apps/app/lib/hooks/use-business.ts`

## Risks and Rollback Protocol

### Current risk

- Temporary shim layer can drift from upstream package surfaces if `@wrelik/*` packages change without synchronized cleanup.

### Rollback protocol

1. Revert this commit.
2. Restore prior root imports (or previous commit state).
3. Re-run lint/typecheck to confirm baseline parity.
4. If partial rollback is required, keep shim aliases and only roll back consuming files incrementally.

## Prerequisites for Next Branch

1. Publish/upgrade `@wrelik/*` versions that expose official `./server|./client|./shared` exports.
2. Remove local shim layer `apps/app/lib/wrelik-shims/*`.
3. Remove temporary path aliases in `apps/app/tsconfig.json`.
4. Tighten ESLint rule to disallow shim exceptions after upstream subpaths are available.

## Summary for Reviewers

This change enforces DRX-side runtime subpath consumption now, without re-vendoring package code, and keeps compatibility via explicit temporary shims until upstream package exports catch up.
