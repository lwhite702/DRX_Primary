-- Migration: Update POS Checkout RPCs for Price Override and Tax Collection
-- Description: Modify checkout functions to support price overrides and respect tax collection settings

-- Drop and recreate the weight-based checkout function with price override support
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
  v_user_role VARCHAR(50);
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
  v_overridden_price DECIMAL(12, 2);
  v_original_price DECIMAL(12, 2);
  v_override_reason TEXT;
  v_line_total DECIMAL(12, 2);
  v_current_stock DECIMAL(16, 4);
  v_unit_cost DECIMAL(12, 2);
  v_error_msg TEXT := '';
  v_customer_loyalty_tier VARCHAR(50);
  v_customer_purchase_count INTEGER;
  v_discount_rate DECIMAL(5, 4);
  v_collect_tax BOOLEAN;
  v_tax_to_apply DECIMAL(12, 2);
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

    -- Get user role for price override validation
    SELECT role INTO v_user_role
    FROM user_roles
    WHERE user_id = v_user_id AND business_id = p_business_id
    LIMIT 1;

    -- Check if tax collection is enabled for this business
    SELECT COALESCE(collect_tax, TRUE) INTO v_collect_tax
    FROM business_settings
    WHERE business_id = p_business_id
    LIMIT 1;

    -- If tax collection is disabled, force tax to 0
    IF v_collect_tax = FALSE THEN
      v_tax_to_apply := 0;
    ELSE
      v_tax_to_apply := p_tax_amount;
    END IF;

    -- Generate order number
    v_order_number := 'ORD-' || TO_CHAR(NOW(), 'YYYYMMDD') || '-' || LPAD(NEXTVAL('order_sequence')::TEXT, 6, '0');
    
    -- Calculate subtotal from line items
    FOR v_item IN SELECT * FROM jsonb_array_elements(p_line_items)
    LOOP
      v_weight_grams := (v_item->>'weight_grams')::DECIMAL(12, 4);
      v_quantity := (v_item->>'quantity')::DECIMAL(12, 4);
      v_unit_price := (v_item->>'unit_price')::DECIMAL(12, 2);
      v_overridden_price := (v_item->>'overridden_price')::DECIMAL(12, 2);
      
      -- Check if price override is present
      IF v_overridden_price IS NOT NULL THEN
        -- Validate user has permission to override prices
        IF v_user_role NOT IN ('owner', 'manager', 'admin') THEN
          RAISE EXCEPTION 'Only admin or manager can override prices';
        END IF;
        
        -- Use overridden price
        v_original_price := v_unit_price;
        v_unit_price := v_overridden_price;
      END IF;
      
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
    v_total := v_subtotal_after_discount + v_tax_to_apply + v_fee_total + p_delivery_price;

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
      v_tax_to_apply,
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
      v_overridden_price := (v_item->>'overridden_price')::DECIMAL(12, 2);
      v_override_reason := v_item->>'override_reason';
      
      SELECT unit_cost INTO v_unit_cost
      FROM inventory WHERE id = v_inventory_id;

      -- Determine final price and original price
      IF v_overridden_price IS NOT NULL THEN
        v_original_price := v_unit_price;
        v_unit_price := v_overridden_price;
      ELSE
        v_original_price := NULL;
      END IF;

      -- Create line item with price override tracking
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
        loyalty_discount_applied,
        overridden_price,
        original_price,
        price_override_by,
        price_override_at,
        price_override_reason
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
        CASE WHEN v_loyalty_discount > 0 AND v_subtotal > 0 THEN (v_loyalty_discount / v_subtotal)::DECIMAL(5, 4) ELSE 0 END,
        v_overridden_price,
        v_original_price,
        CASE WHEN v_overridden_price IS NOT NULL THEN v_user_id ELSE NULL END,
        CASE WHEN v_overridden_price IS NOT NULL THEN NOW() ELSE NULL END,
        v_override_reason
      );

      -- Log price override to audit table if applicable
      IF v_overridden_price IS NOT NULL THEN
        INSERT INTO price_override_audit (
          sale_id,
          sale_line_item_id,
          inventory_id,
          business_id,
          user_id,
          old_price,
          new_price,
          override_reason
        )
        SELECT
          v_sale_id,
          id,
          v_inventory_id,
          p_business_id,
          v_user_id,
          v_original_price,
          v_overridden_price,
          v_override_reason
        FROM sales_line_items
        WHERE sale_id = v_sale_id AND inventory_id = v_inventory_id
        ORDER BY created_at DESC
        LIMIT 1;
      END IF;

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
      v_tax_to_apply,
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

COMMENT ON FUNCTION process_weight_based_checkout IS 'Enhanced POS checkout with price override and tax collection toggle support';
