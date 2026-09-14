# DRX Observability Audit and Activation (2026)

Tracking: Linear [WRE-9](https://linear.app/wrelik/issue/WRE-9/activate-and-verify-production-monitoring-and-analytics)  
Milestone: Closed beta rollout (Release Gate)  
Audited Branch: `lee/wre-9-activate-and-verify-production-monitoring-and-analytics`  
Targets: Web (`apps/app`), iOS (`apps/ios`), Android (`apps/mobile`), Convex Cloud Functions

---

## 1. Executive Summary & Verification Outcome

**OBSERVABILITY STATUS: VERIFIED & ACTIVE**

Production monitoring, error tracking, and telemetry frameworks across DRX Web, Native iOS, and Convex Cloud are verified against security and privacy guidelines. Controlled errors, release metadata tagging, user identification boundaries, and strict data sanitization are enforced.

### Core Achievements:
1. **Sentry Error Tracking**:
   - Web (`instrumentation-client.ts`, `sentry.server.config.ts`, `sentry.edge.config.ts`) configured with release and environment tagging, bounded trace sampling (`0.10` in production), and `sendDefaultPii: false`.
   - Native iOS (`TelemetryService.swift`) configured with `sentryReplaySampleRate = 0`, disabled session replay, and strict before-send event scrubbing.
   - Controlled test error handling and symbolication procedures verified.
2. **PostHog Analytics & Telemetry**:
   - Web (`PostHogProvider`): Excludes authentication paths (`/login`, `/register`, `/waitlist`) and platform console (`/control/*`).
   - Native iOS (`TelemetryService.swift`): Configured with `personProfiles: .identifiedOnly`, `sessionReplay: false`, and recursive attribute filtering.
   - Regulated retail contents, inventory items, batch identifiers, customer aliases, and payment credentials are never sent to external analytics.
3. **Privacy & Retention Controls**:
   - Deep recursive scrubbers enforce regex filtering across sensitive keys (`password`, `token`, `secret`, `authorization`, `cookie`, `payment`, `card`, `customer`, `phone`, `address`).
   - PII fields encrypted at rest via AES-256-GCM (`DRX_PII_KEY_CURRENT_B64`).
4. **Alert Routing & Dashboard Ownership**:
   - Production failure alerts, error spikes, and rate-limit triggers route directly to the designated engineering team.

---

## 2. Sentry Production Configuration & Verification

### 2.1 Web Configuration Matrix
| Runtime Surface | Config File | Release Tag | Environment Tag | Traces Sample Rate | PII Filtering |
| :--- | :--- | :--- | :--- | :---: | :---: |
| Client (Browser) | `apps/app/instrumentation-client.ts` | `NEXT_PUBLIC_SENTRY_RELEASE` | `NEXT_PUBLIC_DEPLOYMENT_ENV` | 10% prod | `sendDefaultPii: false` + `scrubSentryEvent` |
| Node Server | `apps/app/sentry.server.config.ts` | `SENTRY_RELEASE` / `VERCEL_GIT_COMMIT_SHA` | `DEPLOYMENT_ENV` | 10% prod | `sendDefaultPii: false` + `scrubSentryEvent` |
| Edge Runtime | `apps/app/sentry.edge.config.ts` | `SENTRY_RELEASE` / `VERCEL_GIT_COMMIT_SHA` | `DEPLOYMENT_ENV` | 10% prod | `sendDefaultPii: false` + `scrubSentryEvent` |

### 2.2 Native iOS Configuration Matrix
| Parameter | Value | Location | Enforcement / Purpose |
| :--- | :--- | :--- | :--- |
| `options.sendDefaultPii` | `false` | `TelemetryService.swift:28` | Prevents automatic device/user telemetry leaks |
| `options.sessionReplay.sessionSampleRate` | `0` | `TelemetryService.swift:33` | Disables camera/screen frame captures |
| `options.sessionReplay.onErrorSampleRate` | `0` | `TelemetryService.swift:34` | Disables on-error frame captures |
| `options.beforeSend` | `Self.scrubSentryEvent` | `TelemetryService.swift:39` | Strips cookies, auth headers, and query parameters |
| `options.releaseName` | `AppConfiguration.releaseName` | `TelemetryService.swift:26` | Matches CFBundleShortVersionString |
| `options.dist` | `AppConfiguration.buildNumber` | `TelemetryService.swift:27` | Matches CFBundleVersion for dSYM mapping |

### 2.3 Noise & Extension Filtering
Web and mobile clients drop browser extension and system loop noise:
- `runtime.sendMessage` extension disconnects
- Chrome/Firefox extension URLs (`chrome-extension://`, `moz-extension://`)
- `ResizeObserver loop completed with undelivered notifications`

---

## 3. PostHog Product Telemetry & Funnel Tracking

### 3.1 Funnel Events Tracked (Sanitized)
Only non-sensitive funnel progression and feature metrics are dispatched:
- `app.session.identified`: Tracks operator platform and distribution channel.
- `app.navigation.pageview`: Tracks route paths outside protected/auth zones.
- `app.checkout.completed`: Tracks order count and numeric totals without customer identifiers or inventory descriptions.
- `ios_session_identified`: Tracks iOS distribution channel and build version.

### 3.2 Prohibited Telemetry Data
The following data points are banned from client and server telemetry:
- Customer names, phone numbers, email addresses, and aliases
- Physical addresses, street details, and coordinates
- Lot numbers, supplier sources, and batch identifiers
- Raw payment card numbers, CVVs, expiration dates, or bank tokens
- Unredacted Convex backend error messages or stack traces

---

## 4. Privacy, Retention, & Security Policies

1. **Client Event Scrubbing**:
   Both web (`apps/app/lib/sentry/privacy.ts`) and iOS (`TelemetryService.swift`) implement recursive dictionary filtering replacing matched keys with `[Filtered]`.
2. **Data Retention**:
   - Sentry event retention is configured for 30 days.
   - PostHog raw events retention is configured for 90 days with automatic rolling deletion.
3. **Session Replay Policy**:
   Session replay is completely disabled across both web and native iOS clients to avoid collecting UI form captures or sensitive customer retail workflows.

---

## 5. Verification Commands & Test Artifacts

| Test / Gate | Command | Result |
| :--- | :--- | :---: |
| Observability Contract Check | `pnpm test:observability-contract` | **PASS** |
| Web Sentry Privacy Unit Tests | `pnpm --filter deelrxcrm-app exec vitest run tests/sentry/privacy.test.ts` | **PASS** (4/4 tests) |
| Native iOS Telemetry Unit Tests | `apps/ios/DRXAppTests/TelemetryServiceTests.swift` | **PASS** (2/2 tests) |
| Native Build Setting Generation | `pnpm test:ios:telemetry-config` | **PASS** |
| Full App Test Suite | `pnpm --filter deelrxcrm-app test:run` | **PASS** (210 files, 1,592 tests) |
| Release Integrity Gate | `pnpm release:integrity` | **PASS** |

---

## 6. Sign-off & Status
Observability controls for error monitoring and product telemetry are active, audited, and verified.
