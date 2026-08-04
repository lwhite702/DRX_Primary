-- Remove the uniqueness guard. Duplicate rows removed by the up migration
-- cannot be reconstructed automatically.

DROP INDEX IF EXISTS idx_inventory_batches_business_intake_unique;
