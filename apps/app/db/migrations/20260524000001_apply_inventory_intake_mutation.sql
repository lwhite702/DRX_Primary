-- ============================================
-- Centralized Intake Mutation Apply Function
-- Migration: 20260524000001
-- ============================================

CREATE OR REPLACE FUNCTION apply_inventory_intake_mutation(
  p_business_id UUID,
  p_inventory_id UUID,
  p_intake_id UUID,
  p_total_cost DECIMAL(12, 4),
  p_total_weight_grams DECIMAL(12, 4),
  p_calculated_cost_per_gram DECIMAL(12, 6),
  p_delivery_cost DECIMAL(12, 2) DEFAULT 0,
  p_supplier VARCHAR(255) DEFAULT NULL,
  p_user_id UUID DEFAULT NULL,
  p_reason_suffix TEXT DEFAULT NULL
)
RETURNS TABLE(
  success BOOLEAN,
  already_processed BOOLEAN,
  new_quantity_grams DECIMAL(16, 4),
  error_message TEXT
) AS $$
DECLARE
  v_actor UUID;
  v_effective_user UUID;
  v_current_quantity DECIMAL(16, 4);
  v_new_quantity DECIMAL(16, 4);
  v_reason_suffix TEXT;
  v_intake_reason TEXT;
  v_delivery_reason TEXT;
BEGIN
  v_actor := auth.uid();

  IF v_actor IS NULL THEN
    RETURN QUERY SELECT false, false, NULL::DECIMAL(16, 4), 'User not authenticated'::TEXT;
    RETURN;
  END IF;

  IF NOT (has_business_access(v_actor, p_business_id) OR is_admin(v_actor)) THEN
    RETURN QUERY SELECT false, false, NULL::DECIMAL(16, 4), 'Access denied to business'::TEXT;
    RETURN;
  END IF;

  IF p_total_cost <= 0 THEN
    RETURN QUERY SELECT false, false, NULL::DECIMAL(16, 4), 'total_cost must be greater than 0'::TEXT;
    RETURN;
  END IF;

  IF p_total_weight_grams < 0.01 THEN
    RETURN QUERY SELECT false, false, NULL::DECIMAL(16, 4), 'total_weight_grams must be at least 0.01'::TEXT;
    RETURN;
  END IF;

  v_effective_user := COALESCE(p_user_id, v_actor);
  v_reason_suffix := COALESCE(p_reason_suffix, '');

  IF EXISTS (
    SELECT 1
    FROM cost_history
    WHERE intake_id = p_intake_id
      AND business_id = p_business_id
  ) THEN
    SELECT quantity_on_hand
    INTO v_current_quantity
    FROM inventory
    WHERE id = p_inventory_id
      AND business_id = p_business_id;

    RETURN QUERY SELECT true, true, COALESCE(v_current_quantity, 0), NULL::TEXT;
    RETURN;
  END IF;

  SELECT quantity_on_hand
  INTO v_current_quantity
  FROM inventory
  WHERE id = p_inventory_id
    AND business_id = p_business_id
  FOR UPDATE;

  IF v_current_quantity IS NULL THEN
    RETURN QUERY SELECT false, false, NULL::DECIMAL(16, 4), 'Inventory item not found'::TEXT;
    RETURN;
  END IF;

  UPDATE inventory
  SET quantity_on_hand = COALESCE(quantity_on_hand, 0) + p_total_weight_grams,
      unit_cost = p_calculated_cost_per_gram,
      updated_at = NOW()
  WHERE id = p_inventory_id
    AND business_id = p_business_id
  RETURNING quantity_on_hand INTO v_new_quantity;

  INSERT INTO cost_history (
    business_id,
    inventory_id,
    intake_id,
    cost_per_gram,
    total_cost,
    total_weight_grams,
    delivery_cost,
    supplier
  )
  VALUES (
    p_business_id,
    p_inventory_id,
    p_intake_id,
    p_calculated_cost_per_gram,
    p_total_cost,
    p_total_weight_grams,
    COALESCE(p_delivery_cost, 0),
    p_supplier
  );

  v_intake_reason :=
    CASE
      WHEN p_supplier IS NOT NULL AND btrim(p_supplier) <> ''
        THEN 'Intake from ' || p_supplier || v_reason_suffix
      ELSE 'Manual intake' || v_reason_suffix
    END;

  INSERT INTO inventory_log (
    inventory_id,
    transaction_type,
    quantity_change,
    reason,
    created_by,
    metadata
  )
  VALUES (
    p_inventory_id,
    'intake',
    p_total_weight_grams,
    v_intake_reason,
    v_effective_user,
    jsonb_build_object(
      'intake_id', p_intake_id,
      'total_cost', p_total_cost,
      'cost_per_gram', p_calculated_cost_per_gram,
      'source', 'apply_inventory_intake_mutation'
    )
  );

  IF COALESCE(p_delivery_cost, 0) > 0 THEN
    v_delivery_reason := 'Delivery cost for intake' || v_reason_suffix;

    INSERT INTO inventory_log (
      inventory_id,
      transaction_type,
      quantity_change,
      reason,
      created_by,
      metadata
    )
    VALUES (
      p_inventory_id,
      'delivery_cost',
      0,
      v_delivery_reason,
      v_effective_user,
      jsonb_build_object(
        'intake_id', p_intake_id,
        'delivery_cost', p_delivery_cost,
        'supplier', p_supplier,
        'source', 'apply_inventory_intake_mutation'
      )
    );
  END IF;

  RETURN QUERY SELECT true, false, v_new_quantity, NULL::TEXT;
EXCEPTION
  WHEN OTHERS THEN
    RETURN QUERY SELECT false, false, NULL::DECIMAL(16, 4), SQLERRM;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

COMMENT ON FUNCTION apply_inventory_intake_mutation IS
  'Applies intake stock, cost history, and intake audit logs atomically with idempotent intake replay protection.';
