-- ============================================
-- Inventory Batch Safety: deterministic intake->batch mapping
-- Migration: 20260523000001
-- ============================================

CREATE INDEX IF NOT EXISTS idx_inventory_batches_business_intake_lookup
  ON inventory_batches(business_id, intake_id, created_at);

CREATE OR REPLACE FUNCTION ensure_inventory_batch_for_intake(
  p_business_id UUID,
  p_inventory_id UUID,
  p_intake_id UUID,
  p_original_quantity_grams DECIMAL(12, 4),
  p_remaining_quantity_grams DECIMAL(12, 4),
  p_unit_cost_per_gram DECIMAL(12, 6),
  p_supplier VARCHAR(255) DEFAULT NULL,
  p_received_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  p_created_by UUID DEFAULT NULL
)
RETURNS UUID AS $$
DECLARE
  v_batch_id UUID;
  v_lock_key BIGINT;
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'User not authenticated';
  END IF;

  IF NOT (has_business_access(auth.uid(), p_business_id) OR is_admin(auth.uid())) THEN
    RAISE EXCEPTION 'Access denied to business';
  END IF;

  IF p_intake_id IS NULL THEN
    RAISE EXCEPTION 'p_intake_id is required';
  END IF;

  v_lock_key := hashtextextended(p_business_id::text || ':' || p_intake_id::text, 0);
  PERFORM pg_advisory_xact_lock(v_lock_key);

  SELECT id
  INTO v_batch_id
  FROM inventory_batches
  WHERE business_id = p_business_id
    AND intake_id = p_intake_id
  ORDER BY created_at ASC, id ASC
  LIMIT 1;

  IF v_batch_id IS NOT NULL THEN
    RETURN v_batch_id;
  END IF;

  INSERT INTO inventory_batches (
    business_id,
    inventory_id,
    intake_id,
    original_quantity_grams,
    remaining_quantity_grams,
    unit_cost_per_gram,
    supplier,
    received_at,
    created_by
  )
  VALUES (
    p_business_id,
    p_inventory_id,
    p_intake_id,
    p_original_quantity_grams,
    p_remaining_quantity_grams,
    p_unit_cost_per_gram,
    p_supplier,
    p_received_at,
    p_created_by
  )
  RETURNING id INTO v_batch_id;

  RETURN v_batch_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

COMMENT ON FUNCTION ensure_inventory_batch_for_intake IS
  'Creates or reuses a single inventory_batches row per (business_id, intake_id) with advisory-lock serialization.';
