#!/bin/bash
# Quick fix script for inventory intake failure
# This script applies the missing database functions via SQL

echo "🔧 Fixing Inventory Intake Database Functions"
echo "=============================================="
echo ""

# Check if .env.local exists
if [ ! -f ".env.local" ]; then
  echo "❌ Error: .env.local file not found"
  echo "Please make sure you're running this from the project root"
  exit 1
fi

# Source the environment variables
source .env.local

# Get the Supabase database URL
if [ -z "$DATABASE_URL" ]; then
  echo "❌ Error: DATABASE_URL not found in .env.local"
  echo ""
  echo "Please run this SQL manually in the Supabase Dashboard:"
  echo "https://supabase.com/dashboard/project/YOUR_PROJECT/sql/new"
  echo ""
  echo "SQL file location:"
  echo "  supabase/migrations/20251228000000_fix_intake_functions.sql"
  exit 1
fi

echo "📝 Applying migration: 20251228000000_fix_intake_functions.sql"
echo ""

# Apply the migration using psql if available
if command -v psql &> /dev/null; then
  psql "$DATABASE_URL" < supabase/migrations/20251228000000_fix_intake_functions.sql
  
  if [ $? -eq 0 ]; then
    echo ""
    echo "✅ Migration applied successfully!"
    echo ""
    echo "You can now test the intake feature at:"
    echo "  http://localhost:3000/inventory/intake"
  else
    echo ""
    echo "❌ Migration failed. Please apply manually via Supabase Dashboard."
  fi
else
  echo "⚠️  psql not found on your system"
  echo ""
  echo "Please apply the migration manually:"
  echo "1. Go to: https://supabase.com/dashboard/project/YOUR_PROJECT/sql/new"
  echo "2. Copy the contents of: supabase/migrations/20251228000000_fix_intake_functions.sql"
  echo "3. Paste and run the SQL"
fi

echo ""
echo "=============================================="
