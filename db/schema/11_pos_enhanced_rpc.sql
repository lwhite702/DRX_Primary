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
