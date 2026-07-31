# Unit coverage ratchet

Status: Active

Owner: DRX Engineering Team

Baseline measured: 2026-07-30

## Current state

The application unit suite passes 231 tests, but the configured source scope is
not at 90% global coverage. The reproducible baseline is:

| Metric | Ratchet floor | Target |
| --- | ---: | ---: |
| Lines | 28.96% | 90% |
| Branches | 53.93% | 90% |
| Functions | 51.30% | 90% |
| Statements | 28.96% | 90% |

`COVERAGE_POLICY.json` is the canonical machine-readable source. Vitest loads
its ratchet floors directly from that file, so coverage regressions fail while
the 90% target remains explicit.

## Rules

1. Ratchet floors may stay unchanged or move upward; do not lower them to make
   CI pass.
2. New or changed production logic must include tests proportional to its risk.
3. A floor increase must use a clean full-suite run and update
   `measuredAt` plus the four measured values in the same change.
4. Reaching 90% is incremental work. A green ratchet means “no regression,”
   not “90% coverage achieved.”
5. Coverage remains advisory for beta under `RELEASE_POLICY.md`; passing unit
   tests, auth/data integrity, and real authenticated persistent-data evidence
   are separate gates.

## Reproduce

Generate the Prisma client after a script-suppressed install, then collect the
full source-scope baseline:

```bash
pnpm --filter deelrxcrm-app exec prisma generate
pnpm --filter deelrxcrm-app exec vitest run --coverage \
  --coverage.thresholds.lines=0 \
  --coverage.thresholds.branches=0 \
  --coverage.thresholds.functions=0 \
  --coverage.thresholds.statements=0
```

Run the enforced ratchet:

```bash
pnpm --filter deelrxcrm-app test:coverage
```
