# AI Credit Limit Engine - Setup & Deployment Guide

## Quick Start

### 1. Database Migration

Run the migration to add AI credit engine tables and fields:

```bash
# If using Supabase migrations
supabase migration new add_ai_credit_engine
# Or apply directly:
psql $DATABASE_URL < db/migrations/20250128000001_add_ai_credit_engine.sql
```

### 2. Environment Configuration

Add to your `.env.local`:

```bash
# OpenAI API (required for AI recommendations)
OPENAI_API_KEY=sk-your-openai-api-key-here

# Cron job authentication (for scheduled refresh)
CRON_SECRET=your-secure-random-secret-here
```

### 3. Business Settings

Configure in each business's settings:

```sql
INSERT INTO business_settings (business_id, ai_credit_engine_enabled, global_max_credit_per_customer, global_max_credit_ratio_of_inventory, default_credit_limit_for_new_customer, ai_credit_auto_refresh_days)
VALUES (
  'your-business-id',
  true,
  10000.00,
  0.5,
  1000.00,
  7
);
```

Or via the admin UI (when implemented).

### 4. Verify Database View

Test the credit analytics view:

```sql
SELECT * FROM v_credit_analytics WHERE customer_id = 'test-customer-id';
```

Should return all computed metrics without errors.

## Deployment Steps

### Step 1: Deploy Database Migration

If using Supabase with migrations:

```bash
supabase db push
```

Or apply manually to your PostgreSQL instance.

### Step 2: Deploy Application Code

```bash
# Commit changes
git add .
git commit -m "feat: implement AI credit limit engine"

# Deploy to your platform (Vercel, Netlify, etc.)
git push origin feature/ai-credit-limit-engine-drx
```

### Step 3: Set Up Scheduled Job

Configure a cron job to refresh credit limits nightly:

#### Option A: Vercel Cron

Create `vercel.json`:

```json
{
  "crons": [
    {
      "path": "/api/credit/refresh-limits",
      "schedule": "0 2 * * *"
    }
  ]
}
```

Then configure the Authorization header in Vercel:
- Go to Project Settings → Environment Variables
- Add header rule for `/api/credit/refresh-limits` with Bearer token

#### Option B: External Cron Service (AWS Lambda, Google Cloud Scheduler, etc.)

Set up a POST request to `https://yourdomain.com/api/credit/refresh-limits`:

```bash
curl -X POST https://yourdomain.com/api/credit/refresh-limits \
  -H "Authorization: Bearer $CRON_SECRET" \
  -H "Content-Type: application/json"
```

#### Option C: Manual Trigger

Test the endpoint manually:

```bash
curl -X POST http://localhost:3000/api/credit/refresh-limits \
  -H "Authorization: Bearer test-secret" \
  -H "Content-Type: application/json"
```

### Step 4: Verify Integration

1. **Check Feature Engineering:**
   ```bash
   # In browser console on customer detail page:
   fetch('/api/credit/refresh-customer', {
     method: 'POST',
     headers: {'Content-Type': 'application/json'},
     body: JSON.stringify({
       customer_id: 'test-id',
       business_id: 'your-business-id'
     })
   }).then(r => r.json()).then(console.log)
   ```

2. **Check POS Integration:**
   - Create a test cart with credit payment method
   - Verify `validateCreditLimit()` returns proper results
   - Test both hard blocks and soft warnings

3. **Check Audit Trail:**
   ```sql
   SELECT * FROM ai_credit_decisions WHERE business_id = 'your-business-id' LIMIT 5;
   ```

## Configuration Options

### Business Settings Defaults

These can be overridden per business:

| Setting | Default | Description |
|---------|---------|-------------|
| ai_credit_engine_enabled | TRUE | Enable/disable AI recommendations |
| global_max_credit_per_customer | $10,000 | Hard cap per customer |
| global_max_credit_ratio_of_inventory | 0.5 | Max credit as % of inventory |
| default_credit_limit_for_new_customer | $1,000 | Starting limit for new customers |
| ai_credit_auto_refresh_days | 7 | Days between auto-refreshes |

### Tuning Parameters (In Code)

If you need to adjust AI behavior, edit `lib/credit/aiEngine/limitEngine.ts`:

```typescript
// Inventory cap calculation
const inventory_cap = total_inventory_value * config.global_max_credit_ratio_of_inventory;

// Risk score thresholds
const getRiskLabel = (score: number): string => {
  if (score >= 75) return "High Risk";      // Adjust these thresholds
  if (score >= 50) return "Medium Risk";    // as needed for your business
  return "Low Risk";
};

// Multipliers for rule-based fallback
recommended_limit = sales_based_limit * 1.2;  // Perfect payers get 20% boost
```

## Monitoring

### Key Metrics to Track

1. **AI Recommendation Quality:**
   ```sql
   SELECT 
     COUNT(*) as total_refreshes,
     COUNT(CASE WHEN used_ai THEN 1 END) as ai_successful,
     COUNT(CASE WHEN fallback_reason IS NOT NULL THEN 1 END) as fallbacks
   FROM ai_insights;
   ```

2. **Credit Exposure:**
   ```sql
   SELECT
     SUM(credit_limit) as total_limits,
     SUM(current_balance) as total_balance,
     SUM(current_balance)::FLOAT / SUM(credit_limit) as utilization_ratio
   FROM credit_limits
   WHERE business_id = 'your-business-id';
   ```

3. **Risk Distribution:**
   ```sql
   SELECT
     CASE 
       WHEN credit_risk_score < 25 THEN 'Low'
       WHEN credit_risk_score < 50 THEN 'Medium'
       WHEN credit_risk_score < 75 THEN 'High'
       ELSE 'Critical'
     END as risk_level,
     COUNT(*) as customer_count
   FROM customers
   WHERE business_id = 'your-business-id'
   GROUP BY risk_level
   ORDER BY risk_level;
   ```

### Alert Rules

Set up alerts for:

- **High Utilization**: When total_balance / total_limits > 0.8
- **At-Risk Customers**: When credit_risk_score > 70
- **Failed Refreshes**: When scheduler logs errors
- **Large Overrides**: When manual override > 50% from AI recommendation

## Troubleshooting

### Problem: AI Recommendations Always Using Fallback

**Solution:**
1. Verify `OPENAI_API_KEY` is set: `echo $OPENAI_API_KEY`
2. Check OpenAI account has credits and API is accessible
3. Review application logs for API errors
4. Test API directly:
   ```bash
   curl https://api.openai.com/v1/chat/completions \
     -H "Authorization: Bearer $OPENAI_API_KEY" \
     -H "Content-Type: application/json" \
     -d '{
       "model": "gpt-3.5-turbo",
       "messages": [{"role": "user", "content": "test"}]
     }'
   ```

### Problem: Customer Detail Page Shows No Credit Panel

**Solution:**
1. Check customer has `credit_limit` set (might be NULL)
2. Verify analytics view: `SELECT * FROM v_credit_analytics WHERE customer_id = 'test'`
3. Check browser console for fetch errors
4. Ensure `/api/credit/refresh-customer` endpoint is accessible

### Problem: POS Blocking Valid Transactions

**Solution:**
1. Check customer's current_balance in credit_limits table
2. Verify credit_limit vs credit_limit_ai_recommended
3. Review error message: hard block vs soft warning
4. Check `validateCreditLimit()` logic in pos-engine.ts

### Problem: Scheduler Not Running

**Solution:**
1. Verify cron configuration matches your platform
2. Check that `/api/credit/refresh-limits` is publicly accessible
3. Verify `CRON_SECRET` header is being sent correctly
4. Check application logs for 401/403 errors
5. Test endpoint manually:
   ```bash
   curl -X POST http://localhost:3000/api/credit/refresh-limits \
     -H "Authorization: Bearer $CRON_SECRET"
   ```

## Security Considerations

1. **API Key Protection:**
   - Never commit `OPENAI_API_KEY` to version control
   - Use environment variables or secret management
   - Rotate keys regularly

2. **Cron Secret:**
   - Use strong random secret (32+ characters)
   - Different from other API keys
   - Rotate periodically

3. **Rate Limiting:**
   - Consider adding rate limits to `/api/credit/*` endpoints
   - OpenAI API has rate limits - monitor for throttling

4. **Audit Trail:**
   - All decisions logged in `ai_credit_decisions`
   - User ID tracked for all manual changes
   - Review logs regularly for suspicious patterns

5. **Data Privacy:**
   - Feature engineering doesn't store PII
   - AI prompts contain only aggregated metrics
   - Audit logs retained per compliance requirements

## Performance Optimization

### Database Indexes

Already created in migration:

```sql
CREATE INDEX idx_ai_credit_decisions_customer ON ai_credit_decisions(customer_id, business_id);
CREATE INDEX idx_customers_credit_limit ON customers(business_id, credit_limit);
```

### Query Optimization

The `v_credit_analytics` view is designed for efficiency:
- Uses LEFT JOIN to handle customers with no history
- Aggregates with COALESCE for NULL handling
- Materializable if high volume

To materialize the view for your database:

```sql
CREATE MATERIALIZED VIEW v_credit_analytics_materialized AS
SELECT * FROM v_credit_analytics;

CREATE INDEX ON v_credit_analytics_materialized(customer_id);
CREATE INDEX ON v_credit_analytics_materialized(business_id);

REFRESH MATERIALIZED VIEW v_credit_analytics_materialized;
```

### API Response Caching

Consider caching recommendation responses:

```typescript
// In creditDecisionService.ts, add cache middleware:
const cache = new Map();
const CACHE_TTL = 3600000; // 1 hour

async function getCachedRecommendation(customer_id) {
  const cached = cache.get(customer_id);
  if (cached && Date.now() - cached.timestamp < CACHE_TTL) {
    return cached.data;
  }
  // Fetch and cache...
}
```

## Rollback Procedure

If you need to disable the AI engine:

### Option 1: Disable at Feature Level

```typescript
// In limitEngine.ts
const config = await getBusinessConfig(business_id);
if (!config.ai_credit_engine_enabled) {
  // Use fallback directly
  return applyRuleBasedFallback(...);
}
```

### Option 2: Revert Database

```bash
# If you haven't pushed yet
git revert HEAD~1

# If already pushed
git revert <commit-hash>
git push
```

### Option 3: Keep Data, Disable Processing

```sql
-- Disable auto-refresh
UPDATE business_settings 
SET ai_credit_engine_enabled = FALSE 
WHERE business_id = 'your-business-id';

-- Keep existing recommendations for manual application
-- Current limits remain unchanged
```

## Next Steps

1. **Test in Development:**
   - Create test customers with various profiles
   - Verify AI recommendations align with business logic
   - Test POS integration

2. **Pilot with Subset:**
   - Enable for one test business
   - Monitor for 1-2 weeks
   - Gather staff feedback

3. **Full Rollout:**
   - Enable for all businesses
   - Monitor credit exposure metrics
   - Collect data for model improvements

4. **Future Enhancements:**
   - Train custom ML model on DRX historical data
   - Add category-specific limits
   - Integrate external credit scoring (if available)
   - Implement predictive churn prevention

---

**Status:** Ready for Production Deployment

For questions or issues, refer to `<!-- DELETED: AI_CREDIT_ENGINE_<!-- DELETED: IMPLEMENTATION.md --> -->` for detailed technical documentation.
