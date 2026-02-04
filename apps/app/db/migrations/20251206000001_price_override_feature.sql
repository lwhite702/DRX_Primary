-- Migration: Price Override Feature for Admin/Manager
-- Description: Add price override tracking to sales_line_items and create audit table

-- Add price override fields to sales_line_items
ALTER TABLE sales_line_items 
  ADD COLUMN IF NOT EXISTS overridden_price DECIMAL(12, 2),
  ADD COLUMN IF NOT EXISTS original_price DECIMAL(12, 2),
  ADD COLUMN IF NOT EXISTS price_override_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS price_override_at TIMESTAMP,
  ADD COLUMN IF NOT EXISTS price_override_reason TEXT;

-- Create price override audit table
CREATE TABLE IF NOT EXISTS price_override_audit (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  sale_id UUID REFERENCES sales(id) ON DELETE CASCADE,
  sale_line_item_id UUID REFERENCES sales_line_items(id) ON DELETE CASCADE,
  inventory_id UUID REFERENCES inventory(id) ON DELETE SET NULL,
  business_id UUID NOT NULL REFERENCES business_profile(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE SET NULL,
  old_price DECIMAL(12, 2) NOT NULL,
  new_price DECIMAL(12, 2) NOT NULL,
  price_difference DECIMAL(12, 2) GENERATED ALWAYS AS (new_price - old_price) STORED,
  override_reason TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_price_override_audit_business ON price_override_audit(business_id);
CREATE INDEX IF NOT EXISTS idx_price_override_audit_user ON price_override_audit(user_id);
CREATE INDEX IF NOT EXISTS idx_price_override_audit_sale ON price_override_audit(sale_id);
CREATE INDEX IF NOT EXISTS idx_price_override_audit_created ON price_override_audit(created_at);

-- Enable RLS
ALTER TABLE price_override_audit ENABLE ROW LEVEL SECURITY;

-- RLS Policy: Users can view overrides for their business
CREATE POLICY price_override_audit_business_access
  ON price_override_audit
  FOR SELECT
  USING (auth.uid() IS NOT NULL AND has_business_access(auth.uid(), business_id));

-- RLS Policy: Only authenticated users can insert (enforced in RPC)
CREATE POLICY price_override_audit_insert
  ON price_override_audit
  FOR INSERT
  WITH CHECK (auth.uid() IS NOT NULL AND user_id = auth.uid());

-- Add comment
COMMENT ON TABLE price_override_audit IS 'Audit trail for all price overrides performed by admin/manager users';
COMMENT ON COLUMN sales_line_items.overridden_price IS 'Manually overridden price (if set by admin/manager)';
COMMENT ON COLUMN sales_line_items.original_price IS 'Original calculated price before override';
