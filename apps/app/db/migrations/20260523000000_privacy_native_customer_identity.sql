-- DRX Privacy-Native Customer Identity Modernization

-- Deterministic lookup indexes (safe additive)
CREATE INDEX IF NOT EXISTS idx_customers_business_phone_hash
  ON customers (business_id, phone_hash)
  WHERE phone_hash IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_customers_business_email_hash
  ON customers (business_id, email_hash)
  WHERE email_hash IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_customers_business_alias_hash
  ON customers (business_id, alias_hash)
  WHERE alias_hash IS NOT NULL;

-- Privacy policy source-of-truth and propagation tables
CREATE TABLE IF NOT EXISTS privacy_profiles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id UUID NOT NULL REFERENCES business_profile(id) ON DELETE CASCADE,
  profile_key TEXT NOT NULL,
  profile_name TEXT NOT NULL,
  privacy_protocol JSONB NOT NULL,
  is_default BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (business_id, profile_key)
);

CREATE INDEX IF NOT EXISTS idx_privacy_profiles_business_default
  ON privacy_profiles (business_id, is_default);

CREATE TABLE IF NOT EXISTS privacy_preferences (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id UUID NOT NULL REFERENCES business_profile(id) ON DELETE CASCADE,
  scope TEXT NOT NULL DEFAULT 'tenant',
  operator_user_id TEXT,
  manual_screen_privacy_enabled BOOLEAN NOT NULL DEFAULT false,
  preferences JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (business_id, scope, operator_user_id)
);

CREATE INDEX IF NOT EXISTS idx_privacy_preferences_business_scope
  ON privacy_preferences (business_id, scope);

CREATE TABLE IF NOT EXISTS privacy_resolution_cache (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id UUID NOT NULL REFERENCES business_profile(id) ON DELETE CASCADE,
  actor_key TEXT NOT NULL,
  policy_version INTEGER NOT NULL DEFAULT 1,
  resolved_policy JSONB NOT NULL,
  resolved_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  expires_at TIMESTAMPTZ,
  UNIQUE (business_id, actor_key)
);

CREATE INDEX IF NOT EXISTS idx_privacy_resolution_cache_expiry
  ON privacy_resolution_cache (business_id, expires_at);

CREATE TABLE IF NOT EXISTS privacy_audit_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id UUID NOT NULL REFERENCES business_profile(id) ON DELETE CASCADE,
  operator_user_id TEXT,
  action TEXT NOT NULL,
  details JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_privacy_audit_log_business_created
  ON privacy_audit_log (business_id, created_at DESC);

-- Retention and deletion lifecycle hardening
CREATE TABLE IF NOT EXISTS customer_retention_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id UUID NOT NULL REFERENCES business_profile(id) ON DELETE CASCADE,
  customer_id UUID NOT NULL REFERENCES customers(id) ON DELETE CASCADE,
  event_type TEXT NOT NULL,
  reason TEXT,
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_customer_retention_events_business_customer
  ON customer_retention_events (business_id, customer_id, created_at DESC);

CREATE TABLE IF NOT EXISTS customer_cleanup_queue (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id UUID NOT NULL REFERENCES business_profile(id) ON DELETE CASCADE,
  customer_id UUID NOT NULL REFERENCES customers(id) ON DELETE CASCADE,
  run_after TIMESTAMPTZ NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending',
  reason TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (business_id, customer_id, status)
);

CREATE INDEX IF NOT EXISTS idx_customer_cleanup_queue_ready
  ON customer_cleanup_queue (business_id, status, run_after);

CREATE TABLE IF NOT EXISTS customer_deletion_audit (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id UUID NOT NULL REFERENCES business_profile(id) ON DELETE CASCADE,
  customer_id UUID NOT NULL,
  deleted_by_user_id TEXT,
  delete_mode TEXT NOT NULL,
  reason TEXT,
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_customer_deletion_audit_business_created
  ON customer_deletion_audit (business_id, created_at DESC);

CREATE TABLE IF NOT EXISTS customer_legal_holds (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id UUID NOT NULL REFERENCES business_profile(id) ON DELETE CASCADE,
  customer_id UUID NOT NULL REFERENCES customers(id) ON DELETE CASCADE,
  hold_reason TEXT NOT NULL,
  active BOOLEAN NOT NULL DEFAULT true,
  placed_by_user_id TEXT,
  released_by_user_id TEXT,
  hold_until TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  released_at TIMESTAMPTZ,
  UNIQUE (business_id, customer_id, active)
);

CREATE INDEX IF NOT EXISTS idx_customer_legal_holds_active
  ON customer_legal_holds (business_id, active, created_at DESC);

-- Canonical customer + credit relation guard (skip if duplicates exist)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'uq_credit_limits_business_customer'
  ) THEN
    ALTER TABLE credit_limits
      ADD CONSTRAINT uq_credit_limits_business_customer
      UNIQUE (business_id, customer_id);
  END IF;
EXCEPTION
  WHEN unique_violation THEN
    -- Existing duplicate rows must be remediated before strict uniqueness.
    NULL;
END $$;
