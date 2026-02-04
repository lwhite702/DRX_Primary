-- Restore get_user_permissions function missing from recent migrations

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
