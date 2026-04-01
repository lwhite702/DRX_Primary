-- 20251208000001_rbac_implementation.sql

-- 1. Create RBAC Tables
CREATE TABLE IF NOT EXISTS defined_roles (
    role_name VARCHAR(50) PRIMARY KEY,
    description TEXT
);

CREATE TABLE IF NOT EXISTS defined_permissions (
    permission_slug VARCHAR(100) PRIMARY KEY,
    description TEXT
);

CREATE TABLE IF NOT EXISTS role_permissions (
    role_name VARCHAR(50) REFERENCES defined_roles(role_name) ON DELETE CASCADE,
    permission_slug VARCHAR(100) REFERENCES defined_permissions(permission_slug) ON DELETE CASCADE,
    PRIMARY KEY (role_name, permission_slug)
);

-- Enable RLS on these new tables
ALTER TABLE defined_roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE defined_permissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE role_permissions ENABLE ROW LEVEL SECURITY;

-- Allow read access to authenticated users
CREATE POLICY "Authenticated users can read roles" ON defined_roles FOR SELECT TO authenticated USING (true);
CREATE POLICY "Authenticated users can read permissions" ON defined_permissions FOR SELECT TO authenticated USING (true);
CREATE POLICY "Authenticated users can read role_permissions" ON role_permissions FOR SELECT TO authenticated USING (true);

-- 2. Populate Roles
INSERT INTO defined_roles (role_name, description) VALUES
('cashier', 'Process sales, payments, and view shift data'),
('supervisor', 'Void transactions, discounts, reports, customer management'),
('manager', 'Full inventory, pricing, tax, staff management'),
('owner', 'Business Owner - Full Access to Business'),
('super_admin', 'Unrestricted system access')
ON CONFLICT (role_name) DO NOTHING;

-- 3. Populate Permissions
INSERT INTO defined_permissions (permission_slug, description) VALUES
('sales.create', 'Create sales and process payments'),
('sales.view_own', 'View own sales and shift data'),
('sales.view_all', 'View all sales'),
('sales.void', 'Void transactions'),
('sales.adjust', 'Adjust line items and quantities'),
('sales.discount', 'Apply discounts'),
('catalog.view', 'View product catalog and prices'),
('inventory.manage', 'Create, edit, archive products'),
('customers.view', 'View customer profiles'),
('customers.manage', 'Create, edit, merge customers'),
('reports.view_shift', 'View shift reports'),
('reports.view_daily', 'View daily reports'),
('reports.view_all', 'View and export all reports'),
('settings.manage', 'Configure tax, location, POS settings'),
('users.manage', 'Manage staff accounts')
ON CONFLICT (permission_slug) DO NOTHING;

-- 4. Map Roles to Permissions

-- Helper to insert if not exists
DO $$
BEGIN
    -- Clear existing mappings to ensure we are fresh
    DELETE FROM role_permissions;

    -- Cashier
    INSERT INTO role_permissions (role_name, permission_slug) VALUES
    ('cashier', 'sales.create'),
    ('cashier', 'sales.view_own'),
    ('cashier', 'catalog.view'),
    ('cashier', 'customers.view');

    -- Supervisor
    INSERT INTO role_permissions (role_name, permission_slug) VALUES
    ('supervisor', 'sales.create'),
    ('supervisor', 'sales.view_own'),
    ('supervisor', 'sales.view_all'),
    ('supervisor', 'sales.void'),
    ('supervisor', 'sales.adjust'),
    ('supervisor', 'sales.discount'),
    ('supervisor', 'catalog.view'),
    ('supervisor', 'customers.view'),
    ('supervisor', 'customers.manage'),
    ('supervisor', 'reports.view_shift'),
    ('supervisor', 'reports.view_daily');

    -- Manager
    INSERT INTO role_permissions (role_name, permission_slug) VALUES
    ('manager', 'sales.create'),
    ('manager', 'sales.view_own'),
    ('manager', 'sales.view_all'),
    ('manager', 'sales.void'),
    ('manager', 'sales.adjust'),
    ('manager', 'sales.discount'),
    ('manager', 'catalog.view'),
    ('manager', 'inventory.manage'),
    ('manager', 'customers.view'),
    ('manager', 'customers.manage'),
    ('manager', 'reports.view_shift'),
    ('manager', 'reports.view_daily'),
    ('manager', 'reports.view_all'),
    ('manager', 'settings.manage'),
    ('manager', 'users.manage');

    -- Owner (Same as Manager)
    INSERT INTO role_permissions (role_name, permission_slug)
    SELECT 'owner', permission_slug FROM role_permissions WHERE role_name = 'manager';

END $$;

-- 5. Create Authorization Function
CREATE OR REPLACE FUNCTION check_permission(check_user_id UUID, check_business_id UUID, required_permission VARCHAR)
RETURNS BOOLEAN AS $$
DECLARE
  user_role VARCHAR;
BEGIN
  -- 1. Check if user is Super Admin (global)
  IF EXISTS (
    SELECT 1 FROM admin_users
    WHERE user_id = check_user_id
    AND role = 'super_admin'
  ) THEN
    RETURN TRUE;
  END IF;

  -- 2. Check if user is Business Owner (via business_profile)
  IF EXISTS (
    SELECT 1 FROM business_profile
    WHERE id = check_business_id AND owner_id = check_user_id
  ) THEN
    -- Owners effectively have 'manager' role permissions
    RETURN EXISTS (
        SELECT 1 FROM role_permissions
        WHERE role_name = 'owner'
        AND permission_slug = required_permission
    );
  END IF;

  -- 3. Get user's role for the business
  SELECT role INTO user_role
  FROM user_roles
  WHERE user_id = check_user_id
  AND business_id = check_business_id;

  IF user_role IS NULL THEN
    RETURN FALSE;
  END IF;

  -- 4. Check if role has permission
  RETURN EXISTS (
    SELECT 1 FROM role_permissions
    WHERE role_name = user_role
    AND permission_slug = required_permission
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 6. Helper function for frontend to get permissions
CREATE OR REPLACE FUNCTION get_user_permissions(check_business_id UUID)
RETURNS TABLE (permission_slug VARCHAR) AS $$
DECLARE
  uid UUID;
BEGIN
  uid := auth.uid();
  
  -- If super admin, return ALL permissions
  IF EXISTS (SELECT 1 FROM admin_users WHERE user_id = uid AND role = 'super_admin') THEN
    RETURN QUERY SELECT p.permission_slug FROM defined_permissions p;
    RETURN;
  END IF;

  -- If business owner
  IF EXISTS (SELECT 1 FROM business_profile WHERE id = check_business_id AND owner_id = uid) THEN
    RETURN QUERY SELECT p.permission_slug FROM role_permissions p WHERE role_name = 'owner';
    RETURN;
  END IF;

  -- Normal role
  RETURN QUERY
  SELECT rp.permission_slug
  FROM user_roles ur
  JOIN role_permissions rp ON ur.role = rp.role_name
  WHERE ur.user_id = uid AND ur.business_id = check_business_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 7. Update RLS Policies

-- Inventory
DROP POLICY IF EXISTS "Users can insert inventory for their businesses" ON inventory;
CREATE POLICY "Managers can insert inventory" ON inventory FOR INSERT
WITH CHECK (check_permission(auth.uid(), business_id, 'inventory.manage'));

DROP POLICY IF EXISTS "Users can update inventory for their businesses" ON inventory;
CREATE POLICY "Managers can update inventory" ON inventory FOR UPDATE
USING (check_permission(auth.uid(), business_id, 'inventory.manage'));

DROP POLICY IF EXISTS "Users can delete inventory for their businesses" ON inventory;
CREATE POLICY "Managers can delete inventory" ON inventory FOR DELETE
USING (check_permission(auth.uid(), business_id, 'inventory.manage'));

-- Customers
DROP POLICY IF EXISTS "Users can insert customers for their businesses" ON customers;
CREATE POLICY "Supervisors can insert customers" ON customers FOR INSERT
WITH CHECK (check_permission(auth.uid(), business_id, 'customers.manage'));

DROP POLICY IF EXISTS "Users can update customers for their businesses" ON customers;
CREATE POLICY "Supervisors can update customers" ON customers FOR UPDATE
USING (check_permission(auth.uid(), business_id, 'customers.manage'));

DROP POLICY IF EXISTS "Users can delete customers for their businesses" ON customers;
CREATE POLICY "Supervisors can delete customers" ON customers FOR DELETE
USING (check_permission(auth.uid(), business_id, 'customers.manage'));

-- Sales
DROP POLICY IF EXISTS "Users can insert sales for their businesses" ON sales;
CREATE POLICY "Cashiers can insert sales" ON sales FOR INSERT
WITH CHECK (check_permission(auth.uid(), business_id, 'sales.create'));

DROP POLICY IF EXISTS "Users can update sales for their businesses" ON sales;
CREATE POLICY "Authorized users can update sales" ON sales FOR UPDATE
USING (
  -- Allow update if user created it and it is pending
  (order_status = 'pending' AND check_permission(auth.uid(), business_id, 'sales.create'))
  OR
  -- Allow update if user has adjust permission
  check_permission(auth.uid(), business_id, 'sales.adjust')
);

-- Business Settings
DROP POLICY IF EXISTS "Users can update settings for their businesses" ON business_settings;
CREATE POLICY "Managers can update settings" ON business_settings FOR UPDATE
USING (check_permission(auth.uid(), business_id, 'settings.manage'));

DROP POLICY IF EXISTS "Users can insert settings for their businesses" ON business_settings;
CREATE POLICY "Managers can insert settings" ON business_settings FOR INSERT
WITH CHECK (check_permission(auth.uid(), business_id, 'settings.manage'));

-- User Roles (Managing staff)
DROP POLICY IF EXISTS "Business owners can manage roles" ON user_roles;
CREATE POLICY "Managers can manage roles" ON user_roles FOR ALL
USING (
  check_permission(auth.uid(), business_id, 'users.manage')
);
