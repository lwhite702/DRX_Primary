-- Inventory Items Table
CREATE TABLE IF NOT EXISTS inventory (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id UUID NOT NULL REFERENCES business_profile(id) ON DELETE CASCADE,
  sku VARCHAR(100) NOT NULL,
  product_name VARCHAR(255) NOT NULL,
  description TEXT,
  category VARCHAR(100),
  quantity_on_hand INTEGER DEFAULT 0,
  reorder_level INTEGER DEFAULT 10,
  unit_cost DECIMAL(12, 2),
  selling_price DECIMAL(12, 2),
  supplier_id UUID,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(business_id, sku)
);

-- Inventory Logs (for audit trail)
CREATE TABLE IF NOT EXISTS inventory_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  inventory_id UUID NOT NULL REFERENCES inventory(id) ON DELETE CASCADE,
  transaction_type VARCHAR(50),
  quantity_change INTEGER,
  reason TEXT,
  created_by UUID,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
