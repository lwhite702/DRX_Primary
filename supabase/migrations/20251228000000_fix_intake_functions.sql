-- ============================================
-- Add Missing Functions for Inventory Intake
-- Migration: 20251228000000_fix_intake_functions.sql
-- ============================================
-- Only adds the missing functions: is_manager and get_avg_cost_per_gram
-- Note: is_admin and has_business_access already exist

-- Helper function to check if user is a manager
CREATE OR REPLACE FUNCTION is_manager(user_id UUID, business_id UUID)
RETURNS BOOLEAN AS $$
BEGIN
  -- Check if user has manager or admin role for this business
  RETURN EXISTS (
    SELECT 1 FROM user_roles
    WHERE user_roles.user_id = is_manager.user_id
    AND user_roles.business_id = is_manager.business_id
    AND (
      user_roles.role IN ('manager', 'admin', 'super_admin')
      OR (user_roles.permissions->>'can_approve_intakes')::boolean = true
    )
  ) OR is_admin(user_id);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

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
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Comments
COMMENT ON FUNCTION is_manager IS 'Checks if user has manager privileges for a business';
COMMENT ON FUNCTION get_avg_cost_per_gram IS 'Returns average cost per gram for an inventory item over specified days';
