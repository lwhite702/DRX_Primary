-- Row-Level Security Policies for Deelrx CRM
-- Ensures strict per-business isolation and role-based access

-- Enable RLS on all tables
ALTER TABLE business_profile ENABLE ROW LEVEL SECURITY;
ALTER TABLE business_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE inventory ENABLE ROW LEVEL SECURITY;
ALTER TABLE inventory_log ENABLE ROW LEVEL SECURITY;
ALTER TABLE customers ENABLE ROW LEVEL SECURITY;
ALTER TABLE customer_notes ENABLE ROW LEVEL SECURITY;
ALTER TABLE credit_transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE credit_limits ENABLE ROW LEVEL SECURITY;
ALTER TABLE sales ENABLE ROW LEVEL SECURITY;
ALTER TABLE sales_line_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE ai_insights ENABLE ROW LEVEL SECURITY;
ALTER TABLE admin_users ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE system_audit_log ENABLE ROW LEVEL SECURITY;

-- Helper function to check if user is admin
CREATE OR REPLACE FUNCTION is_admin(user_id UUID)
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM admin_users
    WHERE admin_users.user_id::uuid = is_admin.user_id::uuid
    AND role IN ('super_admin', 'admin')
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Helper function to get user's business_id from user_roles
CREATE OR REPLACE FUNCTION get_user_business_id(user_id UUID)
RETURNS UUID AS $$
BEGIN
  RETURN (
    SELECT business_id FROM user_roles
    WHERE user_roles.user_id::uuid = get_user_business_id.user_id::uuid
    LIMIT 1
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Helper function to check if user has access to business
CREATE OR REPLACE FUNCTION has_business_access(user_id UUID, business_id UUID)
RETURNS BOOLEAN AS $$
BEGIN
  -- Admins can read all businesses
  IF is_admin(user_id) THEN
    RETURN TRUE;
  END IF;
  
  -- Check if user has role for this business
  RETURN EXISTS (
    SELECT 1 FROM user_roles
    WHERE user_roles.user_id::uuid = has_business_access.user_id::uuid
    AND user_roles.business_id::uuid = has_business_access.business_id::uuid
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Business Profile Policies
CREATE POLICY "Users can view their own businesses"
  ON business_profile FOR SELECT
  USING (
    auth.uid()::uuid = owner_id::uuid
    OR has_business_access(auth.uid()::uuid, id::uuid)
    OR is_admin(auth.uid()::uuid)
  );

CREATE POLICY "Owners can insert their own businesses"
  ON business_profile FOR INSERT
  WITH CHECK (auth.uid()::uuid = owner_id::uuid);

CREATE POLICY "Owners can update their own businesses"
  ON business_profile FOR UPDATE
  USING (auth.uid()::uuid = owner_id::uuid);

CREATE POLICY "Owners can delete their own businesses"
  ON business_profile FOR DELETE
  USING (auth.uid()::uuid = owner_id::uuid);

-- Business Settings Policies
CREATE POLICY "Users can view settings for their businesses"
  ON business_settings FOR SELECT
  USING (
    has_business_access(auth.uid()::uuid, business_id::uuid)
    OR is_admin(auth.uid()::uuid)
  );

CREATE POLICY "Users can insert settings for their businesses"
  ON business_settings FOR INSERT
  WITH CHECK (has_business_access(auth.uid()::uuid, business_id::uuid));

CREATE POLICY "Users can update settings for their businesses"
  ON business_settings FOR UPDATE
  USING (has_business_access(auth.uid()::uuid, business_id::uuid));

-- Inventory Policies
CREATE POLICY "Users can view inventory for their businesses"
  ON inventory FOR SELECT
  USING (
    has_business_access(auth.uid()::uuid, business_id::uuid)
    OR is_admin(auth.uid()::uuid)
  );

CREATE POLICY "Users can insert inventory for their businesses"
  ON inventory FOR INSERT
  WITH CHECK (has_business_access(auth.uid()::uuid, business_id::uuid));

CREATE POLICY "Users can update inventory for their businesses"
  ON inventory FOR UPDATE
  USING (has_business_access(auth.uid()::uuid, business_id::uuid));

CREATE POLICY "Users can delete inventory for their businesses"
  ON inventory FOR DELETE
  USING (has_business_access(auth.uid()::uuid, business_id::uuid));

-- Inventory Log Policies
CREATE POLICY "Users can view inventory logs for their businesses"
  ON inventory_log FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM inventory
      WHERE inventory.id::uuid = inventory_log.inventory_id::uuid
      AND has_business_access(auth.uid()::uuid, inventory.business_id::uuid)
    )
    OR is_admin(auth.uid()::uuid)
  );

CREATE POLICY "Users can insert inventory logs for their businesses"
  ON inventory_log FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM inventory
      WHERE inventory.id::uuid = inventory_log.inventory_id::uuid
      AND has_business_access(auth.uid()::uuid, inventory.business_id::uuid)
    )
  );

-- Customers Policies
CREATE POLICY "Users can view customers for their businesses"
  ON customers FOR SELECT
  USING (
    has_business_access(auth.uid()::uuid, business_id::uuid)
    OR is_admin(auth.uid()::uuid)
  );

CREATE POLICY "Users can insert customers for their businesses"
  ON customers FOR INSERT
  WITH CHECK (has_business_access(auth.uid()::uuid, business_id::uuid));

CREATE POLICY "Users can update customers for their businesses"
  ON customers FOR UPDATE
  USING (has_business_access(auth.uid()::uuid, business_id::uuid));

CREATE POLICY "Users can delete customers for their businesses"
  ON customers FOR DELETE
  USING (has_business_access(auth.uid()::uuid, business_id::uuid));

-- Customer Notes Policies
CREATE POLICY "Users can view notes for customers in their businesses"
  ON customer_notes FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM customers
      WHERE customers.id::uuid = customer_notes.customer_id::uuid
      AND has_business_access(auth.uid()::uuid, customers.business_id::uuid)
    )
    OR is_admin(auth.uid()::uuid)
  );

CREATE POLICY "Users can insert notes for customers in their businesses"
  ON customer_notes FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM customers
      WHERE customers.id::uuid = customer_notes.customer_id::uuid
      AND has_business_access(auth.uid()::uuid, customers.business_id::uuid)
    )
  );

-- Credit Transactions Policies
CREATE POLICY "Users can view credit transactions for their businesses"
  ON credit_transactions FOR SELECT
  USING (
    has_business_access(auth.uid()::uuid, business_id::uuid)
    OR is_admin(auth.uid()::uuid)
  );

CREATE POLICY "Users can insert credit transactions for their businesses"
  ON credit_transactions FOR INSERT
  WITH CHECK (has_business_access(auth.uid()::uuid, business_id::uuid));

CREATE POLICY "Users can update credit transactions for their businesses"
  ON credit_transactions FOR UPDATE
  USING (has_business_access(auth.uid()::uuid, business_id::uuid));

-- Credit Limits Policies
CREATE POLICY "Users can view credit limits for their businesses"
  ON credit_limits FOR SELECT
  USING (
    has_business_access(auth.uid()::uuid, business_id::uuid)
    OR is_admin(auth.uid()::uuid)
  );

CREATE POLICY "Users can insert credit limits for their businesses"
  ON credit_limits FOR INSERT
  WITH CHECK (has_business_access(auth.uid()::uuid, business_id::uuid));

CREATE POLICY "Users can update credit limits for their businesses"
  ON credit_limits FOR UPDATE
  USING (has_business_access(auth.uid()::uuid, business_id::uuid));

-- Sales Policies
CREATE POLICY "Users can view sales for their businesses"
  ON sales FOR SELECT
  USING (
    has_business_access(auth.uid()::uuid, business_id::uuid)
    OR is_admin(auth.uid()::uuid)
  );

CREATE POLICY "Users can insert sales for their businesses"
  ON sales FOR INSERT
  WITH CHECK (has_business_access(auth.uid()::uuid, business_id::uuid));

CREATE POLICY "Users can update sales for their businesses"
  ON sales FOR UPDATE
  USING (has_business_access(auth.uid()::uuid, business_id::uuid));

-- Sales Line Items Policies
CREATE POLICY "Users can view line items for sales in their businesses"
  ON sales_line_items FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM sales
      WHERE sales.id::uuid = sales_line_items.sale_id::uuid
      AND has_business_access(auth.uid()::uuid, sales.business_id::uuid)
    )
    OR is_admin(auth.uid()::uuid)
  );

CREATE POLICY "Users can insert line items for sales in their businesses"
  ON sales_line_items FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM sales
      WHERE sales.id::uuid = sales_line_items.sale_id::uuid
      AND has_business_access(auth.uid()::uuid, sales.business_id::uuid)
    )
  );

CREATE POLICY "Users can update line items for sales in their businesses"
  ON sales_line_items FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM sales
      WHERE sales.id::uuid = sales_line_items.sale_id::uuid
      AND has_business_access(auth.uid()::uuid, sales.business_id::uuid)
    )
  );

-- AI Insights Policies
CREATE POLICY "Users can view AI insights for their businesses"
  ON ai_insights FOR SELECT
  USING (
    has_business_access(auth.uid()::uuid, business_id::uuid)
    OR is_admin(auth.uid()::uuid)
  );

CREATE POLICY "System can insert AI insights"
  ON ai_insights FOR INSERT
  WITH CHECK (TRUE); -- Edge functions use service role

-- AI Insights Failures Policies
ALTER TABLE ai_insights_failures ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can view AI failures"
  ON ai_insights_failures FOR SELECT
  USING (is_admin(auth.uid()::uuid));

CREATE POLICY "System can insert AI failures"
  ON ai_insights_failures FOR INSERT
  WITH CHECK (TRUE); -- Edge functions use service role

-- Admin Users Policies (only admins can view/modify)
CREATE POLICY "Admins can view admin users"
  ON admin_users FOR SELECT
  USING (is_admin(auth.uid()::uuid));

CREATE POLICY "Super admins can manage admin users"
  ON admin_users FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM admin_users
      WHERE admin_users.user_id::uuid = auth.uid()::uuid
      AND role = 'super_admin'
    )
  );

-- User Roles Policies
CREATE POLICY "Users can view roles for their businesses"
  ON user_roles FOR SELECT
  USING (
    has_business_access(auth.uid()::uuid, business_id::uuid)
    OR is_admin(auth.uid()::uuid)
  );

CREATE POLICY "Business owners can manage roles"
  ON user_roles FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM business_profile
      WHERE business_profile.id::uuid = user_roles.business_id::uuid
      AND business_profile.owner_id::uuid = auth.uid()::uuid
    )
    OR is_admin(auth.uid()::uuid)
  );

-- System Audit Log Policies (admins can view all, users can view their own)
CREATE POLICY "Users can view their own audit logs"
  ON system_audit_log FOR SELECT
  USING (
    user_id::uuid = auth.uid()::uuid
    OR is_admin(auth.uid()::uuid)
  );

CREATE POLICY "System can insert audit logs"
  ON system_audit_log FOR INSERT
  WITH CHECK (TRUE); -- Service role can insert

