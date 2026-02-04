-- Add fixed_price_per_gram to customers table for custom flat-rate pricing
ALTER TABLE customers ADD COLUMN IF NOT EXISTS fixed_price_per_gram DECIMAL(12, 2);

-- Add audit logging for this change (if using trigger-based auditing, this might be automatic, but explicit is good)
-- Assuming existing audit triggers handle column info or we just let it be.

-- Comment on column
COMMENT ON COLUMN customers.fixed_price_per_gram IS 'Override price per gram for this specific customer. If set, this takes precedence over bulk pricing tiers.';
