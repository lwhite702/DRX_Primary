-- DRX Intelligence: trust scoring, front approvals, and operator insights

ALTER TABLE customers
ADD COLUMN IF NOT EXISTS trust_score INTEGER DEFAULT 50,
ADD COLUMN IF NOT EXISTS recommended_credit_limit DECIMAL(12, 2) DEFAULT 0,
ADD COLUMN IF NOT EXISTS credit_risk_flags JSONB NOT NULL DEFAULT '[]'::jsonb,
ADD COLUMN IF NOT EXISTS payment_behavior_metrics JSONB NOT NULL DEFAULT '{}'::jsonb,
ADD COLUMN IF NOT EXISTS trust_score_updated_at TIMESTAMP;

CREATE TABLE IF NOT EXISTS drx_intelligence_audit_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id UUID NOT NULL REFERENCES business_profile(id) ON DELETE CASCADE,
  customer_id UUID REFERENCES customers(id) ON DELETE SET NULL,
  event_type TEXT NOT NULL,
  actor_id UUID,
  payload JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS drx_front_decisions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id UUID NOT NULL REFERENCES business_profile(id) ON DELETE CASCADE,
  customer_id UUID NOT NULL REFERENCES customers(id) ON DELETE CASCADE,
  inventory_id UUID REFERENCES inventory(id) ON DELETE SET NULL,
  requested_amount DECIMAL(12, 2) NOT NULL,
  trust_score INTEGER NOT NULL,
  suggestion TEXT NOT NULL CHECK (suggestion IN ('APPROVE', 'CAUTION', 'DENY')),
  confidence INTEGER NOT NULL,
  reasons JSONB NOT NULL DEFAULT '[]'::jsonb,
  risk_flags JSONB NOT NULL DEFAULT '[]'::jsonb,
  created_at TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_customers_trust_score ON customers(business_id, trust_score);
CREATE INDEX IF NOT EXISTS idx_drx_front_decisions_customer ON drx_front_decisions(customer_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_drx_intelligence_audit_logs_business ON drx_intelligence_audit_logs(business_id, created_at DESC);

CREATE OR REPLACE FUNCTION log_drx_intelligence_event()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO drx_intelligence_audit_logs (business_id, customer_id, event_type, payload)
  VALUES (
    COALESCE(NEW.business_id, OLD.business_id),
    COALESCE(NEW.customer_id, OLD.customer_id, NEW.id, OLD.id),
    TG_TABLE_NAME || ':' || TG_OP,
    jsonb_build_object(
      'new', to_jsonb(NEW),
      'old', to_jsonb(OLD)
    )
  );
  RETURN COALESCE(NEW, OLD);
END;
$$;

DROP TRIGGER IF EXISTS trg_drx_intelligence_credit_tx ON credit_transactions;
CREATE TRIGGER trg_drx_intelligence_credit_tx
AFTER INSERT OR UPDATE ON credit_transactions
FOR EACH ROW EXECUTE FUNCTION log_drx_intelligence_event();

DROP TRIGGER IF EXISTS trg_drx_intelligence_sales ON sales;
CREATE TRIGGER trg_drx_intelligence_sales
AFTER INSERT OR UPDATE ON sales
FOR EACH ROW EXECUTE FUNCTION log_drx_intelligence_event();

DROP TRIGGER IF EXISTS trg_drx_intelligence_customers ON customers;
CREATE TRIGGER trg_drx_intelligence_customers
AFTER UPDATE OF trust_score, recommended_credit_limit, credit_risk_flags, payment_behavior_metrics ON customers
FOR EACH ROW EXECUTE FUNCTION log_drx_intelligence_event();
