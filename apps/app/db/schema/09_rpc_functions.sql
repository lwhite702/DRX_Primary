-- RPC Functions for Secure Data Access
-- These functions provide controlled access to data with RLS enforcement

-- Function to process POS checkout with inventory deduction
CREATE OR REPLACE FUNCTION process_pos_checkout(
  p_business_id UUID,
  p_customer_id UUID,
  p_order_type VARCHAR(50),
  p_payment_method VARCHAR(50),
  p_line_items JSONB,
  p_tax_amount DECIMAL(12, 2) DEFAULT 0,
  p_fees JSONB DEFAULT '[]'::jsonb
)
RETURNS UUID AS $$
DECLARE
  v_sale_id UUID;
  v_order_number VARCHAR(50);
  v_subtotal DECIMAL(12, 2) := 0;
  v_fee_total DECIMAL(12, 2) := 0;
  v_total DECIMAL(12, 2);
  v_item JSONB;
  v_inventory_id UUID;
  v_quantity INTEGER;
  v_unit_price DECIMAL(12, 2);
  v_line_total DECIMAL(12, 2);
  v_current_stock INTEGER;
  v_unit_cost DECIMAL(12, 2);
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

  v_total := v_subtotal + p_tax_amount + v_fee_total;

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
      fees,
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
      'pos_checkout',
      'sale',
      v_sale_id,
      auth.uid(),
      jsonb_build_object(
        'order_number', v_order_number,
        'total', v_total,
        'payment_method', p_payment_method,
        'fees', p_fees
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
    -- 1-7 days overdue: due_date between 1 and 7 days in the past
    COALESCE(SUM(CASE 
      WHEN ct.due_date < CURRENT_DATE 
       AND ct.due_date >= CURRENT_DATE - INTERVAL '7 days'
       AND ct.status = 'pending'
      THEN ct.amount ELSE 0 END), 0)::DECIMAL(12, 2),
    -- 8-14 days overdue
    COALESCE(SUM(CASE 
      WHEN ct.due_date < CURRENT_DATE - INTERVAL '7 days'
       AND ct.due_date >= CURRENT_DATE - INTERVAL '14 days'
       AND ct.status = 'pending'
      THEN ct.amount ELSE 0 END), 0)::DECIMAL(12, 2),
    -- 15-30 days overdue
    COALESCE(SUM(CASE 
      WHEN ct.due_date < CURRENT_DATE - INTERVAL '14 days'
       AND ct.due_date >= CURRENT_DATE - INTERVAL '30 days'
       AND ct.status = 'pending'
      THEN ct.amount ELSE 0 END), 0)::DECIMAL(12, 2),
    -- 31+ days overdue
    COALESCE(SUM(CASE 
      WHEN ct.due_date < CURRENT_DATE - INTERVAL '30 days'
       AND ct.status = 'pending'
      THEN ct.amount ELSE 0 END), 0)::DECIMAL(12, 2),
    -- Total outstanding (all pending)
    COALESCE(SUM(CASE WHEN ct.status = 'pending' THEN ct.amount ELSE 0 END), 0)::DECIMAL(12, 2)
  FROM customers c
  LEFT JOIN credit_transactions ct ON ct.customer_id = c.id AND ct.transaction_type = 'extension'
  WHERE c.business_id = p_business_id
    AND (p_customer_id IS NULL OR c.id = p_customer_id)
  GROUP BY c.id, c.first_name, c.last_name;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create sequence for order numbers
CREATE SEQUENCE IF NOT EXISTS order_sequence START 1;

