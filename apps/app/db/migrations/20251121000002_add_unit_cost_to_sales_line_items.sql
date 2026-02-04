-- Migration: Add unit_cost column to sales_line_items for cost tracking
-- Date: 2025-11-21

CREATE OR REPLACE FUNCTION add_unit_cost_to_sales_line_items()
RETURNS void AS $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='sales_line_items' AND column_name='unit_cost') THEN
    ALTER TABLE sales_line_items ADD COLUMN unit_cost DECIMAL(12,2);
  END IF;
END;
$$ LANGUAGE plpgsql;

SELECT add_unit_cost_to_sales_line_items();

-- Backfill existing rows with unit_cost = 0 (to be updated later with proper values)
UPDATE sales_line_items SET unit_cost = 0 WHERE unit_cost IS NULL;
