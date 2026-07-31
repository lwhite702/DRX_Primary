-- Remove the deterministic intake-to-batch helper and its lookup index.

BEGIN;

DROP FUNCTION IF EXISTS ensure_inventory_batch_for_intake(
  UUID,
  UUID,
  UUID,
  NUMERIC,
  NUMERIC,
  NUMERIC,
  VARCHAR,
  TIMESTAMP,
  UUID
);

DROP INDEX IF EXISTS idx_inventory_batches_business_intake_lookup;

COMMIT;
