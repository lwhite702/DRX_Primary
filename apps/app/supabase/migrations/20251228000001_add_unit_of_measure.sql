-- ============================================
-- Add Unit of Measure for Inventory
-- Migration: 20251228000001
-- ============================================
-- Adds support for liquid (oz) vs solid (g) measurement units
-- based on product category

-- Create enum for unit of measure
DO $$ BEGIN
    CREATE TYPE unit_of_measure AS ENUM ('g', 'oz');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- Add unit_of_measure column to inventory table
ALTER TABLE inventory 
  ADD COLUMN IF NOT EXISTS unit_of_measure unit_of_measure DEFAULT 'g';

-- Create a helper function to determine unit based on category
CREATE OR REPLACE FUNCTION get_unit_for_category(category_name VARCHAR)
RETURNS unit_of_measure AS $$
BEGIN
  -- Liquid categories use ounces
  IF category_name IN ('beverage', 'liquid', 'drink', 'syrup', 'oil', 'tincture', 'concentrate') THEN
    RETURN 'oz';
  -- Everything else uses grams (default for cannabis products)
  ELSE
    RETURN 'g';
  END IF;
END;
$$ LANGUAGE plpgsql IMMUTABLE SET search_path = public;

-- Comments
COMMENT ON COLUMN inventory.unit_of_measure IS 'Unit of measurement: g (grams) for solids, oz (ounces) for liquids';
COMMENT ON FUNCTION get_unit_for_category IS 'Returns appropriate unit of measure based on product category';
