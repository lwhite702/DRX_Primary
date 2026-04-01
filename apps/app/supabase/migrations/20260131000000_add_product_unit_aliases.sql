-- ============================================
-- Add Product Unit Aliases (Nicknames)
-- Migration: 20260131000000
-- ============================================

-- Create product_unit_aliases table
CREATE TABLE IF NOT EXISTS product_unit_aliases (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    business_id UUID REFERENCES business_profile(id) ON DELETE CASCADE,
    alias_name TEXT NOT NULL,
    standard_unit unit_of_measure NOT NULL,
    quantity NUMERIC NOT NULL,
    is_enabled BOOLEAN DEFAULT true,
    is_system_default BOOLEAN DEFAULT false,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now(),
    UNIQUE(business_id, alias_name)
    ) WITH CHECK (EXISTS (SELECT 1 FROM business_profile WHERE business_profile.owner_id = auth.uid() AND business_profile.id = product_unit_aliases.business_id) OR EXISTS (SELECT 1 FROM user_roles WHERE user_roles.user_id = auth.uid() AND user_roles.business_id = product_unit_aliases.business_id AND user_roles.role IN ('owner', 'manager')));

-- Enable RLS
ALTER TABLE product_unit_aliases ENABLE ROW LEVEL SECURITY;

-- Create RLS policies
CREATE POLICY "Users can view aliases for their business" ON product_unit_aliases
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM user_roles 
            WHERE user_roles.user_id = auth.uid() 
            AND user_roles.business_id = product_unit_aliases.business_id
        ) OR EXISTS (
            SELECT 1 FROM business_profile
            WHERE business_profile.owner_id = auth.uid()
            AND business_profile.id = product_unit_aliases.business_id
        )
    );

CREATE POLICY "Owners and Managers can manage aliases" ON product_unit_aliases
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM business_profile
            WHERE business_profile.owner_id = auth.uid()
            AND business_profile.id = product_unit_aliases.business_id
        ) OR EXISTS (
            SELECT 1 FROM user_roles 
            WHERE user_roles.user_id = auth.uid() 
            AND user_roles.business_id = product_unit_aliases.business_id
            AND user_roles.role IN ('owner', 'manager')
        )
    );

-- Function to seed default aliases for a business
CREATE OR REPLACE FUNCTION seed_business_unit_aliases(target_business_id UUID)
RETURNS void AS $$
BEGIN
    INSERT INTO product_unit_aliases (business_id, alias_name, standard_unit, quantity, is_system_default)
    VALUES 
        (target_business_id, 'Eightball', 'g', 3.5, true),
        (target_business_id, 'Ounce', 'g', 28.3495, true),
        (target_business_id, 'Zip', 'g', 28.3495, true),
        (target_business_id, 'Onion', 'g', 28.3495, true),
        (target_business_id, 'Gram', 'g', 1.0, true),
        (target_business_id, 'Ball', 'g', 125.0, true),
        (target_business_id, 'Big 8', 'g', 125.0, true),
        (target_business_id, 'Key', 'g', 1000.0, true),
        (target_business_id, 'Kilo', 'g', 1000.0, true),
        (target_business_id, 'Brick', 'g', 1000.0, true),
        (target_business_id, 'Plate', 'g', 1000.0, true),
        (target_business_id, 'Half-Key', 'g', 500.0, true),
        (target_business_id, '9 Pack', 'g', 255.0, true),
        (target_business_id, 'QP', 'g', 113.4, true),
        (target_business_id, 'Quarter Pound', 'g', 113.4, true)
    ON CONFLICT (business_id, alias_name) DO NOTHING;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger to seed aliases for new businesses
CREATE OR REPLACE FUNCTION on_business_created_seed_aliases()
RETURNS TRIGGER AS $$
BEGIN
    PERFORM seed_business_unit_aliases(NEW.id);
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER trigger_seed_business_aliases
AFTER INSERT ON business_profile
FOR EACH ROW EXECUTE FUNCTION on_business_created_seed_aliases();

-- Seed existing businesses
DO $$ 
DECLARE 
    biz_id UUID;
BEGIN
    FOR biz_id IN SELECT id FROM business_profile LOOP
        PERFORM seed_business_unit_aliases(biz_id);
    END LOOP;
END $$;
