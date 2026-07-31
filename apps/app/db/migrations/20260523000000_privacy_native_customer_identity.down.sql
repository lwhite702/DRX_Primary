-- Roll back the privacy-native customer identity schema additions.
-- WARNING: dropping these tables permanently removes any data written after
-- the forward migration. Export required privacy/audit records before rollback.

BEGIN;

ALTER TABLE IF EXISTS credit_limits
  DROP CONSTRAINT IF EXISTS uq_credit_limits_business_customer;

DROP TABLE IF EXISTS customer_legal_holds;
DROP TABLE IF EXISTS customer_deletion_audit;
DROP TABLE IF EXISTS customer_cleanup_queue;
DROP TABLE IF EXISTS customer_retention_events;
DROP TABLE IF EXISTS privacy_audit_log;
DROP TABLE IF EXISTS privacy_resolution_cache;
DROP TABLE IF EXISTS privacy_preferences;
DROP TABLE IF EXISTS privacy_profiles;

DROP INDEX IF EXISTS idx_customers_business_alias_hash;
DROP INDEX IF EXISTS idx_customers_business_email_hash;
DROP INDEX IF EXISTS idx_customers_business_phone_hash;

COMMIT;
