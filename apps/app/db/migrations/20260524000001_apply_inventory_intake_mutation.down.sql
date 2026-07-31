-- Remove the centralized intake mutation RPC introduced by this migration.

BEGIN;

DROP FUNCTION IF EXISTS apply_inventory_intake_mutation(
  UUID,
  UUID,
  UUID,
  NUMERIC,
  NUMERIC,
  NUMERIC,
  NUMERIC,
  VARCHAR,
  UUID,
  TEXT
);

COMMIT;
