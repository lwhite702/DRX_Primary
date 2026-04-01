-- ============================================
-- V1 Launch Schema Updates
-- Migration: 20260131010000
-- ============================================

-- 1. Expand unit_of_measure enum
-- Note: We do this first as other columns might depend on it
ALTER TYPE unit_of_measure ADD VALUE IF NOT EXISTS 'lb';
ALTER TYPE unit_of_measure ADD VALUE IF NOT EXISTS 'L';
ALTER TYPE unit_of_measure ADD VALUE IF NOT EXISTS 'ml';

-- 2. Add onboarding fields to business_profile
ALTER TABLE business_profile ADD COLUMN IF NOT EXISTS onboarding_completed BOOLEAN DEFAULT false;

-- 3. Ensure phone_number is NOT NULL (Requirement for Launch)
UPDATE business_profile SET phone_number = '000-000-0000' WHERE phone_number IS NULL;
ALTER TABLE business_profile ALTER COLUMN phone_number SET NOT NULL;

-- 4. Create Privacy Preset Enum
DO $$ BEGIN
    CREATE TYPE privacy_preset_level AS ENUM ('open', 'balanced', 'private', 'max_secure');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- 5. Add Privacy and Unit Settings to business_settings
ALTER TABLE business_settings ADD COLUMN IF NOT EXISTS privacy_preset privacy_preset_level DEFAULT 'balanced';
ALTER TABLE business_settings ADD COLUMN IF NOT EXISTS supported_units TEXT[] DEFAULT ARRAY['g', 'oz', 'lb', 'L', 'ml'];

-- 6. Add Audit Retention and Export Policy fields to settings JSONB
-- These will be managed via the settings_data JSONB for maximum flexibility
UPDATE business_settings 
SET settings_data = settings_data || '{
  "audit_retention_days": 365,
  "allowed_export_types": ["csv", "pdf"],
  "gdpr_mode": false,
  "doomsday_mode": false,
  "inactivity_deletion_timer_days": 365
}'::jsonb
WHERE settings_data ? 'audit_retention_days' = false;

-- 7. Add recovery email to business_profile as per PRD
ALTER TABLE business_profile ADD COLUMN IF NOT EXISTS recovery_email VARCHAR(255);

-- 8. Add Intake/Adjustment reasons (seeded with defaults)
-- These will also live in settings_data as a configurable list
UPDATE business_settings 
SET settings_data = settings_data || '{
  "intake_reasons": ["Restock", "Sample Return", "Correction"],
  "adjustment_reasons": ["Theft", "Damage", "Recount", "Gift"]
}'::jsonb
WHERE settings_data ? 'intake_reasons' = false;
