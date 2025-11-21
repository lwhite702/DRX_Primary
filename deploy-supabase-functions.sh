#!/bin/bash
# Deploy all Supabase Edge Functions
# Usage: ./deploy-supabase-functions.sh [project-ref]

set -e

PROJECT_REF=$1

if [ -z "$PROJECT_REF" ]; then
  echo "⚠️  No project reference provided."
  echo "Available projects:"
  supabase projects list
  echo ""
  echo "Usage: ./deploy-supabase-functions.sh <project-ref>"
  echo "Or link first: supabase link --project-ref <project-ref>"
  exit 1
fi

echo "🔗 Linking to project: $PROJECT_REF"
supabase link --project-ref "$PROJECT_REF" || {
  echo "⚠️  Link failed or already linked. Continuing..."
}

echo ""
echo "🚀 Deploying Supabase Edge Functions..."
echo ""

echo "1️⃣  Deploying ai_insights..."
supabase functions deploy ai_insights --no-verify-jwt --project-ref "$PROJECT_REF"

echo ""
echo "2️⃣  Deploying cashflow..."
supabase functions deploy cashflow --no-verify-jwt --project-ref "$PROJECT_REF"

echo ""
echo "3️⃣  Deploying inventory_health..."
supabase functions deploy inventory_health --no-verify-jwt --project-ref "$PROJECT_REF"

echo ""
echo "4️⃣  Deploying credit_risk..."
supabase functions deploy credit_risk --no-verify-jwt --project-ref "$PROJECT_REF"

echo ""
echo "✅ All Edge Functions deployed successfully!"
echo ""
echo "📝 Don't forget to set these secrets in Supabase Dashboard:"
echo "   - OPENAI_API_KEY"
echo "   - SUPABASE_URL (auto-set)"
echo "   - SUPABASE_SERVICE_ROLE_KEY (auto-set)"

