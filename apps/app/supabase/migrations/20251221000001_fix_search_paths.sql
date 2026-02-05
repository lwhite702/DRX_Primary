-- Fix generic function search_path warnings
-- 20251221000001_fix_search_paths.sql

-- 1. is_admin
ALTER FUNCTION is_admin(UUID) SET search_path = public;

-- 2. check_permission (note: moved to public in previous migration)
ALTER FUNCTION public.check_permission(VARCHAR) SET search_path = public;

-- 3. get_user_role
ALTER FUNCTION public.get_user_role() SET search_path = public;

-- 4. has_business_access
ALTER FUNCTION has_business_access(UUID, UUID) SET search_path = public;

-- 5. get_user_business_id
ALTER FUNCTION get_user_business_id(UUID) SET search_path = public;

-- 6. process_pos_checkout
ALTER FUNCTION process_pos_checkout(UUID, UUID, VARCHAR, VARCHAR, JSONB, DECIMAL) SET search_path = public;

-- 7. extend_credit
ALTER FUNCTION extend_credit(UUID, UUID, DECIMAL, TEXT, DATE) SET search_path = public;

-- 8. process_credit_payment
ALTER FUNCTION process_credit_payment(UUID, UUID, DECIMAL, TEXT) SET search_path = public;

-- 9. get_credit_aging
ALTER FUNCTION get_credit_aging(UUID, UUID) SET search_path = public;

-- 10. process_pos_checkout_enhanced
ALTER FUNCTION process_pos_checkout_enhanced(UUID, UUID, VARCHAR, VARCHAR, JSONB, DECIMAL, JSONB, UUID, TEXT, DECIMAL, DECIMAL) SET search_path = public;

-- 11. calculate_quantity_from_amount
ALTER FUNCTION calculate_quantity_from_amount(UUID, DECIMAL) SET search_path = public;

-- 12. get_ai_pricing_recommendations
ALTER FUNCTION get_ai_pricing_recommendations(UUID, INT) SET search_path = public;

-- 13. apply_ai_pricing_recommendation
ALTER FUNCTION apply_ai_pricing_recommendation(UUID, UUID, BOOLEAN) SET search_path = public;
