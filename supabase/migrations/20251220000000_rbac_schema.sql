-- RBAC Schema Migration
-- 20251220000000_rbac_schema.sql

-- 1. Create Enums
DO $$ BEGIN
    CREATE TYPE app_role AS ENUM ('cashier', 'supervisor', 'manager', 'super_admin');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- 2. Create Permissions Table
CREATE TABLE IF NOT EXISTS app_permissions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    code VARCHAR(100) NOT NULL UNIQUE, -- e.g., 'sales.create', 'inventory.edit'
    category VARCHAR(50) NOT NULL, -- e.g., 'sales', 'inventory', 'users'
    description TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 3. Create Role <-> Permission Mapping
CREATE TABLE IF NOT EXISTS role_permissions (
    role app_role NOT NULL,
    permission_code VARCHAR(100) NOT NULL REFERENCES app_permissions(code) ON DELETE CASCADE,
    PRIMARY KEY (role, permission_code)
);

-- 4. Seed Permissions (Idempotent)
INSERT INTO app_permissions (code, category, description) VALUES
-- Cashier
('sales.create', 'sales', 'Create new sales orders'),
('payments.process', 'sales', 'Process payments and refunds'),
('shift.view', 'sales', 'View assigned shift data'),
('catalog.view', 'inventory', 'View product catalog and prices'),
('customers.view', 'customers', 'View customer profiles (read-only)'),

-- Supervisor (Cashier + these)
('sales.void', 'sales', 'Void transactions'),
('sales.discount', 'sales', 'Apply discounts'),
('reports.view_daily', 'reports', 'View daily and shift reports'),
('customers.manage', 'customers', 'Create and edit customers'),

-- Manager (Supervisor + these)
('inventory.manage', 'inventory', 'Create, edit, archive products'),
('pricing.manage', 'inventory', 'Manage pricing and promotions'),
('settings.configure_pos', 'settings', 'Configure POS settings'),
('reports.view_all', 'reports', 'View and export all reports'),
('staff.manage', 'users', 'Manage staff accounts and roles'),

-- Super Admin (Manager + these)
('system.manage', 'system', 'Full system access and configuration'),
('users.manage_all', 'users', 'Manage all users including other admins'),
('audit.view', 'system', 'Access audit logs')
ON CONFLICT (code) DO NOTHING;

-- 5. Seed Role Permissions
-- Cashier
INSERT INTO role_permissions (role, permission_code)
SELECT 'cashier', code FROM app_permissions WHERE code IN (
    'sales.create', 'payments.process', 'shift.view', 'catalog.view', 'customers.view'
) ON CONFLICT DO NOTHING;

-- Supervisor
INSERT INTO role_permissions (role, permission_code)
SELECT 'supervisor', code FROM app_permissions WHERE code IN (
    'sales.create', 'payments.process', 'shift.view', 'catalog.view', 'customers.view',
    'sales.void', 'sales.discount', 'reports.view_daily', 'customers.manage'
) ON CONFLICT DO NOTHING;

-- Manager
INSERT INTO role_permissions (role, permission_code)
SELECT 'manager', code FROM app_permissions WHERE code IN (
    'sales.create', 'payments.process', 'shift.view', 'catalog.view', 'customers.view',
    'sales.void', 'sales.discount', 'reports.view_daily', 'customers.manage',
    'inventory.manage', 'pricing.manage', 'settings.configure_pos', 'reports.view_all', 'staff.manage'
) ON CONFLICT DO NOTHING;

-- Super Admin gets EVERYTHING
INSERT INTO role_permissions (role, permission_code)
SELECT 'super_admin', code FROM app_permissions
ON CONFLICT DO NOTHING;


-- 6. Update user_roles table to use the new ENUM
-- First, add a temporary column
ALTER TABLE user_roles ADD COLUMN IF NOT EXISTS role_new app_role;

-- Migrate data: cast existing varchar roles to enum. Default to 'cashier' if unknown or null.
UPDATE user_roles
SET role_new = CASE 
    WHEN role::text = 'admin' THEN 'manager'::app_role
    WHEN role::text = 'super_admin' THEN 'super_admin'::app_role
    WHEN role::text = 'manager' THEN 'manager'::app_role
    WHEN role::text = 'supervisor' THEN 'supervisor'::app_role
    ELSE 'cashier'::app_role
END;

-- Clean up: Drop old column and rename new one
ALTER TABLE user_roles DROP COLUMN role;
ALTER TABLE user_roles RENAME COLUMN role_new TO role;
ALTER TABLE user_roles ALTER COLUMN role SET NOT NULL;
ALTER TABLE user_roles ALTER COLUMN role SET DEFAULT 'cashier'::app_role;


-- 7. Update Admin Users table (Migrate to single source of truth if possible, but for now strict type)
-- Drop policy that prevents column alteration
DROP POLICY IF EXISTS "Super admins can manage admin users" ON admin_users;

-- Alter column in place handling data migration
ALTER TABLE admin_users 
  ALTER COLUMN role TYPE app_role 
  USING (
    CASE 
      WHEN role::text = 'super_admin' THEN 'super_admin'::app_role
      ELSE 'manager'::app_role
    END
  );

-- Re-create policy
CREATE POLICY "Super admins can manage admin users"
  ON admin_users FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM admin_users
      WHERE admin_users.user_id = auth.uid()
      AND role = 'super_admin'
    )
  );

-- Update is_admin function to support new ENUM values and avoid invalid text comparison
CREATE OR REPLACE FUNCTION is_admin(user_id UUID)
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM admin_users
    WHERE admin_users.user_id = is_admin.user_id
    AND role IN ('super_admin', 'manager')
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;


-- 8. Functions for Enforcing Permissions
CREATE OR REPLACE FUNCTION public.check_permission(required_permission VARCHAR)
RETURNS BOOLEAN AS $$
DECLARE
    user_role app_role;
BEGIN
    -- Get user role from user_roles table (checking business context if needed, but for now simplistic)
    -- This assumes 1 active role per context. 
    -- For this simplified pass, we check if the user has *any* role that grants this permission.
    
    -- Check if user is Super Admin in admin_users (global override)
    IF EXISTS (SELECT 1 FROM admin_users WHERE user_id = auth.uid() AND role = 'super_admin') THEN
        RETURN TRUE;
    END IF;

    -- Check specific permission via user_roles mapping
    RETURN EXISTS (
        SELECT 1 
        FROM user_roles ur
        JOIN role_permissions rp ON ur.role = rp.role
        WHERE ur.user_id = auth.uid()
        AND rp.permission_code = required_permission
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;


-- 9. Function to Check Role Hierarchy (Optional but useful)
CREATE OR REPLACE FUNCTION public.get_user_role()
RETURNS app_role AS $$
    SELECT role FROM user_roles WHERE user_id = auth.uid() LIMIT 1;
$$ LANGUAGE SQL STABLE;


-- 10. Enable RLS on Permission Tables (Read-only for public/auth users)
ALTER TABLE app_permissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE role_permissions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Everyone can view permissions" ON app_permissions FOR SELECT USING (true);
CREATE POLICY "Everyone can view role permissions" ON role_permissions FOR SELECT USING (true);


-- 11. TIGHTEN EXISTING POLICIES
-- Example: Inventory Management
-- PREVIOUS: has_business_access(uid)
-- NEW: has_permission('inventory.manage') AND has_business_access(uid)

-- Note: We need to be careful not to break 'select' which might be allowed for cashiers ('catalog.view')
-- 'inventory' IS SELECTABLE by 'catalog.view'
-- 'inventory' IS INSERT/UPDATE/DELETE by 'inventory.manage'

DROP POLICY IF EXISTS "Users can insert inventory for their businesses" ON inventory;
CREATE POLICY "Users can insert inventory for their businesses"
  ON inventory FOR INSERT
  WITH CHECK (
    has_business_access(auth.uid(), business_id) AND 
    public.check_permission('inventory.manage')
  );

DROP POLICY IF EXISTS "Users can update inventory for their businesses" ON inventory;
CREATE POLICY "Users can update inventory for their businesses"
  ON inventory FOR UPDATE
  USING (
    has_business_access(auth.uid(), business_id) AND 
    public.check_permission('inventory.manage')
  );

DROP POLICY IF EXISTS "Users can delete inventory for their businesses" ON inventory;
CREATE POLICY "Users can delete inventory for their businesses"
  ON inventory FOR DELETE
  USING (
    has_business_access(auth.uid(), business_id) AND 
    public.check_permission('inventory.manage')
  );

-- Allow Cashiers to View Inventory (implied by catalog.view or just basic business access? Requirement says "View product catalog")
-- We'll keep the existing SELECT policy but maybe refine it later if needed. 
-- Existing: "Users can view inventory for their businesses" -> has_business_access OR is_admin.
-- This is fine for now as Cashiers have business access.

