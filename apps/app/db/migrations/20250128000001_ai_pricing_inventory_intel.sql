-- AI Pricing and Inventory Intelligence Tables
-- This migration adds tables for AI-driven pricing recommendations, inventory forecasting, and alerting

-- ============================================
-- AI Pricing Recommendations Table
-- ============================================
CREATE TABLE IF NOT EXISTS ai_pricing_recommendations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id UUID NOT NULL REFERENCES business_profile(id) ON DELETE CASCADE,
  inventory_id UUID NOT NULL REFERENCES inventory(id) ON DELETE CASCADE,
  current_price DECIMAL(12, 2) NOT NULL,
  recommended_price DECIMAL(12, 2) NOT NULL,
  recommended_range_min DECIMAL(12, 2) NOT NULL,
  recommended_range_max DECIMAL(12, 2) NOT NULL,
  confidence_score DECIMAL(5, 2),
  reasoning TEXT NOT NULL,
  factors JSONB,
  status VARCHAR(50) DEFAULT 'pending',
  applied_at TIMESTAMP,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- ============================================
-- Inventory Forecast Table
-- ============================================
CREATE TABLE IF NOT EXISTS inventory_forecasts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id UUID NOT NULL REFERENCES business_profile(id) ON DELETE CASCADE,
  inventory_id UUID NOT NULL REFERENCES inventory(id) ON DELETE CASCADE,
  current_stock INTEGER NOT NULL,
  velocity_7d DECIMAL(10, 2),
  velocity_30d DECIMAL(10, 2),
  velocity_90d DECIMAL(10, 2),
  velocity_trend VARCHAR(50),
  projected_stockout_date DATE,
  days_until_stockout INTEGER,
  recommended_restock_quantity INTEGER,
  restock_urgency VARCHAR(50),
  inventory_risk_level VARCHAR(50),
  restock_cost DECIMAL(12, 2),
  cash_exposure DECIMAL(12, 2),
  reasoning TEXT,
  confidence_score DECIMAL(5, 2),
  forecast_factors JSONB,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- ============================================
-- AI Decision Log (Audit Trail)
-- ============================================
CREATE TABLE IF NOT EXISTS ai_decision_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id UUID NOT NULL REFERENCES business_profile(id) ON DELETE CASCADE,
  product_id UUID REFERENCES inventory(id) ON DELETE SET NULL,
  decision_type VARCHAR(50) NOT NULL,
  old_value JSONB,
  new_value JSONB,
  ai_recommendation JSONB NOT NULL,
  reasoning TEXT,
  decided_by VARCHAR(50),
  decided_by_user_id UUID,
  override_reason TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- ============================================
-- Inventory Alerts Table
-- ============================================
CREATE TABLE IF NOT EXISTS inventory_alerts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id UUID NOT NULL REFERENCES business_profile(id) ON DELETE CASCADE,
  inventory_id UUID NOT NULL REFERENCES inventory(id) ON DELETE CASCADE,
  alert_type VARCHAR(100) NOT NULL,
  severity VARCHAR(50),
  message TEXT NOT NULL,
  data JSONB,
  acknowledged BOOLEAN DEFAULT FALSE,
  acknowledged_by UUID,
  acknowledged_at TIMESTAMP,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- ============================================
-- Sales Velocity Cache (for performance)
-- ============================================
CREATE TABLE IF NOT EXISTS sales_velocity_cache (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id UUID NOT NULL REFERENCES business_profile(id) ON DELETE CASCADE,
  inventory_id UUID NOT NULL REFERENCES inventory(id) ON DELETE CASCADE,
  velocity_7d DECIMAL(10, 2),
  velocity_30d DECIMAL(10, 2),
  velocity_90d DECIMAL(10, 2),
  last_7d_units INTEGER,
  last_30d_units INTEGER,
  last_90d_units INTEGER,
  cache_updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- ============================================
-- Enable RLS on new tables
-- ============================================
ALTER TABLE ai_pricing_recommendations ENABLE ROW LEVEL SECURITY;
ALTER TABLE inventory_forecasts ENABLE ROW LEVEL SECURITY;
ALTER TABLE ai_decision_log ENABLE ROW LEVEL SECURITY;
ALTER TABLE inventory_alerts ENABLE ROW LEVEL SECURITY;
ALTER TABLE sales_velocity_cache ENABLE ROW LEVEL SECURITY;

-- ============================================
-- RLS Policies
-- ============================================

-- AI Pricing Recommendations Policies
CREATE POLICY "Users can view pricing recommendations for their businesses"
  ON ai_pricing_recommendations FOR SELECT
  USING (
    has_business_access(auth.uid(), business_id)
    OR is_admin(auth.uid())
  );

CREATE POLICY "System can insert pricing recommendations"
  ON ai_pricing_recommendations FOR INSERT
  WITH CHECK (TRUE);

CREATE POLICY "Users can update pricing recommendations"
  ON ai_pricing_recommendations FOR UPDATE
  USING (has_business_access(auth.uid(), business_id));

-- Inventory Forecasts Policies
CREATE POLICY "Users can view forecasts for their businesses"
  ON inventory_forecasts FOR SELECT
  USING (
    has_business_access(auth.uid(), business_id)
    OR is_admin(auth.uid())
  );

CREATE POLICY "System can insert forecasts"
  ON inventory_forecasts FOR INSERT
  WITH CHECK (TRUE);

CREATE POLICY "Users can update forecasts"
  ON inventory_forecasts FOR UPDATE
  USING (has_business_access(auth.uid(), business_id));

-- AI Decision Log Policies
CREATE POLICY "Users can view decision logs for their businesses"
  ON ai_decision_log FOR SELECT
  USING (
    has_business_access(auth.uid(), business_id)
    OR is_admin(auth.uid())
  );

CREATE POLICY "System can insert decision logs"
  ON ai_decision_log FOR INSERT
  WITH CHECK (TRUE);

-- Inventory Alerts Policies
CREATE POLICY "Users can view alerts for their businesses"
  ON inventory_alerts FOR SELECT
  USING (
    has_business_access(auth.uid(), business_id)
    OR is_admin(auth.uid())
  );

CREATE POLICY "System can insert alerts"
  ON inventory_alerts FOR INSERT
  WITH CHECK (TRUE);

CREATE POLICY "Users can update alerts"
  ON inventory_alerts FOR UPDATE
  USING (has_business_access(auth.uid(), business_id));

-- Sales Velocity Cache Policies
CREATE POLICY "Users can view velocity cache for their businesses"
  ON sales_velocity_cache FOR SELECT
  USING (
    has_business_access(auth.uid(), business_id)
    OR is_admin(auth.uid())
  );

CREATE POLICY "System can manage velocity cache"
  ON sales_velocity_cache FOR INSERT
  WITH CHECK (TRUE);

CREATE POLICY "System can update velocity cache"
  ON sales_velocity_cache FOR UPDATE
  USING (TRUE);

-- ============================================
-- Indexes for Performance
-- ============================================
CREATE INDEX idx_pricing_recommendations_business ON ai_pricing_recommendations(business_id);
CREATE INDEX idx_pricing_recommendations_inventory ON ai_pricing_recommendations(inventory_id);
CREATE INDEX idx_pricing_recommendations_status ON ai_pricing_recommendations(status);

CREATE INDEX idx_inventory_forecasts_business ON inventory_forecasts(business_id);
CREATE INDEX idx_inventory_forecasts_inventory ON inventory_forecasts(inventory_id);
CREATE INDEX idx_inventory_forecasts_urgency ON inventory_forecasts(restock_urgency);

CREATE INDEX idx_ai_decision_log_business ON ai_decision_log(business_id);
CREATE INDEX idx_ai_decision_log_product ON ai_decision_log(product_id);
CREATE INDEX idx_ai_decision_log_type ON ai_decision_log(decision_type);

CREATE INDEX idx_inventory_alerts_business ON inventory_alerts(business_id);
CREATE INDEX idx_inventory_alerts_inventory ON inventory_alerts(inventory_id);
CREATE INDEX idx_inventory_alerts_severity ON inventory_alerts(severity);

CREATE INDEX idx_velocity_cache_business ON sales_velocity_cache(business_id);
CREATE INDEX idx_velocity_cache_inventory ON sales_velocity_cache(inventory_id);
