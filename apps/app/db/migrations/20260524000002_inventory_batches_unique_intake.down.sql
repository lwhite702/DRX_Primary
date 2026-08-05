-- The deduplication performed by the up migration is intentionally irreversible.
-- Removing the index restores the prior ability to store multiple batches per intake.

DROP INDEX IF EXISTS idx_inventory_batches_business_intake_unique;
