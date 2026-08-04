-- Roll back privacy-native customer identity tables and lookup indexes.
-- Run only after confirming no retained privacy/audit data is required.

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

-- The optional uq_credit_limits_business_customer constraint is intentionally
-- retained: the up migration may have found it pre-existing, and removing a
-- pre-existing integrity constraint would be an unsafe rollback.
