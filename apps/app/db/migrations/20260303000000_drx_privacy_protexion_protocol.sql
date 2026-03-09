-- DRX Privacy ProteXion Protocol - Foundation schema

-- Customer schema hardening
ALTER TABLE customers ALTER COLUMN first_name DROP NOT NULL;
ALTER TABLE customers ALTER COLUMN last_name DROP NOT NULL;

ALTER TABLE customers
  ADD COLUMN IF NOT EXISTS notes TEXT,
  ADD COLUMN IF NOT EXISTS last_activity_at TIMESTAMPTZ DEFAULT NOW(),
  ADD COLUMN IF NOT EXISTS alias_encrypted TEXT,
  ADD COLUMN IF NOT EXISTS first_name_encrypted TEXT,
  ADD COLUMN IF NOT EXISTS phone_encrypted TEXT,
  ADD COLUMN IF NOT EXISTS email_encrypted TEXT,
  ADD COLUMN IF NOT EXISTS address_encrypted TEXT,
  ADD COLUMN IF NOT EXISTS notes_encrypted TEXT,
  ADD COLUMN IF NOT EXISTS alias_hash TEXT,
  ADD COLUMN IF NOT EXISTS phone_hash TEXT,
  ADD COLUMN IF NOT EXISTS email_hash TEXT,
  ADD COLUMN IF NOT EXISTS pii_encryption_version INTEGER DEFAULT 1;

UPDATE customers
SET last_activity_at = COALESCE(last_activity_at, updated_at, created_at, NOW())
WHERE last_activity_at IS NULL;

ALTER TABLE customers ALTER COLUMN last_activity_at SET NOT NULL;

CREATE INDEX IF NOT EXISTS idx_customers_business_last_activity
  ON customers (business_id, last_activity_at);
CREATE INDEX IF NOT EXISTS idx_customers_alias_hash
  ON customers (alias_hash);
CREATE INDEX IF NOT EXISTS idx_customers_phone_hash
  ON customers (phone_hash);
CREATE INDEX IF NOT EXISTS idx_customers_email_hash
  ON customers (email_hash);

-- Login lockout tracking
CREATE TABLE IF NOT EXISTS auth_lockout_windows (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  identifier_hash TEXT NOT NULL,
  ip_hash TEXT NOT NULL DEFAULT '',
  failed_count INTEGER NOT NULL DEFAULT 0,
  window_started_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  locked_until TIMESTAMPTZ,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(identifier_hash, ip_hash)
);

CREATE INDEX IF NOT EXISTS idx_auth_lockout_identifier_ip
  ON auth_lockout_windows (identifier_hash, ip_hash);

-- Session monitoring audit trail
CREATE TABLE IF NOT EXISTS auth_session_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id TEXT NOT NULL,
  session_id TEXT NOT NULL,
  event_type TEXT NOT NULL,
  ip_address TEXT,
  user_agent TEXT,
  device_type TEXT,
  city TEXT,
  country TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb
);

CREATE INDEX IF NOT EXISTS idx_auth_session_events_user_created
  ON auth_session_events (user_id, created_at DESC);
