# DRX Mobile (Expo)

`apps/mobile` is the DRX Expo client in the DRX monorepo.

## Runtime Policy

- **Node.js:** `20.18.0` (exact, matches monorepo policy)
- **pnpm:** `9.15.9`

## Development

From the repo root:

```bash
pnpm --filter deelrxcrm-mobile install
pnpm --filter deelrxcrm-mobile start
```

Or inside `apps/mobile`:

```bash
pnpm install
pnpm start
```

## Auth Integration Boundary

- Mobile auth SDK usage is isolated in `/Users/lee/Projects/DRX_Primary/apps/mobile/src/adapters/auth/client.tsx`
- `AuthContext` consumes the adapter and maps session shape through `@wrelik/auth/react-native`
- Direct vendor imports (Clerk/Supabase/etc.) are restricted in `src/**` outside adapters via ESLint

## Note on `@wrelik/*/client`

The current published `@wrelik/auth` package exposes `@wrelik/auth/react-native` (used here).  
When upstream publishes a `@wrelik/auth/client` alias, mobile imports should switch to that alias without changing the app-level adapter boundary.

