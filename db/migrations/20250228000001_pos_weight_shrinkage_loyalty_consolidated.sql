-- ============================================
-- POS Weight-Based Sales, Shrinkage, Loyalty & Inventory Management
-- Consolidated Migration - Run in Supabase SQL Editor
-- https://supabase.com/dashboard/project/[PROJECT_ID]/sql/new
-- ============================================

-- Phase 1: No Sale / Drawer Events
CREATE TABLE IF NOT EXISTS drawer_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id UUID NOT NULL REFERENCES business_profile(id) ON DELETE CASCADE,
  location_id UUID,
  user_id UUID NOT NULL,
  event_type VARCHAR(50) NOT NULL DEFAULT 'no_sale',
  note TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_drawer_events_business ON drawer_events(business_id);
CREATE INDEX IF NOT EXISTS idx_drawer_events_user ON drawer_events(user_id);
CREATE INDEX IF NOT EXISTS idx_drawer_events_created ON drawer_events(created_at);

-- Phase 2: Shrinkage Events (Personal Use, Comps, Damaged)
CREATE TABLE IF NOT EXISTS shrinkage_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id UUID NOT NULL REFERENCES business_profile(id) ON DELETE CASCADE,
  inventory_id UUID NOT NULL REFERENCES inventory(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  quantity_grams DECIMAL(12, 4) NOT NULL,
  cost_value DECIMAL(12, 2),
  shrinkage_type VARCHAR(50) NOT NULL DEFAULT 'personal_use',
  note TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_shrinkage_events_business ON shrinkage_events(business_id);
CREATE INDEX IF NOT EXISTS idx_shrinkage_events_inventory ON shrinkage_events(inventory_id);
CREATE INDEX IF NOT EXISTS idx_shrinkage_events_user ON shrinkage_events(user_id);
CREATE INDEX IF NOT EXISTS idx_shrinkage_events_created ON shrinkage_events(created_at);

-- Phase 3: Random Inventory Checks
CREATE TABLE IF NOT EXISTS inventory_checks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id UUID NOT NULL REFERENCES business_profile(id) ON DELETE CASCADE,
  inventory_id UUID NOT NULL REFERENCES inventory(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  expected_weight_grams DECIMAL(12, 4) NOT NULL,
  measured_weight_grams DECIMAL(12, 4) NOT NULL,
  delta_grams DECIMAL(12, 4),
  delta_percentage DECIMAL(5, 2),
  discrepancy_flagged BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_inventory_checks_business ON inventory_checks(business_id);
CREATE INDEX IF NOT EXISTS idx_inventory_checks_inventory ON inventory_checks(inventory_id);
CREATE INDEX IF NOT EXISTS idx_inventory_checks_user ON inventory_checks(user_id);
CREATE INDEX IF NOT EXISTS idx_inventory_checks_created ON inventory_checks(created_at);

-- Phase 4: Extend Inventory for Weight-Based Tracking
ALTER TABLE inventory ADD COLUMN IF NOT EXISTS base_unit VARCHAR(10) DEFAULT 'g';
ALTER TABLE inventory ADD COLUMN IF NOT EXISTS convert_to_grams DECIMAL(12, 4) DEFAULT 1.0;
ALTER TABLE inventory ADD COLUMN IF NOT EXISTS inventory_in_grams DECIMAL(16, 4) DEFAULT 0;
ALTER TABLE inventory ADD COLUMN IF NOT EXISTS allow_fractional_weight BOOLEAN DEFAULT TRUE;
ALTER TABLE inventory ADD COLUMN IF NOT EXISTS price_per_gram DECIMAL(12, 4);

-- Phase 5: Bulk Pricing Rules
CREATE TABLE IF NOT EXISTS bulk_pricing_rules (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id UUID NOT NULL REFERENCES business_profile(id) ON DELETE CASCADE,
  inventory_id UUID REFERENCES inventory(id) ON DELETE CASCADE,
  min_weight_grams DECIMAL(12, 4) NOT NULL,
  max_weight_grams DECIMAL(12, 4),
  price_per_gram DECIMAL(12, 4) NOT NULL,
  tier_name VARCHAR(50),
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_bulk_pricing_rules_business ON bulk_pricing_rules(business_id);
CREATE INDEX IF NOT EXISTS idx_bulk_pricing_rules_inventory ON bulk_pricing_rules(inventory_id);
CREATE INDEX IF NOT EXISTS idx_bulk_pricing_rules_active ON bulk_pricing_rules(is_active);

-- Phase 6: Extend Customers for Loyalty Program
ALTER TABLE customers ADD COLUMN IF NOT EXISTS purchase_count INTEGER DEFAULT 0;
ALTER TABLE customers ADD COLUMN IF NOT EXISTS loyalty_tier VARCHAR(50) DEFAULT 'none';
ALTER TABLE customers ADD COLUMN IF NOT EXISTS discount_rate DECIMAL(5, 4) DEFAULT 0;
ALTER TABLE customers ADD COLUMN IF NOT EXISTS next_tier_at INTEGER DEFAULT 5;
ALTER TABLE customers ADD COLUMN IF NOT EXISTS loyalty_updated_at TIMESTAMP;

-- Extend Sales for Weight and Loyalty Tracking
ALTER TABLE sales_line_items ADD COLUMN IF NOT EXISTS weight_sold_grams DECIMAL(12, 4);
ALTER TABLE sales_line_items ADD COLUMN IF NOT EXISTS price_per_gram DECIMAL(12, 4);
ALTER TABLE sales_line_items ADD COLUMN IF NOT EXISTS bulk_tier_applied VARCHAR(50);
ALTER TABLE sales_line_items ADD COLUMN IF NOT EXISTS loyalty_discount_applied DECIMAL(5, 4) DEFAULT 0;

-- Extend Business Settings for POS Configuration
ALTER TABLE business_settings ADD COLUMN IF NOT EXISTS random_inventory_check_frequency INTEGER DEFAULT 15;
ALTER TABLE business_settings ADD COLUMN IF NOT EXISTS random_check_tolerance_percentage DECIMAL(5, 2) DEFAULT 5.0;
ALTER TABLE business_settings ADD COLUMN IF NOT EXISTS enable_weight_based_sales BOOLEAN DEFAULT TRUE;
ALTER TABLE business_settings ADD COLUMN IF NOT EXISTS require_supervisor_pin_for_shrinkage BOOLEAN DEFAULT FALSE;
ALTER TABLE business_settings ADD COLUMN IF NOT EXISTS default_bulk_pricing_tiers JSONB DEFAULT '[{\"min_grams\":1,\"max_grams\":3.4,\"tier_name\":\"1g\"},{\"min_grams\":3.5,\"max_grams\":6.9,\"tier_name\":\"3.5g\"},{\"min_grams\":7,\"max_grams\":9.9,\"tier_name\":\"7g\"},{\"min_grams\":10,\"max_grams\":null,\"tier_name\":\"10g+\"}]';
ALTER TABLE business_settings ADD COLUMN IF NOT EXISTS loyalty_tier_config JSONB DEFAULT '{\"none\":{\"min_purchases\":0,\"discount\":0},\"silver\":{\"min_purchases\":5,\"discount\":0.05},\"gold\":{\"min_purchases\":15,\"discount\":0.10},\"platinum\":{\"min_purchases\":30,\"discount\":0.15}}';
ALTER TABLE business_settings ADD COLUMN IF NOT EXISTS transaction_count INTEGER DEFAULT 0;

-- Extend System Audit Log with more detail
ALTER TABLE system_audit_log ADD COLUMN IF NOT EXISTS action_detail TEXT;
ALTER TABLE system_audit_log ADD COLUMN IF NOT EXISTS business_id UUID REFERENCES business_profile(id) ON DELETE CASCADE;
ALTER TABLE system_audit_log ADD COLUMN IF NOT EXISTS ip_address VARCHAR(50);

-- Create Stock Movement Table (replaces inventory_log for better tracking)
CREATE TABLE IF NOT EXISTS stock_movements (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id UUID NOT NULL REFERENCES business_profile(id) ON DELETE CASCADE,
  inventory_id UUID NOT NULL REFERENCES inventory(id) ON DELETE CASCADE,
  movement_type VARCHAR(50) NOT NULL,
  quantity_change DECIMAL(16, 4),
  weight_change_grams DECIMAL(12, 4),
  reason TEXT,
  related_sale_id UUID REFERENCES sales(id) ON DELETE SET NULL,
  related_shrinkage_id UUID REFERENCES shrinkage_events(id) ON DELETE SET NULL,
  related_check_id UUID REFERENCES inventory_checks(id) ON DELETE SET NULL,
  created_by UUID NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_stock_movements_business ON stock_movements(business_id);
CREATE INDEX IF NOT EXISTS idx_stock_movements_inventory ON stock_movements(inventory_id);
CREATE INDEX IF NOT EXISTS idx_stock_movements_type ON stock_movements(movement_type);
CREATE INDEX IF NOT EXISTS idx_stock_movements_created ON stock_movements(created_at);

-- Table for Loyalty Tier History
CREATE TABLE IF NOT EXISTS loyalty_tier_changes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_id UUID NOT NULL REFERENCES customers(id) ON DELETE CASCADE,
  business_id UUID NOT NULL REFERENCES business_profile(id) ON DELETE CASCADE,
  old_tier VARCHAR(50),
  new_tier VARCHAR(50),
  old_discount_rate DECIMAL(5, 4),
  new_discount_rate DECIMAL(5, 4),
  reason TEXT,
  created_by UUID,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_loyalty_tier_changes_customer ON loyalty_tier_changes(customer_id);
CREATE INDEX IF NOT EXISTS idx_loyalty_tier_changes_business ON loyalty_tier_changes(business_id);
CREATE INDEX IF NOT EXISTS idx_loyalty_tier_changes_created ON loyalty_tier_changes(created_at);

-- ============================================
-- RLS Policies for new tables
-- ============================================

ALTER TABLE drawer_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE shrinkage_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE inventory_checks ENABLE ROW LEVEL SECURITY;
ALTER TABLE bulk_pricing_rules ENABLE ROW LEVEL SECURITY;
ALTER TABLE stock_movements ENABLE ROW LEVEL SECURITY;
ALTER TABLE loyalty_tier_changes ENABLE ROW LEVEL SECURITY;

CREATE POLICY IF NOT EXISTS drawer_events_business_access
  ON drawer_events
  FOR ALL
  USING (auth.uid() IS NOT NULL AND has_business_access(auth.uid(), business_id));

CREATE POLICY IF NOT EXISTS shrinkage_events_business_access
  ON shrinkage_events
  FOR ALL
  USING (auth.uid() IS NOT NULL AND has_business_access(auth.uid(), business_id));

CREATE POLICY IF NOT EXISTS inventory_checks_business_access
  ON inventory_checks
  FOR ALL
  USING (auth.uid() IS NOT NULL AND has_business_access(auth.uid(), business_id));

CREATE POLICY IF NOT EXISTS bulk_pricing_rules_business_access
  ON bulk_pricing_rules
  FOR ALL
  USING (auth.uid() IS NOT NULL AND has_business_access(auth.uid(), business_id));

CREATE POLICY IF NOT EXISTS stock_movements_business_access
  ON stock_movements
  FOR ALL
  USING (auth.uid() IS NOT NULL AND has_business_access(auth.uid(), business_id));

CREATE POLICY IF NOT EXISTS loyalty_tier_changes_business_access
  ON loyalty_tier_changes
  FOR ALL
  USING (auth.uid() IS NOT NULL AND has_business_access(auth.uid(), business_id));

-- ============================================
-- RPC Functions
-- ============================================

-- RPC: Record No Sale / Drawer Event
CREATE OR REPLACE FUNCTION record_drawer_event(
  p_business_id UUID,
  p_event_type VARCHAR(50) DEFAULT 'no_sale',
  p_note TEXT DEFAULT NULL
)
RETURNS TABLE(
  success BOOLEAN,
  event_id UUID,
  error_message TEXT
) AS $$
DECLARE
  v_user_id UUID;
  v_event_id UUID;
BEGIN
  v_user_id := auth.uid();
  
  IF v_user_id IS NULL THEN
    RETURN QUERY SELECT false::BOOLEAN, NULL::UUID, 'User not authenticated'::TEXT;
    RETURN;
  END IF;

  IF NOT has_business_access(v_user_id, p_business_id) THEN
    RETURN QUERY SELECT false::BOOLEAN, NULL::UUID, 'Access denied to business'::TEXT;
    RETURN;
  END IF;

  INSERT INTO drawer_events (business_id, user_id, event_type, note)
  VALUES (p_business_id, v_user_id, p_event_type, p_note)
  RETURNING drawer_events.id INTO v_event_id;

  RETURN QUERY SELECT true::BOOLEAN, v_event_id, NULL::TEXT;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- RPC: Record Shrinkage Event
CREATE OR REPLACE FUNCTION record_shrinkage_event(
  p_business_id UUID,
  p_inventory_id UUID,
  p_quantity_grams DECIMAL(12, 4),
  p_shrinkage_type VARCHAR(50) DEFAULT 'personal_use',
  p_note TEXT DEFAULT NULL
)
RETURNS TABLE(
  success BOOLEAN,
  shrinkage_id UUID,
  new_inventory_grams DECIMAL(16, 4),
  error_message TEXT
) AS $$
DECLARE
  v_user_id UUID;
  v_shrinkage_id UUID;
  v_cost_value DECIMAL(12, 2);
  v_current_inventory DECIMAL(16, 4);
  v_unit_cost DECIMAL(12, 2);
BEGIN
  v_user_id := auth.uid();
  
  IF v_user_id IS NULL THEN
    RETURN QUERY SELECT false::BOOLEAN, NULL::UUID, NULL::DECIMAL(16, 4), 'User not authenticated'::TEXT;
    RETURN;
  END IF;

  IF NOT has_business_access(v_user_id, p_business_id) THEN
    RETURN QUERY SELECT false::BOOLEAN, NULL::UUID, NULL::DECIMAL(16, 4), 'Access denied to business'::TEXT;
    RETURN;
  END IF;

  -- Get current inventory and unit cost
  SELECT inventory_in_grams, unit_cost
  INTO v_current_inventory, v_unit_cost
  FROM inventory
  WHERE id = p_inventory_id AND business_id = p_business_id;

  IF v_current_inventory IS NULL THEN
    RETURN QUERY SELECT false::BOOLEAN, NULL::UUID, NULL::DECIMAL(16, 4), 'Inventory item not found'::TEXT;
    RETURN;
  END IF;

  -- Calculate cost of shrinkage
  v_cost_value := COALESCE(v_unit_cost, 0) * (p_quantity_grams / 1000);

  -- Record shrinkage event
  INSERT INTO shrinkage_events (
    business_id,
    inventory_id,
    user_id,
    quantity_grams,
    cost_value,
    shrinkage_type,
    note
  )
  VALUES (p_business_id, p_inventory_id, v_user_id, p_quantity_grams, v_cost_value, p_shrinkage_type, p_note)
  RETURNING shrinkage_events.id INTO v_shrinkage_id;

  -- Update inventory
  UPDATE inventory
  SET inventory_in_grams = inventory_in_grams - p_quantity_grams,
      updated_at = NOW()
  WHERE id = p_inventory_id;

  -- Record stock movement
  INSERT INTO stock_movements (
    business_id,
    inventory_id,
    movement_type,
    weight_change_grams,
    reason,
    related_shrinkage_id,
    created_by
  )
  VALUES (
    p_business_id,
    p_inventory_id,
    'shrinkage',
    -p_quantity_grams,
    p_shrinkage_type,
    v_shrinkage_id,
    v_user_id
  );

  -- Log to audit trail
  INSERT INTO system_audit_log (action, entity_type, entity_id, user_id, old_values, new_values, business_id, action_detail)
  VALUES (
    'shrinkage_recorded',
    'inventory',
    p_inventory_id,
    v_user_id,
    jsonb_build_object('inventory_grams', v_current_inventory),
    jsonb_build_object('inventory_grams', v_current_inventory - p_quantity_grams),
    p_business_id,
    p_shrinkage_type || ': ' || COALESCE(p_note, '')
  );

  RETURN QUERY SELECT true::BOOLEAN, v_shrinkage_id, (v_current_inventory - p_quantity_grams), NULL::TEXT;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- RPC: Get Random Inventory Check Product
CREATE OR REPLACE FUNCTION get_random_inventory_check_product(
  p_business_id UUID
)
RETURNS TABLE(
  inventory_id UUID,
  product_name VARCHAR(255),
  expected_weight_grams DECIMAL(12, 4),
  last_check_date TIMESTAMP
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    i.id,
    i.product_name,
    i.inventory_in_grams,
    (SELECT MAX(created_at) FROM inventory_checks WHERE inventory_id = i.id) as last_check
  FROM inventory i
  WHERE i.business_id = p_business_id
    AND i.inventory_in_grams > 0
    AND i.base_unit = 'g'
  ORDER BY RANDOM()
  LIMIT 1;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- RPC: Record Inventory Check
CREATE OR REPLACE FUNCTION record_inventory_check(
  p_business_id UUID,
  p_inventory_id UUID,
  p_measured_weight_grams DECIMAL(12, 4)
)
RETURNS TABLE(
  success BOOLEAN,
  check_id UUID,
  expected_weight_grams DECIMAL(12, 4),
  measured_weight_grams DECIMAL(12, 4),
  delta_grams DECIMAL(12, 4),
  delta_percentage DECIMAL(5, 2),
  discrepancy_flagged BOOLEAN,
  error_message TEXT
) AS $$
DECLARE
  v_user_id UUID;
  v_check_id UUID;
  v_expected_weight DECIMAL(12, 4);
  v_delta DECIMAL(12, 4);
  v_delta_pct DECIMAL(5, 2);
  v_flagged BOOLEAN := FALSE;
  v_tolerance_pct DECIMAL(5, 2);
BEGIN
  v_user_id := auth.uid();
  
  IF v_user_id IS NULL THEN
    RETURN QUERY SELECT false::BOOLEAN, NULL::UUID, NULL::DECIMAL(12, 4), NULL::DECIMAL(12, 4), NULL::DECIMAL(12, 4), NULL::DECIMAL(5, 2), false, 'User not authenticated'::TEXT;
    RETURN;
  END IF;

  IF NOT has_business_access(v_user_id, p_business_id) THEN
    RETURN QUERY SELECT false::BOOLEAN, NULL::UUID, NULL::DECIMAL(12, 4), NULL::DECIMAL(12, 4), NULL::DECIMAL(12, 4), NULL::DECIMAL(5, 2), false, 'Access denied to business'::TEXT;
    RETURN;
  END IF;

  -- Get expected weight and tolerance
  SELECT inventory_in_grams, COALESCE(bs.random_check_tolerance_percentage, 5.0)
  INTO v_expected_weight, v_tolerance_pct
  FROM inventory i
  LEFT JOIN business_settings bs ON i.business_id = bs.business_id
  WHERE i.id = p_inventory_id AND i.business_id = p_business_id;

  IF v_expected_weight IS NULL THEN
    RETURN QUERY SELECT false::BOOLEAN, NULL::UUID, NULL::DECIMAL(12, 4), NULL::DECIMAL(12, 4), NULL::DECIMAL(12, 4), NULL::DECIMAL(5, 2), false, 'Inventory item not found'::TEXT;
    RETURN;
  END IF;

  -- Calculate delta
  v_delta := ABS(p_measured_weight_grams - v_expected_weight);
  v_delta_pct := CASE WHEN v_expected_weight > 0 THEN (v_delta / v_expected_weight) * 100 ELSE 0 END;
  
  -- Check if discrepancy exceeds tolerance
  IF v_delta_pct > v_tolerance_pct THEN
    v_flagged := TRUE;
  END IF;

  -- Record inventory check
  INSERT INTO inventory_checks (
    business_id,
    inventory_id,
    user_id,
    expected_weight_grams,
    measured_weight_grams,
    delta_grams,
    delta_percentage,
    discrepancy_flagged
  )
  VALUES (p_business_id, p_inventory_id, v_user_id, v_expected_weight, p_measured_weight_grams, v_delta, v_delta_pct, v_flagged)
  RETURNING inventory_checks.id INTO v_check_id;

  -- If discrepancy flagged, record as shrinkage
  IF v_flagged AND p_measured_weight_grams < v_expected_weight THEN
    PERFORM record_shrinkage_event(
      p_business_id,
      p_inventory_id,
      v_delta,
      'inventory_variance',
      'Detected during inventory check. Expected: ' || v_expected_weight::TEXT || 'g, Measured: ' || p_measured_weight_grams::TEXT || 'g'
    );
  END IF;

  RETURN QUERY SELECT true::BOOLEAN, v_check_id, v_expected_weight, p_measured_weight_grams, v_delta, v_delta_pct, v_flagged, NULL::TEXT;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- RPC: Get Bulk Pricing for Weight
CREATE OR REPLACE FUNCTION get_bulk_pricing(
  p_business_id UUID,
  p_inventory_id UUID,
  p_weight_grams DECIMAL(12, 4)
)
RETURNS TABLE(
  price_per_gram DECIMAL(12, 4),
  tier_name VARCHAR(50),
  min_weight_grams DECIMAL(12, 4),
  max_weight_grams DECIMAL(12, 4),
  total_price DECIMAL(12, 2)
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    bpr.price_per_gram,
    bpr.tier_name,
    bpr.min_weight_grams,
    bpr.max_weight_grams,
    ROUND((p_weight_grams * bpr.price_per_gram)::NUMERIC, 2) as total_price
  FROM bulk_pricing_rules bpr
  WHERE bpr.business_id = p_business_id
    AND (bpr.inventory_id = p_inventory_id OR bpr.inventory_id IS NULL)
    AND bpr.is_active = TRUE
    AND p_weight_grams >= bpr.min_weight_grams
    AND (bpr.max_weight_grams IS NULL OR p_weight_grams <= bpr.max_weight_grams)
  ORDER BY bpr.inventory_id DESC, bpr.min_weight_grams DESC
  LIMIT 1;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- RPC: Update Customer Loyalty Tier
CREATE OR REPLACE FUNCTION update_customer_loyalty_tier(
  p_business_id UUID,
  p_customer_id UUID
)
RETURNS TABLE(
  success BOOLEAN,
  old_tier VARCHAR(50),
  new_tier VARCHAR(50),
  old_discount DECIMAL(5, 4),
  new_discount DECIMAL(5, 4),
  error_message TEXT
) AS $$
DECLARE
  v_purchase_count INTEGER;
  v_old_tier VARCHAR(50);
  v_new_tier VARCHAR(50);
  v_old_discount DECIMAL(5, 4);
  v_new_discount DECIMAL(5, 4);
  v_tier_config JSONB;
  v_user_id UUID;
BEGIN
  v_user_id := auth.uid();
  
  IF v_user_id IS NULL THEN
    RETURN QUERY SELECT false::BOOLEAN, NULL::VARCHAR(50), NULL::VARCHAR(50), NULL::DECIMAL(5, 4), NULL::DECIMAL(5, 4), 'User not authenticated'::TEXT;
    RETURN;
  END IF;

  IF NOT has_business_access(v_user_id, p_business_id) THEN
    RETURN QUERY SELECT false::BOOLEAN, NULL::VARCHAR(50), NULL::VARCHAR(50), NULL::DECIMAL(5, 4), NULL::DECIMAL(5, 4), 'Access denied to business'::TEXT;
    RETURN;
  END IF;

  -- Get current tier and purchase count
  SELECT loyalty_tier, purchase_count, discount_rate
  INTO v_old_tier, v_purchase_count, v_old_discount
  FROM customers
  WHERE id = p_customer_id AND business_id = p_business_id;

  IF v_old_tier IS NULL THEN
    RETURN QUERY SELECT false::BOOLEAN, NULL::VARCHAR(50), NULL::VARCHAR(50), NULL::DECIMAL(5, 4), NULL::DECIMAL(5, 4), 'Customer not found'::TEXT;
    RETURN;
  END IF;

  -- Get tier configuration
  SELECT loyalty_tier_config
  INTO v_tier_config
  FROM business_settings
  WHERE business_id = p_business_id;

  IF v_tier_config IS NULL THEN
    v_tier_config := '{\"none\":{\"min_purchases\":0,\"discount\":0},\"silver\":{\"min_purchases\":5,\"discount\":0.05},\"gold\":{\"min_purchases\":15,\"discount\":0.10},\"platinum\":{\"min_purchases\":30,\"discount\":0.15}}'::JSONB;
  END IF;

  -- Determine new tier based on purchase count
  IF v_purchase_count >= (v_tier_config->'platinum'->>'min_purchases')::INTEGER THEN
    v_new_tier := 'platinum';
  ELSIF v_purchase_count >= (v_tier_config->'gold'->>'min_purchases')::INTEGER THEN
    v_new_tier := 'gold';
  ELSIF v_purchase_count >= (v_tier_config->'silver'->>'min_purchases')::INTEGER THEN
    v_new_tier := 'silver';
  ELSE
    v_new_tier := 'none';
  END IF;

  v_new_discount := ((v_tier_config->v_new_tier->>'discount')::DECIMAL(5, 4));

  -- Update customer if tier changed
  IF v_new_tier <> v_old_tier THEN
    UPDATE customers
    SET loyalty_tier = v_new_tier,
        discount_rate = v_new_discount,
        loyalty_updated_at = NOW()
    WHERE id = p_customer_id;

    -- Record tier change
    INSERT INTO loyalty_tier_changes (
      customer_id,
      business_id,
      old_tier,
      new_tier,
      old_discount_rate,
      new_discount_rate,
      reason,
      created_by
    )
    VALUES (p_customer_id, p_business_id, v_old_tier, v_new_tier, v_old_discount, v_new_discount, 'Automatic tier update', v_user_id);

    -- Log to audit trail
    INSERT INTO system_audit_log (action, entity_type, entity_id, user_id, old_values, new_values, business_id, action_detail)
    VALUES (
      'loyalty_tier_updated',
      'customer',
      p_customer_id,
      v_user_id,
      jsonb_build_object('tier', v_old_tier, 'discount', v_old_discount),
      jsonb_build_object('tier', v_new_tier, 'discount', v_new_discount),
      p_business_id,
      'Automatic: ' || v_purchase_count || ' purchases'
    );
  END IF;

  RETURN QUERY SELECT true::BOOLEAN, v_old_tier, v_new_tier, v_old_discount, v_new_discount, NULL::TEXT;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- RPC: Apply Loyalty Discount
CREATE OR REPLACE FUNCTION apply_loyalty_discount(
  p_business_id UUID,
  p_customer_id UUID,
  p_subtotal DECIMAL(12, 2)
)
RETURNS TABLE(
  loyalty_tier VARCHAR(50),
  discount_rate DECIMAL(5, 4),
  discount_amount DECIMAL(12, 2),
  final_price DECIMAL(12, 2)
) AS $$
DECLARE
  v_discount_rate DECIMAL(5, 4);
  v_loyalty_tier VARCHAR(50);
  v_discount_amount DECIMAL(12, 2);
BEGIN
  SELECT loyalty_tier, discount_rate
  INTO v_loyalty_tier, v_discount_rate
  FROM customers
  WHERE id = p_customer_id AND business_id = p_business_id;

  IF v_loyalty_tier IS NULL THEN
    RETURN QUERY SELECT 'none'::VARCHAR(50), 0::DECIMAL(5, 4), 0::DECIMAL(12, 2), p_subtotal;
    RETURN;
  END IF;

  v_discount_amount := ROUND((p_subtotal * v_discount_rate)::NUMERIC, 2);

  RETURN QUERY SELECT v_loyalty_tier, v_discount_rate, v_discount_amount, ROUND((p_subtotal - v_discount_amount)::NUMERIC, 2);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- RPC: Process Weight-Based Sale Item
CREATE OR REPLACE FUNCTION process_weight_based_sale_item(
  p_business_id UUID,
  p_inventory_id UUID,
  p_weight_grams DECIMAL(12, 4)
)
RETURNS TABLE(
  success BOOLEAN,
  price_per_gram DECIMAL(12, 4),
  tier_name VARCHAR(50),
  total_price DECIMAL(12, 2),
  new_inventory_grams DECIMAL(16, 4),
  error_message TEXT
) AS $$
DECLARE
  v_current_inventory DECIMAL(16, 4);
  v_base_unit VARCHAR(10);
  v_price_per_gram DECIMAL(12, 4);
  v_tier_name VARCHAR(50);
  v_total_price DECIMAL(12, 2);
BEGIN
  -- Get inventory details
  SELECT inventory_in_grams, base_unit, price_per_gram
  INTO v_current_inventory, v_base_unit, v_price_per_gram
  FROM inventory
  WHERE id = p_inventory_id AND business_id = p_business_id;

  IF v_current_inventory IS NULL THEN
    RETURN QUERY SELECT false::BOOLEAN, NULL::DECIMAL(12, 4), NULL::VARCHAR(50), NULL::DECIMAL(12, 2), NULL::DECIMAL(16, 4), 'Inventory item not found'::TEXT;
    RETURN;
  END IF;

  IF v_current_inventory < p_weight_grams THEN
    RETURN QUERY SELECT false::BOOLEAN, NULL::DECIMAL(12, 4), NULL::VARCHAR(50), NULL::DECIMAL(12, 2), NULL::DECIMAL(16, 4), 'Insufficient weight available'::TEXT;
    RETURN;
  END IF;

  -- Get bulk pricing
  SELECT COALESCE(price_per_gram, v_price_per_gram), tier_name, total_price
  INTO v_price_per_gram, v_tier_name, v_total_price
  FROM get_bulk_pricing(p_business_id, p_inventory_id, p_weight_grams);

  IF v_price_per_gram IS NULL THEN
    v_price_per_gram := (SELECT price_per_gram FROM inventory WHERE id = p_inventory_id);
    v_total_price := ROUND((p_weight_grams * v_price_per_gram)::NUMERIC, 2);
  END IF;

  RETURN QUERY SELECT true::BOOLEAN, v_price_per_gram, v_tier_name, v_total_price, v_current_inventory - p_weight_grams, NULL::TEXT;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- RPC: Increment Transaction Counter for Random Checks
CREATE OR REPLACE FUNCTION increment_transaction_counter(
  p_business_id UUID
)
RETURNS TABLE(
  current_count INTEGER,
  should_prompt_check BOOLEAN,
  check_frequency INTEGER
) AS $$
DECLARE
  v_current_count INTEGER;
  v_check_frequency INTEGER;
BEGIN
  -- Get current settings
  SELECT COALESCE(transaction_count, 0), COALESCE(random_inventory_check_frequency, 15)
  INTO v_current_count, v_check_frequency
  FROM business_settings
  WHERE business_id = p_business_id;

  -- Increment counter
  v_current_count := v_current_count + 1;

  UPDATE business_settings
  SET transaction_count = v_current_count
  WHERE business_id = p_business_id;

  RETURN QUERY SELECT v_current_count, (v_current_count % v_check_frequency = 0), v_check_frequency;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- RPC: Enhanced POS Checkout with Weight-Based Items and Loyalty Support
CREATE OR REPLACE FUNCTION process_weight_based_checkout(
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
  p_amount_paid DECIMAL(12, 2) DEFAULT 0,
  p_apply_loyalty_discount BOOLEAN DEFAULT TRUE
)
RETURNS TABLE(
  sale_id UUID,
  order_number VARCHAR(50),
  subtotal_before_discount DECIMAL(12, 2),
  loyalty_discount_amount DECIMAL(12, 2),
  subtotal_after_discount DECIMAL(12, 2),
  tax_amount DECIMAL(12, 2),
  total_amount DECIMAL(12, 2),
  change_amount DECIMAL(12, 2),
  customer_loyalty_tier VARCHAR(50),
  customer_new_purchase_count INTEGER,
  success BOOLEAN,
  error_message TEXT
) AS $$
DECLARE
  v_user_id UUID;
  v_sale_id UUID;
  v_order_number VARCHAR(50);
  v_subtotal DECIMAL(12, 2) := 0;
  v_fee_total DECIMAL(12, 2) := 0;
  v_loyalty_discount DECIMAL(12, 2) := 0;
  v_subtotal_after_discount DECIMAL(12, 2);
  v_total DECIMAL(12, 2);
  v_change_amount DECIMAL(12, 2) := 0;
  v_item JSONB;
  v_inventory_id UUID;
  v_quantity DECIMAL(12, 4);
  v_weight_grams DECIMAL(12, 4);
  v_unit_price DECIMAL(12, 2);
  v_line_total DECIMAL(12, 2);
  v_current_stock DECIMAL(16, 4);
  v_unit_cost DECIMAL(12, 2);
  v_error_msg TEXT := '';
  v_customer_loyalty_tier VARCHAR(50);
  v_customer_purchase_count INTEGER;
  v_discount_rate DECIMAL(5, 4);
BEGIN
  BEGIN
    v_user_id := auth.uid();
    
    IF v_user_id IS NULL THEN
      RETURN QUERY SELECT NULL::UUID, NULL::VARCHAR(50), NULL::DECIMAL(12, 2), NULL::DECIMAL(12, 2), NULL::DECIMAL(12, 2), NULL::DECIMAL(12, 2), NULL::DECIMAL(12, 2), NULL::DECIMAL(12, 2), NULL::VARCHAR(50), NULL::INTEGER, false, 'User not authenticated'::TEXT;
      RETURN;
    END IF;

    IF NOT has_business_access(v_user_id, p_business_id) THEN
      RETURN QUERY SELECT NULL::UUID, NULL::VARCHAR(50), NULL::DECIMAL(12, 2), NULL::DECIMAL(12, 2), NULL::DECIMAL(12, 2), NULL::DECIMAL(12, 2), NULL::DECIMAL(12, 2), NULL::DECIMAL(12, 2), NULL::VARCHAR(50), NULL::INTEGER, false, 'Access denied to business'::TEXT;
      RETURN;
    END IF;

    -- Generate order number
    v_order_number := 'ORD-' || TO_CHAR(NOW(), 'YYYYMMDD') || '-' || LPAD(NEXTVAL('order_sequence')::TEXT, 6, '0');
    
    -- Calculate subtotal from line items
    FOR v_item IN SELECT * FROM jsonb_array_elements(p_line_items)
    LOOP
      v_weight_grams := (v_item->>'weight_grams')::DECIMAL(12, 4);
      v_quantity := (v_item->>'quantity')::DECIMAL(12, 4);
      v_unit_price := (v_item->>'unit_price')::DECIMAL(12, 2);
      
      -- Use weight_grams if present, otherwise quantity
      IF v_weight_grams IS NOT NULL AND v_weight_grams > 0 THEN
        v_line_total := v_unit_price;
      ELSE
        v_line_total := v_quantity * v_unit_price;
      END IF;
      
      v_subtotal := v_subtotal + v_line_total;
    END LOOP;

    -- Calculate total of misc fees
    SELECT COALESCE(SUM((fee->>'amount')::DECIMAL(12,2)),0)
      INTO v_fee_total
      FROM jsonb_array_elements(p_fees) AS fee;

    -- Get customer loyalty info if applicable
    IF p_customer_id IS NOT NULL AND p_apply_loyalty_discount THEN
      SELECT loyalty_tier, discount_rate, purchase_count
      INTO v_customer_loyalty_tier, v_discount_rate, v_customer_purchase_count
      FROM customers
      WHERE id = p_customer_id AND business_id = p_business_id;

      IF v_discount_rate > 0 THEN
        v_loyalty_discount := ROUND((v_subtotal * v_discount_rate)::NUMERIC, 2);
      END IF;
    END IF;

    v_subtotal_after_discount := v_subtotal - COALESCE(v_loyalty_discount, 0);
    v_total := v_subtotal_after_discount + p_tax_amount + v_fee_total + p_delivery_price;

    -- Calculate change if amount_paid is provided
    IF p_amount_paid > 0 THEN
      v_change_amount := p_amount_paid - v_total;
    END IF;

    -- Validate stock for all items
    FOR v_item IN SELECT * FROM jsonb_array_elements(p_line_items)
    LOOP
      v_inventory_id := (v_item->>'inventory_id')::UUID;
      v_weight_grams := (v_item->>'weight_grams')::DECIMAL(12, 4);
      v_quantity := (v_item->>'quantity')::DECIMAL(12, 4);
      
      -- Get current stock (prefer grams, fall back to quantity)
      SELECT inventory_in_grams, quantity_on_hand INTO v_current_stock, v_quantity
      FROM inventory
      WHERE id = v_inventory_id AND business_id = p_business_id;

      IF v_current_stock IS NULL THEN
        RAISE EXCEPTION 'Inventory item not found';
      END IF;

      -- Validate weight-based or quantity-based
      IF v_weight_grams > 0 THEN
        IF v_current_stock < v_weight_grams THEN
          RAISE EXCEPTION 'Insufficient weight for item %. Available: %g, Requested: %g', v_inventory_id, v_current_stock, v_weight_grams;
        END IF;
      ELSE
        IF v_quantity < (v_item->>'quantity')::INTEGER THEN
          RAISE EXCEPTION 'Insufficient stock for item %', v_inventory_id;
        END IF;
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
      created_by
    )
    VALUES (
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
      v_user_id
    )
    RETURNING sales.id INTO v_sale_id;

    -- Process line items and update inventory
    FOR v_item IN SELECT * FROM jsonb_array_elements(p_line_items)
    LOOP
      v_inventory_id := (v_item->>'inventory_id')::UUID;
      v_weight_grams := (v_item->>'weight_grams')::DECIMAL(12, 4);
      v_quantity := COALESCE((v_item->>'quantity')::INTEGER, 1);
      v_unit_price := (v_item->>'unit_price')::DECIMAL(12, 2);
      
      SELECT unit_cost INTO v_unit_cost
      FROM inventory WHERE id = v_inventory_id;

      -- Create line item
      INSERT INTO sales_line_items (
        sale_id,
        inventory_id,
        quantity,
        unit_price,
        line_total,
        unit_cost,
        weight_sold_grams,
        price_per_gram,
        bulk_tier_applied,
        loyalty_discount_applied
      )
      VALUES (
        v_sale_id,
        v_inventory_id,
        v_quantity,
        v_unit_price,
        v_unit_price * GREATEST(v_weight_grams, v_quantity),
        v_unit_cost,
        v_weight_grams,
        CASE WHEN v_weight_grams > 0 THEN v_unit_price / NULLIF(v_weight_grams, 0) ELSE NULL END,
        v_item->>'bulk_tier_applied',
        CASE WHEN v_loyalty_discount > 0 AND v_subtotal > 0 THEN (v_loyalty_discount / v_subtotal)::DECIMAL(5, 4) ELSE 0 END
      );

      -- Update inventory
      IF v_weight_grams > 0 THEN
        UPDATE inventory
        SET inventory_in_grams = inventory_in_grams - v_weight_grams,
            updated_at = NOW()
        WHERE id = v_inventory_id;

        -- Record stock movement for weight
        INSERT INTO stock_movements (
          business_id,
          inventory_id,
          movement_type,
          weight_change_grams,
          reason,
          related_sale_id,
          created_by
        )
        VALUES (p_business_id, v_inventory_id, 'sale', -v_weight_grams, 'Weight-based sale', v_sale_id, v_user_id);
      ELSE
        UPDATE inventory
        SET quantity_on_hand = quantity_on_hand - v_quantity,
            updated_at = NOW()
        WHERE id = v_inventory_id;

        -- Record stock movement for quantity
        INSERT INTO stock_movements (
          business_id,
          inventory_id,
          movement_type,
          quantity_change,
          reason,
          related_sale_id,
          created_by
        )
        VALUES (p_business_id, v_inventory_id, 'sale', -v_quantity, 'Standard sale', v_sale_id, v_user_id);
      END IF;
    END LOOP;

    -- Update customer purchase count and loyalty if applicable
    IF p_customer_id IS NOT NULL THEN
      UPDATE customers
      SET purchase_count = purchase_count + 1,
          total_purchases = total_purchases + v_subtotal_after_discount,
          updated_at = NOW()
      WHERE id = p_customer_id;

      SELECT purchase_count INTO v_customer_purchase_count
      FROM customers WHERE id = p_customer_id;

      -- Trigger loyalty tier update
      PERFORM update_customer_loyalty_tier(p_business_id, p_customer_id);

      SELECT loyalty_tier INTO v_customer_loyalty_tier
      FROM customers WHERE id = p_customer_id;
    END IF;

    RETURN QUERY SELECT 
      v_sale_id,
      v_order_number,
      v_subtotal,
      COALESCE(v_loyalty_discount, 0),
      v_subtotal_after_discount,
      p_tax_amount,
      v_total,
      v_change_amount,
      v_customer_loyalty_tier,
      v_customer_purchase_count,
      true,
      NULL::TEXT;

  EXCEPTION WHEN OTHERS THEN
    v_error_msg := SQLERRM;
    RETURN QUERY SELECT 
      NULL::UUID,
      NULL::VARCHAR(50),
      NULL::DECIMAL(12, 2),
      NULL::DECIMAL(12, 2),
      NULL::DECIMAL(12, 2),
      NULL::DECIMAL(12, 2),
      NULL::DECIMAL(12, 2),
      NULL::DECIMAL(12, 2),
      NULL::VARCHAR(50),
      NULL::INTEGER,
      false,
      v_error_msg;
  END;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================
-- Migration Complete
-- ============================================
-- All tables, columns, and RPC functions have been created.
-- Verify in Supabase Dashboard:
-- 1. Check "SQL Editor" > recent queries for success
-- 2. Navigate to "Database" > Tables to verify new tables exist
-- 3. Navigate to "Database" > Functions to verify RPC functions exist
-- 4. Test RPC functions with sample data
