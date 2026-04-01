-- RPC Function: Assign Customer to Sale
-- Description: Retroactively assign or reassign a customer to an existing sale

CREATE OR REPLACE FUNCTION assign_customer_to_sale(
  p_sale_id UUID,
  p_new_customer_id UUID,
  p_reason TEXT DEFAULT NULL,
  p_manager_pin VARCHAR(10) DEFAULT NULL
)
RETURNS TABLE(
  success BOOLEAN,
  message TEXT,
  old_customer_id UUID,
  new_customer_id UUID
) AS $$
DECLARE
  v_user_id UUID;
  v_business_id UUID;
  v_old_customer_id UUID;
  v_payment_method VARCHAR(50);
  v_total_amount DECIMAL(12, 2);
  v_user_role VARCHAR(50);
  v_requires_override BOOLEAN := FALSE;
  v_error_msg TEXT := '';
BEGIN
  BEGIN
    v_user_id := auth.uid();
    
    IF v_user_id IS NULL THEN
      RETURN QUERY SELECT FALSE, 'User not authenticated'::TEXT, NULL::UUID, NULL::UUID;
      RETURN;
    END IF;

    -- Get sale details
    SELECT business_id, customer_id, payment_method, total_amount
    INTO v_business_id, v_old_customer_id, v_payment_method, v_total_amount
    FROM sales
    WHERE id = p_sale_id;

    IF v_business_id IS NULL THEN
      RETURN QUERY SELECT FALSE, 'Sale not found'::TEXT, NULL::UUID, NULL::UUID;
      RETURN;
    END IF;

    -- Verify business access
    IF NOT has_business_access(v_user_id, v_business_id) THEN
      RETURN QUERY SELECT FALSE, 'Access denied to business'::TEXT, NULL::UUID, NULL::UUID;
      RETURN;
    END IF;

    -- Check if assigning same customer
    IF v_old_customer_id = p_new_customer_id THEN
      RETURN QUERY SELECT FALSE, 'Customer is already assigned to this sale'::TEXT, v_old_customer_id, p_new_customer_id;
      RETURN;
    END IF;

    -- Get user role
    SELECT role INTO v_user_role
    FROM user_roles
    WHERE user_id = v_user_id AND business_id = v_business_id
    LIMIT 1;

    -- Check if manager override is required (credit sales)
    IF v_payment_method = 'credit' THEN
      v_requires_override := TRUE;
      
      -- Verify user is manager or owner
      IF v_user_role NOT IN ('owner', 'manager') THEN
        RETURN QUERY SELECT FALSE, 'Manager or owner role required to reassign credit sales'::TEXT, v_old_customer_id, p_new_customer_id;
        RETURN;
      END IF;

      -- Note: PIN validation would go here if implemented
      -- For now, we just require manager/owner role
    END IF;

    -- Update sale with new customer
    UPDATE sales
    SET customer_id = p_new_customer_id,
        updated_at = NOW()
    WHERE id = p_sale_id;

    -- Update old customer stats (decrement)
    IF v_old_customer_id IS NOT NULL THEN
      UPDATE customers
      SET purchase_count = GREATEST(0, purchase_count - 1),
          total_purchases = GREATEST(0, total_purchases - v_total_amount),
          updated_at = NOW()
      WHERE id = v_old_customer_id;

      -- Recalculate loyalty tier for old customer
      PERFORM update_customer_loyalty_tier(v_business_id, v_old_customer_id);
    END IF;

    -- Update new customer stats (increment)
    IF p_new_customer_id IS NOT NULL THEN
      UPDATE customers
      SET purchase_count = purchase_count + 1,
          total_purchases = total_purchases + v_total_amount,
          updated_at = NOW()
      WHERE id = p_new_customer_id;

      -- Recalculate loyalty tier for new customer
      PERFORM update_customer_loyalty_tier(v_business_id, p_new_customer_id);
    END IF;

    -- Insert audit log entry
    INSERT INTO customer_assignment_audit (
      sale_id,
      business_id,
      old_customer_id,
      new_customer_id,
      assigned_by,
      reason,
      manager_override_used,
      sale_payment_method,
      sale_total_amount
    ) VALUES (
      p_sale_id,
      v_business_id,
      v_old_customer_id,
      p_new_customer_id,
      v_user_id,
      p_reason,
      v_requires_override,
      v_payment_method,
      v_total_amount
    );

    -- Insert system audit log
    INSERT INTO system_audit_log (
      action,
      entity_type,
      entity_id,
      user_id,
      old_values,
      new_values,
      business_id,
      action_detail
    ) VALUES (
      'assign_customer_to_sale',
      'sale',
      p_sale_id,
      v_user_id,
      jsonb_build_object('customer_id', v_old_customer_id),
      jsonb_build_object('customer_id', p_new_customer_id),
      v_business_id,
      COALESCE(p_reason, 'Customer assignment')
    );

    RETURN QUERY SELECT TRUE, 'Customer assigned successfully'::TEXT, v_old_customer_id, p_new_customer_id;

  EXCEPTION WHEN OTHERS THEN
    v_error_msg := SQLERRM;
    RETURN QUERY SELECT FALSE, v_error_msg, NULL::UUID, NULL::UUID;
  END;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Add comment
COMMENT ON FUNCTION assign_customer_to_sale IS 'Retroactively assign or reassign a customer to an existing sale with audit trail';
