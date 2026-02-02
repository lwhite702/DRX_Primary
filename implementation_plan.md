# Phase 3: Modular Stack Migration Plan

**Goal**: Migrate DRX to the authoritative Wrelik stack:

- **Database**: Supabase Postgres -> Neon + Prisma
- **Auth**: Supabase Auth -> Clerk
- **Storage**: Supabase Storage -> Cloudflare R2
- **Direct SDKs**: Removed in favor of `@wrelik/*` adapters.

## User Review Required

> [!IMPORTANT]
> **Dependency Resolution**: The `@wrelik/*` packages are failing to install (404/Private).
> **Workaround**: I will remove them from `package.json` and rely on `wrelik.d.ts` for type checking during this refactor.
> **Runtime**: The application will NOT run locally until these packages are available or linked.

## Proposed Changes

### Database (Prisma + Neon)

- [NEW] `prisma/schema.prisma`: Canonical schema definition derived from `db/migrations_combined.sql`.
- [NEW] `lib/db.ts`: Prisma Client instance (replacing Supabase client for DB ops).
- [MODIFY] `lib/utils/*-engine.ts`: Refactor all business logic to use `prisma.*` instead of `supabase.*`.
- [DELETE] `db/migrations_combined.sql` (after verification).

### Auth (Clerk)

- [MODIFY] `middleware.ts`: Replace Supabase Auth middleware with Clerk Middleware.
- [MODIFY] `hooks/use-user-role.ts`: Re-implement using Clerk hooks (`useUser`, `useAuth`).
- [MODIFY] `lib/auth/server-guards.ts`: Update server-side auth checks.

### Storage (R2)

- [MODIFY] `components/crm/*`: Update file upload components to use signed URLs via `@wrelik/storage`.

### Cleanup

- [DELETE] `lib/supabase/*`: Remove old clients.

## Verification Plan

### Automated Tests

1.  **Type Check**: `tsc --noEmit` to ensure all new `prisma` calls are type-safe.
2.  **Lint**: `pnpm lint` to ensure no banned imports.
3.  **Unit Tests**: Run `vitest` (might need mocking for Prisma).

### Manual Verification

1.  **Schema Check**: `npx prisma format` and `npx prisma validate`.
2.  **Migration**: `npx prisma migrate dev` (requires valid DATABASE_URL).
