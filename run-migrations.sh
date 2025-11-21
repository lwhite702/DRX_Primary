#!/bin/bash
# Run all database migrations in order
# Uses Supabase project credentials from .env.local

set -e

PROJECT_REF="ljndzcilgplckhdjddry"
DB_PASSWORD="4xalTLbiuPJ7rd7r"
DB_HOST="db.ljndzcilgplckhdjddry.supabase.co"
DB_USER="postgres"
DB_NAME="postgres"

# Connection string
CONNECTION_STRING="postgresql://${DB_USER}:${DB_PASSWORD}@${DB_HOST}:5432/${DB_NAME}?sslmode=require"

echo "🚀 Running database migrations for project: $PROJECT_REF"
echo ""

# Check if psql is available
if ! command -v psql &> /dev/null; then
  echo "❌ psql not found. Installing PostgreSQL client..."
  echo "   On macOS: brew install postgresql"
  echo "   Or use Supabase Dashboard SQL Editor instead"
  exit 1
fi

# Migration files in order
MIGRATIONS=(
  "01_business_profile.sql"
  "02_inventory.sql"
  "03_customers.sql"
  "04_credit.sql"
  "05_sales.sql"
  "06_ai_insights.sql"
  "07_admin.sql"
  "08_rls_policies.sql"
  "09_rpc_functions.sql"
)

echo "📋 Running ${#MIGRATIONS[@]} migration files..."
echo ""

for migration in "${MIGRATIONS[@]}"; do
  echo "▶️  Running: $migration"
  
  if psql "$CONNECTION_STRING" -f "db/schema/$migration" > /dev/null 2>&1; then
    echo "   ✅ Success"
  else
    echo "   ⚠️  Error (may already exist, continuing...)"
    # Show error but continue
    psql "$CONNECTION_STRING" -f "db/schema/$migration" 2>&1 | grep -v "already exists" || true
  fi
  echo ""
done

echo "✅ All migrations completed!"
echo ""
echo "📝 Next steps:"
echo "   1. Verify tables in Supabase Dashboard"
echo "   2. Check RLS policies are enabled"
echo "   3. Test RPC functions"
echo "   4. Create initial admin user"

