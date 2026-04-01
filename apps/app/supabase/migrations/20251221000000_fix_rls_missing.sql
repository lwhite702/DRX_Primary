-- Fix missing RLS on new tables
-- 20251221000000_fix_rls_missing.sql

-- 1. Enable RLS
ALTER TABLE delivery_management ENABLE ROW LEVEL SECURITY;
ALTER TABLE ai_pricing_recommendations ENABLE ROW LEVEL SECURITY;

-- 2. Add Policies for Delivery Management
CREATE POLICY "Users can view delivery settings for their businesses"
  ON delivery_management FOR SELECT
  USING (
    has_business_access(auth.uid(), business_id)
    OR is_admin(auth.uid())
  );

CREATE POLICY "Users can insert delivery settings for their businesses"
  ON delivery_management FOR INSERT
  WITH CHECK (has_business_access(auth.uid(), business_id));

CREATE POLICY "Users can update delivery settings for their businesses"
  ON delivery_management FOR UPDATE
  USING (has_business_access(auth.uid(), business_id));

CREATE POLICY "Users can delete delivery settings for their businesses"
  ON delivery_management FOR DELETE
  USING (has_business_access(auth.uid(), business_id));

-- 3. Add Policies for AI Pricing Recommendations
CREATE POLICY "Users can view AI pricing recommendations for their businesses"
  ON ai_pricing_recommendations FOR SELECT
  USING (
    has_business_access(auth.uid(), business_id)
    OR is_admin(auth.uid())
  );

-- System creates recommendations (service role), but users might need to update status
CREATE POLICY "Users can update AI pricing recommendations for their businesses"
  ON ai_pricing_recommendations FOR UPDATE
  USING (has_business_access(auth.uid(), business_id));

-- Allow system insert (service role bypasses RLS, but explicit policy is good documentation)
CREATE POLICY "System can insert AI pricing recommendations"
  ON ai_pricing_recommendations FOR INSERT
  WITH CHECK (TRUE);
