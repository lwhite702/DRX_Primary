-- Migration: Business Tax Collection Toggle
-- Description: Add ability to disable tax collection per business

-- Add tax collection toggle fields to business_settings
ALTER TABLE business_settings 
  ADD COLUMN IF NOT EXISTS collect_tax BOOLEAN DEFAULT TRUE,
  ADD COLUMN IF NOT EXISTS tax_disabled_reason TEXT,
  ADD COLUMN IF NOT EXISTS tax_disabled_at TIMESTAMP,
  ADD COLUMN IF NOT EXISTS tax_disabled_by UUID REFERENCES auth.users(id) ON DELETE SET NULL;

-- Add comment
COMMENT ON COLUMN business_settings.collect_tax IS 'When false, no tax will be charged on sales for this business';
COMMENT ON COLUMN business_settings.tax_disabled_reason IS 'Optional reason why tax collection was disabled';
