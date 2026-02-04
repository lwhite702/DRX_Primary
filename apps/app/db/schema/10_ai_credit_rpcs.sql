-- RPC Functions for AI Credit Engine

-- Function to get customer credit analytics and health
CREATE OR REPLACE FUNCTION get_customer_credit_health(
  p_customer_id UUID,
  p_business_id UUID
)
RETURNS TABLE (
  customer_id UUID,
  customer_name TEXT,
  credit_limit DECIMAL(12, 2),
  credit_balance DECIMAL(12, 2),
  credit_utilization DECIMAL(5, 2),
  risk_score DECIMAL(5, 2),
  sales_30d DECIMAL(12, 2),
  credit_issued_30d DECIMAL(12, 2),
  on_time_ratio DECIMAL(5, 4),
  late_payments INTEGER,
  days_since_first_transaction INTEGER,
  total_inventory_value DECIMAL(12, 2)
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    c.id,
    (c.first_name || ' ' || c.last_name)::TEXT,
    c.credit_limit,
    COALESCE((SELECT current_balance FROM credit_limits WHERE customer_id = c.id AND business_id = p_business_id), 0),
    (COALESCE((SELECT current_balance FROM credit_limits WHERE customer_id = c.id AND business_id = p_business_id), 0) / 
     NULLIF(c.credit_limit, 0) * 100)::DECIMAL(5, 2),
    c.credit_risk_score,
    COALESCE(ca.sales_30d, 0),
    COALESCE(ca.credit_issued_30d, 0),
    ca.on_time_repayment_ratio,
    COALESCE(ca.late_payment_count, 0)::INTEGER,
    COALESCE(ca.days_since_first_transaction, 0)::INTEGER,
    COALESCE((
      SELECT SUM(quantity_on_hand * unit_cost)::DECIMAL(12, 2)
      FROM inventory
      WHERE business_id = p_business_id
    ), 0)
  FROM customers c
  LEFT JOIN v_credit_analytics ca ON ca.customer_id = c.id
  WHERE c.id = p_customer_id AND c.business_id = p_business_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to get business credit exposure summary
CREATE OR REPLACE FUNCTION get_business_credit_exposure(
  p_business_id UUID
)
RETURNS TABLE (
  total_customers INTEGER,
  active_customers INTEGER,
  total_credit_limits DECIMAL(12, 2),
  total_credit_balance DECIMAL(12, 2),
  utilization_ratio DECIMAL(5, 4),
  high_risk_count INTEGER,
  low_risk_count INTEGER,
  avg_risk_score DECIMAL(5, 2),
  total_inventory_value DECIMAL(12, 2),
  max_inventory_cap DECIMAL(12, 2)
) AS $$
DECLARE
  v_inventory_ratio DECIMAL(5, 4);
BEGIN
  -- Get business settings
  SELECT COALESCE(global_max_credit_ratio_of_inventory, 0.5)::DECIMAL(5, 4)
  INTO v_inventory_ratio
  FROM business_settings
  WHERE business_id = p_business_id;

  RETURN QUERY
  SELECT
    (SELECT COUNT(*) FROM customers WHERE business_id = p_business_id)::INTEGER,
    (SELECT COUNT(*) FROM customers WHERE business_id = p_business_id AND is_active = TRUE)::INTEGER,
    COALESCE(SUM(cl.max_credit_limit), 0)::DECIMAL(12, 2),
    COALESCE(SUM(cl.current_balance), 0)::DECIMAL(12, 2),
    CASE 
      WHEN SUM(cl.max_credit_limit) > 0 
      THEN (SUM(cl.current_balance)::DECIMAL / SUM(cl.max_credit_limit))::DECIMAL(5, 4)
      ELSE 0::DECIMAL(5, 4)
    END,
    (SELECT COUNT(*) FROM customers WHERE business_id = p_business_id AND credit_risk_score > 70)::INTEGER,
    (SELECT COUNT(*) FROM customers WHERE business_id = p_business_id AND credit_risk_score < 25)::INTEGER,
    COALESCE(AVG(c.credit_risk_score), 0)::DECIMAL(5, 2),
    COALESCE(SUM(i.quantity_on_hand * i.unit_cost), 0)::DECIMAL(12, 2),
    COALESCE(SUM(i.quantity_on_hand * i.unit_cost), 0)::DECIMAL(12, 2) * v_inventory_ratio
  FROM credit_limits cl
  FULL OUTER JOIN customers c ON cl.customer_id = c.id AND c.business_id = p_business_id
  FULL OUTER JOIN inventory i ON i.business_id = p_business_id
  WHERE cl.business_id = p_business_id OR (c.business_id = p_business_id AND cl.business_id IS NULL);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to log AI credit decision
CREATE OR REPLACE FUNCTION log_ai_credit_decision(
  p_business_id UUID,
  p_customer_id UUID,
  p_decision_type VARCHAR(50),
  p_old_limit DECIMAL(12, 2),
  p_new_limit DECIMAL(12, 2),
  p_risk_score DECIMAL(5, 2),
  p_reason TEXT,
  p_details_json JSONB DEFAULT '{}'::jsonb
)
RETURNS UUID AS $$
DECLARE
  v_decision_id UUID;
BEGIN
  -- Verify business access
  IF NOT has_business_access(auth.uid(), p_business_id) THEN
    RAISE EXCEPTION 'Access denied to business';
  END IF;

  INSERT INTO ai_credit_decisions (
    business_id,
    customer_id,
    decision_type,
    old_limit,
    new_limit,
    risk_score,
    reason,
    details_json,
    decided_by,
    created_at,
    updated_at
  ) VALUES (
    p_business_id,
    p_customer_id,
    p_decision_type,
    p_old_limit,
    p_new_limit,
    p_risk_score,
    p_reason,
    p_details_json,
    auth.uid(),
    NOW(),
    NOW()
  ) RETURNING id INTO v_decision_id;

  -- Log audit
  INSERT INTO system_audit_log (
    action,
    entity_type,
    entity_id,
    user_id,
    new_values
  ) VALUES (
    'ai_credit_decision',
    'customer',
    p_customer_id,
    auth.uid(),
    jsonb_build_object(
      'decision_type', p_decision_type,
      'old_limit', p_old_limit,
      'new_limit', p_new_limit,
      'risk_score', p_risk_score,
      'reason', p_reason
    )
  );

  RETURN v_decision_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to get recent credit decisions for audit trail
CREATE OR REPLACE FUNCTION get_recent_credit_decisions(
  p_business_id UUID,
  p_customer_id UUID DEFAULT NULL,
  p_limit INTEGER DEFAULT 20
)
RETURNS TABLE (
  id UUID,
  customer_id UUID,
  customer_name TEXT,
  decision_type VARCHAR(50),
  old_limit DECIMAL(12, 2),
  new_limit DECIMAL(12, 2),
  risk_score DECIMAL(5, 2),
  reason TEXT,
  decided_by UUID,
  decided_by_email TEXT,
  created_at TIMESTAMP
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    acd.id,
    acd.customer_id,
    (c.first_name || ' ' || c.last_name)::TEXT,
    acd.decision_type,
    acd.old_limit,
    acd.new_limit,
    acd.risk_score,
    acd.reason,
    acd.decided_by,
    u.email,
    acd.created_at
  FROM ai_credit_decisions acd
  JOIN customers c ON acd.customer_id = c.id
  LEFT JOIN auth.users u ON acd.decided_by = u.id
  WHERE acd.business_id = p_business_id
    AND (p_customer_id IS NULL OR acd.customer_id = p_customer_id)
  ORDER BY acd.created_at DESC
  LIMIT p_limit;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to check if customer is at risk
CREATE OR REPLACE FUNCTION is_customer_at_risk(
  p_customer_id UUID,
  p_risk_threshold DECIMAL(5, 2) DEFAULT 70
)
RETURNS TABLE (
  is_at_risk BOOLEAN,
  risk_score DECIMAL(5, 2),
  late_payments INTEGER,
  reason TEXT
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    (c.credit_risk_score > p_risk_threshold)::BOOLEAN,
    c.credit_risk_score,
    COALESCE(ca.late_payment_count, 0)::INTEGER,
    CASE
      WHEN c.credit_risk_score > p_risk_threshold THEN 'Risk score above threshold'
      WHEN COALESCE(ca.late_payment_count, 0) > 0 THEN 'Recent late payments'
      WHEN COALESCE(ca.on_time_repayment_ratio, 1) < 0.8 THEN 'Poor repayment history'
      ELSE 'Low risk'
    END::TEXT
  FROM customers c
  LEFT JOIN v_credit_analytics ca ON ca.customer_id = c.id
  WHERE c.id = p_customer_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant execute permissions (adjust roles as needed)
GRANT EXECUTE ON FUNCTION get_customer_credit_health TO authenticated;
GRANT EXECUTE ON FUNCTION get_business_credit_exposure TO authenticated;
GRANT EXECUTE ON FUNCTION log_ai_credit_decision TO authenticated;
GRANT EXECUTE ON FUNCTION get_recent_credit_decisions TO authenticated;
GRANT EXECUTE ON FUNCTION is_customer_at_risk TO authenticated;
