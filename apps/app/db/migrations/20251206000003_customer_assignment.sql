-- Migration: Retroactive Customer Assignment to Sales
-- Description: Add ability to assign/reassign customers to existing sales with audit trail

-- Create customer assignment audit table
CREATE TABLE IF NOT EXISTS customer_assignment_audit (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  sale_id UUID NOT NULL REFERENCES sales(id) ON DELETE CASCADE,
  business_id UUID NOT NULL REFERENCES business_profile(id) ON DELETE CASCADE,
  old_customer_id UUID REFERENCES customers(id) ON DELETE SET NULL,
  new_customer_id UUID REFERENCES customers(id) ON DELETE SET NULL,
  assigned_by UUID NOT NULL REFERENCES auth.users(id) ON DELETE SET NULL,
  assigned_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  reason TEXT,
  manager_override_used BOOLEAN DEFAULT FALSE,
  sale_payment_method VARCHAR(50),
  sale_total_amount DECIMAL(12, 2)
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_customer_assignment_audit_sale ON customer_assignment_audit(sale_id);
CREATE INDEX IF NOT EXISTS idx_customer_assignment_audit_business ON customer_assignment_audit(business_id);
CREATE INDEX IF NOT EXISTS idx_customer_assignment_audit_old_customer ON customer_assignment_audit(old_customer_id);
CREATE INDEX IF NOT EXISTS idx_customer_assignment_audit_new_customer ON customer_assignment_audit(new_customer_id);
CREATE INDEX IF NOT EXISTS idx_customer_assignment_audit_assigned_at ON customer_assignment_audit(assigned_at);

-- Enable RLS
ALTER TABLE customer_assignment_audit ENABLE ROW LEVEL SECURITY;

-- RLS Policy: Users can view assignments for their business
CREATE POLICY customer_assignment_audit_business_access
  ON customer_assignment_audit
  FOR SELECT
  USING (auth.uid() IS NOT NULL AND has_business_access(auth.uid(), business_id));

-- RLS Policy: Only authenticated users can insert (enforced in RPC)
CREATE POLICY customer_assignment_audit_insert
  ON customer_assignment_audit
  FOR INSERT
  WITH CHECK (auth.uid() IS NOT NULL AND assigned_by = auth.uid());

-- Add comment
COMMENT ON TABLE customer_assignment_audit IS 'Audit trail for customer assignments/reassignments to sales';
