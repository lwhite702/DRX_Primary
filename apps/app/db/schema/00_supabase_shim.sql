-- Supabase Shim for standard PostgreSQL (e.g. Neon)
-- Provides missing schema, roles, and FORCE-FIXES types for ID columns
-- This script is "Nuclear": it drops FKs and Policies to allow type conversion.
-- They will be recreated by the following migration files.

-- Create auth schema
CREATE SCHEMA IF NOT EXISTS auth;

-- Create auth.uid() function
CREATE OR REPLACE FUNCTION auth.uid()
RETURNS UUID AS $$
DECLARE
  v_jwt_json JSON;
BEGIN
  v_jwt_json := current_setting('request.jwt.claims', true)::json;
  RETURN (v_jwt_json->>'sub')::uuid;
EXCEPTION WHEN OTHERS THEN
  RETURN '00000000-0000-0000-0000-000000000000'::uuid;
END;
$$ LANGUAGE plpgsql STABLE;

-- Create missing roles
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'authenticated') THEN
        CREATE ROLE authenticated;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'anon') THEN
        CREATE ROLE anon;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'service_role') THEN
        CREATE ROLE service_role;
    END IF;
END $$;

-- Grant permissions
GRANT USAGE ON SCHEMA auth TO authenticated;
GRANT SELECT ON ALL TABLES IN SCHEMA auth TO authenticated;
GRANT EXECUTE ON FUNCTION auth.uid() TO authenticated;
GRANT EXECUTE ON FUNCTION auth.uid() TO service_role;

-- NUCLEAR TYPE UNIFICATION
DO $$
DECLARE
    pol_record RECORD;
    fk_record RECORD;
    convert_record RECORD;
BEGIN
    -- 1. DROP ALL POLICIES in the public schema
    FOR pol_record IN 
        SELECT policyname, tablename 
        FROM pg_policies 
        WHERE schemaname = 'public'
    LOOP
        EXECUTE format('DROP POLICY IF EXISTS %I ON %I', pol_record.policyname, pol_record.tablename);
        RAISE NOTICE 'Dropped policy % on %', pol_record.policyname, pol_record.tablename;
    END LOOP;

    -- 2. DROP ALL FOREIGN KEYS in the public schema
    FOR fk_record IN 
        SELECT conname, relname, nspname
        FROM pg_constraint
        JOIN pg_class ON pg_constraint.conrelid = pg_class.oid
        JOIN pg_namespace ON pg_class.relnamespace = pg_namespace.oid
        WHERE contype = 'f' AND nspname = 'public'
    LOOP
        EXECUTE format('ALTER TABLE %I.%I DROP CONSTRAINT IF EXISTS %I', fk_record.nspname, fk_record.relname, fk_record.conname);
        RAISE NOTICE 'Dropped FK % on %', fk_record.conname, fk_record.relname;
    END LOOP;

    -- 3. CONVERT target columns to UUID
    FOR convert_record IN 
        SELECT table_name, column_name 
        FROM information_schema.columns 
        WHERE table_schema = 'public' 
        AND data_type = 'text'
        AND (column_name = 'id' OR column_name LIKE '%_id' OR column_name = 'created_by' OR column_name = 'entity_id')
        AND table_name IN (
            'business_profile', 'business_settings', 'inventory', 'inventory_log', 
            'customers', 'customer_notes', 'credit_transactions', 'credit_limits', 
            'sales', 'sales_line_items', 'user_roles', 'admin_users', 
            'ai_insights', 'ai_insights_failures', 'notifications', 'system_audit_log'
        )
    LOOP
        BEGIN
            EXECUTE format('ALTER TABLE %I ALTER COLUMN %I TYPE UUID USING %I::uuid', 
                           convert_record.table_name, convert_record.column_name, convert_record.column_name);
            RAISE NOTICE 'Converted %.% to UUID', convert_record.table_name, convert_record.column_name;
        EXCEPTION WHEN OTHERS THEN
            RAISE NOTICE 'Skipped conversion for %.%: %', convert_record.table_name, convert_record.column_name, SQLERRM;
        END;
    END LOOP;

END $$;
