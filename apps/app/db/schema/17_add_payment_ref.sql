-- Add payment_ref to sales table for Zelle/Manual payments
ALTER TABLE sales ADD COLUMN IF NOT EXISTS payment_ref VARCHAR(255);

-- Ensure payment_method checks (if any) allow 'zelle'
-- (We verified it's a VARCHAR column, so no enum update needed strictly, but good to document)
