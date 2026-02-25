# Wrelik Kit Integration (DRX Beta Baseline)

## Status

- Source of truth for integration packages: published `@wrelik/*` packages (registry)
- Vendored copies in `packages/wrelik-*`: reference only, not workspace-resolved
- Monorepo policy: app/mobile code integrates through `@wrelik/*` and local adapters, not direct vendor SDK imports

## How DRX Consumes `@wrelik/*`

DRX pins `@wrelik/*` versions in the root `package.json` via `pnpm.overrides` and installs them from the registry.

Current pinned versions (beta baseline):

- `@wrelik/auth@0.2.2`
- `@wrelik/db@0.1.2`
- `@wrelik/storage@0.2.0`
- `@wrelik/analytics@0.2.0`
- `@wrelik/errors@0.2.0`
- `@wrelik/email@0.1.2`
- `@wrelik/jobs@0.1.2`
- `@wrelik/config@0.2.0`

## Workspace De-shadowing (Important)

`pnpm-workspace.yaml` explicitly excludes vendored `wrelik` packages:

```yaml
packages:
  - "apps/*"
  - "packages/*"
  - "!packages/wrelik-*"
```

This prevents workspace linking from silently using vendored copies instead of the pinned registry packages.

## Approved Integration Boundaries

Use these boundaries in DRX app/mobile code:

- Auth (server + UI): local adapters under `apps/app/lib/adapters/auth/*`, backed by `@wrelik/auth`
- Auth (mobile): local adapter under `apps/mobile/src/adapters/**`, backed by `@wrelik/auth` (`/react-native` today)
- Errors: `@wrelik/errors` or local error adapter wrappers
- Analytics: `@wrelik/analytics`
- Jobs: `@wrelik/jobs`
- Email: `@wrelik/email`
- Storage: `@wrelik/storage`
- Supabase (legacy bridge only): `apps/app/lib/supabase/**`

## Banned Direct Vendor Imports (Enforced by ESLint)

DRX fails compliance lint if runtime app/mobile code imports vendor SDKs directly outside approved adapter/bridge paths.

Restricted families include:

- `@clerk/*`
- `@sentry/*`
- `posthog*`
- `resend`
- `inngest`
- `@aws-sdk/*` (S3 clients must stay behind `@wrelik/storage`)
- `@supabase/*` (except the approved legacy bridge)

### Allowed Exceptions (Narrow)

- `apps/app/lib/adapters/**` and `apps/mobile/src/adapters/**` during adapter implementation
- `apps/app/lib/supabase/**` (legacy bridge only)
- Test files (`*.test.*`, `*.spec.*`) where vendor test helpers are required (for example Clerk Playwright helpers)
- Vendored reference packages in `packages/wrelik-*` are ignored by lint scanning

## Actionable Replacements

Use these replacements when lint fails:

- `@clerk/*` -> `apps/app/lib/adapters/auth/*` (app) or `apps/mobile/src/adapters/auth/*` (mobile)
- `@sentry/*` -> `@wrelik/errors` or local error adapter
- `posthog*` -> `@wrelik/analytics`
- `@aws-sdk/client-s3` -> `@wrelik/storage`
- `resend` -> `@wrelik/email`
- `inngest` -> `@wrelik/jobs`
- `@supabase/*` -> `apps/app/lib/supabase/**` (only if the legacy bridge is explicitly needed)

## Temporary Fallback Policy (Removable)

Default policy is registry-pinned `@wrelik/*` only.

If DRX is blocked by missing published APIs (for example a needed client entrypoint), use a temporary fallback only as a last resort:

- Git dependency pinning to a specific `wrelik-kit` commit, or
- Tarball dependency pinning

Removal criteria for any fallback:

1. Required API is released in `wrelik-kit`
2. DRX pins move back to registry versions
3. Fallback pin and any local workaround notes are deleted in the same PR

## Mobile `/client` Entry Point Note

Target policy is `@wrelik/*/client` entrypoints for mobile.

Current beta baseline uses `@wrelik/auth/react-native` behind `apps/mobile/src/adapters/auth/client.tsx` because the published `@wrelik/auth` package does not yet expose a stable `/client` alias. This is the only documented exception and should be removed once `/client` is published.

## Verification Commands (Repo Root)

Run these from `/Users/lee/Projects/DRX_Primary`:

```bash
pnpm run verify:lock
pnpm run verify:tarballs
pnpm run compliance:imports
```

## Related Docs

- `/Users/lee/Projects/DRX_Primary/README.md` (Node policy, domain routing, Quick POS overview)
- `/Users/lee/Projects/DRX_Primary/docs/db-overview.md` (DB truth artifact for tenant-scoped POS/reporting)
