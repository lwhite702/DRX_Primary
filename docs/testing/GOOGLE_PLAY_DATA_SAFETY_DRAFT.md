# Google Play Data Safety draft

Issue: WRE-49

Status: **review required — do not submit yet**

This inventory is based on Android 0.7.2 source at `f8b2238402cdd8b6a4c87adab9918baaeba3f01b`, the production EAS environment variable names, the generated Expo configuration, and the public legal/support pages verified on 2026-09-03. It contains no credentials or customer data.

## Top-level answers

| Play question | Draft answer | Evidence or condition |
| --- | --- | --- |
| Does the app collect or share required user data types? | Yes | Authentication, operations, analytics, and push services receive data off-device. |
| Is all transmitted user data encrypted in transit? | Yes, subject to final provider review | App endpoints are HTTPS/WSS and cleartext traffic is disabled. Confirm every production provider before submission. |
| Can users request that data be deleted? | Not policy-complete | DRX has administrative RTBF behavior, but Android has no in-app deletion-request path and the public policy does not provide a dedicated account-deletion URL. |
| Is data collection required or optional? | Mixed | Operator identity and core operational records are required; customer contact details and notification permission are optional. |

## Data-type inventory

The final Play form must be answered for every production SDK and backend, not only fields entered directly on the phone.

| Play category / data type | Collected | Shared | Purpose | Notes |
| --- | --- | --- | --- | --- |
| Personal info — Name | Yes | No, unless final provider classification requires it | Account management; app functionality | Operator display identity and optional customer names. |
| Personal info — Email address | Yes | No, unless final provider classification requires it | Account management; app functionality | Required for operator signup/login; optional for customer records. |
| Personal info — Phone number | Optional | No | App functionality | Optional customer field. |
| Personal info — Physical address | Optional | No | App functionality | Optional customer/delivery address; reveal is authorization-gated. |
| Personal info — User IDs | Yes | No | Account management; security; app functionality | Clerk user ID, business/tenant IDs, and device installation identity. |
| Financial info — Purchase history | Yes | No | App functionality; fraud prevention/security | Sales, line items, payment method, refunds/voids, and reconciliation. No payment-card number capture was found. |
| Financial info — Other financial information | Yes | No | App functionality | Customer credit limits, balances, and payments. |
| App activity — App interactions | Yes | No, subject to PostHog service-provider classification | Analytics; app functionality | PostHog lifecycle and screen analytics are enabled; touch autocapture and session replay are not enabled. |
| App info and performance — Crash logs / Diagnostics | Conditional | No, subject to Sentry service-provider classification | Analytics; developer communications | Source supports Sentry, but no production mobile DSN was observed. Decide whether it can be remotely enabled or will ship in any active artifact. |
| Device or other IDs — Device or other identifiers | Yes | No, subject to provider classification | App functionality; analytics; security | Local installation ID, Expo push token, and device/app metadata used by PostHog. |
| Other user-generated content | Yes | No | App functionality | Inventory/catalog records, operational notes, delivery state, and business configuration. Confirm Play's exact classification during final review. |

## Data types not evidenced in the Android source

- precise or approximate location;
- contacts/address book;
- photos or videos;
- audio files or voice recordings;
- health and fitness data;
- SMS or other private messages;
- web browsing history;
- advertising ID use; or
- payment-card or bank-account credentials.

The generated Android configuration declares only `android.permission.INTERNET`; external-storage/image permissions are explicitly blocked. Notification permission is requested at runtime on a physical Android device.

## Production providers to reconcile

- Clerk: operator authentication, user identity, sessions, and email verification.
- Convex: canonical application data, tenant-scoped operations, push-token registration, and offline-queue synchronization.
- PostHog: app lifecycle/screen analytics plus device/app metadata; session replay is disabled.
- Expo: EAS build/distribution and Expo push-token service.
- Sentry: conditional mobile error reporting; final declaration depends on whether the production artifact has a DSN.
- Vercel/API hosting: application API transport where mobile routes use the DRX web API.

For each provider, confirm controller/processor role, retention, deletion propagation, encryption, geographic processing, and whether Play treats the transfer as collection only or also sharing.

## Public URL verification

| Purpose | Canonical URL | Result on 2026-09-03 |
| --- | --- | --- |
| Privacy | `https://deelrxcrm.com/legal/privacy` | Redirects to `www` and returns HTTP 200. Content is too generic for the provider/data inventory above. |
| Terms | `https://deelrxcrm.com/legal/terms` | Redirects to `www` and returns HTTP 200. |
| Support | `https://deelrxcrm.com/resources` | Redirects to `www` and returns HTTP 200. This is the app-store metadata support URL. |
| Broken legacy support path | `https://deelrxcrm.com/support` | Returns HTTP 404. |
| Broken mobile documentation path | `https://docs.deelrxcrm.com` | DNS resolution fails. Android's Help screen currently opens this URL. |

## Required before Play submission

1. Approve and publish a privacy notice that identifies the production providers, data categories, purposes, retention/deletion behavior, and contact route.
2. Provide a public account-deletion request page and add an easy-to-find deletion path inside the Android app.
3. Replace the dead Android Help URL or restore the documentation domain.
4. Decide the production Sentry posture and verify PostHog configuration against the final signed artifact.
5. Review every table row with the product/privacy owner and record the approval in WRE-49.
6. Only then enter the answers in Play Console, save the draft, and submit it for review.
