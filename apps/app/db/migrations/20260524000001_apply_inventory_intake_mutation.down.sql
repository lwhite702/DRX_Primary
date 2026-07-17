-- Roll back the centralized inventory intake mutation RPC.

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
