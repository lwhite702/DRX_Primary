# Operational provider lifecycle

The app has three client-side operational providers with different mounting and data-handling behavior. Treat their initialization order, failure behavior, and privacy boundaries as release contracts.

## Current mounting

| Provider | Mount point | Current state |
| --- | --- | --- |
| `FeaturebaseProvider` | Root `apps/app/app/layout.tsx`, inside Clerk, Convex, error-boundary, and PostHog providers | Mounted on every non-auth route when `NEXT_PUBLIC_FEATUREBASE_APP_ID` is set |
| `OfflineProvider` | Authenticated app layout through `AppProviders` | Initializes IndexedDB and network listeners for operator routes |
| `ChunkRecoveryProvider` | No mount point in the current tree | Implemented but inactive until deliberately mounted and tested |

## Featurebase feedback and help

`FeaturebaseProvider` does not load on `/login`, `/register`, `/sign-in`, `/sign-up`, or `/waitlist`. It loads the Featurebase SDK after the page becomes interactive and initializes the feedback widget with organization, theme, sanitized email, sanitized user ID, and an optional SSO token.

- `NEXT_PUBLIC_FEATUREBASE_APP_ID` enables the global provider.
- `NEXT_PUBLIC_FEATUREBASE_ORG` selects the organization and falls back to `deelrxcrm`.
- `FEATUREBASE_JWT_SECRET` signs one-hour HS256 SSO tokens returned by `/api/featurebase/auth`.
- The SSO endpoint requires an authenticated Supabase user and returns `401` when signed out.
- The current root mount does not pass a user object, so the global widget is anonymous unless a caller supplies one. Do not describe SSO identity as active without runtime evidence.
- Widget metadata is explicitly `null`. Do not add customer, transaction, inventory, free-form note, or regulated-retail data to Featurebase metadata.
- Email and user ID are format-sanitized before SDK use, but sanitization is not consent or authorization. Any expansion of identity properties requires privacy review.

The help-library embed loads the same SDK separately on `/help/library`, initializes after script load, retries once after 300 ms if the SDK is late, and offers a manual reload action.

## Offline sync

`OfflineProvider` initializes `offlineSyncManager`, listens for browser online/offline events, polls the pending count every five seconds, and attempts queued sync when connectivity returns. It unregisters its listeners and timer on unmount.

The current manager stores complete queued transaction payloads in browser IndexedDB and retains synced records for up to seven days. Those payloads may include business, customer, inventory, credit, or checkout fields and are not encrypted by this layer. Treat offline persistence as a privacy and tenant-isolation release gate:

- never add secrets or unrestricted customer notes to queued payloads;
- verify sign-out clears or isolates cached data before production approval;
- verify retry, duplicate-submission, and cross-account behavior with real sessions;
- do not claim offline safety from provider mounting alone.

## Chunk recovery

`ChunkRecoveryProvider` is best-effort stale-client recovery. On mount it unregisters legacy service workers and clears Cache API entries, then listens for chunk-load failures. It performs at most one cache-busted reload per browser session using `sessionStorage`.

Because the provider is not currently mounted, no production recovery behavior should be claimed. Mounting it requires regression coverage for legitimate runtime errors, offline use, cache clearing, and the one-retry guard.

## Verification

For provider changes:

1. Run lint, typecheck, unit tests, build, and relevant browser tests.
2. Verify auth routes do not load Featurebase.
3. Verify missing Featurebase configuration fails closed without breaking navigation.
4. Verify identity and metadata in the browser without recording sensitive values.
5. Verify offline queue persistence, retry, sign-out reset, and second-account isolation.
6. Verify chunk recovery only after the provider has a deliberate mount point.
