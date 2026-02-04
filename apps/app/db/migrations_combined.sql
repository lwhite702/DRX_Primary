-- DRX CRM Database Migrations
-- Run this file in Supabase Dashboard SQL Editor
-- https://supabase.com/dashboard/project/ljndzcilgplckhdjddry/sql/new

-- ============================================
-- 01: Business Profile
-- ============================================
-- Business Profile Table
CREATE TABLE IF NOT EXISTS business_profile (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  business_name VARCHAR(255) NOT NULL,
  business_type VARCHAR(100),
  address TEXT,
  city VARCHAR(100),
  state VARCHAR(50),
  zip_code VARCHAR(20),
  phone_number VARCHAR(20),
  email VARCHAR(255),
  owner_id UUID NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  is_active BOOLEAN DEFAULT TRUE
);

-- Business Settings Table
CREATE TABLE IF NOT EXISTS business_settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id UUID NOT NULL REFERENCES business_profile(id) ON DELETE CASCADE,
  theme_preference VARCHAR(50),
  currency VARCHAR(3) DEFAULT 'USD',
  timezone VARCHAR(100),
  settings_data JSONB DEFAULT '{}',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- ============================================
-- 02: Inventory
-- ============================================
-- Inventory Items Table
CREATE TABLE IF NOT EXISTS inventory (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id UUID NOT NULL REFERENCES business_profile(id) ON DELETE CASCADE,
  sku VARCHAR(100) NOT NULL,
  product_name VARCHAR(255) NOT NULL,
  description TEXT,
  category VARCHAR(100),
  quantity_on_hand INTEGER DEFAULT 0,
  reorder_level INTEGER DEFAULT 10,
  unit_cost DECIMAL(12, 2),
  selling_price DECIMAL(12, 2),
  supplier_id UUID,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(business_id, sku)
);

-- Inventory Logs (for audit trail)
CREATE TABLE IF NOT EXISTS inventory_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  inventory_id UUID NOT NULL REFERENCES inventory(id) ON DELETE CASCADE,
  transaction_type VARCHAR(50),
  quantity_change INTEGER,
  reason TEXT,
  created_by UUID,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- ============================================
-- 03: Customers
-- ============================================
-- Customers Table
CREATE TABLE IF NOT EXISTS customers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id UUID NOT NULL REFERENCES business_profile(id) ON DELETE CASCADE,
  first_name VARCHAR(100) NOT NULL,
  last_name VARCHAR(100) NOT NULL,
  phone_number VARCHAR(20),
  email VARCHAR(255),
  address TEXT,
  city VARCHAR(100),
  state VARCHAR(50),
  zip_code VARCHAR(20),
  customer_type VARCHAR(50),
  total_purchases DECIMAL(12, 2) DEFAULT 0,
  total_credit_used DECIMAL(12, 2) DEFAULT 0,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  is_active BOOLEAN DEFAULT TRUE
);

-- Customer Notes Table
CREATE TABLE IF NOT EXISTS customer_notes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_id UUID NOT NULL REFERENCES customers(id) ON DELETE CASCADE,
  note_text TEXT NOT NULL,
  created_by UUID,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- ============================================
-- 04: Credit
-- ============================================
-- Credit Transactions Table
CREATE TABLE IF NOT EXISTS credit_transactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id UUID NOT NULL REFERENCES business_profile(id) ON DELETE CASCADE,
  customer_id UUID NOT NULL REFERENCES customers(id) ON DELETE CASCADE,
  transaction_type VARCHAR(50),
  amount DECIMAL(12, 2) NOT NULL,
  description TEXT,
  due_date DATE,
  paid_date DATE,
  status VARCHAR(50) DEFAULT 'pending',
  created_by UUID,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Credit Limits Table
CREATE TABLE IF NOT EXISTS credit_limits (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id UUID NOT NULL REFERENCES business_profile(id) ON DELETE CASCADE,
  customer_id UUID NOT NULL REFERENCES customers(id) ON DELETE CASCADE,
  max_credit_limit DECIMAL(12, 2),
  current_balance DECIMAL(12, 2) DEFAULT 0,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- ============================================
-- 05: Sales
-- ============================================
-- Sales Orders Table
CREATE TABLE IF NOT EXISTS sales (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id UUID NOT NULL REFERENCES business_profile(id) ON DELETE CASCADE,
  customer_id UUID REFERENCES customers(id) ON DELETE SET NULL,
  order_number VARCHAR(50) NOT NULL,
  order_type VARCHAR(50),
  order_status VARCHAR(50) DEFAULT 'pending',
  subtotal DECIMAL(12, 2),
  tax_amount DECIMAL(12, 2) DEFAULT 0,
  total_amount DECIMAL(12, 2),
  payment_method VARCHAR(50),
  created_by UUID,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(business_id, order_number)
);

-- Sales Line Items Table
CREATE TABLE IF NOT EXISTS sales_line_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  sale_id UUID NOT NULL REFERENCES sales(id) ON DELETE CASCADE,
  inventory_id UUID REFERENCES inventory(id),
  quantity INTEGER NOT NULL,
  unit_price DECIMAL(12, 2) NOT NULL,
  line_total DECIMAL(12, 2),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- ============================================
-- 06: AI Insights
-- ============================================
-- AI Insights Table
CREATE TABLE IF NOT EXISTS ai_insights (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id UUID NOT NULL REFERENCES business_profile(id) ON DELETE CASCADE,
  insight_type VARCHAR(100),
  insight_title VARCHAR(255),
  insight_content TEXT,
  priority VARCHAR(50),
  action_recommended TEXT,
  status VARCHAR(50) DEFAULT 'pending',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- AI Insights Failures Table (for error tracking)
CREATE TABLE IF NOT EXISTS ai_insights_failures (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id UUID REFERENCES business_profile(id) ON DELETE CASCADE,
  function_name VARCHAR(100),
  error_message TEXT,
  error_stack TEXT,
  input_data JSONB,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- ============================================
-- 07: Admin
-- ============================================
-- Admin Users Table
CREATE TABLE IF NOT EXISTS admin_users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  role VARCHAR(50),
  permission_level INTEGER,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- User Roles Table
CREATE TABLE IF NOT EXISTS user_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id UUID NOT NULL REFERENCES business_profile(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  role VARCHAR(50),
  permissions JSONB DEFAULT '{}',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- System Audit Log Table
CREATE TABLE IF NOT EXISTS system_audit_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  action VARCHAR(255),
  entity_type VARCHAR(100),
  entity_id UUID,
  user_id UUID,
  old_values JSONB,
  new_values JSONB,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- ============================================
-- 08: RLS Policies
-- ============================================
-- Row-Level Security Policies for DRX CRM
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
    WHERE admin_users.user_id = is_admin.user_id
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
    WHERE user_roles.user_id = get_user_business_id.user_id
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
    WHERE user_roles.user_id = has_business_access.user_id
    AND user_roles.business_id = has_business_access.business_id
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Business Profile Policies
CREATE POLICY "Users can view their own businesses"
  ON business_profile FOR SELECT
  USING (
    auth.uid() = owner_id
    OR has_business_access(auth.uid(), id)
    OR is_admin(auth.uid())
  );

CREATE POLICY "Owners can insert their own businesses"
  ON business_profile FOR INSERT
  WITH CHECK (auth.uid() = owner_id);

CREATE POLICY "Owners can update their own businesses"
  ON business_profile FOR UPDATE
  USING (auth.uid() = owner_id);

CREATE POLICY "Owners can delete their own businesses"
  ON business_profile FOR DELETE
  USING (auth.uid() = owner_id);

-- Business Settings Policies
CREATE POLICY "Users can view settings for their businesses"
  ON business_settings FOR SELECT
  USING (
    has_business_access(auth.uid(), business_id)
    OR is_admin(auth.uid())
  );

CREATE POLICY "Users can insert settings for their businesses"
  ON business_settings FOR INSERT
  WITH CHECK (has_business_access(auth.uid(), business_id));

CREATE POLICY "Users can update settings for their businesses"
  ON business_settings FOR UPDATE
  USING (has_business_access(auth.uid(), business_id));

-- Inventory Policies
CREATE POLICY "Users can view inventory for their businesses"
  ON inventory FOR SELECT
  USING (
    has_business_access(auth.uid(), business_id)
    OR is_admin(auth.uid())
  );

CREATE POLICY "Users can insert inventory for their businesses"
  ON inventory FOR INSERT
  WITH CHECK (has_business_access(auth.uid(), business_id));

CREATE POLICY "Users can update inventory for their businesses"
  ON inventory FOR UPDATE
  USING (has_business_access(auth.uid(), business_id));

CREATE POLICY "Users can delete inventory for their businesses"
  ON inventory FOR DELETE
  USING (has_business_access(auth.uid(), business_id));

-- Inventory Log Policies
CREATE POLICY "Users can view inventory logs for their businesses"
  ON inventory_log FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM inventory
      WHERE inventory.id = inventory_log.inventory_id
      AND has_business_access(auth.uid(), inventory.business_id)
    )
    OR is_admin(auth.uid())
  );

CREATE POLICY "Users can insert inventory logs for their businesses"
  ON inventory_log FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM inventory
      WHERE inventory.id = inventory_log.inventory_id
      AND has_business_access(auth.uid(), inventory.business_id)
    )
  );

-- Customers Policies
CREATE POLICY "Users can view customers for their businesses"
  ON customers FOR SELECT
  USING (
    has_business_access(auth.uid(), business_id)
    OR is_admin(auth.uid())
  );

CREATE POLICY "Users can insert customers for their businesses"
  ON customers FOR INSERT
  WITH CHECK (has_business_access(auth.uid(), business_id));

CREATE POLICY "Users can update customers for their businesses"
  ON customers FOR UPDATE
  USING (has_business_access(auth.uid(), business_id));

CREATE POLICY "Users can delete customers for their businesses"
  ON customers FOR DELETE
  USING (has_business_access(auth.uid(), business_id));

-- Customer Notes Policies
CREATE POLICY "Users can view notes for customers in their businesses"
  ON customer_notes FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM customers
      WHERE customers.id = customer_notes.customer_id
      AND has_business_access(auth.uid(), customers.business_id)
    )
    OR is_admin(auth.uid())
  );

CREATE POLICY "Users can insert notes for customers in their businesses"
  ON customer_notes FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM customers
      WHERE customers.id = customer_notes.customer_id
      AND has_business_access(auth.uid(), customers.business_id)
    )
  );

-- Credit Transactions Policies
CREATE POLICY "Users can view credit transactions for their businesses"
  ON credit_transactions FOR SELECT
  USING (
    has_business_access(auth.uid(), business_id)
    OR is_admin(auth.uid())
  );

CREATE POLICY "Users can insert credit transactions for their businesses"
  ON credit_transactions FOR INSERT
  WITH CHECK (has_business_access(auth.uid(), business_id));

CREATE POLICY "Users can update credit transactions for their businesses"
  ON credit_transactions FOR UPDATE
  USING (has_business_access(auth.uid(), business_id));

-- Credit Limits Policies
CREATE POLICY "Users can view credit limits for their businesses"
  ON credit_limits FOR SELECT
  USING (
    has_business_access(auth.uid(), business_id)
    OR is_admin(auth.uid())
  );

CREATE POLICY "Users can insert credit limits for their businesses"
  ON credit_limits FOR INSERT
  WITH CHECK (has_business_access(auth.uid(), business_id));

CREATE POLICY "Users can update credit limits for their businesses"
  ON credit_limits FOR UPDATE
  USING (has_business_access(auth.uid(), business_id));

-- Sales Policies
CREATE POLICY "Users can view sales for their businesses"
  ON sales FOR SELECT
  USING (
    has_business_access(auth.uid(), business_id)
    OR is_admin(auth.uid())
  );

CREATE POLICY "Users can insert sales for their businesses"
  ON sales FOR INSERT
  WITH CHECK (has_business_access(auth.uid(), business_id));

CREATE POLICY "Users can update sales for their businesses"
  ON sales FOR UPDATE
  USING (has_business_access(auth.uid(), business_id));

-- Sales Line Items Policies
CREATE POLICY "Users can view line items for sales in their businesses"
  ON sales_line_items FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM sales
      WHERE sales.id = sales_line_items.sale_id
      AND has_business_access(auth.uid(), sales.business_id)
    )
    OR is_admin(auth.uid())
  );

CREATE POLICY "Users can insert line items for sales in their businesses"
  ON sales_line_items FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM sales
      WHERE sales.id = sales_line_items.sale_id
      AND has_business_access(auth.uid(), sales.business_id)
    )
  );

CREATE POLICY "Users can update line items for sales in their businesses"
  ON sales_line_items FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM sales
      WHERE sales.id = sales_line_items.sale_id
      AND has_business_access(auth.uid(), sales.business_id)
    )
  );

-- AI Insights Policies
CREATE POLICY "Users can view AI insights for their businesses"
  ON ai_insights FOR SELECT
  USING (
    has_business_access(auth.uid(), business_id)
    OR is_admin(auth.uid())
  );

CREATE POLICY "System can insert AI insights"
  ON ai_insights FOR INSERT
  WITH CHECK (TRUE); -- Edge functions use service role

-- AI Insights Failures Policies
ALTER TABLE ai_insights_failures ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can view AI failures"
  ON ai_insights_failures FOR SELECT
  USING (is_admin(auth.uid()));

CREATE POLICY "System can insert AI failures"
  ON ai_insights_failures FOR INSERT
  WITH CHECK (TRUE); -- Edge functions use service role

-- Admin Users Policies (only admins can view/modify)
CREATE POLICY "Admins can view admin users"
  ON admin_users FOR SELECT
  USING (is_admin(auth.uid()));

CREATE POLICY "Super admins can manage admin users"
  ON admin_users FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM admin_users
      WHERE admin_users.user_id = auth.uid()
      AND role = 'super_admin'
    )
  );

-- User Roles Policies
CREATE POLICY "Users can view roles for their businesses"
  ON user_roles FOR SELECT
  USING (
    has_business_access(auth.uid(), business_id)
    OR is_admin(auth.uid())
  );

CREATE POLICY "Business owners can manage roles"
  ON user_roles FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM business_profile
      WHERE business_profile.id = user_roles.business_id
      AND business_profile.owner_id = auth.uid()
    )
    OR is_admin(auth.uid())
  );

-- System Audit Log Policies (admins can view all, users can view their own)
CREATE POLICY "Users can view their own audit logs"
  ON system_audit_log FOR SELECT
  USING (
    user_id = auth.uid()
    OR is_admin(auth.uid())
  );

CREATE POLICY "System can insert audit logs"
  ON system_audit_log FOR INSERT
  WITH CHECK (TRUE); -- Service role can insert


-- ============================================
-- 09: RPC Functions
-- ============================================
-- RPC Functions for Secure Data Access
-- These functions provide controlled access to data with RLS enforcement

-- Function to process POS checkout with inventory deduction
CREATE OR REPLACE FUNCTION process_pos_checkout(
  p_business_id UUID,
  p_customer_id UUID,
  p_order_type VARCHAR(50),
  p_payment_method VARCHAR(50),
  p_line_items JSONB,
  p_tax_amount DECIMAL(12, 2) DEFAULT 0
)
RETURNS UUID AS $$
DECLARE
  v_sale_id UUID;
  v_order_number VARCHAR(50);
  v_subtotal DECIMAL(12, 2) := 0;
  v_total DECIMAL(12, 2);
  v_item JSONB;
  v_inventory_id UUID;
  v_quantity INTEGER;
  v_unit_price DECIMAL(12, 2);
  v_line_total DECIMAL(12, 2);
  v_current_stock INTEGER;
BEGIN
  -- Verify business access
  IF NOT has_business_access(auth.uid(), p_business_id) THEN
    RAISE EXCEPTION 'Access denied to business';
  END IF;

  -- Generate order number
  v_order_number := 'ORD-' || TO_CHAR(NOW(), 'YYYYMMDD') || '-' || LPAD(NEXTVAL('order_sequence')::TEXT, 6, '0');
  
  -- Calculate subtotal from line items
  FOR v_item IN SELECT * FROM jsonb_array_elements(p_line_items)
  LOOP
    v_line_total := (v_item->>'quantity')::INTEGER * (v_item->>'unit_price')::DECIMAL(12, 2);
    v_subtotal := v_subtotal + v_line_total;
  END LOOP;

  v_total := v_subtotal + p_tax_amount;

  -- Start transaction
  BEGIN
    -- Create sale record
    INSERT INTO sales (
      business_id,
      customer_id,
      order_number,
      order_type,
      order_status,
      subtotal,
      tax_amount,
      total_amount,
      payment_method,
      created_by
    ) VALUES (
      p_business_id,
      p_customer_id,
      v_order_number,
      p_order_type,
      'completed',
      v_subtotal,
      p_tax_amount,
      v_total,
      p_payment_method,
      auth.uid()
    ) RETURNING id INTO v_sale_id;

    -- Process line items and deduct inventory
    FOR v_item IN SELECT * FROM jsonb_array_elements(p_line_items)
    LOOP
      v_inventory_id := (v_item->>'inventory_id')::UUID;
      v_quantity := (v_item->>'quantity')::INTEGER;
      v_unit_price := (v_item->>'unit_price')::DECIMAL(12, 2);
      v_line_total := v_quantity * v_unit_price;

      -- Check stock availability
      SELECT quantity_on_hand INTO v_current_stock
      FROM inventory
      WHERE id = v_inventory_id AND business_id = p_business_id;

      IF v_current_stock IS NULL THEN
        RAISE EXCEPTION 'Inventory item not found';
      END IF;

      IF v_current_stock < v_quantity THEN
        RAISE EXCEPTION 'Insufficient stock for item %', v_inventory_id;
      END IF;

      -- Deduct inventory
      UPDATE inventory
      SET quantity_on_hand = quantity_on_hand - v_quantity,
          updated_at = NOW()
      WHERE id = v_inventory_id;

      -- Log inventory change
      INSERT INTO inventory_log (
        inventory_id,
        transaction_type,
        quantity_change,
        reason,
        created_by
      ) VALUES (
        v_inventory_id,
        'sale',
        -v_quantity,
        'POS checkout: ' || v_order_number,
        auth.uid()
      );

      -- Create line item
      INSERT INTO sales_line_items (
        sale_id,
        inventory_id,
        quantity,
        unit_price,
        line_total
      ) VALUES (
        v_sale_id,
        v_inventory_id,
        v_quantity,
        v_unit_price,
        v_line_total
      );
    END LOOP;

    -- Update customer total purchases
    IF p_customer_id IS NOT NULL THEN
      UPDATE customers
      SET total_purchases = total_purchases + v_total,
          updated_at = NOW()
      WHERE id = p_customer_id;
    END IF;

    -- Log audit
    INSERT INTO system_audit_log (
      action,
      entity_type,
      entity_id,
      user_id,
      new_values
    ) VALUES (
      'pos_checkout',
      'sale',
      v_sale_id,
      auth.uid(),
      jsonb_build_object(
        'order_number', v_order_number,
        'total', v_total,
        'payment_method', p_payment_method
      )
    );

    RETURN v_sale_id;
  EXCEPTION
    WHEN OTHERS THEN
      RAISE;
  END;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to extend credit (front)
CREATE OR REPLACE FUNCTION extend_credit(
  p_business_id UUID,
  p_customer_id UUID,
  p_amount DECIMAL(12, 2),
  p_description TEXT,
  p_due_date DATE
)
RETURNS UUID AS $$
DECLARE
  v_transaction_id UUID;
  v_credit_limit DECIMAL(12, 2);
  v_current_balance DECIMAL(12, 2);
  v_new_balance DECIMAL(12, 2);
BEGIN
  -- Verify business access
  IF NOT has_business_access(auth.uid(), p_business_id) THEN
    RAISE EXCEPTION 'Access denied to business';
  END IF;

  -- Get or create credit limit
  SELECT max_credit_limit, current_balance
  INTO v_credit_limit, v_current_balance
  FROM credit_limits
  WHERE business_id = p_business_id AND customer_id = p_customer_id;

  IF v_credit_limit IS NULL THEN
    -- Create default credit limit
    INSERT INTO credit_limits (business_id, customer_id, max_credit_limit, current_balance)
    VALUES (p_business_id, p_customer_id, 1000.00, 0)
    RETURNING max_credit_limit, current_balance INTO v_credit_limit, v_current_balance;
  END IF;

  v_new_balance := v_current_balance + p_amount;

  -- Check if exceeds limit
  IF v_new_balance > v_credit_limit THEN
    RAISE EXCEPTION 'Credit limit exceeded. Current: %, Limit: %, Requested: %',
      v_current_balance, v_credit_limit, p_amount;
  END IF;

  -- Create credit transaction
  INSERT INTO credit_transactions (
    business_id,
    customer_id,
    transaction_type,
    amount,
    description,
    due_date,
    status,
    created_by
  ) VALUES (
    p_business_id,
    p_customer_id,
    'extension',
    p_amount,
    p_description,
    p_due_date,
    'pending',
    auth.uid()
  ) RETURNING id INTO v_transaction_id;

  -- Update credit limit balance
  UPDATE credit_limits
  SET current_balance = v_new_balance,
      updated_at = NOW()
  WHERE business_id = p_business_id AND customer_id = p_customer_id;

  -- Update customer total credit used
  UPDATE customers
  SET total_credit_used = total_credit_used + p_amount,
      updated_at = NOW()
  WHERE id = p_customer_id;

  -- Log audit
  INSERT INTO system_audit_log (
    action,
    entity_type,
    entity_id,
    user_id,
    new_values
  ) VALUES (
    'credit_extension',
    'credit_transaction',
    v_transaction_id,
    auth.uid(),
    jsonb_build_object('amount', p_amount, 'new_balance', v_new_balance)
  );

  RETURN v_transaction_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to process credit payment
CREATE OR REPLACE FUNCTION process_credit_payment(
  p_business_id UUID,
  p_customer_id UUID,
  p_amount DECIMAL(12, 2),
  p_description TEXT
)
RETURNS UUID AS $$
DECLARE
  v_transaction_id UUID;
  v_current_balance DECIMAL(12, 2);
  v_new_balance DECIMAL(12, 2);
BEGIN
  -- Verify business access
  IF NOT has_business_access(auth.uid(), p_business_id) THEN
    RAISE EXCEPTION 'Access denied to business';
  END IF;

  -- Get current balance
  SELECT current_balance INTO v_current_balance
  FROM credit_limits
  WHERE business_id = p_business_id AND customer_id = p_customer_id;

  IF v_current_balance IS NULL THEN
    RAISE EXCEPTION 'No credit account found for customer';
  END IF;

  IF v_current_balance < p_amount THEN
    RAISE EXCEPTION 'Payment amount exceeds balance. Balance: %, Payment: %',
      v_current_balance, p_amount;
  END IF;

  v_new_balance := v_current_balance - p_amount;

  -- Create payment transaction
  INSERT INTO credit_transactions (
    business_id,
    customer_id,
    transaction_type,
    amount,
    description,
    paid_date,
    status,
    created_by
  ) VALUES (
    p_business_id,
    p_customer_id,
    'payment',
    p_amount,
    p_description,
    CURRENT_DATE,
    'completed',
    auth.uid()
  ) RETURNING id INTO v_transaction_id;

  -- Update credit limit balance
  UPDATE credit_limits
  SET current_balance = v_new_balance,
      updated_at = NOW()
  WHERE business_id = p_business_id AND customer_id = p_customer_id;

  -- Log audit
  INSERT INTO system_audit_log (
    action,
    entity_type,
    entity_id,
    user_id,
    new_values
  ) VALUES (
    'credit_payment',
    'credit_transaction',
    v_transaction_id,
    auth.uid(),
    jsonb_build_object('amount', p_amount, 'new_balance', v_new_balance)
  );

  RETURN v_transaction_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to get credit aging buckets
CREATE OR REPLACE FUNCTION get_credit_aging(
  p_business_id UUID,
  p_customer_id UUID DEFAULT NULL
)
RETURNS TABLE (
  customer_id UUID,
  customer_name TEXT,
  bucket_1_7 DECIMAL(12, 2),
  bucket_8_14 DECIMAL(12, 2),
  bucket_15_30 DECIMAL(12, 2),
  bucket_31_plus DECIMAL(12, 2),
  total_outstanding DECIMAL(12, 2)
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    c.id,
    (c.first_name || ' ' || c.last_name)::TEXT,
    COALESCE(SUM(CASE WHEN ct.due_date >= CURRENT_DATE - INTERVAL '7 days' 
                      AND ct.due_date < CURRENT_DATE 
                      AND ct.status = 'pending' 
                 THEN ct.amount ELSE 0 END), 0)::DECIMAL(12, 2),
    COALESCE(SUM(CASE WHEN ct.due_date >= CURRENT_DATE - INTERVAL '14 days' 
                      AND ct.due_date < CURRENT_DATE - INTERVAL '7 days' 
                      AND ct.status = 'pending' 
                 THEN ct.amount ELSE 0 END), 0)::DECIMAL(12, 2),
    COALESCE(SUM(CASE WHEN ct.due_date >= CURRENT_DATE - INTERVAL '30 days' 
                      AND ct.due_date < CURRENT_DATE - INTERVAL '14 days' 
                      AND ct.status = 'pending' 
                 THEN ct.amount ELSE 0 END), 0)::DECIMAL(12, 2),
    COALESCE(SUM(CASE WHEN ct.due_date < CURRENT_DATE - INTERVAL '30 days' 
                      AND ct.status = 'pending' 
                 THEN ct.amount ELSE 0 END), 0)::DECIMAL(12, 2),
    COALESCE(SUM(CASE WHEN ct.status = 'pending' THEN ct.amount ELSE 0 END), 0)::DECIMAL(12, 2)
  FROM customers c
  JOIN credit_transactions ct ON ct.customer_id = c.id
  WHERE c.business_id = p_business_id
    AND (p_customer_id IS NULL OR c.id = p_customer_id)
    AND ct.transaction_type = 'extension'
  GROUP BY c.id, c.first_name, c.last_name;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create sequence for order numbers
CREATE SEQUENCE IF NOT EXISTS order_sequence START 1;

-- Delivery Management Table
CREATE TABLE IF NOT EXISTS delivery_management (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id UUID NOT NULL REFERENCES business_profile(id) ON DELETE CASCADE,
  name VARCHAR(255) NOT NULL,
  provider VARCHAR(100),
  base_price DECIMAL(12, 2) DEFAULT 0,
  is_active BOOLEAN DEFAULT TRUE,
  allow_price_override BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- AI Pricing Recommendations Table
CREATE TABLE IF NOT EXISTS ai_pricing_recommendations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id UUID NOT NULL REFERENCES business_profile(id) ON DELETE CASCADE,
  inventory_id UUID NOT NULL REFERENCES inventory(id) ON DELETE CASCADE,
  recommended_price DECIMAL(12, 2),
  confidence_score DECIMAL(5, 2),
  current_price DECIMAL(12, 2),
  price_change_percentage DECIMAL(5, 2),
  recommendation_reason TEXT,
  status VARCHAR(50) DEFAULT 'pending', -- pending, accepted, rejected, applied
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Sales Table Updates: Add delivery and amount_paid related fields
ALTER TABLE sales ADD COLUMN IF NOT EXISTS delivery_management_id UUID REFERENCES delivery_management(id) ON DELETE SET NULL;
ALTER TABLE sales ADD COLUMN IF NOT EXISTS delivery_address TEXT;
ALTER TABLE sales ADD COLUMN IF NOT EXISTS delivery_price DECIMAL(12, 2) DEFAULT 0;
ALTER TABLE sales ADD COLUMN IF NOT EXISTS amount_paid DECIMAL(12, 2) DEFAULT 0;
ALTER TABLE sales ADD COLUMN IF NOT EXISTS change_amount DECIMAL(12, 2) DEFAULT 0;

-- Inventory Table Updates: Add AI pricing field
ALTER TABLE inventory ADD COLUMN IF NOT EXISTS ai_pricing_enabled BOOLEAN DEFAULT TRUE;
ALTER TABLE inventory ADD COLUMN IF NOT EXISTS quantity_unit VARCHAR(50) DEFAULT 'unit'; -- unit, gram, ml, etc.
ALTER TABLE inventory ADD COLUMN IF NOT EXISTS unit_to_serving_ratio DECIMAL(10, 4) DEFAULT 1; -- How many servings per unit
-- Enhanced POS Checkout with Delivery and Amount Paid Support
CREATE OR REPLACE FUNCTION process_pos_checkout_enhanced(
  p_business_id UUID,
  p_customer_id UUID,
  p_order_type VARCHAR(50),
  p_payment_method VARCHAR(50),
  p_line_items JSONB,
  p_tax_amount DECIMAL(12, 2) DEFAULT 0,
  p_fees JSONB DEFAULT '[]'::jsonb,
  p_delivery_management_id UUID DEFAULT NULL,
  p_delivery_address TEXT DEFAULT NULL,
  p_delivery_price DECIMAL(12, 2) DEFAULT 0,
  p_amount_paid DECIMAL(12, 2) DEFAULT 0
)
RETURNS TABLE(
  sale_id UUID,
  order_number VARCHAR(50),
  total_amount DECIMAL(12, 2),
  change_amount DECIMAL(12, 2),
  success BOOLEAN,
  error_message TEXT
) AS $$
DECLARE
  v_sale_id UUID;
  v_order_number VARCHAR(50);
  v_subtotal DECIMAL(12, 2) := 0;
  v_fee_total DECIMAL(12, 2) := 0;
  v_total DECIMAL(12, 2);
  v_change_amount DECIMAL(12, 2) := 0;
  v_item JSONB;
  v_inventory_id UUID;
  v_quantity INTEGER;
  v_unit_price DECIMAL(12, 2);
  v_line_total DECIMAL(12, 2);
  v_current_stock INTEGER;
  v_unit_cost DECIMAL(12, 2);
  v_error_msg TEXT := '';
BEGIN
  BEGIN
    -- Verify business access
    IF NOT has_business_access(auth.uid(), p_business_id) THEN
      RAISE EXCEPTION 'Access denied to business';
    END IF;

    -- Generate order number
    v_order_number := 'ORD-' || TO_CHAR(NOW(), 'YYYYMMDD') || '-' || LPAD(NEXTVAL('order_sequence')::TEXT, 6, '0');
    
    -- Calculate subtotal from line items
    FOR v_item IN SELECT * FROM jsonb_array_elements(p_line_items)
    LOOP
      v_line_total := (v_item->>'quantity')::INTEGER * (v_item->>'unit_price')::DECIMAL(12, 2);
      v_subtotal := v_subtotal + v_line_total;
    END LOOP;

    -- Calculate total of misc fees
    SELECT COALESCE(SUM((fee->>'amount')::DECIMAL(12,2)),0)
      INTO v_fee_total
      FROM jsonb_array_elements(p_fees) AS fee;

    v_total := v_subtotal + p_tax_amount + v_fee_total + p_delivery_price;

    -- Calculate change if amount_paid is provided
    IF p_amount_paid > 0 THEN
      v_change_amount := p_amount_paid - v_total;
    END IF;

    -- Validate stock
    FOR v_item IN SELECT * FROM jsonb_array_elements(p_line_items)
    LOOP
      v_inventory_id := (v_item->>'inventory_id')::UUID;
      v_quantity := (v_item->>'quantity')::INTEGER;
      
      SELECT quantity_on_hand INTO v_current_stock
      FROM inventory
      WHERE id = v_inventory_id AND business_id = p_business_id;

      IF v_current_stock IS NULL THEN
        RAISE EXCEPTION 'Inventory item not found';
      END IF;

      IF v_current_stock < v_quantity THEN
        RAISE EXCEPTION 'Insufficient stock for item %', v_inventory_id;
      END IF;
    END LOOP;

    -- Create sale record
    INSERT INTO sales (
      business_id,
      customer_id,
      order_number,
      order_type,
      order_status,
      subtotal,
      tax_amount,
      total_amount,
      payment_method,
      fees,
      delivery_management_id,
      delivery_address,
      delivery_price,
      amount_paid,
      change_amount,
      created_by
    ) VALUES (
      p_business_id,
      p_customer_id,
      v_order_number,
      p_order_type,
      'completed',
      v_subtotal,
      p_tax_amount,
      v_total,
      p_payment_method,
      p_fees,
      p_delivery_management_id,
      p_delivery_address,
      p_delivery_price,
      p_amount_paid,
      v_change_amount,
      auth.uid()
    ) RETURNING id INTO v_sale_id;

    -- Process line items and deduct inventory
    FOR v_item IN SELECT * FROM jsonb_array_elements(p_line_items)
    LOOP
      v_inventory_id := (v_item->>'inventory_id')::UUID;
      v_quantity := (v_item->>'quantity')::INTEGER;
      v_unit_price := (v_item->>'unit_price')::DECIMAL(12, 2);
      v_line_total := v_quantity * v_unit_price;

      -- Check stock availability
      SELECT quantity_on_hand, unit_cost INTO v_current_stock, v_unit_cost
      FROM inventory
      WHERE id = v_inventory_id AND business_id = p_business_id;

      IF v_current_stock IS NULL THEN
        RAISE EXCEPTION 'Inventory item not found';
      END IF;

      IF v_current_stock < v_quantity THEN
        RAISE EXCEPTION 'Insufficient stock for item %', v_inventory_id;
      END IF;

      -- Deduct inventory
      UPDATE inventory
      SET quantity_on_hand = quantity_on_hand - v_quantity,
          updated_at = NOW()
      WHERE id = v_inventory_id;

      -- Log inventory change
      INSERT INTO inventory_log (
        inventory_id,
        transaction_type,
        quantity_change,
        reason,
        created_by
      ) VALUES (
        v_inventory_id,
        'sale',
        -v_quantity,
        'POS checkout: ' || v_order_number,
        auth.uid()
      );

      -- Create line item
      INSERT INTO sales_line_items (
          sale_id,
          inventory_id,
          quantity,
          unit_price,
          line_total,
          unit_cost
        ) VALUES (
          v_sale_id,
          v_inventory_id,
          v_quantity,
          v_unit_price,
          v_line_total,
          v_unit_cost
        );
    END LOOP;

    -- Update customer total purchases
    IF p_customer_id IS NOT NULL THEN
      UPDATE customers
      SET total_purchases = total_purchases + v_total,
          updated_at = NOW()
      WHERE id = p_customer_id;
    END IF;

    -- Log audit
    INSERT INTO system_audit_log (
      action,
      entity_type,
      entity_id,
      user_id,
      new_values
    ) VALUES (
      'pos_checkout_enhanced',
      'sale',
      v_sale_id,
      auth.uid(),
      jsonb_build_object(
        'order_number', v_order_number,
        'total', v_total,
        'payment_method', p_payment_method,
        'delivery_price', p_delivery_price,
        'amount_paid', p_amount_paid,
        'change_amount', v_change_amount,
        'fees', p_fees
      )
    );

    RETURN QUERY SELECT v_sale_id, v_order_number, v_total, v_change_amount, TRUE, NULL::TEXT;
  EXCEPTION
    WHEN OTHERS THEN
      v_error_msg := SQLERRM;
      RETURN QUERY SELECT NULL::UUID, NULL::VARCHAR, NULL::DECIMAL, NULL::DECIMAL, FALSE, v_error_msg;
  END;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to calculate product quantity from amount paid
CREATE OR REPLACE FUNCTION calculate_quantity_from_amount(
  p_inventory_id UUID,
  p_amount_paid DECIMAL(12, 2)
)
RETURNS TABLE(
  quantity INTEGER,
  amount_used DECIMAL(12, 2),
  change_amount DECIMAL(12, 2),
  unit_price DECIMAL(12, 2)
) AS $$
DECLARE
  v_unit_price DECIMAL(12, 2);
  v_quantity INTEGER;
  v_amount_used DECIMAL(12, 2);
  v_change_amount DECIMAL(12, 2);
BEGIN
  -- Get the unit price from inventory
  SELECT selling_price INTO v_unit_price
  FROM inventory
  WHERE id = p_inventory_id;

  IF v_unit_price IS NULL THEN
    RAISE EXCEPTION 'Inventory item not found';
  END IF;

  -- Calculate quantity based on amount paid
  v_quantity := FLOOR(p_amount_paid::NUMERIC / v_unit_price::NUMERIC)::INTEGER;
  v_amount_used := v_quantity * v_unit_price;
  v_change_amount := p_amount_paid - v_amount_used;

  RETURN QUERY SELECT v_quantity, v_amount_used, v_change_amount, v_unit_price;
END;
$$ LANGUAGE plpgsql STABLE;

-- Function to get AI pricing recommendations
CREATE OR REPLACE FUNCTION get_ai_pricing_recommendations(
  p_business_id UUID,
  p_limit INT DEFAULT 10
)
RETURNS TABLE(
  recommendation_id UUID,
  inventory_id UUID,
  product_name VARCHAR,
  current_price DECIMAL(12, 2),
  recommended_price DECIMAL(12, 2),
  confidence_score DECIMAL(5, 2),
  price_change_percentage DECIMAL(5, 2),
  recommendation_reason TEXT
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    apr.id,
    apr.inventory_id,
    i.product_name,
    apr.current_price,
    apr.recommended_price,
    apr.confidence_score,
    apr.price_change_percentage,
    apr.recommendation_reason
  FROM ai_pricing_recommendations apr
  JOIN inventory i ON apr.inventory_id = i.id
  WHERE apr.business_id = p_business_id
    AND apr.is_active = TRUE
    AND apr.status IN ('pending', 'applied')
  ORDER BY apr.confidence_score DESC, apr.updated_at DESC
  LIMIT p_limit;
END;
$$ LANGUAGE plpgsql STABLE;

-- Function to apply AI pricing recommendation
CREATE OR REPLACE FUNCTION apply_ai_pricing_recommendation(
  p_business_id UUID,
  p_recommendation_id UUID,
  p_override BOOLEAN DEFAULT FALSE
)
RETURNS TABLE(
  success BOOLEAN,
  message TEXT,
  previous_price DECIMAL(12, 2),
  new_price DECIMAL(12, 2)
) AS $$
DECLARE
  v_inventory_id UUID;
  v_recommended_price DECIMAL(12, 2);
  v_current_price DECIMAL(12, 2);
BEGIN
  BEGIN
    -- Verify business access
    IF NOT has_business_access(auth.uid(), p_business_id) THEN
      RAISE EXCEPTION 'Access denied to business';
    END IF;

    -- Get recommendation details
    SELECT inventory_id, recommended_price, current_price
    INTO v_inventory_id, v_recommended_price, v_current_price
    FROM ai_pricing_recommendations
    WHERE id = p_recommendation_id AND business_id = p_business_id;

    IF v_inventory_id IS NULL THEN
      RAISE EXCEPTION 'Recommendation not found';
    END IF;

    -- Update inventory with recommended price
    UPDATE inventory
    SET selling_price = v_recommended_price,
        updated_at = NOW()
    WHERE id = v_inventory_id;

    -- Mark recommendation as applied
    UPDATE ai_pricing_recommendations
    SET status = 'applied',
        is_active = FALSE,
        updated_at = NOW()
    WHERE id = p_recommendation_id;

    -- Log audit
    INSERT INTO system_audit_log (
      action,
      entity_type,
      entity_id,
      user_id,
      new_values
    ) VALUES (
      'apply_ai_pricing',
      'ai_pricing_recommendations',
      p_recommendation_id,
      auth.uid(),
      jsonb_build_object(
        'previous_price', v_current_price,
        'new_price', v_recommended_price,
        'inventory_id', v_inventory_id
      )
    );

    RETURN QUERY SELECT TRUE, 'Pricing updated successfully', v_current_price, v_recommended_price;
  EXCEPTION
    WHEN OTHERS THEN
      RETURN QUERY SELECT FALSE, SQLERRM, NULL::DECIMAL, NULL::DECIMAL;
  END;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
