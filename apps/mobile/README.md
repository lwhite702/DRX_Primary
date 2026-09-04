# DRX Mobile (Expo)

`apps/mobile` is the DRX Expo client in the DRX monorepo.

## Runtime Policy

- **Node.js:** `22.23.1` (exact, matches monorepo policy)
- **pnpm:** `10.17.1`
- EAS build profiles pin the same Node.js and pnpm versions as local development and CI.

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
- `AuthContext` consumes the adapter and maps session shape through `@wrelik/auth/client`
- Direct vendor imports (Clerk/Supabase/etc.) are restricted in `src/**` outside adapters via ESLint

## Android and Convex

- Android application ID: `com.wrelik.drx`
- Minimum Android version: Android 12 (API 31)
- Compile and target SDK: Android 16 (API 36)
- Data plane: Clerk-authenticated Convex queries and mutations
- Offline checkout: SQLCipher-backed queue for owner-authorized cash and customer-credit sales

The current Convex offline contract uses `offline.configurePolicy`,
`offline.getPolicy`, `offline.registerDevice`, `offline.issueAuthorization`, and
`offline.syncSale`. Reconciliation is exposed through
`offline.listReconciliationCases`, `offline.resolveReconciliationCase`, and
`offline.dismissReconciliationCase`; older queue-oriented function names are
not part of the implemented API.

The local and EAS environments must provide these public runtime variables:

```text
EXPO_PUBLIC_CLERK_PUBLISHABLE_KEY
EXPO_PUBLIC_CONVEX_URL
```

Run every EAS command from this directory; the repository root is not an Expo app.

```bash
cd apps/mobile
eas config --platform android --profile closed-test
eas build --platform android --profile development
eas build --platform android --profile preview
eas build --platform android --profile closed-test
```

- `development` and `preview` create internally distributed APKs.
- `closed-test` creates a store-distributed AAB, uses the EAS `preview` environment, and auto-increments the remote Android version code.
- Closed-test submission targets Google Play's `alpha` track with `draft` status, so a submission cannot become tester-visible without an explicit Play release action.
- `production` creates an auto-incremented AAB from the EAS `production` environment and also defaults submissions to `draft`.

The current closed-test lane uses the approved non-production Convex deployment. Do not configure the `production` EAS environment with that development URL; production requires its own approved Convex deployment. Offline checkout remains unavailable until an owner or admin explicitly saves risk limits and authorizes the Android device.
