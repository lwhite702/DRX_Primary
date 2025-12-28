-- Optimize RLS policies for performance
-- Fix auth_rls_initplan warnings by wrapping auth function calls with (select ...)
-- Fix multiple_permissive_policies warnings by consolidating policies

-- ============================================================================
-- 1. FIX AUTH_RLS_INITPLAN - inventory_intakes
-- ============================================================================

-- Drop existing policies
DROP POLICY IF EXISTS "Users can view intakes for their businesses" ON public.inventory_intakes;
DROP POLICY IF EXISTS "Users can insert intakes for their businesses" ON public.inventory_intakes;
DROP POLICY IF EXISTS "Users can update intakes for their businesses" ON public.inventory_intakes;
DROP POLICY IF EXISTS "Managers can approve intakes" ON public.inventory_intakes;

-- Recreate with optimized auth calls
CREATE POLICY "Users can view intakes for their businesses"
  ON public.inventory_intakes FOR SELECT
  USING (
    business_id IN (
      SELECT business_id FROM public.user_roles
      WHERE user_id = (SELECT auth.uid())
    )
    OR is_admin((SELECT auth.uid()))
  );

CREATE POLICY "Users can insert intakes for their businesses"
  ON public.inventory_intakes FOR INSERT
  WITH CHECK (
    business_id IN (
      SELECT business_id FROM public.user_roles
      WHERE user_id = (SELECT auth.uid())
    )
    OR is_admin((SELECT auth.uid()))
  );

-- Consolidate UPDATE policies to fix multiple_permissive_policies warning
CREATE POLICY "Users can update intakes"
  ON public.inventory_intakes FOR UPDATE
  USING (
    -- Users can update their own business intakes
    business_id IN (
      SELECT business_id FROM public.user_roles
      WHERE user_id = (SELECT auth.uid())
    )
    OR
    -- Managers can approve intakes
    is_manager((SELECT auth.uid()), business_id)
  );

-- ============================================================================
-- 2. FIX AUTH_RLS_INITPLAN - cost_history
-- ============================================================================

DROP POLICY IF EXISTS "Users can view cost history for their businesses" ON public.cost_history;
DROP POLICY IF EXISTS "Users can insert cost history for their businesses" ON public.cost_history;

CREATE POLICY "Users can view cost history for their businesses"
  ON public.cost_history FOR SELECT
  USING (
    business_id IN (
      SELECT business_id FROM public.user_roles
      WHERE user_id = (SELECT auth.uid())
    )
    OR is_admin((SELECT auth.uid()))
  );

CREATE POLICY "Users can insert cost history for their businesses"
  ON public.cost_history FOR INSERT
  WITH CHECK (
    business_id IN (
      SELECT business_id FROM public.user_roles
      WHERE user_id = (SELECT auth.uid())
    )
    OR is_admin((SELECT auth.uid()))
  );

-- ============================================================================
-- 3. FIX AUTH_RLS_INITPLAN - waitlist
-- ============================================================================

DROP POLICY IF EXISTS "Admins can view waitlist" ON public.waitlist;

CREATE POLICY "Admins can view waitlist"
  ON public.waitlist FOR SELECT
  USING (is_admin((SELECT auth.uid())));

-- ============================================================================
-- 4. FIX AUTH_RLS_INITPLAN - support_tickets
-- ============================================================================

DROP POLICY IF EXISTS "Users can view own tickets" ON public.support_tickets;
DROP POLICY IF EXISTS "Users can create tickets" ON public.support_tickets;
DROP POLICY IF EXISTS "Admins can update tickets" ON public.support_tickets;

CREATE POLICY "Users can view own tickets"
  ON public.support_tickets FOR SELECT
  USING (user_id = (SELECT auth.uid()) OR is_admin((SELECT auth.uid())));

CREATE POLICY "Users can create tickets"
  ON public.support_tickets FOR INSERT
  WITH CHECK (user_id = (SELECT auth.uid()));

CREATE POLICY "Admins can update tickets"
  ON public.support_tickets FOR UPDATE
  USING (is_admin((SELECT auth.uid())));

-- ============================================================================
-- 5. FIX multiple_permissive_policies - feature_flags
-- ============================================================================

DROP POLICY IF EXISTS "Anyone can view feature flags" ON public.feature_flags;
DROP POLICY IF EXISTS "Admins can manage feature flags" ON public.feature_flags;

-- Consolidate into single SELECT policy
CREATE POLICY "Feature flags are viewable by all"
  ON public.feature_flags FOR SELECT
  USING (true);  -- Anyone can view

CREATE POLICY "Admins can manage feature flags"
  ON public.feature_flags FOR ALL
  USING (is_admin((SELECT auth.uid())))
  WITH CHECK (is_admin((SELECT auth.uid())));

-- ============================================================================
-- 6. FIX multiple_permissive_policies - business_features
-- ============================================================================

DROP POLICY IF EXISTS "Business members can view their features" ON public.business_features;
DROP POLICY IF EXISTS "Admins can manage business features" ON public.business_features;

-- Consolidate into single SELECT policy
CREATE POLICY "Users can view business features"
  ON public.business_features FOR SELECT
  USING (
    -- Business members can view their features
    business_id IN (
      SELECT business_id FROM public.user_roles
      WHERE user_id = (SELECT auth.uid())
    )
    OR
    -- Admins can view all
    is_admin((SELECT auth.uid()))
  );

CREATE POLICY "Admins can manage business features"
  ON public.business_features FOR ALL
  USING (is_admin((SELECT auth.uid())))
  WITH CHECK (is_admin((SELECT auth.uid())));

-- ============================================================================
-- 7. ADD MISSING FOREIGN KEY INDEXES
-- ============================================================================

-- Index on business_features.feature_id (foreign key to feature_flags)
CREATE INDEX IF NOT EXISTS idx_business_features_feature_id
  ON public.business_features(feature_id);

-- Index on support_tickets.user_id (foreign key to users)
CREATE INDEX IF NOT EXISTS idx_support_tickets_user_id
  ON public.support_tickets(user_id);

