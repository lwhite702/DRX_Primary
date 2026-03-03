#!/bin/bash
# Deploy Supabase Edge Functions
# Requires: SUPABASE_ACCESS_TOKEN environment variable or supabase login

set -e

PROJECT_REF="momkmatyoisoynyfbvta"

echo "🚀 Deploying Supabase Edge Functions to project: $PROJECT_REF"
echo ""

# Check if logged in
if ! supabase projects list > /dev/null 2>&1; then
  echo "❌ Not authenticated. Please run: supabase login"
  echo "   Or set SUPABASE_ACCESS_TOKEN environment variable"
  exit 1
fi

echo "✅ Authenticated"
echo ""

# Deploy each function
echo "1️⃣  Deploying ai_insights..."
supabase functions deploy ai_insights \
  --project-ref "$PROJECT_REF" \
  --no-verify-jwt \
  --use-api

echo ""
echo "2️⃣  Deploying cashflow..."
supabase functions deploy cashflow \
  --project-ref "$PROJECT_REF" \
  --no-verify-jwt \
  --use-api

echo ""
echo "3️⃣  Deploying inventory_health..."
supabase functions deploy inventory_health \
  --project-ref "$PROJECT_REF" \
  --no-verify-jwt \
  --use-api

echo ""
echo "4️⃣  Deploying credit_risk..."
supabase functions deploy credit_risk \
  --project-ref "$PROJECT_REF" \
  --no-verify-jwt \
  --use-api

echo ""
echo "✅ All Edge Functions deployed successfully!"
echo ""
echo "📝 Next steps:"
echo "   1. Set OPENAI_API_KEY secret in Supabase Dashboard:"
echo "      https://supabase.com/dashboard/project/$PROJECT_REF/settings/functions"
echo "   2. Test functions in the Supabase Dashboard"
echo "   3. Update Vercel environment variables"
