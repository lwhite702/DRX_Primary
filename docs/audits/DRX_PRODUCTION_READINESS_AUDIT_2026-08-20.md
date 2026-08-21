# DRX production-readiness audit — 2026-08-20

Tracking: WRE-62  
Audited source: `codex/wre-readiness-blockers`; readiness snapshot at `8338449fd`, with WRE-63 remediation pending its draft PR
Latest observed `origin/main`: `8b51b8f47`
Deployed desktop release label observed in the authenticated UI: `v0.4.12`  
Repository version: `0.5.8`

This report supersedes the April 2026 readiness reports for current release decisions. It records no secrets, customer payloads, or personally identifying evidence. Moxie is optional and is not a DRX release gate.

The branch-local P1-P3 desktop UX remediation and its separate deployment gates
are tracked in `DRX_PRE_RC_UX_IMPROVEMENTS_2026-08-20.md`. Those improvements do
not change this report's release verdict.

## 1. Executive readiness verdict

**NOT READY**

DRX cannot currently prove or complete the required clean-account, cross-platform business workflow in production-equivalent conditions.

Verified positive evidence:

- A real desktop Clerk session reached the deployed operator dashboard.
- A browser refresh restored the authenticated session without returning to the login form.
- Unauthenticated `/dashboard` redirects to login, and unauthenticated inventory/team API requests return `401`.
- The current repair branch passes 470 web unit tests, 77 opt-in integration tests, exact-Node-22 type checking and release preflight, 28 required Playwright UI checks, 14 serious/critical accessibility checks, a 114-route application plus 31-route marketing production build, policy/security/environment/observability checks, and rollback verification for 28 enforced migrations.
- Native iOS arm64 Debug and unsigned device Release builds pass.
- Native iOS tests pass: 28 unit tests and one signed-out Clerk UI test.

Release-blocking evidence:

- Production identifies itself as `v0.4.12` while the repository is `0.5.8`; the tested source repairs are neither merged into the observed deployment nor proven deployed.
- The deployed Inventory route remains blocked by “Set up your business profile” even though the same session reaches an owner dashboard.
- The deployed Team route remains on a full-screen `Loading...` state after more than ten seconds.
- The deployed legacy `/sales` route renders no main content instead of the current-source redirect to `/pos/sale`.
- The deployed Quick Sale route has no available products for the authenticated workspace, so no transaction can be completed.
- The authenticated account was already provisioned; it cannot prove new registration, clean onboarding, business creation, or invitation acceptance.
- Web mutations use Prisma/PostgreSQL while native iOS product, customer, intake, checkout, reporting, and credit flows call Convex directly. No deployed dual-client round trip proves that both surfaces operate on the same authoritative records.
- No signed device or current TestFlight run proves production Clerk/Keychain session restoration, callback handling, or a complete iOS transaction.
- No second synthetic tenant was available for an authenticated cross-tenant denial test.
- Live Sentry/PostHog receipt was not verified with controlled errors.

No production data was mutated. Invitations, role changes, customer creation, inventory changes, and financial transactions require a designated synthetic business and action-time approval.

## 2. End-to-end workflow result

| Step | iOS result | Desktop result | Backend result | Evidence | Defect ID | Severity |
|---|---|---|---|---|---|---|
| 1. Register or sign in | Partially supported; signed-out Clerk UI test passes, real credentialed native sign-in not executed | Existing-user sign-in completed by the user; session survived refresh | Unauthenticated dashboard redirects to login; unauthenticated APIs return `401` | iOS UI test; deployed browser; anonymous HTTP checks | DRX-RDY-006 | P1 |
| 2. Complete onboarding | Native state-machine tests pass; live clean-account flow not executed | Not testable with the already-provisioned account | Native uses an atomic Convex mutation; web provisioning remains sequential and non-atomic | `OnboardingModelTests`; source trace | DRX-RDY-003 | P1 |
| 3. Create/configure business | Native UI/source present; no live persistence proof | Broken/inconsistent: owner dashboard exists while Inventory demands business setup | Web and native create business records in different backends; web values are partly hardcoded | Deployed Inventory and Dashboard; source trace | DRX-RDY-002, DRX-RDY-004 | P1 |
| 4. Configure initial owner/operator | Session/provisioning tests pass; no live native owner proof | Owner role is visible, but Team cannot finish loading | Current branch repairs owner permission handling; deployed status is unproved | Browser role label; WRE-13 repair tests | DRX-RDY-002 | P1 |
| 5. Add/invite user | Missing native management UI | Broken: Team stays on `Loading...`; no invitation sent | Invitation code exists, but acceptance/revoke/expiry lifecycle is not fully proved | Deployed Team; source trace | DRX-RDY-002, DRX-RDY-003 | P1 |
| 6. Assign roles/permissions | Read-only/missing for administration | Broken in deployed Team UI | Server authorization repairs pass locally but are not deployed; unique membership/webhook dedupe work remains | WRE-13 tests; WRE-16 source trace | DRX-RDY-011 | P1 |
| 7. Configure products/inventory | Native create/list screens compile; no live record | Blocked by business-profile state | Web uses Prisma inventory; iOS uses Convex products | Build plus deployed Inventory | DRX-RDY-004 | P1 |
| 8. Intake stock | Native intake screen compiles; no live batch | Blocked by Inventory route | FIFO/unit coverage exists locally, but no shared deployed intake proof | Source/build/tests | DRX-RDY-004, DRX-RDY-005 | P1 |
| 9. Create/locate customer | Native customer UI compiles; no live mutation | Customers route renders; no production mutation performed | WRE-17 authorization/lifecycle tests pass only on the repair branch | Browser route; 439/77 test runs | DRX-RDY-001 | P1 |
| 10. Complete transaction | Checkout UI/math tests pass; no signed-device sale | Quick Sale renders, but no products are available; no approved synthetic sale | No deployed cross-backend transaction proof | Browser Quick Sale; `CheckoutMathTests` | DRX-RDY-005 | P1 |
| 11. Verify results | Not executed | Not executed | Atomic inventory, FIFO, audit, totals, balances, and idempotency cannot be certified without the transaction | Scenario stopped at the first unavailable product/business state | DRX-RDY-005 | P1 |

## 3. Production blockers

| Severity | Surface | Workflow affected | Root cause | Files involved | Required fix | Regression test needed |
|---|---|---|---|---|---|---|
| P1 | Deployment | All desktop steps | Production reports `v0.4.12`; audited source is `0.5.8`, and deployed `/sales` behavior differs from current source | `.github/workflows/deploy-production.yml`, `VERSION`, `apps/app/app/(app)/sales/page.tsx` | Merge reviewed repairs, deploy the exact SHA through the production workflow, and expose release/commit identity | Deployment smoke test asserting release SHA and `/sales` redirect |
| P1 | Desktop/backend | Business, inventory, users, roles | Business/role resolution is inconsistent; Inventory treats the business as absent and Team can wait forever when no usable business/role is returned | `apps/app/lib/hooks/use-business.tsx`, `apps/app/lib/hooks/use-permission.ts`, `apps/app/app/(app)/inventory/page.tsx`, `apps/app/app/(app)/settings/team/_components/TeamClient.tsx` | Use one canonical provisioning record, represent absent/error states explicitly, and terminate every loader | Route tests for missing business, missing role, error, retry, and successful recovery |
| P1 | Web/native/backend | Onboarding and owner provisioning | Web setup performs sequential mutations and Clerk metadata writes; webhook registration can create a separate personal workspace; durable webhook dedupe and a unique membership constraint are absent | `apps/app/app/onboarding/_actions.ts`, `apps/app/lib/auth/clerk-user-sync.ts`, `apps/app/app/api/webhooks/clerk/route.ts`, `apps/app/prisma/schema.prisma`, `apps/app/convex/onboarding.ts` | Implement one atomic/idempotent canonical provisioning path, durable webhook receipt handling, and unique membership enforcement | Interrupted submit, double submit, webhook retry, invitation acceptance, and owner-permission tests |
| P1 | Cross-platform | Products through post-transaction verification | Native business operations call Convex while desktop operations call Prisma/PostgreSQL; no proven synchronization or single source of truth | `apps/ios/DRXApp/Core/API/ConvexClient.swift`, native feature views, `apps/app/app/api/inventory/*`, `apps/app/app/api/pos/*`, `apps/app/app/api/customers/*` | Choose and complete one authoritative backend or implement a transactional, observable cutover/sync with reconciliation | Credentialed create-on-one/read-on-the-other tests for product, intake, customer, sale, FIFO, and audit |
| P1 | Both | Transaction and post-transaction verification | No approved synthetic inventory/customer environment and no successful deployed sale were available | POS/checkout and reporting modules | Provision two isolated synthetic businesses, seed only through supported UI/API, and execute the full scenario on both surfaces | Idempotency, oversell, FIFO, tax, discount, totals, audit, refresh/restart, and cross-client assertions |
| P1 | iOS | Authentication through completed sale | No signed current-build device/TestFlight evidence; unsigned tests report unavailable Keychain entitlement | `apps/ios/project.yml`, `apps/ios/DRXApp/DRXApp.entitlements`, `apps/ios/Configuration/Release.xcconfig`, `apps/ios/DRXApp/Core/Auth/SessionStore.swift` | Archive/sign the reviewed SHA, distribute it internally, and run credentialed device E2E | Sign-in, callback, keychain restoration, expiration, sign-out, onboarding, and transaction UI tests on a signed build |
| P1 | Security | Tenant isolation | Anonymous denial is verified, but no authenticated second-tenant IDOR test was possible | Business-scoped API and Convex functions | Run two-account/two-business denial tests across every privileged read/write endpoint | Cross-tenant matrix for inventory, customers, roles, checkout, reports, and audit |
| P2 | Desktop UX | Navigation and all data routes | Deployed `v0.4.12` showed slow/full-screen reload behavior; the repair branch now retains last-good data, distinguishes initial/background/reconnect/error states, uses tailored skeletons, and requires explicit chunk reload | `apps/app/components/providers/chunk-recovery-provider.tsx`, `apps/app/lib/hooks/use-business.tsx`, `apps/app/lib/hooks/use-realtime.ts`, route loading files | Review and merge WRE-63, deploy the exact SHA, then measure and verify the behavior against real APIs | Navigation timing, no-full-reload, skeleton, error, retry, tenant-switch, and reduced-motion checks |
| P2 | Desktop UX | Tours | Deployed behavior remains unverified; the repair branch replaces manual viewport math with the existing Radix Popover anchor/collision/focus primitive and skips missing targets | `apps/app/components/ui/tour.tsx` and page tour definitions | Review and merge WRE-63, then run keyboard, edge-collision, resize, and assistive-technology checks in the deployed build | Viewport collision, keyboard, screen-reader, resize, route change, target-missing, and reduced-motion tests |
| P2 | iOS build tooling | Simulator development/CI | Convex Swift’s binary lacks an x86_64 simulator slice, so a generic simulator build fails | Swift package resolution and `apps/ios/project.yml` | Declare supported simulator architectures explicitly or update/replace the package with an x86_64 slice | CI builds both supported arm64 simulator and documented generic target policy |
| P2 | Observability | Failure diagnosis | SDK configuration and tests exist, but controlled events were not confirmed in live Sentry/PostHog | Sentry/PostHog config and telemetry adapters | Add a safe internal diagnostic event path and verify release/environment/correlation metadata in staging and production | Automated receipt check with data-minimized synthetic events |
| P2 | Database | Migration recovery | Rollback verification covers 28 enforced migrations; 21 legacy migrations have no down migration | `apps/app/prisma/migrations`, migration verification scripts | Create a reviewed recovery strategy for legacy migrations and verify the production schema fingerprint | Restore rehearsal and schema drift check against a production-like clone |

## 4. Platform parity matrix

| Feature | Native iOS | Desktop web | Material difference |
|---|---|---|---|
| Authentication | Partially supported | Partially supported | Desktop real sign-in/refresh verified; native only signed-out UI and session unit tests |
| Onboarding | Partially supported | Partially supported | Native writes Convex atomically; web writes Prisma sequentially; neither clean live flow verified |
| Business setup | Partially supported | Broken in deployed session | Desktop business state is internally inconsistent |
| User management | Missing | Broken | No native team administration; deployed Team never finishes loading |
| Roles/permissions | Read-only | Partially supported | Native displays operator state; desktop source has management UI, but deployed path is blocked |
| Products | Partially supported | Broken in deployed session | Native uses Convex; desktop Inventory is blocked |
| Inventory intake | Partially supported | Broken in deployed session | Native screen exists; no shared record proof |
| Inventory adjustment | Missing | Partially supported | Desktop source route exists; native has intake but no equivalent adjustment workflow |
| Customers | Partially supported | Partially supported | Both UIs exist, but native and desktop use different persistence paths |
| Transactions | Partially supported | Partially supported | Both checkout UIs exist; neither completed the required live scenario |
| Receipts | Partially supported | Partially supported | Source exists; reproducible cross-platform receipt not verified |
| Reporting | Partially supported | Partially supported | Both render report surfaces against different backends |
| Settings | Partially supported | Partially supported | Native exposes account/legal only; desktop settings is slow and Team is broken |
| Audit logs | Read-only/partial | Partially supported | No end-to-end immutable event verification |
| Offline behavior | Missing/unverified | Missing/unverified | No production-safe offline transaction workflow proved |
| Error handling | Partially supported | Partially supported | Native recovery views exist; desktop has persistent loaders and reload/chunk recovery |

## 5. Security and tenant-isolation findings

- Anonymous enforcement passed for the tested desktop surfaces: `/dashboard` returned a login redirect; `/api/inventory` and `/api/team` returned `401`.
- WRE-13, WRE-56, and WRE-17 repair server-side team, AI, and customer authorization on the isolated branch. Those repairs are not verified in the deployed `v0.4.12` application.
- Client-side hidden controls are not treated as authorization proof.
- Authenticated cross-tenant ID access remains unverified because a second synthetic tenant and its IDs were not available.
- Webhook replay/dedupe, membership uniqueness, and canonical user/business mapping remain WRE-16 blockers.
- The customer lifecycle repair uses normalized keyed hashes, tenant-scoped queries, PII-free audit metadata, and atomic archive/reactivation on the repair branch.
- No secret values were printed or copied into this report. Production configuration values remain redacted.
- Native telemetry tests verify nested sensitive-value scrubbing and disabled session replay, but live telemetry receipt was not confirmed.

## 6. Data-integrity findings

- Web unit/integration coverage on the repair branch passes for checkout math, authorization, customer lifecycle, inventory/audit paths, and duplicate handling.
- Native `CheckoutMathTests` pass for locale-aware currency parsing, tax/rounding bounds, and store-account-limit semantics.
- The customer lifecycle repair is transactional and duplicate-aware, including concurrent quick-create behavior.
- A deployed sale was not possible, so transaction uniqueness, FIFO batch consumption, stock decrement, customer history, tax totals, loyalty/credit balances, business reporting, attribution, timestamp/time zone, and audit immutability remain unverified in production.
- The Prisma/Convex split prevents a cross-platform correctness claim even where isolated unit tests pass.
- The deployed reports route showed zero completed sales and zero balance customers for the selected workspace; that is an empty-state observation, not a successful workflow.
- Production schema parity was not queried directly. Local Prisma validation passed; rollback coverage is incomplete for legacy migrations.

## 7. Configuration audit

All values are intentionally omitted.

| Environment | Sources | Required/critical names | Result |
|---|---|---|---|
| Local web development | `.env.example`, `apps/app/.env.example`, local secret manager | `DATABASE_URL`, Clerk public/secret/webhook keys, app/deployment URLs, privacy encryption/hash keys, KV rate-limit values, Sentry/PostHog values, Convex URL, legacy Supabase values where still used | Names documented; environment contract passes; runtime standardized on Node 22.23.1; real local values not inspected |
| CI | Workflow secrets plus test-only variables | Runtime names above; `CLERK_TESTING_TOKEN`, `BETA_E2E_*`, `E2E_REQUIRE_AUTH`, `VITEST_INCLUDE_INTEGRATION`, Playwright/visual/a11y variables; bypass variables must be non-production only | Integration opt-in repaired by WRE-57; credentialed CI E2E still absent |
| Staging desktop | Deployment secret manager | Production-like runtime names with staging Clerk, database, Convex, Sentry/PostHog release/environment, privacy keys, KV, storage and enabled integrations | Not live-verified in this audit |
| Production desktop | Vercel/deployment secret manager | Same runtime names with production Clerk/database/URLs; bypass/demo/test flags disabled; Sentry source-map credentials build-only; paired Upstash URL/token | Upstash variable names are present in preview and production without values being read; deployed release remains stale and is not tied to the audited SHA |
| Local iOS Debug | `Shared.xcconfig`, `Debug.xcconfig`, generated project settings | `DRX_APP_ENVIRONMENT`, `CLERK_PUBLISHABLE_KEY`, `DRX_API_BASE_URL`, `DRX_CONVEX_URL`; optional Sentry/PostHog locally | arm64 Debug build passed |
| TestFlight / production iOS | `Shared.xcconfig`, `Release.xcconfig`, signing/entitlements, CI/App Store Connect secrets | Production values for the five iOS runtime keys plus `SENTRY_DSN`, `POSTHOG_API_KEY`, `POSTHOG_HOST`; correct bundle ID, version/build, signing team, associated domains and Keychain access group | Unsigned Release build passed; signed archive/TestFlight not verified |

Native configuration validation requires HTTPS API/observability URLs, a Convex Cloud host, valid Clerk key shape, and Sentry/PostHog in production. The bundle identifier resolves to `com.wrelik.drx`; the callback scheme is the bundle identifier. Associated domains currently contain the Clerk web-credentials domain. The unsigned simulator test cannot validate the signed Keychain access group and emitted entitlement errors as expected.

Production-disallowed variables include `BYPASS_AUTH_FOR_TESTING`, `NEXT_PUBLIC_BYPASS_AUTH_FOR_TESTING`, `BYPASS_AUTH_USER_ID`, `BYPASS_AUTH_ORG_ID`, demo fixture names, and test-only feature flags/tokens.

## 8. Test report

### Commands and results

| Command | Result |
|---|---|
| `pnpm --filter deelrxcrm-app test:run` | Passed: 81 files, 470 tests |
| `pnpm --filter deelrxcrm-app test:integration` | Passed: 15 files, 77 tests |
| Exact Node 22.23.1 typecheck and release preflight | Passed |
| Changed-file web lint | Passed with 0 errors; legacy warnings remain |
| Full-repository web lint | Failed: 3,724 errors and 509 warnings, largely pre-existing generated/vendor content and restricted imports; remains a release gate |
| `pnpm test:policy` | Passed: 0 new findings, 6 baseline findings |
| Environment, observability, security, secret-file, and repository-hygiene contracts | Passed |
| Migration rollback verification | Passed for 28 enforced migrations; 21 legacy migrations lack down migrations |
| Required Playwright route checks | Passed: 8 public/auth plus 20 desktop/mobile protected checks; fixtures/bypass and no live database, so not credentialed E2E |
| Accessibility Playwright checks | Passed: 8 public plus 6 protected desktop/mobile checks with no serious/critical Axe findings; protected checks used auth bypass |
| Production Next builds | Passed: 114 application routes and 31 marketing routes; the first run found and the branch repaired a provider-boundary failure on `/inventory/search` |
| Generic Debug iOS simulator build | Failed: Convex binary missing x86_64 symbols |
| arm64 Debug iOS simulator build | Passed |
| arm64 unsigned device Release build | Passed with five unused-value warnings |
| Native unit tests | Passed: 28 tests |
| Native signed-out Clerk UI test | Passed: 1 test |

### Skipped or unproved

- Clean-account desktop and iOS credentialed onboarding
- Signed native authentication/session restoration and callback handling
- Invitation/acceptance/revocation/expiry live tests
- Two-business cross-tenant denial
- Full product/intake/customer/transaction/post-transaction workflow
- Offline/network-loss/concurrency/slow-response live matrix
- Large-data pagination/performance workflow
- Live Sentry/PostHog delivery
- Current-sha production deployment and TestFlight installation

No test was classified as flaky in the completed runs. The dominant coverage gap is deployed credentialed E2E, not compilation or isolated unit behavior.

## 9. Changes made in the isolated repair branch

These commits are local to `codex/wre-readiness-blockers` unless separately merged; none is claimed deployed.

| Commit | File area | Purpose | Before | After | Regression coverage |
|---|---|---|---|---|---|
| `f05da9707` | Governance/templates | WRE-55: make Moxie optional | Moxie evidence was treated as mandatory | Moxie is opt-in and not a release gate | Policy/template checks |
| `61b6bdf29` | Team API/auth | WRE-13: tenant and role authorization | Legacy/bypass-prone team authorization paths | Canonical server auth and tenant-scoped role enforcement | Team member/role route tests |
| `b9ac78d05` | AI API/auth | WRE-56: protect AI routes | AI endpoints did not consistently use canonical authorization | Tenant-aware authenticated AI handlers | AI route authorization tests |
| `19c3a22c1` | Vitest configuration | WRE-57: prevent false-green integration runs | Integration tests could be silently excluded | Explicit opt-in gate executes the intended suite | 15 files / 77 tests |
| `656042aec` | Customer APIs | WRE-17: customer tenant authorization | Customer reads/writes had inconsistent server enforcement | Canonical tenant-scoped server helpers | Customer route authorization tests |
| `808ff3e2a` | Customer lifecycle/UI | WRE-17: atomic duplicate-aware lifecycle | Archive/reactivation/history and quick-create consistency were incomplete | Atomic lifecycle, legacy duplicate fallback, history, and status-aware UI | Customer lifecycle and quick-create tests |
| `8338449fd` | This report and summary pointer | WRE-62: correct the stale readiness conclusion | April documents could be misread as current release approval | Dated evidence-backed NOT READY report | Documentation review plus reproducible commands |
| `ba8f60763`, `7fb335b2f` | Desktop UX/runtime/observability/tests | Complete the P1-P3 pre-RC UX list | Crowded dashboard, overlapping tours, blocking loaders/reloads, inconsistent transitions, stale tenant responses, and outdated runtime/observability wiring | Simplified Today view, Radix-anchored tour, shared/cached business state, tailored skeletons, nonblocking refresh/reconnect states, Node 22, pinned browser, and privacy-safe Sentry entrypoint | 470 unit, 77 integration, 28 route, 14 accessibility, exact-runtime/build/contracts |

## 10. Remaining work in release order

1. Merge or rebase the reviewed repair branch onto current `origin/main`, resolve conflicts, and rerun every web/native gate.
2. Complete WRE-16 canonical atomic/idempotent provisioning, membership uniqueness, webhook dedupe, and invitation lifecycle.
3. Decide and implement the authoritative cross-platform persistence architecture; prove reconciliation before migration/cutover claims.
4. Deploy an exact reviewed SHA to staging, expose release/commit metadata, and run the full clean-account workflow with two synthetic tenants.
5. Review, merge, and deploy WRE-63 so the branch-local business/role loading, stable shell, explicit empty/error states, tailored skeletons, and tour fixes can be verified against production APIs.
6. Complete product variants/tax/inventory batches, customer, checkout, FIFO, totals, audit, receipt, reporting, restart/refresh, duplicate, and oversell assertions on desktop.
7. Archive/sign that same SHA, install the current TestFlight build, and repeat the workflow on a physical iOS device.
8. Prove cross-client round trips in both directions and second-account isolation.
9. Run the required failure matrix, including offline, interruption, stale data, 4xx/5xx mapping, double-submit, and concurrency.
10. Verify Sentry/PostHog receipt with release/environment/correlation data and no sensitive payloads.
11. Rehearse production-like schema migration/restore and address legacy rollback gaps.
12. Complete native iOS parity for loading, refresh, error, and transition language, then close WRE-63 only after deployed desktop and device evidence is recorded.

## 11. Final verification checklist

- [ ] A new user can register
- [x] A returning desktop user can sign in
- [x] Desktop session restoration works after refresh
- [ ] Signed native session restoration works
- [ ] Onboarding completes on both surfaces
- [ ] Business creation completes once
- [ ] Initial owner setup completes
- [ ] Additional user setup completes
- [ ] Roles and permissions are enforced in deployed production
- [ ] Products can be created on both surfaces against the same data
- [ ] Inventory can be received on both surfaces
- [ ] Inventory totals remain correct
- [ ] Customers can be created on both surfaces
- [ ] A customer transaction completes on both surfaces
- [ ] Totals are correct
- [ ] Inventory decrements correctly using the intended batches
- [ ] The transaction appears on both platforms
- [ ] Restart and refresh preserve the same state
- [ ] No production-only crash occurs
- [x] arm64 Debug and unsigned device Release builds succeed
- [ ] Signed archive/TestFlight build succeeds and is installed
- [ ] All required automated gates pass (the focused suites pass; full-repository lint does not)
- [ ] No P0 or P1 defect remains
- [x] No Moxie requirement is needed
- [ ] No mock, bypass, or manual database intervention is required

The completion standard is satisfied through the second allowed outcome: DRX is proved not production-ready, and the current blockers, roots, impacted files, and repair sequence are documented. A future READY verdict requires a new credentialed, deployed, signed-device verification run.
