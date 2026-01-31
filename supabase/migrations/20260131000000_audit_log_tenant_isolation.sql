-- Add business_id to system_audit_log for tenant isolation
-- Migration: 20260131000000_audit_log_tenant_isolation

-- 1. Add business_id column
ALTER TABLE system_audit_log 
ADD COLUMN IF NOT EXISTS business_id UUID REFERENCES business_profile(id) ON DELETE CASCADE;

-- 2. Populate business_id for existing logs where possible (backup mapping via user_id)
UPDATE system_audit_log
SET business_id = (
    SELECT business_id 
    FROM user_roles 
    WHERE user_roles.user_id = system_audit_log.user_id 
    LIMIT 1
)
WHERE business_id IS NULL AND user_id IS NOT NULL;

-- 3. Update RLS Policies for system_audit_log
DROP POLICY IF EXISTS "Users can view their own audit logs" ON system_audit_log;
DROP POLICY IF EXISTS "System can insert audit logs" ON system_audit_log;

-- Users (Owners/Managers) can view logs for their own business
CREATE POLICY "Users can view audit logs for their business"
  ON system_audit_log FOR SELECT
  USING (
    has_business_access(auth.uid(), business_id)
    OR is_admin(auth.uid())
  );

-- System/Service can insert logs
CREATE POLICY "System can insert audit logs"
  ON system_audit_log FOR INSERT
  WITH CHECK (TRUE);

-- 4. Indexes for performance
CREATE INDEX IF NOT EXISTS idx_system_audit_log_business_id ON system_audit_log(business_id);
CREATE INDEX IF NOT EXISTS idx_system_audit_log_created_at ON system_audit_log(created_at DESC);
