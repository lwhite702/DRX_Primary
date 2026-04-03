-- ============================================
-- POS Audit Closure: transaction provenance + inventory invariants
-- Migration: 20260331000001
-- ============================================

ALTER TABLE sales
  ADD COLUMN IF NOT EXISTS sale_source VARCHAR(50) DEFAULT 'unknown',
  ADD COLUMN IF NOT EXISTS checkout_version VARCHAR(20) DEFAULT 'v1';

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'inventory_quantity_non_negative'
  ) THEN
    ALTER TABLE inventory
      ADD CONSTRAINT inventory_quantity_non_negative
      CHECK (quantity_on_hand >= 0) NOT VALID;
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'inventory_grams_non_negative'
  ) THEN
    ALTER TABLE inventory
      ADD CONSTRAINT inventory_grams_non_negative
      CHECK (inventory_in_grams IS NULL OR inventory_in_grams >= 0) NOT VALID;
  END IF;
END $$;
