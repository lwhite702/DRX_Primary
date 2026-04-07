-- Migration: Add POS Manager PIN
-- Description: Add pos_manager_pin column to business_settings table for overriding prices below cost

ALTER TABLE business_settings 
ADD COLUMN IF NOT EXISTS pos_manager_pin VARCHAR(50);

COMMENT ON COLUMN business_settings.pos_manager_pin IS 'PIN required for manager overrides (e.g., selling below cost)';
