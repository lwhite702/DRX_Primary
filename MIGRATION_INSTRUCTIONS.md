# Database Migration Instructions

## Quick Start

### Option 1: Supabase Dashboard SQL Editor (Recommended)

1. **Open SQL Editor:**
   - Go to: https://supabase.com/dashboard/project/ljndzcilgplckhdjddry/sql/new

2. **Run Combined Migration:**
   - Open the file: `db/migrations_combined.sql`
   - Copy the entire contents
   - Paste into the SQL Editor
   - Click **Run** or press `Cmd+Enter` (Mac) / `Ctrl+Enter` (Windows)

3. **Verify:**
   - Check the Tables section to see all created tables
   - Verify RLS is enabled on all tables
   - Test RPC functions in the SQL Editor

### Option 2: Run Migrations Individually

If you prefer to run migrations one at a time (recommended for debugging):

1. Go to: https://supabase.com/dashboard/project/ljndzcilgplckhdjddry/sql/new

2. Run each file in order:
   - `db/schema/01_business_profile.sql`
   - `db/schema/02_inventory.sql`
   - `db/schema/03_customers.sql`
   - `db/schema/04_credit.sql`
   - `db/schema/05_sales.sql`
   - `db/schema/06_ai_insights.sql`
   - `db/schema/07_admin.sql`
   - `db/schema/08_rls_policies.sql`
   - `db/schema/09_rpc_functions.sql`

### Option 3: Using psql (if installed)

```bash
# Install PostgreSQL client (if needed)
brew install postgresql  # macOS

# Run migrations
./run-migrations.sh
```

## Migration Order

The migrations must be run in this order due to foreign key dependencies:

1. **01_business_profile.sql** - Base tables (no dependencies)
2. **02_inventory.sql** - References business_profile
3. **03_customers.sql** - References business_profile
4. **04_credit.sql** - References business_profile and customers
5. **05_sales.sql** - References business_profile, customers, inventory
6. **06_ai_insights.sql** - References business_profile
7. **07_admin.sql** - References business_profile
8. **08_rls_policies.sql** - Requires all tables to exist
9. **09_rpc_functions.sql** - Requires all tables and RLS policies

## Verification

After running migrations, verify:

```sql
-- Check all tables exist
SELECT table_name 
FROM information_schema.tables 
WHERE table_schema = 'public' 
ORDER BY table_name;

-- Check RLS is enabled
SELECT tablename, rowsecurity 
FROM pg_tables 
WHERE schemaname = 'public';

-- Test RPC function
SELECT * FROM get_credit_aging('your-business-id'::uuid);
```

## Post-Migration Steps

1. **Create Admin User:**
   ```sql
   -- Replace 'your-user-id' with your actual auth.users.id
   INSERT INTO admin_users (user_id, role, permission_level)
   VALUES ('your-user-id', 'super_admin', 100);
   ```

2. **Create Test Business (optional):**
   ```sql
   -- Replace 'your-user-id' with your actual auth.users.id
   INSERT INTO business_profile (business_name, owner_id)
   VALUES ('My Business', 'your-user-id');
   ```

3. **Set Edge Function Secrets:**
   - Go to: https://supabase.com/dashboard/project/ljndzcilgplckhdjddry/settings/functions
   - Add `OPENAI_API_KEY` secret

## Troubleshooting

- **"relation already exists"** - Tables already created, safe to ignore
- **"permission denied"** - Ensure you're using the correct database user
- **"function already exists"** - Functions already created, safe to ignore

## Project Details

- **Project Ref:** `ljndzcilgplckhdjddry`
- **Database:** `postgres`
- **Host:** `db.ljndzcilgplckhdjddry.supabase.co`

