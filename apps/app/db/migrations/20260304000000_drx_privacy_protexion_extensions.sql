-- DRX Privacy ProteXion Extensions

ALTER TABLE customers
  ADD COLUMN IF NOT EXISTS ephemeral BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS ephemeral_expires_at TIMESTAMPTZ;

CREATE INDEX IF NOT EXISTS idx_customers_business_ephemeral_expiry
  ON customers (business_id, ephemeral, ephemeral_expires_at);

CREATE TABLE IF NOT EXISTS privacy_inventory_snapshots (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id UUID NOT NULL REFERENCES business_profile(id) ON DELETE CASCADE,
  captured_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  alias_count INTEGER NOT NULL DEFAULT 0,
  phone_count INTEGER NOT NULL DEFAULT 0,
  email_count INTEGER NOT NULL DEFAULT 0,
  address_count INTEGER NOT NULL DEFAULT 0,
  notes_count INTEGER NOT NULL DEFAULT 0,
  alias_delta INTEGER NOT NULL DEFAULT 0,
  phone_delta INTEGER NOT NULL DEFAULT 0,
  email_delta INTEGER NOT NULL DEFAULT 0,
  address_delta INTEGER NOT NULL DEFAULT 0,
  notes_delta INTEGER NOT NULL DEFAULT 0
);

CREATE INDEX IF NOT EXISTS idx_privacy_inventory_snapshots_business_captured
  ON privacy_inventory_snapshots (business_id, captured_at DESC);
