-- Delivery Management Table
CREATE TABLE IF NOT EXISTS delivery_management (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id UUID NOT NULL REFERENCES business_profile(id) ON DELETE CASCADE,
  name VARCHAR(255) NOT NULL,
  provider VARCHAR(100),
  base_price DECIMAL(12, 2) DEFAULT 0,
  is_active BOOLEAN DEFAULT TRUE,
  allow_price_override BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- AI Pricing Recommendations Table
CREATE TABLE IF NOT EXISTS ai_pricing_recommendations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id UUID NOT NULL REFERENCES business_profile(id) ON DELETE CASCADE,
  inventory_id UUID NOT NULL REFERENCES inventory(id) ON DELETE CASCADE,
  recommended_price DECIMAL(12, 2),
  confidence_score DECIMAL(5, 2),
  current_price DECIMAL(12, 2),
  price_change_percentage DECIMAL(5, 2),
  recommendation_reason TEXT,
  status VARCHAR(50) DEFAULT 'pending', -- pending, accepted, rejected, applied
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Sales Table Updates: Add delivery and amount_paid related fields
ALTER TABLE sales ADD COLUMN IF NOT EXISTS delivery_management_id UUID REFERENCES delivery_management(id) ON DELETE SET NULL;
ALTER TABLE sales ADD COLUMN IF NOT EXISTS delivery_address TEXT;
ALTER TABLE sales ADD COLUMN IF NOT EXISTS delivery_price DECIMAL(12, 2) DEFAULT 0;
ALTER TABLE sales ADD COLUMN IF NOT EXISTS amount_paid DECIMAL(12, 2) DEFAULT 0;
ALTER TABLE sales ADD COLUMN IF NOT EXISTS change_amount DECIMAL(12, 2) DEFAULT 0;

-- Inventory Table Updates: Add AI pricing field
ALTER TABLE inventory ADD COLUMN IF NOT EXISTS ai_pricing_enabled BOOLEAN DEFAULT TRUE;
ALTER TABLE inventory ADD COLUMN IF NOT EXISTS quantity_unit VARCHAR(50) DEFAULT 'unit'; -- unit, gram, ml, etc.
ALTER TABLE inventory ADD COLUMN IF NOT EXISTS unit_to_serving_ratio DECIMAL(10, 4) DEFAULT 1; -- How many servings per unit
