-- Fix Customer Schema Mismatch
-- 20251227000000_fix_customer_schema.sql

-- 1. Relax last_name requirement
ALTER TABLE customers ALTER COLUMN last_name DROP NOT NULL;

-- 2. Add missing alias column
ALTER TABLE customers ADD COLUMN IF NOT EXISTS alias VARCHAR(100);
