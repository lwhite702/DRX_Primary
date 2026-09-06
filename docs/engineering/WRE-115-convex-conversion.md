# WRE-115: Complete Convex conversion

Status: In Progress. User authorized the full conversion. Nothing in this working branch is released.

Tracking: https://linear.app/wrelik/issue/WRE-115/complete-drx-migration-to-convex-as-the-sole-application-database

## Completion contract

Convex is the sole operational database for all supported web and native workflows. Existing records, relationships, stock, money, permissions and audit history must survive the transition. Runtime Prisma/Postgres fallbacks are not an acceptable final state. Clerk remains the authentication provider; replacing the application database does not mean replacing external services.

Production deployment and destructive data operations remain approval-bound. Keep this work In Progress or In Review until migration and deployed workflows are verified.

## Verified baseline

Production source inspected at 076b801c12b57e02182a1530b4b36df6b383a972. Static direct-import inventory found 48 API route files and 6 API helpers importing legacy persistence. This is a lower bound: service, server-action and compatibility-shim callers add indirect dependencies. Commerce reports deliberately read both ledgers; ordinary web checkout still writes the legacy ledger.

## Work sequence and evidence required

1. Inventory and commerce: migrate catalog reads/creation/editing, intake and approvals, adjustments, FIFO batches, audit, checkout, stock validation, pricing, sales history and reports together. Reconcile product identity, historical costs, pending intake and stock before rollout. Test fractional quantity, cost precision, simultaneous writes and replay behavior.
2. Identity and business: replace legacy user/business lookups, onboarding/server actions, settings, team roles, admin operations, Clerk synchronization, sessions and mobile session resolution. Preserve multi-business selection and effective permissions; the current Convex user model needs review against legacy memberships and overrides.
3. Customers and balances: convert lifecycle, search, credit and payment operations. Preserve encryption, deletion, balances, customer references and transaction history; verify cents and tenant boundaries.
4. Supporting workflows: notifications, AI/pricing jobs, privacy queues, security, integration authentication and health checks. Verify actual callers instead of treating unused helpers as active features.
5. Data migration: build a resumable, tenant-scoped mapping and reconciliation process with synthetic dry runs first. Preserve source identifiers as migration metadata, never infer identity from names. Validate counts, references, stock, FIFO value, balances, sales totals and audit coverage. Do not overwrite live data with a development snapshot.
6. Retirement: remove legacy runtime adapters, imports, Prisma packages/generation, database settings and fallback branches only after their callers and data are migrated. Add a guard against reintroducing legacy operational persistence.
7. Verification and release: full test suite, app/native typechecks, builds, release integrity, local deployment and authenticated workflow tests. Then prepare reviewed versioned deployment, reconcile production data and verify live workflows with approved fixtures. Passing source checks alone cannot close this issue.

## Current branch progress

- Intake and approval APIs use Convex with request idempotency, tenant checks, cost-deviation approval, FIFO batches and atomic stock/audit writes.
- Catalog GET and POST now use Convex. GET preserves offset/search behavior using bounded indexed pages and returns cursor metadata. Product creation validates integer-cent amounts and selected business; initial stock creates a FIFO batch.
- New catalog query tests verify that intake stock is visible through catalog reads, anonymous requests fail and another tenant cannot read a product.
- Broader Convex and converted API suites: 78 tests passed after product edit, adjustment and audit cutover. A subsequent audit visibility/tenant test also passed (5/5 stock adjustment tests).
- App typecheck passed after generated API refresh. Local Convex schema/functions pushed successfully, including the audit entity index. Full app and marketing builds passed.

## Open compatibility and verification work

- Product edit, adjustment and inventory audit routes now use Convex. Shared inventory hooks still need complete pagination and reactive Convex updates.
- Product edit retries and concurrent stock edits need the same request identity/stale-count protection as dedicated adjustments.
- Stock reductions currently fail atomically if more than 4096 historic batches must be examined or batch totals disagree; replace the history bound with indexed active-batch traversal and a verified migration before release.
- Audit now reads canonical product/intake events. Checkout conversion must emit stock audit events so sales-related changes remain visible.
- Product creation without explicit commerce configuration must preserve the caller's selling unit. Supplier references need a canonical schema/migration policy; do not silently discard supported fields.
- Existing native recordIntake still autoapproves. Reconcile native approval and idempotency behavior while preserving installed-client response contracts.
- Legacy API tests outside the converted suites require replacement with equivalent Convex behavioral coverage, not deletion to obtain green checks.
- Current code remains unreleased; complete migration verification is outstanding.

## Checkout and session checkpoint

- Quick checkout and quote now always use Convex, including ordinary no-customer carts. The canonical adapter no longer imports Prisma or checks the old sales table. Migration must import completed legacy checkout request identities before cutover to prevent historical retry duplication.
- Shared `resolveAuthContext` now derives the selected business from an authenticated Convex membership query. Canonical IDs and explicit legacy business mappings are accepted. Existing single-business Convex user records still require a complete multi-business membership migration before release.
- Product/customer cart identity resolution uses bounded indexed lookups and rejects foreign/inactive records. POS product search returns canonical prices and stock. Checkout validators now accept canonical record IDs.
- Added optional business activity and migrated tenant permission fields. Inactive businesses are denied centrally; existing native role defaults and migrated web role matrices are retained.
- Focused checkout/session/identity suites: 22 tests passed. Full suite snapshot before the final role fixture: 782 passed, 20 failed across 2 files (platform-boundary approval mocks and commerce-settings access). These failures remain open and must be resolved by preserving authorization behavior through conversion.
- Full checkout, checkout-enhanced and sales API still use legacy writers. Their fee, payment reference, mixed/Zelle payment and delivery contracts must be represented in Convex before removal. Checkout bootstrap, preflight and stock/credit validation remain to convert.
- Commerce settings still reads/writes Prisma and its permission tests expose the mixed backend path. Convert merchant/product settings and server guards next, preserving owner/admin/manager defaults, explicit tenant grants, inactive-business denial and platform separation.

## Commerce settings and tenant-authorization checkpoint

- Commerce settings GET/PATCH now operate entirely in Convex. Merchant and product changes validate and commit atomically with an audit event; invalid product references roll back merchant changes. Notification recipients must be active tenant managers and rates must fit basis-point precision.
- Removed the settings page's duplicate direct mutation plus web PATCH flow and the manual web/mobile customer/product linking controls. Loads and saves verify the current Convex business. Failed/obsolete loads cannot replace newer state.
- Tenant server guards now query Convex permissions. Platform-admin lookup remains separate and still needs conversion. A tenant grant for users.manage_all is always denied.
- Backend commerce settings tests: 12 passed. Real route/Convex authorization integration tests: 12 passed. UI loading/recovery tests: 9 passed. Platform-boundary tests passed in the subsequent full-suite run; the full-run results and subsequent targeted verification are recorded below.
- Added scripts/migration/check-convex-runtime.mjs. It parses actual TypeScript imports, separates type-only imports, includes dynamic imports and reports remaining legacy dependencies. Initial report: 119 runtime imports in 104 files, plus 6 type-only imports. It exits nonzero by default while runtime dependencies remain; --report is an audit mode, not a passing gate. This structural check does not prove data migration or runtime behavior.
- Prior 20-failure snapshot is superseded by the targeted fixes above; the new full-suite result must be recorded before claiming all tests pass.

Latest full-suite snapshot after settings conversion: 808 passed and 2 failed (119 files). Both failures were the old Prisma-backed server-business-permissions fixture. Replaced it with a real Convex permission integration covering owner, manager, cashier, foreign actor/tenant, platform-scope denial and provider failure. All 40 targeted authorization/settings/UI tests passed. Do not report this snapshot as a complete green suite. A test-fixture generic type error was corrected; the fresh app typecheck passed.

## Stock and credit preflight checkpoint

- Stock validation, credit validation and combined preflight now query Convex in one authenticated snapshot. Canonical and explicitly mapped legacy product IDs aggregate into the same stock request, so duplicate lines cannot pass individually when their combined quantity exceeds availability. Product selling rules, inactive records, tenant membership and checkout permission are checked.
- Routes preserve their existing stock error shapes, validate integer-cent amounts and sanitize provider failures. No validation route imports Prisma or the legacy checkout core. These are advisory snapshots; the checkout mutation must continue to recheck before committing.
- The POS engine now supplies the selected business header and fails closed when credit validation is unavailable. Credit replies map canonical balances into its existing interface.
- Existing Convex policy uses a zero customer credit limit as unlimited. Responses make this explicit with unlimited=true and remaining=null. Legacy no-credit/zero-limit records must not be blindly imported as unlimited; the historical credit policy needs an explicit migration representation before release. Full checkout conversion must also restrict credit checks to the actual financed amount/payment method.
- Root suite: 833 tests passed across 120 files. Local anonymous Convex compile/push passed. Release integrity passed. Fresh app typecheck and full app/marketing build passed after correcting an afterEach test callback return type. The build still generates Prisma because other application domains remain unconverted.
- Structural retirement audit is now 116 runtime legacy imports in 101 files, plus 6 type-only imports. Full checkout, remaining operational domains, data migration and deployed verification remain incomplete. Production unchanged.

## Full-checkout settlement foundation

- Convex quote/checkout now accepts bounded integer-cent miscellaneous fees and persists them separately from merchandise and tax. Canonical and legacy reconciliation totals, CSV and the report table include fee revenue; fee revenue contributes to net revenue and gross profit.
- Canonical checkout stores bounded payment references, supports exact Zelle settlement and mixed tender, and assigns only an unpaid mixed remainder to customer credit. Fully settled mixed tender does not require a credit customer. Fees/reference/tender participate in replay identity; omitted/empty new fields preserve existing native fingerprint behavior. Credit-limit failures roll back all writes.
- Checkout stock deductions now emit per-product audit events, once per successful transaction, so inventory history includes sales alongside intake/adjustments.
- Additive optional schema/result fields preserve existing rows and clients. Full web checkout/checkout-enhanced/sales API still need conversion: delivery profiles and independently priced delivery, authorized price overrides, displayed tax/quote parity, native/installed-client semantics and stable client request IDs must be completed before switching those writers. No fields may be silently dropped.
- The first full suite at this foundation passed 844 tests across 121 files. Subsequent focused verification added a historical-fee reconciliation case and exposed a timing-sensitive existing push test (fake timer advanced through a live dispatch lease). Its success-path scheduler ordering now waits for due sends before advancing future timers, preserving the exact three-send assertion. Final focused verification/build results follow; production unchanged.

Final settlement-foundation verification: root suite 845/845 tests across 121 files, app typecheck, full app/marketing build, local anonymous Convex compile/push and release integrity all passed. Full checkout route cutover and remaining migration acceptance criteria remain open; production unchanged.
