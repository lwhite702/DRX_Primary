# POS Audit Closure Gates

Execution window: `audit-closure`

Scope tags:
- `pos`
- `inventory`
- `reports`

Only changes that map to the POS audit gap list are in scope while this window is open.

## Release Gates

1. Schema migrations applied
- `20260316000001_inventory_fifo_batches.sql`
- `20260331000001_pos_audit_closure_integrity.sql`

2. Verification suite passes
- POS contract and checkout tests
- FIFO missing-batch hard-fail test
- Preflight validation contract test
- Reporting + reconciliation tests

3. Reconciliation health
- Discrepancy report endpoint returns expected structure
- Clean golden dataset yields zero discrepancies

4. Load/concurrency
- Parallel checkout on same SKU does not oversell
- Weighted + unit mixed-batch depletion remains deterministic

5. Rollback validation
- Migration rollback rehearsal documented and successful

## Baseline Re-lock Rule

Do not regenerate `FEATURE_FREEZE_BASELINE.json` until all release gates pass.

Once green:
- regenerate baseline artifacts
- commit baseline update with POS audit closure references
