# DRX POS Module Audit

## 1. Executive Summary
- **Overall state:** DRX has two active POS paths (`/pos/*` quick POS and `/sales` legacy/enhanced POS), with mixed architecture and partially overlapping checkout logic. Core checkout exists and can complete sales, but FIFO inventory accounting and production-grade reporting are not implemented.
- **Biggest risks:**
  1. **No FIFO/batch model at all** (no `InventoryBatch`, no per-batch consumption records, no persisted COGS lineage).
  2. **Inconsistent sales execution paths** (Prisma transactional checkout vs RPC-enhanced checkout vs generic `/api/sales`), which can diverge in business rules.
  3. **Reporting is incomplete** (placeholder Reports UI and baseline-only API without daily profit/COGS integrity).
  4. **Weak data consistency safeguards** in some API paths (`/api/sales`, `/api/pos/validate-stock`, `/api/pos/validate-credit`).
- **Biggest missing capabilities:** True FIFO, daily profit/COGS reporting, per-line FIFO cost basis, batch-level stock visibility, and a single authoritative sales pipeline.
- **Readiness:** **Beta-ready only for limited quick checkout**, with significant blockers for production-grade inventory costing and financial reporting.

## 2. Feature Audit Checklist

### 2.1 Core POS Features
1. **Product inventory management**  
   - **Status:** PARTIAL  
   - **Evidence found:** `inventory` model/table exists with quantity, costs, and logs; search and product lookup APIs exist.  
   - **Issues:** No normalized product/batch abstraction; inventory updates are split across multiple codepaths with inconsistent validation.
   - **Recommended action:** Consolidate inventory mutations behind one domain service; deprecate divergent endpoints.

2. **Buy price and sell price tracking**  
   - **Status:** PARTIAL  
   - **Evidence found:** `inventory.unitCost`, `inventory.sellingPrice`, `sales_line_items.unit_cost` fields exist.  
   - **Issues:** `unit_cost` on line items is not reliably set in primary checkout path (`lib/pos/core.ts` omits it), and no FIFO-derived cost is persisted.
   - **Recommended action:** Persist resolved per-unit FIFO cost and extended COGS per line item at checkout time.

3. **Sales transaction processing**  
   - **Status:** PARTIAL  
   - **Evidence found:** `/api/pos/checkout` + `lib/pos/core.checkout()` uses Prisma transaction and idempotency; legacy `/api/sales` and `/api/pos/checkout-enhanced` also process sales.
   - **Issues:** Multiple checkout implementations with incompatible invariants; one path (`/api/sales`) lacks stock prevalidation and can oversell.
   - **Recommended action:** Route all sales through one transaction-safe service and retire duplicate paths.

4. **Real-time inventory updates**  
   - **Status:** PARTIAL  
   - **Evidence found:** UI hooks reference realtime inventory and checkout decrements inventory.
   - **Issues:** “Realtime” is UI-level; no robust eventing contract tied to a single source of truth across all checkout paths.
   - **Recommended action:** Emit unified post-commit inventory events and consume them consistently in POS/reporting surfaces.

5. **User-friendly cashier interface**  
   - **Status:** PARTIAL  
   - **Evidence found:** Quick POS (`/pos/sale`, `/pos/payment`) supports search, favorites, cart, payment.
   - **Issues:** Two separate cashier experiences (`/pos` and `/sales`) increase operator confusion; no strong guardrails for stale stock between add-to-cart and checkout.
   - **Recommended action:** Pick one POS UX as canonical and align all flows to it.

### 2.2 FIFO Inventory Logic
1. **True FIFO handling**  
   - **Status:** MISSING  
   - **Evidence found:** No FIFO algorithm in checkout services/RPC; no FIFO tables in Prisma schema.
   - **Issues:** COGS/profit are not tied to actual purchase layers.
   - **Recommended action:** Add batch ledger + deterministic FIFO consumption in transactional checkout.

2. **Inventory batch tracking with purchase/received dates**  
   - **Status:** PARTIAL  
   - **Evidence found:** `inventory_intakes` exists for intake/cost history.
   - **Issues:** Intake records are not wired as sellable stock layers consumed by checkout.
   - **Recommended action:** Introduce `inventory_batches` with remaining quantity and received timestamp, linked to intake events.

3. **Oldest stock sold first automatically**  
   - **Status:** MISSING  
   - **Evidence found:** Checkout decrements aggregate `quantity_on_hand` only.
   - **Issues:** No ordering by batch date.
   - **Recommended action:** During checkout, lock and consume oldest non-empty batches first.

4. **Accurate FIFO-based cost calculations**  
   - **Status:** MISSING  
   - **Evidence found:** Sales totals are revenue-focused; costs are static/snapshot at best.
   - **Issues:** Profit metrics cannot be trusted.
   - **Recommended action:** Persist per-consumption cost and aggregate line COGS deterministically.

5. **Sales consuming multiple batches**  
   - **Status:** MISSING  
   - **Evidence found:** Line item links to one inventory item only; no child consumption rows.
   - **Issues:** Large sales cannot represent mixed-layer depletion.
   - **Recommended action:** Add `fifo_consumptions` child rows under each sale line item.

6. **Preserved historical cost basis per sale item**  
   - **Status:** PARTIAL  
   - **Evidence found:** `sales_line_items.unit_cost` exists.
   - **Issues:** Single value cannot represent multi-batch cost lineage and is not consistently populated.
   - **Recommended action:** Store both summarized COGS and detailed batch consumption records.

### 2.3 Daily Sales Reporting
1. **Total daily sales revenue**  
   - **Status:** PARTIAL  
   - **Evidence found:** Baseline report has `today.salesTotal`.
   - **Issues:** No full reporting module in Reports page.
   - **Recommended action:** Build production reporting endpoints/UI with date filters and reconciliations.

2. **Total daily profit**  
   - **Status:** MISSING  
   - **Evidence found:** No daily profit query using COGS.
   - **Issues:** Management cannot trust margin outputs.
   - **Recommended action:** Derive profit from persisted FIFO consumption costs.

3. **Number of transactions**  
   - **Status:** PARTIAL  
   - **Evidence found:** Baseline includes `salesCount`.
   - **Issues:** Not exposed in complete reporting workspace.
   - **Recommended action:** Integrate into formal reporting UI and API contracts.

4. **Best-selling products**  
   - **Status:** PARTIAL  
   - **Evidence found:** Baseline computes `topProducts` from sales line items.
   - **Issues:** Period-limited and not presented in a complete report center.
   - **Recommended action:** Add robust product performance report with tunable windows.

5. **Inventory levels after sales**  
   - **Status:** PARTIAL  
   - **Evidence found:** Low-stock query available in baseline.
   - **Issues:** No batch-aware post-sale state.
   - **Recommended action:** Add batch and aggregate stock reporting snapshots.

6. **FIFO-based COGS**  
   - **Status:** MISSING  
   - **Evidence found:** No FIFO data model or COGS query layer.
   - **Issues:** Financial reports are incomplete.
   - **Recommended action:** Implement FIFO ledger first, then report COGS from consumption records.

7. **Report accuracy and consistency with transactions**  
   - **Status:** PARTIAL  
   - **Evidence found:** Some transactional logs/audits exist.
   - **Issues:** Multiple checkout paths and missing FIFO cause reconciliation drift.
   - **Recommended action:** Single checkout write model + post-commit reporting projections.

## 3. Database & Data Integrity Audit
- **Current schema findings:**
  - Strong base entities exist (`inventory`, `sales`, `sales_line_items`, `inventory_log`, `credit_*`).
  - Intake/cost history tables exist but are not integrated into checkout depletion logic.
  - No first-class `Product` table (inventory currently acts as product + stock record).
- **Missing tables/fields/relationships:**
  - Missing: `inventory_batches`, `fifo_consumptions`, explicit transaction COGS totals.
  - Missing constraints: guaranteed non-negative stock at DB level for all mutation paths.
  - Missing relational guarantee for cashier/user attribution in all sale pathways.
- **FIFO data model readiness:**
  - **Not ready.** Current model cannot represent multi-layer cost consumption.
- **Reporting data quality risks:**
  - Profit and COGS cannot be computed correctly.
  - Divergent checkout endpoints can write semantically different sale records.
  - Some validations use weak fallback logic (e.g., credit max derived from total purchases).

## 4. POS Transaction Flow Audit
- **Current checkout flow:**
  - Quick POS route builds cart -> validates payload -> `lib/pos/core.checkout()` transaction.
  - Legacy Sales flow uses `POSEngine.checkout()` -> `/api/pos/checkout-enhanced` RPC path.
  - Generic `/api/sales` also writes sales directly.
- **Inventory deduction logic:**
  - Aggregate decrement of `inventory.quantityOnHand`; no batch consumption.
- **FIFO usage/lack:**
  - No FIFO logic in any observed path.
- **Rollback/atomicity findings:**
  - `lib/pos/core.checkout()` uses DB transaction and row locks (`FOR UPDATE`) for targeted inventory rows.
  - `/api/sales` transaction does not lock/verify stock preconditions robustly.
  - RPC path quality is uncertain due to schema/function signature drift risks.
- **Concurrency/overselling risks:**
  - Core checkout has better protection than other flows.
  - `/api/sales` can race and oversell because it decrements without locked precheck.
  - Split pathways increase probability of inconsistent behavior under load.

## 5. Reporting Audit
- **Current reporting capabilities:**
  - Baseline API supports today/week totals, counts, top products, low stock, credit balances, recent sales.
  - Reports page in app is still placeholder (“No reports yet”).
- **Daily revenue/profit accuracy:**
  - Revenue totals exist but only in baseline endpoint.
  - Profit is not implemented with FIFO COGS; therefore daily profit is not trustworthy/available.
- **FIFO reflection in reporting:**
  - Not present.
- **Reporting gaps/logic flaws:**
  - No production report center wired to robust APIs.
  - No reconciliation report to prove `sales` ↔ `line items` ↔ `inventory logs` parity.

## 6. UX / Operational Readiness Audit
- **Cashier usability:**
  - Quick POS is fast and focused (search/favorites/payment).
  - Legacy Sales page is feature-heavy and complex.
- **Speed/clarity of register experience:**
  - Quick flow is ergonomic for rapid checkout.
  - Dual POS paradigms create training and operational confusion.
- **Practical workflow issues:**
  - Stock can change after item add; limited UX for hard stock revalidation feedback before final commit.
  - Error messaging varies by endpoint and is not consistently operator-friendly.
- **Production friction points:**
  - Multiple endpoints and rule duplication raise support burden.
  - Missing report center and FIFO costing block manager-level trust.

## 7. Gap List
1. **No FIFO batch ledger and consumption tracking**  
   - **Severity:** CRITICAL  
   - **Affected area:** Data model, checkout backend, reporting  
   - **Description:** No schema or logic to consume oldest stock layers or preserve per-sale cost lineage.  
   - **Why it matters:** Invalid COGS/profit and auditability.

2. **Multiple inconsistent checkout implementations**  
   - **Severity:** HIGH  
   - **Affected area:** API architecture, transaction correctness  
   - **Description:** `/api/pos/checkout`, `/api/pos/checkout-enhanced`, and `/api/sales` implement overlapping sale writes with different rules.  
   - **Why it matters:** Divergent behavior, defects, and reconciliation drift.

3. **Weak stock validation path in legacy APIs**  
   - **Severity:** HIGH  
   - **Affected area:** Inventory integrity  
   - **Description:** Some paths do not enforce lock-then-decrement with strict invariants.  
   - **Why it matters:** Overselling and negative inventory risk.

4. **Credit validation logic is unreliable in one path**  
   - **Severity:** MEDIUM  
   - **Affected area:** Payment/credit control  
   - **Description:** `/api/pos/validate-credit` falls back to `customer.totalPurchases` as limit.  
   - **Why it matters:** Incorrect credit approvals/denials.

5. **Reports module is incomplete in product UI**  
   - **Severity:** HIGH  
   - **Affected area:** Analytics/reporting UX  
   - **Description:** Reports page is placeholder; baseline API is not a full reporting suite.  
   - **Why it matters:** Operators/managers lack actionable daily reporting.

6. **No production-grade daily profit/COGS pipeline**  
   - **Severity:** CRITICAL  
   - **Affected area:** Finance/reporting  
   - **Description:** Profit is not tied to persisted FIFO consumption costs.  
   - **Why it matters:** Financial misreporting risk.

7. **Inconsistent unit cost capture on sale items**  
   - **Severity:** MEDIUM  
   - **Affected area:** Data quality  
   - **Description:** `sales_line_items.unit_cost` exists but is not consistently written in modern checkout.  
   - **Why it matters:** Incomplete historical cost record.

8. **Split POS UX surfaces**  
   - **Severity:** MEDIUM  
   - **Affected area:** Operator workflow  
   - **Description:** `/pos` and `/sales` provide different flows and capability sets.  
   - **Why it matters:** Training overhead and process inconsistency.

## 8. Implementation Plan

### Phase 1: Critical data integrity and transaction correctness
- **Goals:** Single authoritative checkout flow with strict stock invariants and idempotency.
- **Files/modules likely affected:**
  - `apps/app/lib/pos/core.ts`
  - `apps/app/app/api/pos/checkout/route.ts`
  - `apps/app/app/api/sales/route.ts` (deprecate or proxy)
  - `apps/app/app/api/pos/checkout-enhanced/route.ts` (deprecate or align)
- **Schema changes:**
  - Add DB constraints/triggers to prevent negative stock writes.
  - Add explicit `sale_source` / `checkout_version` fields for observability.
- **Backend work:**
  - Consolidate all write paths to one service function.
  - Standardize credit checks against `credit_limits` only.
  - Preserve consistent audit log payloads.
- **Frontend work:**
  - Repoint legacy UI to canonical endpoint.
  - Normalize error messaging for cashier actions.
- **Testing required:**
  - Concurrency tests (parallel checkout same SKU).
  - Idempotency replay tests.
  - Contract tests for all consumer UIs.
- **Exit criteria:**
  - Only one checkout path writes sales/inventory in production.
  - No oversell under concurrent test harness.

### Phase 2: FIFO completion
- **Goals:** Implement true FIFO inventory depletion with historical cost lineage.
- **Files/modules likely affected:**
  - DB migrations under `apps/app/db/migrations/*`
  - Prisma schema `apps/app/prisma/schema.prisma`
  - Checkout core service and inventory intake flows
- **Schema changes needed:**
  - `inventory_batches` (id, inventory_id, received_at, qty_received, qty_remaining, unit_cost, intake_id, created_at)
  - `fifo_consumptions` (sale_line_item_id, batch_id, qty_consumed, unit_cost, extended_cost)
  - Add aggregate COGS fields to `sales_line_items` / `sales` (optional denormalization)
- **Backend work:**
  - On checkout, lock candidate batches ordered by received date.
  - Consume across multiple batches when needed.
  - Persist detailed consumption rows + summary cost.
- **Frontend work:**
  - Add batch-aware inventory visibility (optional in POS, required in admin/inventory screens).
- **Testing required:**
  - Unit tests for multi-batch depletion.
  - Property tests for no negative `qty_remaining`.
  - Regression tests for refunds/voids (if supported).
- **Exit criteria:**
  - Every sold quantity traces to specific batch rows.
  - FIFO COGS reproducible from persisted records.

### Phase 3: reporting accuracy
- **Goals:** Daily revenue, transactions, best sellers, inventory state, FIFO COGS, and daily profit with reconciliation.
- **Files/modules likely affected:**
  - `apps/app/lib/reports/*`
  - `apps/app/app/api/reports/*`
  - `apps/app/app/(app)/reports/page.tsx`
- **Schema changes if needed:**
  - Materialized views or report snapshots for heavy workloads.
- **Backend work:**
  - Build daily report query layer backed by FIFO consumptions.
  - Add reconciliation checks (`sales.total` vs sum(line totals); stock movement parity).
- **Frontend work:**
  - Replace placeholder Reports UI with report dashboards and export endpoints.
- **Testing required:**
  - Golden dataset report tests.
  - End-to-end validation against seeded multi-batch scenarios.
- **Exit criteria:**
  - Daily report outputs match transaction ledger and FIFO records.

### Phase 4: POS UX polish
- **Goals:** Fast, consistent cashier journey with minimal friction.
- **Files/modules likely affected:**
  - `apps/app/app/(operator)/pos/*`
  - `apps/app/app/(app)/sales/*` (migration/deprecation)
  - `apps/app/components/quick-pos/*`
- **Schema changes:** None required.
- **Backend work:**
  - Preflight endpoint combining stock + credit validation in one call.
- **Frontend work:**
  - Unify to one POS surface.
  - Improve out-of-stock and insufficient-credit UX with actionable prompts.
  - Add clear final confirmation and retry-safe behavior.
- **Testing required:**
  - Cashier task-flow usability checks.
  - Interaction tests for fast add/remove/payment paths.
- **Exit criteria:**
  - One cashier flow, consistent behavior, lower operator error rate.

### Phase 5: production hardening and testing
- **Goals:** Operational confidence under realistic load.
- **Files/modules likely affected:** checkout, reports, DB migrations, observability.
- **Schema changes if needed:** reporting indexes, partitioning, retention controls.
- **Backend work:**
  - Add telemetry around checkout latency/failure classes.
  - Add dead-letter/recovery strategy for async report projections.
- **Frontend work:**
  - Surface degraded-mode banners when report services lag.
- **Testing required:**
  - Load tests (peak checkout concurrency).
  - Chaos/failure tests for partial outages.
  - Migration rollback drills.
- **Exit criteria:**
  - SLOs met, alerts in place, and on-call playbook validated.

## 9. Final Readiness Verdict
**Current DRX POS module is: _beta ready with blockers_.**

It supports basic sales in at least one path, but is **not production ready** for businesses requiring FIFO-costed inventory accounting and reliable daily profit reporting. The platform needs checkout-path unification, FIFO implementation, and reporting completion before production-grade launch.
