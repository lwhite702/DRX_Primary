-- ============================================
-- Random Inventory Check Counter Safety
-- Migration: 20260523000002
-- ============================================

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
  -- Atomic increment under row-level lock acquired by UPDATE.
  UPDATE business_settings
  SET transaction_count = COALESCE(transaction_count, 0) + 1,
      updated_at = NOW()
  WHERE business_id = p_business_id
  RETURNING transaction_count, COALESCE(random_inventory_check_frequency, 15)
  INTO v_current_count, v_check_frequency;

  -- Fallback when settings row does not exist.
  IF v_current_count IS NULL THEN
    INSERT INTO business_settings (
      business_id,
      transaction_count,
      random_inventory_check_frequency,
      updated_at
    )
    VALUES (
      p_business_id,
      1,
      15,
      NOW()
    )
    ON CONFLICT (business_id)
    DO UPDATE
      SET transaction_count = COALESCE(business_settings.transaction_count, 0) + 1,
          updated_at = NOW()
    RETURNING transaction_count, COALESCE(random_inventory_check_frequency, 15)
    INTO v_current_count, v_check_frequency;
  END IF;

  RETURN QUERY
  SELECT
    v_current_count,
    (v_check_frequency > 0 AND v_current_count % v_check_frequency = 0),
    v_check_frequency;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

COMMENT ON FUNCTION increment_transaction_counter IS
  'Atomically increments business transaction_count and returns check prompt decision.';
