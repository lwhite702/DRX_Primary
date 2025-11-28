-- Phase 1: No Sale / Drawer Events
CREATE TABLE IF NOT EXISTS drawer_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id UUID NOT NULL REFERENCES business_profile(id) ON DELETE CASCADE,
  location_id UUID,
  user_id UUID NOT NULL,
  event_type VARCHAR(50) NOT NULL DEFAULT 'no_sale',
  note TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_drawer_events_business ON drawer_events(business_id);
CREATE INDEX idx_drawer_events_user ON drawer_events(user_id);
CREATE INDEX idx_drawer_events_created ON drawer_events(created_at);

-- Phase 2: Shrinkage Events (Personal Use, Comps, Damaged)
CREATE TABLE IF NOT EXISTS shrinkage_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id UUID NOT NULL REFERENCES business_profile(id) ON DELETE CASCADE,
  inventory_id UUID NOT NULL REFERENCES inventory(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  quantity_grams DECIMAL(12, 4) NOT NULL,
  cost_value DECIMAL(12, 2),
  shrinkage_type VARCHAR(50) NOT NULL DEFAULT 'personal_use',
  note TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_shrinkage_events_business ON shrinkage_events(business_id);
CREATE INDEX idx_shrinkage_events_inventory ON shrinkage_events(inventory_id);
CREATE INDEX idx_shrinkage_events_user ON shrinkage_events(user_id);
CREATE INDEX idx_shrinkage_events_created ON shrinkage_events(created_at);

-- Phase 3: Random Inventory Checks
CREATE TABLE IF NOT EXISTS inventory_checks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id UUID NOT NULL REFERENCES business_profile(id) ON DELETE CASCADE,
  inventory_id UUID NOT NULL REFERENCES inventory(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  expected_weight_grams DECIMAL(12, 4) NOT NULL,
  measured_weight_grams DECIMAL(12, 4) NOT NULL,
  delta_grams DECIMAL(12, 4),
  delta_percentage DECIMAL(5, 2),
  discrepancy_flagged BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_inventory_checks_business ON inventory_checks(business_id);
CREATE INDEX idx_inventory_checks_inventory ON inventory_checks(inventory_id);
CREATE INDEX idx_inventory_checks_user ON inventory_checks(user_id);
CREATE INDEX idx_inventory_checks_created ON inventory_checks(created_at);

-- Phase 4: Extend Inventory for Weight-Based Tracking
ALTER TABLE inventory ADD COLUMN IF NOT EXISTS base_unit VARCHAR(10) DEFAULT 'g';
ALTER TABLE inventory ADD COLUMN IF NOT EXISTS convert_to_grams DECIMAL(12, 4) DEFAULT 1.0;
ALTER TABLE inventory ADD COLUMN IF NOT EXISTS inventory_in_grams DECIMAL(16, 4) DEFAULT 0;
ALTER TABLE inventory ADD COLUMN IF NOT EXISTS allow_fractional_weight BOOLEAN DEFAULT TRUE;
ALTER TABLE inventory ADD COLUMN IF NOT EXISTS price_per_gram DECIMAL(12, 4);

-- Phase 5: Bulk Pricing Rules
CREATE TABLE IF NOT EXISTS bulk_pricing_rules (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id UUID NOT NULL REFERENCES business_profile(id) ON DELETE CASCADE,
  inventory_id UUID REFERENCES inventory(id) ON DELETE CASCADE,
  min_weight_grams DECIMAL(12, 4) NOT NULL,
  max_weight_grams DECIMAL(12, 4),
  price_per_gram DECIMAL(12, 4) NOT NULL,
  tier_name VARCHAR(50),
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_bulk_pricing_rules_business ON bulk_pricing_rules(business_id);
CREATE INDEX idx_bulk_pricing_rules_inventory ON bulk_pricing_rules(inventory_id);
CREATE INDEX idx_bulk_pricing_rules_active ON bulk_pricing_rules(is_active);

-- Phase 6: Extend Customers for Loyalty Program
ALTER TABLE customers ADD COLUMN IF NOT EXISTS purchase_count INTEGER DEFAULT 0;
ALTER TABLE customers ADD COLUMN IF NOT EXISTS loyalty_tier VARCHAR(50) DEFAULT 'none';
ALTER TABLE customers ADD COLUMN IF NOT EXISTS discount_rate DECIMAL(5, 4) DEFAULT 0;
ALTER TABLE customers ADD COLUMN IF NOT EXISTS next_tier_at INTEGER DEFAULT 5;
ALTER TABLE customers ADD COLUMN IF NOT EXISTS loyalty_updated_at TIMESTAMP;

-- Extend Sales for Weight and Loyalty Tracking
ALTER TABLE sales_line_items ADD COLUMN IF NOT EXISTS weight_sold_grams DECIMAL(12, 4);
ALTER TABLE sales_line_items ADD COLUMN IF NOT EXISTS price_per_gram DECIMAL(12, 4);
ALTER TABLE sales_line_items ADD COLUMN IF NOT EXISTS bulk_tier_applied VARCHAR(50);
ALTER TABLE sales_line_items ADD COLUMN IF NOT EXISTS loyalty_discount_applied DECIMAL(5, 4) DEFAULT 0;

-- Extend Business Settings for POS Configuration
ALTER TABLE business_settings ADD COLUMN IF NOT EXISTS random_inventory_check_frequency INTEGER DEFAULT 15;
ALTER TABLE business_settings ADD COLUMN IF NOT EXISTS random_check_tolerance_percentage DECIMAL(5, 2) DEFAULT 5.0;
ALTER TABLE business_settings ADD COLUMN IF NOT EXISTS enable_weight_based_sales BOOLEAN DEFAULT TRUE;
ALTER TABLE business_settings ADD COLUMN IF NOT EXISTS require_supervisor_pin_for_shrinkage BOOLEAN DEFAULT FALSE;
ALTER TABLE business_settings ADD COLUMN IF NOT EXISTS default_bulk_pricing_tiers JSONB DEFAULT '[{"min_grams":1,"max_grams":3.4,"tier_name":"1g"},{"min_grams":3.5,"max_grams":6.9,"tier_name":"3.5g"},{"min_grams":7,"max_grams":9.9,"tier_name":"7g"},{"min_grams":10,"max_grams":null,"tier_name":"10g+"}]';
ALTER TABLE business_settings ADD COLUMN IF NOT EXISTS loyalty_tier_config JSONB DEFAULT '{"none":{"min_purchases":0,"discount":0},"silver":{"min_purchases":5,"discount":0.05},"gold":{"min_purchases":15,"discount":0.10},"platinum":{"min_purchases":30,"discount":0.15}}';
ALTER TABLE business_settings ADD COLUMN IF NOT EXISTS transaction_count INTEGER DEFAULT 0;

-- Extend System Audit Log with more detail
ALTER TABLE system_audit_log ADD COLUMN IF NOT EXISTS action_detail TEXT;
ALTER TABLE system_audit_log ADD COLUMN IF NOT EXISTS business_id UUID REFERENCES business_profile(id) ON DELETE CASCADE;
ALTER TABLE system_audit_log ADD COLUMN IF NOT EXISTS ip_address VARCHAR(50);

-- Create Stock Movement Table (replaces inventory_log for better tracking)
CREATE TABLE IF NOT EXISTS stock_movements (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id UUID NOT NULL REFERENCES business_profile(id) ON DELETE CASCADE,
  inventory_id UUID NOT NULL REFERENCES inventory(id) ON DELETE CASCADE,
  movement_type VARCHAR(50) NOT NULL,
  quantity_change DECIMAL(16, 4),
  weight_change_grams DECIMAL(12, 4),
  reason TEXT,
  related_sale_id UUID REFERENCES sales(id) ON DELETE SET NULL,
  related_shrinkage_id UUID REFERENCES shrinkage_events(id) ON DELETE SET NULL,
  related_check_id UUID REFERENCES inventory_checks(id) ON DELETE SET NULL,
  created_by UUID NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_stock_movements_business ON stock_movements(business_id);
CREATE INDEX idx_stock_movements_inventory ON stock_movements(inventory_id);
CREATE INDEX idx_stock_movements_type ON stock_movements(movement_type);
CREATE INDEX idx_stock_movements_created ON stock_movements(created_at);

-- Table for Loyalty Tier History
CREATE TABLE IF NOT EXISTS loyalty_tier_changes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_id UUID NOT NULL REFERENCES customers(id) ON DELETE CASCADE,
  business_id UUID NOT NULL REFERENCES business_profile(id) ON DELETE CASCADE,
  old_tier VARCHAR(50),
  new_tier VARCHAR(50),
  old_discount_rate DECIMAL(5, 4),
  new_discount_rate DECIMAL(5, 4),
  reason TEXT,
  created_by UUID,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_loyalty_tier_changes_customer ON loyalty_tier_changes(customer_id);
CREATE INDEX idx_loyalty_tier_changes_business ON loyalty_tier_changes(business_id);
CREATE INDEX idx_loyalty_tier_changes_created ON loyalty_tier_changes(created_at);

-- RLS Policies for new tables
ALTER TABLE drawer_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE shrinkage_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE inventory_checks ENABLE ROW LEVEL SECURITY;
ALTER TABLE bulk_pricing_rules ENABLE ROW LEVEL SECURITY;
ALTER TABLE stock_movements ENABLE ROW LEVEL SECURITY;
ALTER TABLE loyalty_tier_changes ENABLE ROW LEVEL SECURITY;

CREATE POLICY drawer_events_business_access
  ON drawer_events
  FOR ALL
  USING (auth.uid() IS NOT NULL AND has_business_access(auth.uid(), business_id));

CREATE POLICY shrinkage_events_business_access
  ON shrinkage_events
  FOR ALL
  USING (auth.uid() IS NOT NULL AND has_business_access(auth.uid(), business_id));

CREATE POLICY inventory_checks_business_access
  ON inventory_checks
  FOR ALL
  USING (auth.uid() IS NOT NULL AND has_business_access(auth.uid(), business_id));

CREATE POLICY bulk_pricing_rules_business_access
  ON bulk_pricing_rules
  FOR ALL
  USING (auth.uid() IS NOT NULL AND has_business_access(auth.uid(), business_id));

CREATE POLICY stock_movements_business_access
  ON stock_movements
  FOR ALL
  USING (auth.uid() IS NOT NULL AND has_business_access(auth.uid(), business_id));

CREATE POLICY loyalty_tier_changes_business_access
  ON loyalty_tier_changes
  FOR ALL
  USING (auth.uid() IS NOT NULL AND has_business_access(auth.uid(), business_id));
