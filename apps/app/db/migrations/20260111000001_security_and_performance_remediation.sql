-- 1. Secure Function Search Paths
ALTER FUNCTION public.check_permission SET search_path = public;
ALTER FUNCTION public.is_admin SET search_path = public;
ALTER FUNCTION public.create_notification SET search_path = public;
ALTER FUNCTION public.notify_managers_on_intake SET search_path = public;
ALTER FUNCTION public.notify_user_on_intake_decision SET search_path = public;
ALTER FUNCTION public.get_user_permissions SET search_path = public;

-- 2. Remove permissive INSERT policies (System-only tables)
-- Dropping these policies enforces that only Service Role (which bypasses RLS) can insert.
DROP POLICY IF EXISTS "System can insert AI insights" ON public.ai_insights;
DROP POLICY IF EXISTS "System can insert AI failures" ON public.ai_insights_failures;
DROP POLICY IF EXISTS "System can insert AI pricing recommendations" ON public.ai_pricing_recommendations;
DROP POLICY IF EXISTS "System can insert notifications" ON public.notifications;
DROP POLICY IF EXISTS "System can insert audit logs" ON public.system_audit_log;

-- 3. Optimize Notifications RLS (InitPlan) & Add Missing Index
DROP POLICY IF EXISTS "Users can update their own notifications" ON public.notifications;
CREATE POLICY "Users can update their own notifications" ON public.notifications
    FOR UPDATE USING (user_id = (SELECT auth.uid()));

DROP POLICY IF EXISTS "Users can view their own notifications" ON public.notifications;
CREATE POLICY "Users can view their own notifications" ON public.notifications
    FOR SELECT USING (user_id = (SELECT auth.uid()));

CREATE INDEX IF NOT EXISTS idx_notifications_business_id ON public.notifications(business_id);

-- 4. Fix Redundant Policies on Feature Flags / Business Features
-- Feature Flags: Remove "ALL" policy and replace with specific modification policies to avoid overlap with "View All" SELECT policy.
DROP POLICY IF EXISTS "Admins can manage feature flags" ON public.feature_flags;
CREATE POLICY "Admins can insert feature flags" ON public.feature_flags
    FOR INSERT WITH CHECK (is_admin((SELECT auth.uid())));
CREATE POLICY "Admins can update feature flags" ON public.feature_flags
    FOR UPDATE USING (is_admin((SELECT auth.uid())));
CREATE POLICY "Admins can delete feature flags" ON public.feature_flags
    FOR DELETE USING (is_admin((SELECT auth.uid())));

-- Business Features: Similar setup.
DROP POLICY IF EXISTS "Admins can manage business features" ON public.business_features;
CREATE POLICY "Admins can insert business features" ON public.business_features
    FOR INSERT WITH CHECK (is_admin((SELECT auth.uid())));
CREATE POLICY "Admins can update business features" ON public.business_features
    FOR UPDATE USING (is_admin((SELECT auth.uid())));
CREATE POLICY "Admins can delete business features" ON public.business_features
    FOR DELETE USING (is_admin((SELECT auth.uid())));
