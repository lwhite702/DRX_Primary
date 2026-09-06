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
