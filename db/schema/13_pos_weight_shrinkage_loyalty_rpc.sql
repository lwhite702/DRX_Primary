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
  FROM inventory
  i
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
    v_tier_config := '{"none":{"min_purchases":0,"discount":0},"silver":{"min_purchases":5,"discount":0.05},"gold":{"min_purchases":15,"discount":0.10},"platinum":{"min_purchases":30,"discount":0.15}}'::JSONB;
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

-- RPC: Process Weight-Based Sale
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

  -- Check if we should prompt
  RETURN QUERY SELECT v_current_count, (v_current_count % v_check_frequency = 0), v_check_frequency;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
