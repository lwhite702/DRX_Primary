# Google Play Data Safety inventory

Status: working compliance draft for WRE-27 and WRE-49. Do not copy these answers into Google Play until every verification item below is closed.

## Artifact in scope

- App: Deelrx CRM / DRX
- Android package: `com.wrelik.drx`
- Current Internal testing artifact: version `0.7.1`, version code `5`
- Artifact source: `21d3d74120fd0d8a7ec9576219755e9f1a4195eb`
- Current source reviewed: `e0f663794af0768f285ffe9932b0e6258862537f` (`origin/main` on 2026-09-03)
- Mobile runtime changes after the artifact source are limited to the app/package version moving from `0.7.1` to `0.7.2`; later README and EAS configuration changes do not add a mobile data flow.

This inventory distinguishes information entered by a subscribing business from device data collected automatically. It also distinguishes customer-entered street addresses from device-derived precise location. The Android app does not request device location permission.

## Provisional Play declaration map

| Google Play category | Collected | Shared | Primary purposes | Source evidence |
| --- | --- | --- | --- | --- |
| Personal info — name | Yes | No, subject to service-provider verification | App functionality, account management | Clerk user profile; Convex operator session; customer first and last name |
| Personal info — email address | Yes | No, subject to service-provider verification | Authentication, account management, support | Clerk sign-in/profile; operator and customer records |
| Personal info — user IDs | Yes | No, subject to service-provider verification | Authentication, security, tenant authorization | Clerk user ID; Convex operator ID |
| Personal info — address | Yes, when a business enters it | No, subject to service-provider verification | Delivery and customer management | Customer and delivery records |
| Personal info — phone number | Yes, when a business enters it | No, subject to service-provider verification | Customer management | Customer create/edit workflow |
| Personal info — other info | Yes | No, subject to service-provider verification | App functionality, authorization | Business membership, roles, permissions, aliases, notes, age-verification fields |
| Financial info — purchase history | Yes | No, subject to service-provider verification | Checkout, transaction history, reporting, audit | Sales, line items, refunds/voids, delivery, offline receipts |
| Financial info — credit or other financial information | Yes | No, subject to service-provider verification | Merchant-managed balances and credit | Credit limits, balances, repayments, credit transactions |
| Financial info — payment information | Limited | No, subject to service-provider verification | Payment reconciliation | Tender type, amount, and limited payment reference; no full card or bank credentials |
| App activity — app interactions | Yes when PostHog is configured | No, subject to service-provider verification | Analytics and product improvement | `PostHogProvider`; mobile session replay disabled |
| App activity — other user-generated content | Yes | No, subject to service-provider verification | App functionality and support | Product descriptions, business/customer notes, feedback content |
| App info and performance — crash logs | Yes when Sentry is configured | No, subject to service-provider verification | Diagnostics | `@sentry/react-native` initialization through `@wrelik/errors` |
| App info and performance — diagnostics | Yes when Sentry is configured | No, subject to service-provider verification | Reliability, security, debugging | Error and diagnostic context |
| Device or other IDs | Yes | No, subject to service-provider verification | Security, offline authorization, push notifications | Android ID or random installation ID; Expo push token |
| Precise or approximate location | No device-derived location | No | Not collected from device | No location dependency or permission; customer-entered addresses are declared as Personal info — address |

`Shared: No` is provisional because Google Play can exclude transfers to service providers acting on the developer's behalf. Confirm the provider contracts, configuration, and provider use restrictions before relying on that exception. If any provider uses data for an independent purpose outside the exception, update the affected row to `Shared: Yes`.

## Data flow and safeguards

- Clerk receives authentication identifiers, credentials, session data, and operator profile information.
- Convex receives tenant-scoped operational records, including inventory, customer, sale, balance, delivery, audit, device-registration, and offline-sync records.
- Expo and Google receive mobile distribution/device-service data and push tokens. Push payloads are limited to delivery reminder routing data; lock-screen visibility is configured as private.
- PostHog can receive app interaction and device/technical data. Mobile session replay is explicitly disabled.
- Sentry can receive crash, device, performance, and diagnostic data when its DSN is configured.
- Featurebase receives webview traffic and feedback/roadmap content when an operator opens that screen.
- On-device Clerk tokens and the operator-session cache use SecureStore. The Android offline database uses SQLCipher, and Android app-data backup is disabled.
- Network traffic is intended to use HTTPS and the Android release configuration disables cleartext traffic.

## Verification required before saving Data Safety in Play

1. Publish and anonymously verify the expanded policy at `https://deelrxcrm.com/legal/privacy`; the source change alone is not public evidence.
2. Verify the exact PostHog mobile defaults and production project settings, including autocapture, IP handling, retention, and that session replay remains off.
3. Verify Sentry event scrubbing, attachment settings, diagnostic retention, and that customer or transaction payloads are not added as event context.
4. Verify Clerk, Convex, Expo/Google, PostHog, Sentry, Vercel, and Featurebase data-processing terms support the Play service-provider exception used above.
5. Replace or remove the mobile Featurebase SSO request to `http://localhost:3000`; the release build currently cannot use that endpoint, and no cleartext exception should be added.
6. Confirm the public account-deletion request URL and implement an in-app deletion initiation path. The current Android source allows account creation but exposes no account-deletion workflow.
7. Confirm whether age-verification ID numbers and birth dates are present in the canonical Convex mobile schema or only in transitional REST types; disclose them if they can be entered or synced.
8. Inspect the final signed AAB permission and SDK report after the next build. Re-run this inventory whenever a dependency, permission, provider, or data flow changes.
9. Obtain compliance/legal review of merchant-managed credit classification and the final Data Safety answers.

## Explicit exclusions observed in source

- No advertising SDK or Android Advertising ID permission.
- No device contacts, calendar, photo library, external storage, microphone, camera, health, or fitness collection in the reviewed Android configuration.
- No full payment-card or bank-account credentials are required by the reviewed mobile flows.
- No mobile session replay.
- No review submission, production publication, or Data Safety form save is authorized by this document.
