-- Database Performance Optimization
-- 20251221000002_optimize_performance.sql

-- ============================================
-- 1. Index Unindexed Foreign Keys
-- ============================================

CREATE INDEX IF NOT EXISTS idx_ai_insights_business_id ON ai_insights(business_id);
CREATE INDEX IF NOT EXISTS idx_ai_insights_failures_business_id ON ai_insights_failures(business_id);
CREATE INDEX IF NOT EXISTS idx_ai_pricing_rec_business_id ON ai_pricing_recommendations(business_id);
CREATE INDEX IF NOT EXISTS idx_ai_pricing_rec_inventory_id ON ai_pricing_recommendations(inventory_id);
CREATE INDEX IF NOT EXISTS idx_credit_limits_business_id ON credit_limits(business_id);
CREATE INDEX IF NOT EXISTS idx_credit_limits_customer_id ON credit_limits(customer_id);
CREATE INDEX IF NOT EXISTS idx_credit_transactions_business_id ON credit_transactions(business_id);
CREATE INDEX IF NOT EXISTS idx_credit_transactions_customer_id ON credit_transactions(customer_id);
CREATE INDEX IF NOT EXISTS idx_customer_notes_customer_id ON customer_notes(customer_id);
CREATE INDEX IF NOT EXISTS idx_customers_business_id ON customers(business_id);
CREATE INDEX IF NOT EXISTS idx_delivery_management_business_id ON delivery_management(business_id);
CREATE INDEX IF NOT EXISTS idx_inventory_log_inventory_id ON inventory_log(inventory_id);
CREATE INDEX IF NOT EXISTS idx_role_permissions_permission_code ON role_permissions(permission_code);
CREATE INDEX IF NOT EXISTS idx_sales_customer_id ON sales(customer_id);
CREATE INDEX IF NOT EXISTS idx_sales_delivery_management_id ON sales(delivery_management_id);
CREATE INDEX IF NOT EXISTS idx_sales_line_items_inventory_id ON sales_line_items(inventory_id);
CREATE INDEX IF NOT EXISTS idx_sales_line_items_sale_id ON sales_line_items(sale_id);
CREATE INDEX IF NOT EXISTS idx_user_roles_business_id ON user_roles(business_id);

-- ============================================
-- 2. Consolidate Overlapping Policies
-- ============================================

-- Update has_business_access to include owners
CREATE OR REPLACE FUNCTION has_business_access(user_id UUID, business_id UUID)
RETURNS BOOLEAN AS $$
BEGIN
  -- Admins can read all businesses
  IF is_admin(user_id) THEN
    RETURN TRUE;
  END IF;

  -- Check if user is the owner of the business
  IF EXISTS (
    SELECT 1 FROM business_profile 
    WHERE id = business_id 
    AND owner_id = user_id
  ) THEN
    RETURN TRUE;
  END IF;
  
  -- Check if user has role for this business
  RETURN EXISTS (
    SELECT 1 FROM user_roles
    WHERE user_roles.user_id = has_business_access.user_id
    AND user_roles.business_id = has_business_access.business_id
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- admin_users: Split "Super admins can manage admin users" to exclude SELECT (covered by "Admins can view")
DROP POLICY IF EXISTS "Super admins can manage admin users" ON admin_users;
CREATE POLICY "Super admins can manage admin users"
  ON admin_users FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM admin_users
      WHERE admin_users.user_id = (SELECT auth.uid())
      AND role = 'super_admin'
    )
  );
-- Note: Re-creating as ALL because splitting into INSERT/UPDATE/DELETE requires 3 policies. 
-- The warning is suboptimal but "ALL" is semantic.
-- Actually, the linter warning is "Multiple permissive policies for ... SELECT".
-- If I change it to INSERT, UPDATE, DELETE, the warning goes away.
DROP POLICY IF EXISTS "Super admins can manage admin users" ON admin_users;
CREATE POLICY "Super admins can insert admin users"
  ON admin_users FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM admin_users
      WHERE admin_users.user_id = (SELECT auth.uid())
      AND role = 'super_admin'
    )
  );
CREATE POLICY "Super admins can update admin users"
  ON admin_users FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM admin_users
      WHERE admin_users.user_id = (SELECT auth.uid())
      AND role = 'super_admin'
    )
  );
CREATE POLICY "Super admins can delete admin users"
  ON admin_users FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM admin_users
      WHERE admin_users.user_id = (SELECT auth.uid())
      AND role = 'super_admin'
    )
  );
-- "Admins can view admin users" covers the SELECT part for everyone including Super Admins.


-- user_roles: Split "Business owners can manage roles"
DROP POLICY IF EXISTS "Business owners can manage roles" ON user_roles;
-- Owners are now covered by "Users can view roles for their businesses" due to updated has_business_access
CREATE POLICY "Business owners can insert roles"
  ON user_roles FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM business_profile
      WHERE business_profile.id = user_roles.business_id
      AND business_profile.owner_id = (SELECT auth.uid())
    )
    OR is_admin((SELECT auth.uid()))
  );
CREATE POLICY "Business owners can update roles"
  ON user_roles FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM business_profile
      WHERE business_profile.id = user_roles.business_id
      AND business_profile.owner_id = (SELECT auth.uid())
    )
    OR is_admin((SELECT auth.uid()))
  );
CREATE POLICY "Business owners can delete roles"
  ON user_roles FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM business_profile
      WHERE business_profile.id = user_roles.business_id
      AND business_profile.owner_id = (SELECT auth.uid())
    )
    OR is_admin((SELECT auth.uid()))
  );


-- ============================================
-- 3. Fix auth.uid() re-evaluation (auth_rls_initplan)
-- ============================================

-- business_profile
DROP POLICY IF EXISTS "Users can view their own businesses" ON business_profile;
CREATE POLICY "Users can view their own businesses"
  ON business_profile FOR SELECT
  USING (
    (SELECT auth.uid()) = owner_id
    OR has_business_access((SELECT auth.uid()), id)
    OR is_admin((SELECT auth.uid()))
  );

DROP POLICY IF EXISTS "Owners can insert their own businesses" ON business_profile;
CREATE POLICY "Owners can insert their own businesses"
  ON business_profile FOR INSERT
  WITH CHECK ((SELECT auth.uid()) = owner_id);

DROP POLICY IF EXISTS "Owners can update their own businesses" ON business_profile;
CREATE POLICY "Owners can update their own businesses"
  ON business_profile FOR UPDATE
  USING ((SELECT auth.uid()) = owner_id);

DROP POLICY IF EXISTS "Owners can delete their own businesses" ON business_profile;
CREATE POLICY "Owners can delete their own businesses"
  ON business_profile FOR DELETE
  USING ((SELECT auth.uid()) = owner_id);


-- inventory
DROP POLICY IF EXISTS "Users can view inventory for their businesses" ON inventory;
CREATE POLICY "Users can view inventory for their businesses"
  ON inventory FOR SELECT
  USING (
    has_business_access((SELECT auth.uid()), business_id)
    OR is_admin((SELECT auth.uid()))
  );

DROP POLICY IF EXISTS "Users can insert inventory for their businesses" ON inventory;
CREATE POLICY "Users can insert inventory for their businesses"
  ON inventory FOR INSERT
  WITH CHECK (
    has_business_access((SELECT auth.uid()), business_id) AND 
    public.check_permission('inventory.manage')
  );

DROP POLICY IF EXISTS "Users can update inventory for their businesses" ON inventory;
CREATE POLICY "Users can update inventory for their businesses"
  ON inventory FOR UPDATE
  USING (
    has_business_access((SELECT auth.uid()), business_id) AND 
    public.check_permission('inventory.manage')
  );

DROP POLICY IF EXISTS "Users can delete inventory for their businesses" ON inventory;
CREATE POLICY "Users can delete inventory for their businesses"
  ON inventory FOR DELETE
  USING (
    has_business_access((SELECT auth.uid()), business_id) AND 
    public.check_permission('inventory.manage')
  );


-- inventory_log
DROP POLICY IF EXISTS "Users can insert inventory logs for their businesses" ON inventory_log;
CREATE POLICY "Users can insert inventory logs for their businesses"
  ON inventory_log FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM inventory
      WHERE inventory.id = inventory_log.inventory_id
      AND has_business_access((SELECT auth.uid()), inventory.business_id)
    )
  );

DROP POLICY IF EXISTS "Users can view inventory logs for their businesses" ON inventory_log;
CREATE POLICY "Users can view inventory logs for their businesses"
  ON inventory_log FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM inventory
      WHERE inventory.id = inventory_log.inventory_id
      AND has_business_access((SELECT auth.uid()), inventory.business_id)
    )
    OR is_admin((SELECT auth.uid()))
  );


-- customers
DROP POLICY IF EXISTS "Users can delete customers for their businesses" ON customers;
CREATE POLICY "Users can delete customers for their businesses"
  ON customers FOR DELETE
  USING (has_business_access((SELECT auth.uid()), business_id));

DROP POLICY IF EXISTS "Users can insert customers for their businesses" ON customers;
CREATE POLICY "Users can insert customers for their businesses"
  ON customers FOR INSERT
  WITH CHECK (has_business_access((SELECT auth.uid()), business_id));

DROP POLICY IF EXISTS "Users can update customers for their businesses" ON customers;
CREATE POLICY "Users can update customers for their businesses"
  ON customers FOR UPDATE
  USING (has_business_access((SELECT auth.uid()), business_id));

DROP POLICY IF EXISTS "Users can view customers for their businesses" ON customers;
CREATE POLICY "Users can view customers for their businesses"
  ON customers FOR SELECT
  USING (
    has_business_access((SELECT auth.uid()), business_id)
    OR is_admin((SELECT auth.uid()))
  );


-- customer_notes
DROP POLICY IF EXISTS "Users can insert notes for customers in their businesses" ON customer_notes;
CREATE POLICY "Users can insert notes for customers in their businesses"
  ON customer_notes FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM customers
      WHERE customers.id = customer_notes.customer_id
      AND has_business_access((SELECT auth.uid()), customers.business_id)
    )
  );

DROP POLICY IF EXISTS "Users can view notes for customers in their businesses" ON customer_notes;
CREATE POLICY "Users can view notes for customers in their businesses"
  ON customer_notes FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM customers
      WHERE customers.id = customer_notes.customer_id
      AND has_business_access((SELECT auth.uid()), customers.business_id)
    )
    OR is_admin((SELECT auth.uid()))
  );


-- credit_transactions
DROP POLICY IF EXISTS "Users can insert credit transactions for their businesses" ON credit_transactions;
CREATE POLICY "Users can insert credit transactions for their businesses"
  ON credit_transactions FOR INSERT
  WITH CHECK (has_business_access((SELECT auth.uid()), business_id));

DROP POLICY IF EXISTS "Users can update credit transactions for their businesses" ON credit_transactions;
CREATE POLICY "Users can update credit transactions for their businesses"
  ON credit_transactions FOR UPDATE
  USING (has_business_access((SELECT auth.uid()), business_id));

DROP POLICY IF EXISTS "Users can view credit transactions for their businesses" ON credit_transactions;
CREATE POLICY "Users can view credit transactions for their businesses"
  ON credit_transactions FOR SELECT
  USING (
    has_business_access((SELECT auth.uid()), business_id)
    OR is_admin((SELECT auth.uid()))
  );


-- credit_limits
DROP POLICY IF EXISTS "Users can insert credit limits for their businesses" ON credit_limits;
CREATE POLICY "Users can insert credit limits for their businesses"
  ON credit_limits FOR INSERT
  WITH CHECK (has_business_access((SELECT auth.uid()), business_id));

DROP POLICY IF EXISTS "Users can update credit limits for their businesses" ON credit_limits;
CREATE POLICY "Users can update credit limits for their businesses"
  ON credit_limits FOR UPDATE
  USING (has_business_access((SELECT auth.uid()), business_id));

DROP POLICY IF EXISTS "Users can view credit limits for their businesses" ON credit_limits;
CREATE POLICY "Users can view credit limits for their businesses"
  ON credit_limits FOR SELECT
  USING (
    has_business_access((SELECT auth.uid()), business_id)
    OR is_admin((SELECT auth.uid()))
  );


-- sales_line_items
DROP POLICY IF EXISTS "Users can insert line items for sales in their businesses" ON sales_line_items;
CREATE POLICY "Users can insert line items for sales in their businesses"
  ON sales_line_items FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM sales
      WHERE sales.id = sales_line_items.sale_id
      AND has_business_access((SELECT auth.uid()), sales.business_id)
    )
  );

DROP POLICY IF EXISTS "Users can update line items for sales in their businesses" ON sales_line_items;
CREATE POLICY "Users can update line items for sales in their businesses"
  ON sales_line_items FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM sales
      WHERE sales.id = sales_line_items.sale_id
      AND has_business_access((SELECT auth.uid()), sales.business_id)
    )
  );

DROP POLICY IF EXISTS "Users can view line items for sales in their businesses" ON sales_line_items;
CREATE POLICY "Users can view line items for sales in their businesses"
  ON sales_line_items FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM sales
      WHERE sales.id = sales_line_items.sale_id
      AND has_business_access((SELECT auth.uid()), sales.business_id)
    )
    OR is_admin((SELECT auth.uid()))
  );


-- ai_insights
DROP POLICY IF EXISTS "Users can view AI insights for their businesses" ON ai_insights;
CREATE POLICY "Users can view AI insights for their businesses"
  ON ai_insights FOR SELECT
  USING (
    has_business_access((SELECT auth.uid()), business_id)
    OR is_admin((SELECT auth.uid()))
  );


-- business_settings
DROP POLICY IF EXISTS "Users can insert settings for their businesses" ON business_settings;
CREATE POLICY "Users can insert settings for their businesses"
  ON business_settings FOR INSERT
  WITH CHECK (has_business_access((SELECT auth.uid()), business_id));

DROP POLICY IF EXISTS "Users can update settings for their businesses" ON business_settings;
CREATE POLICY "Users can update settings for their businesses"
  ON business_settings FOR UPDATE
  USING (has_business_access((SELECT auth.uid()), business_id));

DROP POLICY IF EXISTS "Users can view settings for their businesses" ON business_settings;
CREATE POLICY "Users can view settings for their businesses"
  ON business_settings FOR SELECT
  USING (
    has_business_access((SELECT auth.uid()), business_id)
    OR is_admin((SELECT auth.uid()))
  );


-- delivery_management
DROP POLICY IF EXISTS "Users can delete delivery settings for their businesses" ON delivery_management;
CREATE POLICY "Users can delete delivery settings for their businesses"
  ON delivery_management FOR DELETE
  USING (has_business_access((SELECT auth.uid()), business_id));

DROP POLICY IF EXISTS "Users can insert delivery settings for their businesses" ON delivery_management;
CREATE POLICY "Users can insert delivery settings for their businesses"
  ON delivery_management FOR INSERT
  WITH CHECK (has_business_access((SELECT auth.uid()), business_id));

DROP POLICY IF EXISTS "Users can update delivery settings for their businesses" ON delivery_management;
CREATE POLICY "Users can update delivery settings for their businesses"
  ON delivery_management FOR UPDATE
  USING (has_business_access((SELECT auth.uid()), business_id));

DROP POLICY IF EXISTS "Users can view delivery settings for their businesses" ON delivery_management;
CREATE POLICY "Users can view delivery settings for their businesses"
  ON delivery_management FOR SELECT
  USING (
    has_business_access((SELECT auth.uid()), business_id)
    OR is_admin((SELECT auth.uid()))
  );


-- system_audit_log
DROP POLICY IF EXISTS "Users can view their own audit logs" ON system_audit_log;
CREATE POLICY "Users can view their own audit logs"
  ON system_audit_log FOR SELECT
  USING (
    user_id = (SELECT auth.uid())
    OR is_admin((SELECT auth.uid()))
  );


-- ai_insights_failures
DROP POLICY IF EXISTS "Admins can view AI failures" ON ai_insights_failures;
CREATE POLICY "Admins can view AI failures"
  ON ai_insights_failures FOR SELECT
  USING (is_admin((SELECT auth.uid())));


-- user_roles (Updating view policy)
DROP POLICY IF EXISTS "Users can view roles for their businesses" ON user_roles;
CREATE POLICY "Users can view roles for their businesses"
  ON user_roles FOR SELECT
  USING (
    has_business_access((SELECT auth.uid()), business_id)
    OR is_admin((SELECT auth.uid()))
  );


-- admin_users (Updating view policy)
DROP POLICY IF EXISTS "Admins can view admin users" ON admin_users;
CREATE POLICY "Admins can view admin users"
  ON admin_users FOR SELECT
  USING (is_admin((SELECT auth.uid())));


-- sales
DROP POLICY IF EXISTS "Users can insert sales for their businesses" ON sales;
CREATE POLICY "Users can insert sales for their businesses"
  ON sales FOR INSERT
  WITH CHECK (has_business_access((SELECT auth.uid()), business_id));

DROP POLICY IF EXISTS "Users can update sales for their businesses" ON sales;
CREATE POLICY "Users can update sales for their businesses"
  ON sales FOR UPDATE
  USING (has_business_access((SELECT auth.uid()), business_id));

DROP POLICY IF EXISTS "Users can view sales for their businesses" ON sales;
CREATE POLICY "Users can view sales for their businesses"
  ON sales FOR SELECT
  USING (
    has_business_access((SELECT auth.uid()), business_id)
    OR is_admin((SELECT auth.uid()))
  );


-- ai_pricing_recommendations
DROP POLICY IF EXISTS "Users can update AI pricing recommendations for their businesses" ON ai_pricing_recommendations;
CREATE POLICY "Users can update AI pricing recommendations for their businesses"
  ON ai_pricing_recommendations FOR UPDATE
  USING (has_business_access((SELECT auth.uid()), business_id));

DROP POLICY IF EXISTS "Users can view AI pricing recommendations for their businesses" ON ai_pricing_recommendations;
CREATE POLICY "Users can view AI pricing recommendations for their businesses"
  ON ai_pricing_recommendations FOR SELECT
  USING (
    has_business_access((SELECT auth.uid()), business_id)
    OR is_admin((SELECT auth.uid()))
  );
