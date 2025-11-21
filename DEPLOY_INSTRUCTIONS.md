# Supabase Edge Functions Deployment Instructions

## Current Status
The Supabase CLI is encountering permission issues. Here are alternative deployment methods:

## Method 1: Deploy via Supabase Dashboard (Recommended)

1. Go to https://supabase.com/dashboard/project/ljndzcilgplckhdjddry
2. Navigate to **Edge Functions** in the sidebar
3. For each function, click **Deploy** and upload the function files:

### Function Locations:
- `supabase/functions/ai_insights/index.ts`
- `supabase/functions/cashflow/index.ts`
- `supabase/functions/inventory_health/index.ts`
- `supabase/functions/credit_risk/index.ts`

### Set Environment Variables (Secrets):
In the Supabase Dashboard → Edge Functions → Settings → Secrets:
- `OPENAI_API_KEY` - Your OpenAI API key
- `SUPABASE_URL` - https://ljndzcilgplckhdjddry.supabase.co (auto-set)
- `SUPABASE_SERVICE_ROLE_KEY` - (auto-set)

## Method 2: Fix CLI Authentication

1. Login to Supabase CLI:
   ```bash
   supabase login
   ```

2. Then deploy:
   ```bash
   supabase functions deploy ai_insights --project-ref ljndzcilgplckhdjddry --no-verify-jwt --use-api
   supabase functions deploy cashflow --project-ref ljndzcilgplckhdjddry --no-verify-jwt --use-api
   supabase functions deploy inventory_health --project-ref ljndzcilgplckhdjddry --no-verify-jwt --use-api
   supabase functions deploy credit_risk --project-ref ljndzcilgplckhdjddry --no-verify-jwt --use-api
   ```

## Method 3: Use Supabase Management API

You can also deploy via the Supabase Management API using curl or a script.

## Project Reference
- **Project Ref:** `ljndzcilgplckhdjddry`
- **Project URL:** https://ljndzcilgplckhdjddry.supabase.co

## Next Steps After Deployment

1. Set the `OPENAI_API_KEY` secret in Supabase Dashboard
2. Test each function via the Supabase Dashboard
3. Update your Vercel environment variables with the Supabase credentials
