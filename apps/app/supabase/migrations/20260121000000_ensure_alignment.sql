-- ============================================
-- Alignment with DRX-Native (Cannabis CRM)
-- Migration: 20260121000000
-- ============================================

-- 1. Create Vendors Table
CREATE TABLE IF NOT EXISTS vendors (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id UUID NOT NULL REFERENCES business_profile(id) ON DELETE CASCADE,
  name VARCHAR(255) NOT NULL,
  contact_name VARCHAR(255),
  phone VARCHAR(50),
  email VARCHAR(255),
  address TEXT,
  license_number VARCHAR(100), -- Cannabis license number
  notes TEXT,
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Enable RLS on vendors
ALTER TABLE vendors ENABLE ROW LEVEL SECURITY;

-- Vendors Policies
CREATE POLICY "Users can view vendors for their businesses"
  ON vendors FOR SELECT
  USING (
    has_business_access(auth.uid(), business_id)
    OR is_admin(auth.uid())
  );

CREATE POLICY "Users can insert vendors for their businesses"
  ON vendors FOR INSERT
  WITH CHECK (has_business_access(auth.uid(), business_id));

CREATE POLICY "Users can update vendors for their businesses"
  ON vendors FOR UPDATE
  USING (has_business_access(auth.uid(), business_id));

CREATE POLICY "Users can delete vendors for their businesses"
  ON vendors FOR DELETE
  USING (has_business_access(auth.uid(), business_id));

-- 2. Update Inventory Table
-- Add fields for Cannabis compliance and vendor linking
ALTER TABLE inventory 
ADD COLUMN IF NOT EXISTS thc_percentage DECIMAL(5, 2),
ADD COLUMN IF NOT EXISTS cbd_percentage DECIMAL(5, 2),
ADD COLUMN IF NOT EXISTS strain_type VARCHAR(50), -- Indica, Sativa, Hybrid
ADD COLUMN IF NOT EXISTS batch_number VARCHAR(100);

-- Foreign Key to Vendors (replacing generic supplier_id if desired, or aliasing it)
-- We will keep supplier_id but ensure it can be referenced to vendors if UUID matches.
-- However, supplier_id was UUID in init.sql but no foreign key constraint was strictly defined to a specific table 
-- (it was just `supplier_id UUID`). 
-- Let's add a proper FK constraint if possible, but carefully to not break existing data if any bad UUIDs exist.
-- For now, we'll leave supplier_id as is to avoid conflict, but users should use the vendors table IDs.

DO $$ BEGIN
    ALTER TABLE inventory 
    ADD CONSTRAINT fk_inventory_vendor 
    FOREIGN KEY (supplier_id) 
    REFERENCES vendors(id) 
    ON DELETE SET NULL;
EXCEPTION
    WHEN duplicate_object THEN null;
    WHEN foreign_key_violation THEN null; -- If existing data has invalid UUIDs, skip constraint
END $$;


-- 3. Update Customers Table
-- Add fields for Compliance (ID checks, Age verification)
ALTER TABLE customers
ADD COLUMN IF NOT EXISTS date_of_birth DATE,
ADD COLUMN IF NOT EXISTS age_verified BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS age_verified_date TIMESTAMP,
ADD COLUMN IF NOT EXISTS id_type VARCHAR(50), -- Driver's License, Passport, etc.
ADD COLUMN IF NOT EXISTS id_number VARCHAR(100),
ADD COLUMN IF NOT EXISTS med_card_number VARCHAR(100); -- Medical Cannabis Card

-- 4. Comments
COMMENT ON TABLE vendors IS 'Suppliers and vendors for inventory, including license info for compliance.';
COMMENT ON COLUMN inventory.thc_percentage IS 'THC potency percentage';
COMMENT ON COLUMN inventory.cbd_percentage IS 'CBD potency percentage';
COMMENT ON COLUMN inventory.strain_type IS 'Strain classification: Indica, Sativa, Hybrid';
COMMENT ON COLUMN customers.age_verified IS 'True if ID has been checked and age confirmed over 21 (or 18 for med)';
