-- ============================================
-- Enforce unique intake batch per business
-- Migration: 20260524000002
-- ============================================

WITH ranked AS (
  SELECT
    id,
    business_id,
    intake_id,
    ROW_NUMBER() OVER (
      PARTITION BY business_id, intake_id
      ORDER BY created_at ASC, id ASC
    ) AS rn,
    FIRST_VALUE(id) OVER (
      PARTITION BY business_id, intake_id
      ORDER BY created_at ASC, id ASC
    ) AS keeper_id
  FROM inventory_batches
  WHERE intake_id IS NOT NULL
), duplicates AS (
  SELECT id AS duplicate_id, keeper_id
  FROM ranked
  WHERE rn > 1
)
UPDATE sales_line_item_allocations a
SET batch_id = d.keeper_id
FROM duplicates d
WHERE a.batch_id = d.duplicate_id;

WITH ranked AS (
  SELECT
    id,
    business_id,
    intake_id,
    ROW_NUMBER() OVER (
      PARTITION BY business_id, intake_id
      ORDER BY created_at ASC, id ASC
    ) AS rn
  FROM inventory_batches
  WHERE intake_id IS NOT NULL
)
DELETE FROM inventory_batches b
USING ranked r
WHERE b.id = r.id
  AND r.rn > 1;

CREATE UNIQUE INDEX IF NOT EXISTS idx_inventory_batches_business_intake_unique
  ON inventory_batches (business_id, intake_id)
  WHERE intake_id IS NOT NULL;
