-- Migration for AI Credit Limit Engine

-- Add AI credit fields to customers table
ALTER TABLE customers 
ADD COLUMN IF NOT EXISTS credit_limit DECIMAL(12, 2),
ADD COLUMN IF NOT EXISTS credit_limit_ai_recommended DECIMAL(12, 2),
ADD COLUMN IF NOT EXISTS credit_limit_last_reviewed_at TIMESTAMP,
ADD COLUMN IF NOT EXISTS credit_risk_score DECIMAL(5, 2),
ADD COLUMN IF NOT EXISTS credit_notes TEXT;

-- Create credit decisions audit table
CREATE TABLE IF NOT EXISTS ai_credit_decisions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id UUID NOT NULL REFERENCES business_profile(id) ON DELETE CASCADE,
  customer_id UUID NOT NULL REFERENCES customers(id) ON DELETE CASCADE,
  decision_type VARCHAR(50) NOT NULL, -- 'ai_recommendation', 'manual_override', 'auto_apply'
  old_limit DECIMAL(12, 2),
  new_limit DECIMAL(12, 2),
  risk_score DECIMAL(5, 2),
  reason TEXT,
  details_json JSONB,
  decided_by UUID, -- user_id or NULL if 'system'
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(business_id, customer_id, created_at)
);

-- Add AI credit engine settings to business_settings
ALTER TABLE business_settings
ADD COLUMN IF NOT EXISTS ai_credit_engine_enabled BOOLEAN DEFAULT TRUE,
ADD COLUMN IF NOT EXISTS global_max_credit_per_customer DECIMAL(12, 2) DEFAULT 10000.00,
ADD COLUMN IF NOT EXISTS global_max_credit_ratio_of_inventory DECIMAL(5, 4) DEFAULT 0.5,
ADD COLUMN IF NOT EXISTS default_credit_limit_for_new_customer DECIMAL(12, 2) DEFAULT 1000.00,
ADD COLUMN IF NOT EXISTS ai_credit_auto_refresh_days INTEGER DEFAULT 7;

-- Create view for credit analytics
CREATE OR REPLACE VIEW v_credit_analytics AS
SELECT
  c.id AS customer_id,
  c.business_id,
  c.first_name,
  c.last_name,
  c.credit_limit,
  c.credit_limit_ai_recommended,
  c.credit_risk_score,
  c.credit_limit_last_reviewed_at,
  COALESCE((
    SELECT SUM(total_amount)
    FROM sales
    WHERE customer_id = c.id AND created_at >= NOW() - INTERVAL '30 days'
  ), 0) AS sales_30d,
  COALESCE((
    SELECT SUM(total_amount)
    FROM sales
    WHERE customer_id = c.id AND created_at >= NOW() - INTERVAL '90 days'
  ), 0) AS sales_90d,
  COALESCE((
    SELECT SUM(total_amount)
    FROM sales
    WHERE customer_id = c.id
  ), 0) AS sales_all_time,
  COALESCE((
    SELECT SUM(amount)
    FROM credit_transactions
    WHERE customer_id = c.id AND transaction_type = 'extension' AND created_at >= NOW() - INTERVAL '30 days'
  ), 0) AS credit_issued_30d,
  COALESCE((
    SELECT SUM(amount)
    FROM credit_transactions
    WHERE customer_id = c.id AND transaction_type = 'extension' AND created_at >= NOW() - INTERVAL '90 days'
  ), 0) AS credit_issued_90d,
  COALESCE((
    SELECT SUM(amount)
    FROM credit_transactions
    WHERE customer_id = c.id AND transaction_type = 'extension'
  ), 0) AS credit_issued_all_time,
  COALESCE((
    SELECT SUM(amount)
    FROM credit_transactions
    WHERE customer_id = c.id AND transaction_type = 'payment'
  ), 0) AS credit_repaid_all_time,
  COALESCE((
    SELECT COUNT(*)
    FROM credit_transactions
    WHERE customer_id = c.id AND transaction_type = 'extension' AND status = 'completed'
  ), 0) AS completed_transactions,
  COALESCE((
    SELECT COUNT(*)
    FROM credit_transactions
    WHERE customer_id = c.id 
      AND transaction_type = 'extension' 
      AND status = 'pending' 
      AND due_date < CURRENT_DATE
  ), 0) AS late_payment_count,
  COALESCE((
    SELECT EXTRACT(DAY FROM NOW() - MIN(created_at))
    FROM sales
    WHERE customer_id = c.id
  ), 0) AS days_since_first_transaction,
  COALESCE((
    SELECT current_balance
    FROM credit_limits
    WHERE customer_id = c.id AND business_id = c.business_id
  ), 0) AS current_credit_balance
FROM customers c
WHERE c.is_active = TRUE;

-- Create index for frequent queries
CREATE INDEX IF NOT EXISTS idx_ai_credit_decisions_customer ON ai_credit_decisions(customer_id, business_id);
CREATE INDEX IF NOT EXISTS idx_customers_credit_limit ON customers(business_id, credit_limit);
