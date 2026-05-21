# Migration Rollback Policy

## Scope
This policy applies to SQL migrations under:

- `apps/app/db/migrations`

## Enforcement

- Every migration at or after timestamp `20260405000000` must include a sibling rollback file:
  - Up: `YYYYMMDDHHMMSS_description.sql`
  - Down: `YYYYMMDDHHMMSS_description.down.sql`
- CI enforces this via:
  - `pnpm --filter deelrxcrm-app verify:migration-rollbacks`

Legacy migrations before this timestamp are reported as warnings and will be backfilled over time.

## Rollback Procedure

1. Identify the migration to roll back in `apps/app/db/migrations`.
2. Review the matching `.down.sql` for safety.
3. Apply the rollback in a maintenance window against the target environment.
4. Re-run health checks:
   - `/api/health`
   - core auth flow
   - critical POS read/write routes
5. Confirm no data integrity regressions in:
   - `sales`
   - `customers`
   - `inventory`
   - `credit_limits`

## Security-irreversible Migrations

For security hardening migrations, rollback may intentionally be non-reversible (no-op) when rollback would re-introduce insecure defaults or unsafe behavior. In those cases:

- The `.down.sql` file must exist.
- The file must explicitly document why rollback is non-reversible.
- Rollback fallback is application rollback only, not schema weakening.
