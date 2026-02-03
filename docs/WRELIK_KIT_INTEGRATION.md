# Wrelik Kit Integration

**Date:** 2026-02-28
**Status:** ACTIVE (Phase 2 & Phase 3 Complete)

## Dependency Method

DRX consumes `wrelik-kit` packages via **npm/pnpm**.
The packages are pinned to exact versions as defined in migration requirements.

## Integrated Packages

The following packages are required and installed (pinned to version 0.1.1):

- `@wrelik/auth@0.1.1`
- `@wrelik/auth/next@0.1.1`
- `@wrelik/db@0.1.1`
- `@wrelik/storage@0.1.1`
- `@wrelik/analytics@0.1.1`
- `@wrelik/errors@0.1.1`
- `@wrelik/email@0.1.1`
- `@wrelik/jobs@0.1.1`
- `@wrelik/config@0.1.1`

## Installation Procedure

### Prerequisites

1. Ensure environment variables are set according to `docs/ENV_MATRIX.md`
2. Run: `pnpm install` to install all @wrelik dependencies
3. Verify packages are installed: `pnpm list @wrelik`

### Adapter Initialization

All adapters are initialized centrally in `lib/adapters/index.ts`.

**IMPORTANT:** Adapters must be initialized once at application startup. Initialization calls include:

1. **Database** (`@wrelik/db`)
2. **Auth** (`@wrelik/auth` + `@wrelik/auth/next`)
3. **Storage** (`@wrelik/storage` with R2)
4. **Analytics** (`@wrelik/analytics` with PostHog)
5. **Errors** (`@wrelik/errors` with Sentry)
6. **Jobs** (`@wrelik/jobs` with Inngest)
7. **Email** (`@wrelik/email` with Resend)

## Usage Guidelines

### Database

**Legacy:** `import { createClient } from '@supabase/supabase-js'`
**Wrelik:** `import { db } from '@wrelik/db'`

All database operations should use the singleton `db` instance from `@wrelik/db`.

### Storage

**Legacy:** `import { S3Client } from '@aws-sdk/client-s3'`
**Wrelik:** `import { storage } from '@wrelik/storage'`

File operations are automatically tenant-scoped via the adapter wrapper.

### Auth

**Legacy:** `import { auth } from '@clerk/nextjs/server'`
**Wrelik:** `import { auth } from '@wrelik/auth/next'`

Server-side auth uses `@wrelik/auth/next`.
Client-side auth components use exports from `@wrelik/auth/next`.

### Analytics

**Legacy:** `import posthog from 'posthog-js'`
**Wrelik:** `import { analytics } from '@wrelik/analytics'`

Use `analytics.track()`, `analytics.identify()`, and `analytics.page()` methods.

### Errors

**Legacy:** `import * as Sentry from '@sentry/nextjs'`
**Wrelik:** `import { errorTracker } from '@wrelik/errors'`

Use `errorTracker.capture()`, `errorTracker.captureMessage()`, and `errorTracker.breadcrumb()`.

### Email

**Legacy:** Direct Resend SDK usage
**Wrelik:** `import { email } from '@wrelik/email'`

Use `email.send()` and `email.sendTemplate()` methods.

### Jobs

**Legacy:** Direct Inngest SDK usage
**Wrelik:** `import { jobs } from '@wrelik/jobs'`

Use `jobs.send()` to trigger background tasks.

## Validation

To verify integration:

1. `pnpm build` must pass.
2. `npm run compliance:full` must pass with zero violations.
3. `npm run lint` must generally pass (except defined legacy exclusions in test mocks).
4. No direct vendor imports in `app/`, `components/`, `lib/`.
5. All adapter imports must come from `lib/adapters/` directory.

## Migration Notes

- Legacy Supabase client interfaces are maintained in `lib/supabase/` for backward compatibility but internally use `@wrelik/db`.
- Legacy Clerk imports in middleware and providers are replaced with `@wrelik/auth/next`.
- All @sentry/nextjs imports replaced with `@wrelik/errors`.
- All @aws-sdk imports replaced with `@wrelik/storage`.
- Test files use mocks from `@wrelik/db` instead of Supabase.
