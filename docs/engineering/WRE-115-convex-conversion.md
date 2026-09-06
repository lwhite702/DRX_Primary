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

## Full web checkout route conversion

- `/api/pos/checkout` full mode and `/api/pos/checkout-enhanced` now call the canonical transaction; neither loads the Prisma checkout core. Full quote support uses the same product, tax, loyalty, fee and delivery rules. A mismatched displayed total aborts before any write.
- Price overrides require the existing pricing.manage permission, a bounded reason and integer-cent pricing. Stored sale lines retain the reason and catalog price. Bulk tiers do not silently replace an explicit authorized override.
- Added tenant-scoped delivery profiles, bounded profile paging, canonical/migrated profile-ID resolution, manager-authorized profile saves and audit events. Delivery revenue and vendor cost can differ. Missing vendor costs remain explicitly unknown in delivery/sale records and mark profit incomplete; report warnings expose that limitation. Profile charges/ownership are checked again in the checkout mutation.
- The retained full POS engine reviews a changed canonical quote before submitting, blocks concurrent submissions, reuses the exact request body after an uncertain response, and refuses a changed cart until that request is resolved. Retry state currently lasts for the engine instance: browser-refresh recovery still needs persistent non-sensitive request metadata and receipt reconciliation. The current routed sales page is history; these retained full-POS components are not themselves proof of a rendered active checkout flow.
- Checkout-enhanced now requires the caller's UUID request key. This is a deliberate contract tightening requiring major-release review and caller migration, not a backward-compatible patch. Installed/native callers remain on their existing canonical contracts.
- Quick checkout's quote request now omits the delivery address from the strict quote validator while retaining it for the encrypted checkout mutation.
- Verification: root suite 852/852 tests across 121 files; app typecheck; full app/marketing build; local anonymous Convex compile/push; release integrity. Real route-to-Convex tests cover fees, payment references, override permissions, stale totals, retry after catalog price change, delivery prices/ownership, encrypted address storage, unknown vendor cost and enhanced/quick routes. Client tests cover review, uncertain responses, concurrent submission and changed-cart rejection.
- Still open: `/api/sales` writer and sales history/detail/amendments, active POS bootstrap/customer lookup, production data reconciliation, historical profile mapping, persistent retry recovery, and all remaining domains. Weighted full-cart quantity edits/override units need a dedicated parity check before release. The structural direct-import audit is 115 runtime imports in 100 files plus 6 type-only imports; indirect old-core callers are additional work. No production deployment.

## POS bootstrap conversion

- Register favorites/recent products and credit/delivery policies now query Convex. Completed sale history is paged in batches of 25; orders above 50 lines use separate 200-line pages so imported large orders retain every line. Catalog reads are bounded to 100 records and use the same current-stock and selling-rule mapping as product search.
- Authenticated route-to-Convex coverage passes all 9 cases: sold-out stock, fractional and whole-unit rules, history across page boundaries, inactive/foreign records, canonical policies, provider failure, anonymous access, 220-line historical orders and denied roles. The policy test inserts valid synthetic settings because onboarding does not create that optional record.
- Current implementation reconstructs lifetime quantities on each bootstrap. Individual queries are bounded, but total request work grows with history. Reconciled materialized counters/backfill and production-volume validation are still required before release. Historical legacy sales are not yet imported, so these results alone cannot establish complete production favorites.
- Verification passed: 859 tests across 121 files, app typecheck, full app/marketing build, local anonymous Convex compile/push and release integrity. Structural audit: 114 runtime legacy imports in 99 files, plus 6 type-only imports. The full conversion remains incomplete. No production deployment.

## Next sales cutover constraints

- `/api/sales` still creates legacy sales and returns legacy item records; list/detail endpoints remain legacy reads. Convert the writer and receipt/history projection together so a successful canonical checkout is visible through the same operator workflow.
- Existing sale amendments change payment method/reference or reassign customers; the credit path updates legacy balances directly. Canonical amendments must enforce permissions and tenant ownership, preserve immutable checkout replay identity, reconcile financed amounts and payment history, and emit audit events atomically. Merely changing the sale's customer ID or payment method is insufficient.
- Preserve installed-client contracts or explicitly migrate callers, including stable request keys. Detail financial summaries must exclude collected tax from revenue and disclose missing vendor costs. Refresh/retry and another-business tests remain acceptance gates.
- Source review found the existing Convex credit functions only update an aggregate balance and audit event; payments have no request identity or sale allocation, and payment amounts lack positive integer validation. Build durable credit transaction/allocation history with bounded monetary validation and replay protection before implementing sale reassignment/payment amendments. Existing balances require an explicit reconciled opening entry; they cannot be inferred from a partial canonical sales history.

## Durable credit entry foundation

- Added append-only credit entries and a checked account balance. Credit issuance, repayments, canonical checkout and authorized offline sync update the entries, account, customer balance and audit in one mutation. Any aggregate/ledger mismatch fails for reconciliation. Offline sync preserves its existing authorized commit-and-record-conflict policy when the credit limit has changed.
- Existing aggregate balances become explicit opening entries with `existing_customer_balance_unreconciled` provenance. This preserves the balance, but is not historical reconciliation or a replacement for importing source transactions. Payment-to-sale allocations and amendment accounting are still pending.
- Credit issue/payment mutations accept an optional bounded request key and preserve their existing response shapes. An identical keyed retry returns its original result; changed customer, kind, amount or description conflicts. Older installed clients without keys remain supported and do not yet gain retry protection; migrate their callers before final cutover.
- Positive safe integer cents are required. Repayments above the outstanding balance now fail instead of silently discarding the excess; include this contract correction in major-release/caller review. Bounded descriptions stay in the tenant's ledger, while audit metadata contains amounts and references only.
- Verification passed: 864 tests across 122 files; 13 final focused ledger/offline tests; app typecheck; full app/marketing build; local anonymous Convex compile/push; release integrity. Sales APIs, payment allocation/history UI, native caller changes, migration and all remaining domains remain open; production unchanged.
- Caller audit: iOS issue/payment sheets use canonical credit mutations but supply no request key; Expo's API client still posts to `/api/credit/transactions`. That legacy route updates `creditLimit.currentBalance` separately from `customers.totalCreditUsed`, and lacks selected-business ownership checks. Its conversion must enforce tenant membership and reconcile both historical balance representations rather than blindly importing either one.

## Credit transaction API cutover

- `/api/credit/transactions` POST now uses a single authenticated Convex mutation for ownership resolution, credit limits, balance/ledger/audit writes and exact-key replay. Legacy customer IDs resolve only through explicit tenant-scoped mappings. Body business IDs are independently checked against membership. Credit/extension/purchase aliases and dollar input remain supported; invalid cents/types, overpayments and mismatched retries fail with sanitized errors.
- GET reads ledger entries through indexed pages of at most 100. Existing array and camel-case transaction fields remain. Opening rows are explicitly `opening`/`unreconciled`; they are never represented as completed purchases. Cursor headers support bounded client paging; the existing customer-specific all-history contract traverses pages until complete and still requires production-volume validation. Default business history remains the latest 50 entries.
- Requests may supply `Idempotency-Key`, `requestKey` or `idempotencyKey`. Legacy callers without one get a generated key in the response header, preserving request compatibility but not protecting a retry after a lost response. Client-generated stable keys remain required before full cutover.
- Six real route-to-Convex integration tests pass, including foreign tenant/customer rejection, mapped IDs, unchanged retry results, dollar precision, full history over page boundaries, and provider/anonymous failures. Root suite: 870 tests across 123 files passed; app typecheck, local anonymous Convex compile/push, full app/marketing build and release integrity passed before the subsequent recovery additions. Structural audit: 113 runtime legacy imports in 98 files plus 6 type-only imports.
- The credit transaction detail/delete endpoint, web credit manager and Expo screens still need coordinated conversion. Expo currently reconstructs balances from recent history and expects snake-case records; move it to authoritative canonical balances and normalized records with stable request keys. Do not claim the entire credit workflow works from the API checks alone. Historical balance reconciliation, allocations and sale amendments remain open. Production unchanged.
- Web manager inspection confirms due dates, aging buckets, credit-limit edits and account freeze/unfreeze operations in the legacy credit service. Preserve these supported terms in the canonical account/debt model before replacing that service; the current transaction endpoint did not persist due dates and does not establish aging parity.

## Credit request recovery in progress

- Added an authenticated atomic recovery mutation: an already committed request returns its recorded result; an absent request gets a durable cancellation marker. The shared ledger writer rejects cancelled keys, so a delayed original write cannot commit after the operator replaces the request. Recovery permits inactive owned customers and rejects foreign customers. Seven focused ledger tests passed, including cancellation/replay and committed-request recovery; final combined tests are running.
- iOS issue/payment forms now have a shared pending-attempt controller. It saves the exact request in device-only Keychain storage before sending, scoped by a hash of deployment/operator/customer/operation. Reopening restores the original amount, note and request key; edits remain disabled until success or atomic resolution. Cancel/close retains the saved request. Identity changes prevent submission/recovery using another operator's saved attempt. Raw request content is not logged.
- Added native controller tests for lost-response recovery across controller instances, exact-payload replay, cancellation and identity changes. Swift parse validation passed, but native type/build/runtime verification is not yet established. No available iOS simulator runtime was found. The first native build failed during dependency extraction because the system volume ran out of space. This task's generated derived-data directory was moved to the Projects volume; native build-for-testing is retrying with external dependency caches, temporary files and result bundle. Shared user files/caches were not removed.
- Final combined backend/API tests: 13 passed. Recovery Convex compile/push and release integrity passed. A fresh root suite is running. Native tests remain unexecuted until the platform/runtime and build are verified.
- The earlier web API full app/marketing build completed successfully. Recovery changes made while that build was running require fresh final verification. Production unchanged; do not release this unfinished client/backend pair or mark the full conversion complete.

## Disabled credit policy and native controller verification

- Source inspection confirmed that legacy `freezeAccount` sets the credit limit to zero, whereas existing canonical zero limits mean unlimited. Added optional `creditEnabled` state; absent flags retain existing canonical semantics. Imported frozen/no-credit records must explicitly disable new credit after source reconciliation. No production records were changed.
- Canonical customer creation validates nonnegative integer-cent limits, and an audited tenant-authorized configuration mutation sets the enabled flag and limit independently without changing debt. The ledger blocks new debt for disabled accounts but accepts repayments and exact retries of already recorded transactions. Advisory checks and indexed register policy reads honor the flag. Authorized offline sync preserves its existing commit-and-record-conflict policy, treating disabled credit as zero availability at reconciliation.
- Native customer decoding, available-credit calculations and labels recognize disabled credit; it cannot appear as unlimited or permit new charges. Added backend cases for frozen zero limits, repayment, explicit reactivation, cash checkout, rollback and foreign configuration, plus a native model test.
- Initial focused backend run timed out before collecting tests because workers could not start under filesystem load. The single-thread retry passed all 26 ledger, bootstrap and offline tests. Local Convex typechecking/compile/push and release integrity also passed. The earlier full-suite process remains active; the startup failure is not misrepresented as test coverage.
- The unchanged retry controller source and its two existing tests were compiled/run in an isolated macOS Swift package with injected in-memory storage and RPC adapters: both tests passed. This verifies controller state behavior and Swift concurrency typing, not the real Keychain adapter, iOS view integration or device persistence. The full iOS build-for-testing remains pending dependency resolution; no simulator runtime is available.
- Final privacy/retention work must include new ledger/account/cancellation records and native pending requests. Remaining account screens, due-date/aging/allocation behavior, sales amendments, historical reconciliation and other domains stay in scope.
