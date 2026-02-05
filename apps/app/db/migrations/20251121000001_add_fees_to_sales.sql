-- Migration: Add configurable fees column to sales
-- Date: 2025-11-21
-- This column stores an array of JSON objects: [{type: 'processing', amount: 2.50}, ...]

CREATE OR REPLACE FUNCTION add_fees_to_sales()
RETURNS void AS $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_name = 'sales'
      AND column_name = 'fees'
  ) THEN
    ALTER TABLE sales
      ADD COLUMN fees JSONB NOT NULL DEFAULT '[]'::jsonb;
  END IF;
END;
$$ LANGUAGE plpgsql;

SELECT add_fees_to_sales();

-- Back-fill existing rows (should already be defaulted, but explicit for safety)
UPDATE sales SET fees = '[]'::jsonb WHERE fees IS NULL;
