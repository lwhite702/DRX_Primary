# Wrelik Kit Integration

**Date:** 2026-02-02
**Status:** ACTIVE

## Dependency Method

DRX consumes `wrelik-kit` packages via **npm**.
The packages are assumed to be available in the configured registry (or globally linked for development).

## Integrated Packages

The following packages are required and installed:

- `@wrelik/auth`
- `@wrelik/auth-next`
- `@wrelik/db`
- `@wrelik/storage`
- `@wrelik/analytics`
- `@wrelik/errors`
- `@wrelik/email`
- `@wrelik/jobs`
- `@wrelik/config`

## Versioning

All `wrelik-kit` packages should be kept in sync.
Upgrades are validated by running the full compliance suite: `pnpm run check`.

## Usage Guidelines

### Analytics

**Legacy:** `import posthog from 'posthog-js'`
**Wrelik:** `import { analytics } from '@wrelik/analytics'`

### Errors

**Legacy:** `import * as Sentry from '@sentry/nextjs'`
**Wrelik:** `import { errorTracker } from '@wrelik/errors'`

### Auth

**Legacy:** `supabase.auth...`
**Wrelik:** `import { auth } from '@wrelik/auth'` (Migration in Phase 3)

## Validation

To verify integration:

1. `pnpm build` must pass.
2. `eslint` must generally pass (except defined legacy exclusions).
3. No direct vendor imports in `app/` or `lib/`.
