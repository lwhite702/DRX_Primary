-- Feature Flags System
-- 20251227000001_feature_flags.sql

-- 1. Feature Flags Definitions
CREATE TABLE IF NOT EXISTS feature_flags (
  id TEXT PRIMARY KEY, -- e.g. 'ai_insights'
  description TEXT,
  is_global_enabled BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 2. Business Feature Toggle (Overrides/Entitlements)
CREATE TABLE IF NOT EXISTS business_features (
  business_id UUID REFERENCES business_profile(id) ON DELETE CASCADE,
  feature_id TEXT REFERENCES feature_flags(id) ON DELETE CASCADE,
  is_enabled BOOLEAN DEFAULT TRUE,
  enabled_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (business_id, feature_id)
);

-- 3. RLS Policies

-- Feature Flags: Readable by everyone (authenticated), manageable by admins
ALTER TABLE feature_flags ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view feature flags"
  ON feature_flags FOR SELECT
  USING (auth.role() = 'authenticated');

CREATE POLICY "Admins can manage feature flags"
  ON feature_flags FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM admin_users
      WHERE user_id = (SELECT auth.uid())
    )
  );

-- Business Features: Readable by business members, manageable by admins
ALTER TABLE business_features ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Business members can view their features"
  ON business_features FOR SELECT
  USING (
    has_business_access((SELECT auth.uid()), business_id)
  );

CREATE POLICY "Admins can manage business features"
  ON business_features FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM admin_users
      WHERE user_id = (SELECT auth.uid())
    )
  );

-- 4. RPC Helper: has_feature
CREATE OR REPLACE FUNCTION has_feature(p_business_id UUID, p_feature_id TEXT)
RETURNS BOOLEAN AS $$
DECLARE
  v_global_enabled BOOLEAN;
  v_business_enabled BOOLEAN;
BEGIN
  -- Check global flag
  SELECT is_global_enabled INTO v_global_enabled
  FROM feature_flags
  WHERE id = p_feature_id;

  -- If feature doesn't exist, return false
  IF v_global_enabled IS NULL THEN
    RETURN FALSE;
  END IF;

  -- Check business override
  SELECT is_enabled INTO v_business_enabled
  FROM business_features
  WHERE business_id = p_business_id AND feature_id = p_feature_id;

  -- Logic:
  -- 1. If business override exists, use it.
  -- 2. Else, use global default.
  
  IF v_business_enabled IS NOT NULL THEN
    RETURN v_business_enabled;
  ELSE
    RETURN v_global_enabled;
  END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- 5. Seed Initial Features (Example)
INSERT INTO feature_flags (id, description, is_global_enabled)
VALUES 
  ('ai_insights', 'Access to AI-driven business insights', TRUE),
  ('advanced_inventory', 'Access to inventory intake costing and logs', TRUE)
ON CONFLICT (id) DO NOTHING;
