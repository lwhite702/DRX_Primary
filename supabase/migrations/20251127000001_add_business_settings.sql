-- Migration: Add business_settings table for per-business configuration
-- Date: 2025-11-27

CREATE TABLE IF NOT EXISTS business_settings (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  business_id UUID REFERENCES business_profile(id) ON DELETE CASCADE,
  default_tax_rate DECIMAL(5,4) DEFAULT 0.0800,
  currency VARCHAR(3) DEFAULT 'USD',
  timezone VARCHAR(50) DEFAULT 'America/New_York',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(business_id)
);

-- Enable RLS
ALTER TABLE business_settings ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Users can view their business settings"
  ON business_settings FOR SELECT
  USING (has_business_access(auth.uid(), business_id));

CREATE POLICY "Users can update their business settings"
  ON business_settings FOR UPDATE
  USING (has_business_access(auth.uid(), business_id));

CREATE POLICY "Users can insert their business settings"
  ON business_settings FOR INSERT
  WITH CHECK (has_business_access(auth.uid(), business_id));

-- Create default settings for existing businesses
INSERT INTO business_settings (business_id)
SELECT id FROM business_profile
WHERE NOT EXISTS (
  SELECT 1 FROM business_settings WHERE business_id = business_profile.id
);
