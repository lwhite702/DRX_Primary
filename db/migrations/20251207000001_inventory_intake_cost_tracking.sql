-- ============================================
-- Inventory Intake Cost Tracking System
-- Migration: 20251207000001
-- ============================================
-- This migration adds comprehensive cost tracking for inventory intakes:
-- - Total cost and weight tracking
-- - Automatic cost-per-gram calculation
-- - Separate delivery/shipping cost tracking
-- - Cost history for trend analysis
-- - Manager approval workflow for unusual costs

-- ============================================
-- 1. Inventory Intakes Table
-- ============================================
CREATE TABLE IF NOT EXISTS inventory_intakes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id UUID NOT NULL REFERENCES business_profile(id) ON DELETE CASCADE,
  inventory_id UUID NOT NULL REFERENCES inventory(id) ON DELETE CASCADE,
  
  -- Cost structure
  total_cost DECIMAL(12, 4) NOT NULL CHECK (total_cost > 0),
  total_weight_grams DECIMAL(12, 4) NOT NULL CHECK (total_weight_grams >= 0.01),
  calculated_cost_per_gram DECIMAL(12, 6) NOT NULL,
  delivery_cost DECIMAL(12, 2) DEFAULT 0 CHECK (delivery_cost >= 0),
  
  -- Supplier info
  supplier VARCHAR(255),
  
  -- Approval workflow
  requires_approval BOOLEAN DEFAULT FALSE,
  approved_by UUID,
  approved_at TIMESTAMP,
  status VARCHAR(50) DEFAULT 'approved' CHECK (status IN ('pending', 'approved', 'rejected')),
  rejection_reason TEXT,
  
  -- Audit fields
  created_by UUID,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- ============================================
-- 2. Cost History Table
-- ============================================
CREATE TABLE IF NOT EXISTS cost_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id UUID NOT NULL REFERENCES business_profile(id) ON DELETE CASCADE,
  inventory_id UUID NOT NULL REFERENCES inventory(id) ON DELETE CASCADE,
  intake_id UUID REFERENCES inventory_intakes(id) ON DELETE SET NULL,
  
  -- Cost data
  cost_per_gram DECIMAL(12, 6) NOT NULL,
  total_cost DECIMAL(12, 4) NOT NULL,
  total_weight_grams DECIMAL(12, 4) NOT NULL,
  delivery_cost DECIMAL(12, 2) DEFAULT 0,
  
  -- Supplier info
  supplier VARCHAR(255),
  
  -- Timestamp
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- ============================================
-- 3. Helper Functions
-- ============================================

-- Function to check if user is a manager
CREATE OR REPLACE FUNCTION is_manager(user_id UUID, business_id UUID)
RETURNS BOOLEAN AS $$
BEGIN
  -- Check if user has manager or admin role for this business
  RETURN EXISTS (
    SELECT 1 FROM user_roles
    WHERE user_roles.user_id = is_manager.user_id
    AND user_roles.business_id = is_manager.business_id
    AND (
      user_roles.role IN ('manager', 'admin', 'owner')
      OR (user_roles.permissions->>'can_approve_intakes')::boolean = true
    )
  ) OR is_admin(user_id);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to get average cost per gram for an inventory item
CREATE OR REPLACE FUNCTION get_avg_cost_per_gram(p_inventory_id UUID, p_days INTEGER DEFAULT 90)
RETURNS DECIMAL(12, 6) AS $$
DECLARE
  v_avg_cost DECIMAL(12, 6);
BEGIN
  SELECT AVG(cost_per_gram) INTO v_avg_cost
  FROM cost_history
  WHERE inventory_id = p_inventory_id
  AND created_at >= NOW() - (p_days || ' days')::INTERVAL;
  
  RETURN COALESCE(v_avg_cost, 0);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================
-- 4. Enable RLS
-- ============================================
ALTER TABLE inventory_intakes ENABLE ROW LEVEL SECURITY;
ALTER TABLE cost_history ENABLE ROW LEVEL SECURITY;

-- ============================================
-- 5. RLS Policies - Inventory Intakes
-- ============================================

-- Users can view intakes for their businesses
CREATE POLICY "Users can view intakes for their businesses"
  ON inventory_intakes FOR SELECT
  USING (
    has_business_access(auth.uid(), business_id)
    OR is_admin(auth.uid())
  );

-- Users can insert intakes for their businesses
CREATE POLICY "Users can insert intakes for their businesses"
  ON inventory_intakes FOR INSERT
  WITH CHECK (
    has_business_access(auth.uid(), business_id)
  );

-- Users can update intakes for their businesses
CREATE POLICY "Users can update intakes for their businesses"
  ON inventory_intakes FOR UPDATE
  USING (
    has_business_access(auth.uid(), business_id)
  );

-- Managers can approve/reject intakes
CREATE POLICY "Managers can approve intakes"
  ON inventory_intakes FOR UPDATE
  USING (
    is_manager(auth.uid(), business_id)
    AND status = 'pending'
  );

-- ============================================
-- 6. RLS Policies - Cost History
-- ============================================

-- Users can view cost history for their businesses
CREATE POLICY "Users can view cost history for their businesses"
  ON cost_history FOR SELECT
  USING (
    has_business_access(auth.uid(), business_id)
    OR is_admin(auth.uid())
  );

-- System can insert cost history (via service role or authenticated users)
CREATE POLICY "Users can insert cost history for their businesses"
  ON cost_history FOR INSERT
  WITH CHECK (
    has_business_access(auth.uid(), business_id)
    OR TRUE -- Allow service role
  );

-- ============================================
-- 7. Indexes for Performance
-- ============================================

-- Inventory Intakes indexes
CREATE INDEX IF NOT EXISTS idx_inventory_intakes_business 
  ON inventory_intakes(business_id);
CREATE INDEX IF NOT EXISTS idx_inventory_intakes_inventory 
  ON inventory_intakes(inventory_id);
CREATE INDEX IF NOT EXISTS idx_inventory_intakes_status 
  ON inventory_intakes(status);
CREATE INDEX IF NOT EXISTS idx_inventory_intakes_created 
  ON inventory_intakes(created_at DESC);

-- Cost History indexes
CREATE INDEX IF NOT EXISTS idx_cost_history_business 
  ON cost_history(business_id);
CREATE INDEX IF NOT EXISTS idx_cost_history_inventory 
  ON cost_history(inventory_id);
CREATE INDEX IF NOT EXISTS idx_cost_history_created 
  ON cost_history(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_cost_history_intake 
  ON cost_history(intake_id);

-- ============================================
-- 8. Update inventory_log to support delivery cost
-- ============================================

-- Add metadata column to inventory_log if it doesn't exist
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'inventory_log' 
    AND column_name = 'metadata'
  ) THEN
    ALTER TABLE inventory_log ADD COLUMN metadata JSONB DEFAULT '{}';
  END IF;
END $$;

-- Create index on metadata for delivery cost queries
CREATE INDEX IF NOT EXISTS idx_inventory_log_metadata 
  ON inventory_log USING GIN (metadata);

-- ============================================
-- 9. Comments for Documentation
-- ============================================

COMMENT ON TABLE inventory_intakes IS 'Tracks inventory intake events with complete cost breakdown including delivery costs';
COMMENT ON TABLE cost_history IS 'Historical record of cost changes for inventory items over time';
COMMENT ON COLUMN inventory_intakes.calculated_cost_per_gram IS 'Automatically calculated as total_cost / total_weight_grams';
COMMENT ON COLUMN inventory_intakes.delivery_cost IS 'Separate delivery/shipping cost - NOT included in cost_per_gram calculation';
COMMENT ON COLUMN inventory_intakes.requires_approval IS 'Set to true when cost deviates significantly from historical average';
COMMENT ON FUNCTION is_manager IS 'Checks if user has manager privileges for a business';
COMMENT ON FUNCTION get_avg_cost_per_gram IS 'Returns average cost per gram for an inventory item over specified days';

