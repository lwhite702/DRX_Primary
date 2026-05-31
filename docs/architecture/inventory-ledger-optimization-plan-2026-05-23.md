# DRX Inventory Ledger Optimization Plan (2026-05-23)

## 1) Executive Summary
DRX inventory currently has multiple mutation paths (Supabase route handlers, Prisma transaction flow, and legacy RPC/offline replay), which increases drift and reconciliation risk under concurrency.

Immediate hardening has already started:
- Intake duplicate FIFO insertion risk removed by introducing deterministic batch ensure behavior.
- Intake approval path now avoids missing RPC dependency and uses direct update fallback.
- Adjustment route now compensates inventory on audit-log failure.

Target architecture:
- Centralize all inventory mutations behind one mutation engine.
- Make immutable `inventory_events` the source of truth.
- Keep `inventory_current_state` as an aggregate projection for low-latency POS.
- Run FIFO financial allocation as deterministic, idempotent transactional logic, with async reconciliation safety net.
- Separate operational and financial pipelines so POS never blocks on COGS/reporting.

## 2) Current Inventory Architecture Risks
1. Mutation logic duplication across routes and RPCs
- Intake and intake approval each implement their own stock/batch/log logic.
- POS has a canonical Prisma flow (`lib/pos/core.ts`) but offline replay still uses legacy RPC (`process_pos_checkout`).

2. Audit inconsistency
- `/api/inventory/[id]` can change `quantity_on_hand` directly without `inventory_log`.
- Adjustment previously could succeed stock update and fail log write (now compensated, but still not transactionally atomic).

3. FIFO lineage fragmentation
- Canonical POS path writes `sales_line_item_allocations`; legacy RPC path does not.
- Reporting must tolerate missing allocation table/rows and marks unallocated sales.

4. Concurrency and stale write risks
- No optimistic version checks on inventory writes.
- Intake/adjust handlers do read-then-write updates without version guard.
- `increment_transaction_counter` is non-atomic read+write and is called on POS page load, not only on checkout.

5. Realtime disabled
- `use-realtime.ts` intentionally disables realtime channels and falls back to snapshot fetches.

6. Reporting tightly coupled to operational tables
- Baseline and reconciliation reports query live transactional tables directly.

## 3) Mutation Flow Audit

### Mutation Flow Inventory Table
| Mutation Source | Route/File | Direct Inventory Writes? | FIFO Writes? | Audit Writes? | Transaction Protected? | Idempotent? | Risk Level |
|---|---|---:|---:|---:|---:|---:|---|
| Inventory create | `apps/app/app/api/inventory/route.ts` | Yes (`inventory` insert) | No | No inventory log | No | No | Medium |
| Inventory update (generic) | `apps/app/app/api/inventory/[id]/route.ts` | Yes (`inventory` update; includes `quantity_on_hand`) | No | No inventory log | No | No | **High** |
| Intake submit + auto-process | `apps/app/app/api/inventory/intake/route.ts` | Yes | Yes (`inventory_batches`) | Yes (`inventory_log`) | No (multi-step) | Partial | **High** |
| Intake approval processing | `apps/app/app/api/inventory/intake/approve/route.ts` | Yes | Yes (`inventory_batches`) | Yes (`inventory_log`) | No (multi-step) | Partial | **High** |
| Manual adjustment | `apps/app/app/api/inventory/adjust/route.ts` | Yes | No | Yes (`inventory_log`) | Partial (compensation only) | No | High |
| POS checkout (canonical) | `apps/app/lib/pos/core.ts` via `/api/pos/checkout*` | Yes | Yes (`inventory_batches`, `sales_line_item_allocations`) | Yes (`inventory_log`, `system_audit_log`) | Yes (Prisma tx + row locks) | Yes (idempotency key) | Medium |
| Offline POS replay (legacy) | `apps/app/lib/utils/offline-sync.ts` -> RPC `process_pos_checkout` | Yes | No | Yes (`inventory_log`, `system_audit_log`) | Yes (RPC txn) | Weak (offline tx id != order idempotency) | **High** |
| Shrinkage | `apps/app/lib/utils/pos-weight-engine.ts` -> RPC `record_shrinkage_event` | Yes (`inventory_in_grams`) | No | Yes (`system_audit_log`, `stock_movements`) | Yes (RPC txn) | No | Medium |
| Random check | `apps/app/lib/utils/pos-weight-engine.ts` -> RPC `record_inventory_check` | Indirect (may call shrinkage RPC) | No | Yes | Yes (RPC txn) | No | Medium |
| Random check counter | `apps/app/lib/utils/pos-weight-engine.ts` -> RPC `increment_transaction_counter` | No stock write (settings counter) | No | No | No atomic increment | No | High |
| AI pricing apply | `/api/pos/apply-pricing/route.ts` -> RPC `apply_ai_pricing_recommendation` | Yes (`selling_price`) | No | Yes (`system_audit_log`) | Yes (RPC txn) | No | Low |

### Duplicated Logic
- Intake stock/batch/log logic duplicated in submit and approval handlers.
- POS mutation logic split between canonical Prisma checkout and legacy RPC checkout.

### Inconsistent Validation
- `/api/inventory/[id]` allows quantity mutation without audit context.
- Intake auto-approval uses `status = pending` first, then updates to approved; can trigger pending-notification side effects.

### Non-Transactional Updates
- Intake and approval handlers execute multiple writes without a DB transaction envelope.
- Adjustment flow still relies on best-effort compensation rather than a single atomic transaction.

### Race Conditions
- Read-then-write inventory updates in intake/adjust without version guard.
- Non-atomic transaction counter increment RPC (`SELECT` then `UPDATE`).

### Inventory Drift Risks
- Legacy offline replay bypasses FIFO allocation writes, causing COGS lineage gaps.
- Direct inventory update route bypasses inventory log.

### Hidden Write Coupling
- Random-check trigger is tied to POS page mount effect, not completed transactions.
- Reporting reconciliation depends on timestamp proximity to infer inventory-log linkage.

## 4) Unified Mutation Engine Design

### Required Module Structure
```
apps/app/lib/inventory/core/
  mutation-engine.ts
  inventory-ledger.ts
  fifo-engine.ts
  inventory-state.ts
  reconciliation.ts
  inventory-events.ts
apps/app/lib/inventory/mutations/
  apply-intake.ts
  apply-sale.ts
  apply-adjustment.ts
  apply-shrinkage.ts
  apply-transfer.ts
  apply-return.ts
```

### Engine Contract
`mutation-engine.apply(input)`:
1. Validate input and tenant context.
2. Open DB transaction.
3. Create immutable ledger event (`inventory_events`).
4. Apply state delta to `inventory_current_state` with optimistic version guard.
5. Run FIFO allocation/deallocation where applicable.
6. Write observability hooks (`inventory_anomaly_events` / `system_audit_log`).
7. Commit.

### Transaction Boundaries
- Single transaction for operational mutation + ledger + aggregate update + allocation reservation.
- Long-running analytics and profitability projections run async after commit.

### Rollback and Failure Recovery
- If any in-transaction step fails: full rollback.
- If post-commit async step fails: persist failure in `inventory_repair_queue` and retry.

### Retry + Idempotency
- Every command includes `idempotency_key`, `source_system`, `source_ref`.
- Unique key on `(business_id, idempotency_key, mutation_type)` in `inventory_events`.
- Retries return prior event result, no duplicate stock movement.

### Audit Guarantees
- No mutation may update current stock without an event row.
- `inventory_log` remains as compatibility projection until migration completes.

### Concurrency Guarantees
- `SELECT ... FOR UPDATE` for targeted state rows and FIFO candidate batches.
- Optimistic version check on `inventory_current_state` update.

## 5) Inventory Ledger Architecture

### Source of Truth Split
- `inventory_events`: immutable append-only truth.
- `inventory_current_state`: mutable aggregate projection for low-latency reads.

### Proposed Tables
- `inventory_events`
- `inventory_current_state`
- `inventory_batches`
- `inventory_allocations`
- `inventory_reconciliation_events`
- `inventory_health_checks`

### Event Schema (minimum)
- `id`, `business_id`, `inventory_id`, `event_type`, `occurred_at`, `recorded_at`
- `quantity_delta_units`, `quantity_delta_grams`
- `unit_cost_snapshot`, `price_snapshot`
- `actor_user_id`, `source`, `source_ref`, `idempotency_key`
- `metadata jsonb`, `causation_id`, `correlation_id`

### Event Types
- `intake.created`, `intake.approved`, `intake.rejected`
- `stock.adjusted`, `stock.shrinkage`, `stock.sale`
- `stock.transfer.out`, `stock.transfer.in`
- `stock.return`
- `fifo.batch.created`, `fifo.batch.depleted`, `fifo.allocated`, `fifo.released`

### Aggregate Rebuild Strategy
- Rebuild `inventory_current_state` by replaying `inventory_events` ordered by `(occurred_at, id)`.
- Rebuild supports per-business and per-inventory scope.

### Reconciliation Strategy
- Nightly reconciliation compares:
  - projected state from events
  - current state table
  - FIFO batch remaining totals
  - allocation totals vs sold grams/qty

### Repair Strategy
- Auto-generate repair commands into `inventory_repair_queue`.
- Require manager approval for high-impact fixes (stock changes, COGS changes).

## 6) FIFO Hardening Plan

### FIFO Insert Paths Identified
- Intake submit and approve handlers (now routed through `ensureInventoryBatchForIntake`).
- Canonical POS checkout decrements `inventory_batches` and writes `sales_line_item_allocations`.

### Hardening Controls
1. Uniqueness + determinism
- Add unique constraint on `(business_id, intake_id)` where `intake_id is not null`.
- Keep deterministic order: `ORDER BY received_at ASC, created_at ASC, id ASC`.

2. Idempotent allocation model
- Allocation key: `(sale_id, sales_line_item_id, batch_id)` unique.
- Replaying same sale idempotency key should no-op on allocations.

3. Allocation locking
- Lock candidate batches `FOR UPDATE` in deterministic order.
- Update remaining quantities in same transaction.

4. Partial allocation recovery
- If failure after partial reserve but before commit, transaction rollback handles recovery.
- If post-commit anomaly detected, enqueue repair event and recalc allocation ledger.

5. Reconciliation tooling
- Daily check: sum(allocations) by line item equals sold quantity/grams.
- Check: batch remaining + allocated + depleted == original.

## 7) Concurrency Strategy

### Versioning
- Add `version bigint not null default 0` to `inventory_current_state` (and transitional `inventory` if needed).

### Mutation Pattern
```
UPDATE inventory_current_state
SET quantity_on_hand = quantity_on_hand + :delta,
    version = version + 1,
    updated_at = now()
WHERE business_id = :business_id
  AND inventory_id = :inventory_id
  AND version = :expected_version;
```

### Retry Behavior
- On conflict (`0 rows updated`): refetch state, revalidate domain constraints, retry with bounded attempts (max 2).
- If still conflict: return 409 with fresh server state and conflict payload.

### Stale Write UX
- POS: silent retry once; if still stale, show "Stock changed on another terminal" and refresh row.
- Admin adjust/intake: explicit conflict modal with previous vs current values.

### Terminal Synchronization
- Use targeted invalidation events keyed by inventory IDs touched by committed mutation.

## 8) Realtime Strategy

### Principle
No full-table subscriptions. Use mutation-triggered invalidation events plus selective refetch.

| Surface | Strategy |
|---|---|
| POS cart | Optimistic decrement locally, server-confirmed commit event, rollback on reject |
| Inventory counts | Invalidate touched `inventory_id` rows only; fetch by ids |
| Dashboards | 15-60s cached aggregate endpoint + invalidation for critical counters |
| Audit feed | Append-only stream from `inventory_events`/`system_audit_log` |
| Approvals queue | Channel on `inventory_intakes` pending/decision events |
| Reporting | Async materialized/report tables, no realtime dependence |
| FIFO allocations | Back-office view via paged query + event invalidation on related sale/intake |

Implementation notes:
- Introduce websocket channel `inventory:business:{id}` events containing `{event_id, type, inventory_ids, changed_at}`.
- Clients refetch only affected entities.

## 9) Reporting + Analytics Separation Plan

### Target Reporting Tables
- `reporting_daily_inventory`
- `reporting_daily_sales`
- `reporting_profitability`
- `reporting_credit_exposure`
- `reporting_inventory_health`

### Aggregation Cadence
- Near-realtime incremental rollups every 1-5 minutes for operational dashboards.
- End-of-day finalization for financial reporting.

### Incremental Rebuild
- Watermark by `inventory_events.recorded_at` and `sales.created_at`.
- Backfill by date partition and business.

### Reconciliation Checks
- Report totals must tie to ledger/event-derived aggregates.
- Mark snapshot status as `provisional` until reconciliation passes.

### Query Isolation
- Cashier/POS paths never query reporting tables.
- BI and AI workloads query reporting schemas or warehouse views only.

## 10) Inventory Health Engine

### Required Tables
- `inventory_health_checks`
- `inventory_anomaly_events`
- `inventory_repair_queue`

### Checks
- Negative inventory
- Orphan FIFO allocations
- Duplicate batches/intake linkage violations
- Missing inventory log compatibility projections
- Impossible margins (negative COGS margin thresholds)
- Allocation gaps
- Reconciliation mismatches
- Shrinkage anomalies
- Stock drift between event replay and current state
- Failed allocations/retries

### Outputs
- Health score (0-100)
- Severity (`info`, `warning`, `critical`)
- Recommended repair action
- Auto-reconciliation eligibility flag

## 11) Policy Engine Design

### Rules Model
`inventory_policy_rules`:
- `id`, `business_id`, `name`, `enabled`, `priority`
- `condition jsonb` (DSL)
- `action jsonb` (require approval, freeze inventory, alert)
- `created_by`, `updated_by`, timestamps

`inventory_policy_evaluations`:
- mutation/event id link, evaluated rules, outcomes, override details.

### Example Conditions and Actions
- cost delta threshold -> approval required
- supplier risk score -> owner approval
- large intake -> dual approval
- high shrinkage -> freeze inventory
- negative margin -> alert
- repeated variance -> audit review

### Escalation + Overrides
- Escalation matrix table by severity.
- Overrides require reason, actor, and optional second approver.

## 12) Event Bus Design

### Required Domain Events
- `inventory.intake.created`
- `inventory.intake.approved`
- `inventory.adjusted`
- `inventory.sale.completed`
- `inventory.batch.created`
- `inventory.batch.depleted`
- `inventory.low_stock`
- `inventory.shrinkage.detected`
- `inventory.audit.failed`
- `inventory.reconciliation.failed`
- `inventory.health.warning`

### Payload Contract
Common envelope:
- `event_id`, `event_type`, `occurred_at`, `business_id`, `inventory_ids[]`, `causation_id`, `correlation_id`, `idempotency_key`, `payload_version`, `payload`.

### Consumers
- Realtime invalidation service
- Reporting projector
- Health engine
- Policy engine
- Notification service
- AI feature pipelines

### Delivery Guarantees
- At-least-once with consumer idempotency.
- Dead-letter queue after bounded retries.
- Retry backoff with jitter.

### Observability Hooks
- Metrics: publish lag, retry count, DLQ count, consumer failure rate.
- Traces: mutation request -> event persist -> consumer ack chain.

## 13) Operational vs Financial Inventory Separation

### Operational Inventory (sync path)
- Fast checkout-safe updates to `inventory_current_state`.
- Immediate validation and stale-write protection.
- Never blocked by profitability calculations.

### Financial Inventory (async path)
- FIFO COGS verification and profitability rollups.
- Reconciliation and exception handling.
- Report-grade and audit-grade lineage.

### Async Reconciliation
- Queue `financial_reconcile_jobs` for each committed sale/intake.
- If delayed/failing, POS remains unaffected; alerts generated for finance ops.

## 14) Migration + Rollout Plan

### Phase 1: Immediate safety fixes (done/in progress)
- Scope: duplicate FIFO prevention, missing audit compensation, batch ensure helper.
- Risk: Low
- Rollback: revert route changes + disable new RPC call path
- Complexity: Low
- Operational impact: Minimal
- Flags: `feat_inventory_batch_safety`

### Phase 2: Mutation consolidation
- Scope: introduce mutation engine; route handlers become thin wrappers.
- Risk: Medium
- Rollback: per-route fallback to legacy handler
- Complexity: High
- Operational impact: Moderate
- Flags: `feat_inventory_mutation_engine`

### Phase 3: FIFO hardening
- Scope: uniqueness constraints, allocation idempotency, reconciliation checks.
- Risk: Medium
- Rollback: disable strict uniqueness checks, keep ensure RPC fallback
- Complexity: Medium
- Operational impact: Low-to-moderate
- Flags: `feat_fifo_strict_mode`

### Phase 4: Concurrency/versioning
- Scope: add version columns, optimistic updates, conflict responses.
- Risk: Medium
- Rollback: disable version predicates by feature flag
- Complexity: Medium
- Operational impact: Moderate UX changes on conflicts
- Flags: `feat_inventory_optimistic_locking`

### Phase 5: Reporting separation
- Scope: create reporting tables + projectors, decouple dashboard reads.
- Risk: Medium
- Rollback: fallback to existing report queries
- Complexity: Medium
- Operational impact: Low
- Flags: `feat_reporting_projectors`

### Phase 6: Realtime redesign
- Scope: targeted invalidation channels + row-level refetch.
- Risk: Medium
- Rollback: keep snapshot polling only
- Complexity: Medium
- Operational impact: Positive latency improvement
- Flags: `feat_inventory_realtime_invalidation`

### Phase 7: Event bus rollout
- Scope: domain event publisher + core consumers.
- Risk: Medium
- Rollback: disable non-critical consumers, keep event persistence
- Complexity: High
- Operational impact: Low if consumers optional
- Flags: `feat_inventory_event_bus`

### Phase 8: Health engine rollout
- Scope: anomaly detection, score, repair queue.
- Risk: Low
- Rollback: pause checks/jobs
- Complexity: Medium
- Operational impact: Low
- Flags: `feat_inventory_health_engine`

### Phase 9: Policy engine rollout
- Scope: configurable approval/risk rules and overrides.
- Risk: Medium
- Rollback: fallback to fixed threshold rule
- Complexity: Medium
- Operational impact: Moderate governance changes
- Flags: `feat_inventory_policy_engine`

## 15) Highest Priority Fixes
1. Remove direct stock mutation from `/api/inventory/[id]` or route it through mutation engine + mandatory event/log.
2. Decommission offline replay `process_pos_checkout` path or adapt it to call the canonical mutation engine with FIFO allocation.
3. Add unique `(business_id, intake_id)` constraint for `inventory_batches` (non-null intake).
4. Add optimistic version checks for intake/adjust/sale stock updates.
5. Make random-check counter increment atomic and trigger only on successful checkout commit.
6. Replace timestamp-proximity reconciliation logic with explicit event/lineage linkage IDs.

## 16) Long-Term Architecture Direction
- Single writer model for inventory state transitions (mutation engine only).
- Ledger-first audit model with replayability and deterministic rebuilds.
- Operational/financial decoupling with async COGS verification.
- Event-driven observability and policy governance for proactive integrity management.
- AI readiness through stable event contracts and reporting projections, not direct reads on hot operational tables.

## Appendix: Concrete Evidence Map
- Canonical POS transactional flow: `apps/app/lib/pos/core.ts`
- Intake submit processing: `apps/app/app/api/inventory/intake/route.ts`
- Intake approval processing: `apps/app/app/api/inventory/intake/approve/route.ts`
- Manual adjustment path: `apps/app/app/api/inventory/adjust/route.ts`
- Direct inventory update path: `apps/app/app/api/inventory/[id]/route.ts`
- Legacy offline replay path: `apps/app/lib/utils/offline-sync.ts`
- Shrinkage/random-check RPC usage: `apps/app/lib/utils/pos-weight-engine.ts`
- Random check counter RPC definition: `apps/app/db/schema/13_pos_weight_shrinkage_loyalty_rpc.sql`
- FIFO schema: `apps/app/db/migrations/20260316000001_inventory_fifo_batches.sql`
- Realtime disabled fallback: `apps/app/lib/hooks/use-realtime.ts`
- Reporting direct operational queries: `apps/app/lib/reports/pos-baseline.ts`, `apps/app/lib/reports/pos-reconciliation.ts`
