-- AI Insights Table
CREATE TABLE IF NOT EXISTS ai_insights (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id UUID NOT NULL REFERENCES business_profile(id) ON DELETE CASCADE,
  insight_type VARCHAR(100),
  insight_title VARCHAR(255),
  insight_content TEXT,
  priority VARCHAR(50),
  action_recommended TEXT,
  status VARCHAR(50) DEFAULT 'pending',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- AI Insights Failures Table (for error tracking)
CREATE TABLE IF NOT EXISTS ai_insights_failures (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id UUID REFERENCES business_profile(id) ON DELETE CASCADE,
  function_name VARCHAR(100),
  error_message TEXT,
  error_stack TEXT,
  input_data JSONB,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
