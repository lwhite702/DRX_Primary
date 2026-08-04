-- Remove the centralized intake mutation helper.

DROP FUNCTION IF EXISTS apply_inventory_intake_mutation(
  UUID,
  UUID,
  UUID,
  DECIMAL,
  DECIMAL,
  DECIMAL,
  DECIMAL,
  VARCHAR,
  UUID,
  TEXT
);
