# DRX Wrelik 2.0.0 Cutover Handoff

**Date:** 2026-02-27 09:29 ET  
**Branch:** main  
**PRD Alignment:** Confirmed

## Final Scope

Cut DRX from temporary Wrelik shim bridging to official published `@wrelik/*@2.0.0` runtime exports.

- Upgraded app/root/mobile Wrelik dependencies to `2.0.0`
- Removed app-local shim layer (`apps/app/lib/wrelik-shims/*`)
- Removed temporary TS path alias indirection and shim-specific ESLint exceptions
- Updated adapters for upstream API deltas in `@wrelik/config/server` and `@wrelik/jobs/server`
- Updated mobile auth adapter to official runtime subpaths

## Files and Systems Changed

### Dependency version cutover

- `package.json`
- `apps/app/package.json`
- `apps/mobile/package.json`
- `pnpm-lock.yaml`

### App adapter/config cleanup

- `apps/app/tsconfig.json`
- `apps/app/eslint.config.mjs`
- `apps/app/wrelik.d.ts`
- `apps/app/lib/adapters/index.ts`
- `apps/app/lib/adapters/jobs.ts`
- deleted: `apps/app/lib/wrelik-shims/**`

### Mobile runtime path adoption

- `apps/mobile/src/adapters/auth/client.tsx`
- `apps/mobile/README.md`

## Validation Evidence

- `npm view @wrelik/* version` confirms published `2.0.0` for auth/config/errors/storage/db/email/jobs/analytics.
- `apps/app/node_modules/@wrelik/*/package.json` confirms `./server`, `./client`, `./shared` exports exist.
- Root-import scan in `apps/app` shows no remaining direct runtime imports from root `@wrelik/*` package names.
- App ESLint on touched adapter/config files: no errors (warnings only).
- App typecheck fails only on pre-existing unrelated strictness errors:
  - `apps/app/app/(app)/workspaces/_components/WorkspacesClient.tsx`
  - `apps/app/components/layout/business-switcher.tsx`
  - `apps/app/lib/hooks/use-business.ts`

## Risks and Rollback Protocol

### Risks

- Upstream package API evolution may require additional adapter updates beyond current `loadServerConfig` / jobs singleton compatibility.

### Rollback

1. Revert this cutover commit.
2. Restore shim layer and tsconfig/eslint bridge configuration.
3. Re-run lint/typecheck to ensure baseline parity.

## Prerequisites for Next Branch

1. Resolve remaining strict TS `implicit any` debt in app files listed above.
2. Optionally normalize remaining React peer dependency mismatches separately from this cutover.
