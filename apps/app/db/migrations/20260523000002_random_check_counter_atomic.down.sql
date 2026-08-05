-- Restore the pre-atomic random inventory check counter implementation.

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
  SELECT COALESCE(transaction_count, 0),
         COALESCE(random_inventory_check_frequency, 15)
  INTO v_current_count, v_check_frequency
  FROM business_settings
  WHERE business_id = p_business_id;

  v_current_count := v_current_count + 1;

  UPDATE business_settings
  SET transaction_count = v_current_count
  WHERE business_id = p_business_id;

  RETURN QUERY
  SELECT
    v_current_count,
    (v_current_count % v_check_frequency = 0),
    v_check_frequency;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

COMMENT ON FUNCTION increment_transaction_counter(UUID) IS NULL;
