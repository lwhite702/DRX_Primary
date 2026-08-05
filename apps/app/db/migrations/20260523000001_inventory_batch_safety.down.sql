-- Roll back deterministic intake-to-batch lookup support.

DROP FUNCTION IF EXISTS ensure_inventory_batch_for_intake(
  UUID,
  UUID,
  UUID,
  DECIMAL,
  DECIMAL,
  DECIMAL,
  VARCHAR,
  TIMESTAMP,
  UUID
);

DROP INDEX IF EXISTS idx_inventory_batches_business_intake_lookup;
