-- Remove the uniqueness guard introduced by this migration.
--
-- LIMITATION: the forward migration reassigned allocations and deleted
-- duplicate batch rows. PostgreSQL cannot reconstruct those deleted rows from
-- the surviving data, so this rollback restores schema permissiveness only.

BEGIN;

DROP INDEX IF EXISTS idx_inventory_batches_business_intake_unique;

COMMIT;
