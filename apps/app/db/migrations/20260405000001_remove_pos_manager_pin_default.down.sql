-- Irreversible security migration.
-- We intentionally do not restore the insecure default PIN.
-- Rollback is a no-op by policy.
SELECT 1;
