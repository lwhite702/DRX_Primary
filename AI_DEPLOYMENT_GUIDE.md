# AI Intelligence System - Deployment Guide

## Pre-Deployment Checklist

### ✅ Database Migration
- [ ] Run migration: `20250128000001_ai_pricing_inventory_intel.sql`
  - Creates 5 new tables
  - Adds RLS policies
  - Adds performance indexes

**Execute in Supabase Dashboard:**
```sql
-- Copy full contents of:
-- /db/migrations/20250128000001_ai_pricing_inventory_intel.sql
-- Paste into SQL Editor and run
```

### ✅ Environment Variables
Verify these are set in your deployment:
```
NEXT_PUBLIC_SUPABASE_URL=<your-supabase-url>
NEXT_PUBLIC_SUPABASE_ANON_KEY=<your-anon-key>
```

### ✅ Edge Functions (Optional but Recommended)
Deploy the edge function for batch analysis:
```bash
# From project root
supabase functions deploy ai_pricing_inventory
```

## Step-by-Step Deployment

### 1. Run Database Migration
1. Log into Supabase Dashboard
2. Go to SQL Editor
3. Open file: `/db/migrations/20250128000001_ai_pricing_inventory_intel.sql`
4. Copy entire contents
5. Paste into SQL Editor in Supabase
6. Click "Execute"

**Expected Output:**
- 5 tables created
- RLS policies applied
- 7 indexes created
- ~50 ms execution time

### 2. Deploy Application Code
```bash
# Standard Next.js deployment
npm run build
npm start

# Or via Vercel
vercel deploy --prod
```

### 3. Verify Database Setup
```sql
-- Check tables exist
SELECT table_name FROM information_schema.tables 
WHERE table_schema = 'public' 
AND table_name LIKE 'ai_%' OR table_name LIKE 'sales_velocity%';

-- Should return 5 rows:
-- - ai_pricing_recommendations
-- - inventory_forecasts
-- - ai_decision_log
-- - inventory_alerts
-- - sales_velocity_cache

-- Check RLS is enabled
SELECT tablename FROM pg_tables 
WHERE schemaname = 'public' 
AND tablename IN ('ai_pricing_recommendations', 'inventory_forecasts', 
                   'ai_decision_log', 'inventory_alerts', 'sales_velocity_cache');
```

### 4. Test AI Analysis API
```bash
# Test single product analysis
curl -X POST http://localhost:3000/api/ai/product-intelligence \
  -H "Content-Type: application/json" \
  -d '{
    "business_id": "<valid-uuid>",
    "inventory_id": "<valid-uuid>",
    "product_name": "Test Product",
    "sku": "TEST-001",
    "cost": 10,
    "current_price": 25,
    "current_stock": 150,
    "reorder_level": 20
  }'

# Expected response:
# {
#   "success": true,
#   "data": {
#     "pricing": { ... },
#     "forecast": { ... },
#     "alerts": [],
#     "insights": "..."
#   }
# }
```

### 5. Test Batch Analysis API
```bash
curl -X POST http://localhost:3000/api/ai/analyze \
  -H "Content-Type: application/json" \
  -d '{
    "business_id": "<valid-uuid>",
    "analysis_type": "all"
  }'

# Expected response:
# {
#   "success": true,
#   "summary": {
#     "total_analyzed": 42,
#     "pricing_generated": 38,
#     "forecasts_generated": 42,
#     ...
#   }
# }
```

### 6. Enable UI Components
No additional setup needed - components are already integrated:
- `/ai-intelligence` page ready
- Dashboard widget available
- API integration complete

## Post-Deployment Validation

### ✅ Verify Tables Have RLS
```sql
SELECT tablename FROM pg_tables 
WHERE schemaname = 'public' 
AND tablename LIKE 'ai_%'
LIMIT 1;

-- Then check RLS status
SELECT * FROM pg_tables 
WHERE tablename = 'ai_pricing_recommendations';
```

### ✅ Test Data Isolation
```sql
-- Verify per-business isolation works
-- Create test records as different users/businesses
-- Verify cross-business leakage doesn't occur
SELECT COUNT(*) FROM ai_pricing_recommendations 
WHERE business_id = '<business-1>';

SELECT COUNT(*) FROM ai_pricing_recommendations 
WHERE business_id = '<business-2>';
```

### ✅ Performance Baseline
Monitor these queries:
```sql
-- Should complete < 100ms with proper indexes
SELECT * FROM inventory_forecasts 
WHERE business_id = '<uuid>' 
AND restock_urgency = 'critical';

SELECT * FROM ai_pricing_recommendations 
WHERE business_id = '<uuid>' 
AND status = 'pending';
```

## Monitoring & Alerts

### Key Metrics to Monitor

1. **API Response Times**
   - `/api/ai/analyze` - Target: <5s for 100 products
   - `/api/ai/product-intelligence` - Target: <500ms
   - `/api/ai/alerts` - Target: <200ms

2. **Database Performance**
   - Monitor `ai_decision_log` table size
   - Watch `inventory_alerts` for accumulation
   - Check velocity cache hits/misses

3. **Error Rates**
   - Monitor API error responses
   - Track Supabase RLS errors
   - Watch for null/NaN in calculations

### Set Up Alerts
```sql
-- Monitor daily growth in alerts
SELECT 
  DATE(created_at) as date,
  COUNT(*) as alert_count,
  COUNT(CASE WHEN severity = 'critical' THEN 1 END) as critical_count
FROM inventory_alerts
WHERE business_id = '<uuid>'
GROUP BY DATE(created_at)
ORDER BY date DESC;
```

## Troubleshooting

### Issue: "Supabase client not available"
**Solution:** Verify environment variables are set in deployment
```bash
# Check vars
echo $NEXT_PUBLIC_SUPABASE_URL
echo $NEXT_PUBLIC_SUPABASE_ANON_KEY
```

### Issue: RLS policy violation
**Solution:** Ensure user has proper business role
```sql
-- Check user roles
SELECT * FROM user_roles 
WHERE user_id = '<user-uuid>';

-- Verify business access
SELECT has_business_access('<user-uuid>', '<business-uuid>');
```

### Issue: Recommendations not generating
**Solution:** Check for sales data
```sql
-- Verify sales exist
SELECT COUNT(*) FROM sales_line_items 
WHERE inventory_id = '<uuid>';

-- If 0, product has no sales history
-- Create test sales to generate recommendations
```

### Issue: Performance degradation
**Solution:** Check indexes and query performance
```sql
-- Rebuild indexes
REINDEX INDEX idx_inventory_forecasts_urgency;
REINDEX INDEX idx_inventory_alerts_severity;
REINDEX INDEX idx_pricing_recommendations_status;
```

## Backup & Recovery

### Backup Strategy
```sql
-- Export critical AI data before major changes
\copy ai_decision_log TO 'backup_decisions.csv' WITH CSV;
\copy ai_pricing_recommendations TO 'backup_pricing.csv' WITH CSV;
\copy inventory_forecasts TO 'backup_forecasts.csv' WITH CSV;
```

### Recovery from Corruption
```sql
-- Truncate and rebuild if needed
TRUNCATE ai_pricing_recommendations CASCADE;
TRUNCATE inventory_forecasts CASCADE;
TRUNCATE ai_decision_log CASCADE;

-- Keep alerts for audit purposes
-- Don't truncate unless absolutely necessary
```

## Scaling Considerations

### For 10K+ Products
- Implement analysis scheduling (off-peak)
- Use batch processing in background jobs
- Consider data retention policies for old alerts
- Archive old decision logs

### Database Optimization
```sql
-- Add partitioning for large tables (if > 10M rows)
CREATE TABLE inventory_alerts_2025_01 
PARTITION OF inventory_alerts
FOR VALUES FROM ('2025-01-01') TO ('2025-02-01');

-- Add compression for historical data
ALTER TABLE ai_decision_log SET (
  fillfactor = 70
);
```

## Rollback Plan

If issues occur after deployment:

1. **Disable AI Features** (keep data)
   - Hide `/ai-intelligence` page
   - Stop calling AI endpoints
   - Keep database tables intact

2. **Rollback Application**
   ```bash
   vercel rollback  # or git revert
   npm run build
   npm start
   ```

3. **Restore from Backup** (if critical)
   - Restore Supabase database from backups
   - Re-run migrations
   - Verify data integrity

## Support & Monitoring

### Key Files for Debugging
- Database Schema: `/db/migrations/20250128000001_ai_pricing_inventory_intel.sql`
- Engines: `/lib/utils/pricing-engine.ts`, `/lib/utils/inventory-engine.ts`
- API Handlers: `/app/api/ai/`
- UI Components: `/components/ai/`

### Logs to Monitor
- Supabase Function Logs (edge functions)
- Next.js Application Logs
- Database Query Performance
- API Response Times

### Documentation References
- System Architecture: `/AI_INTELLIGENCE_IMPLEMENTATION.md`
- This Deployment Guide: `/AI_DEPLOYMENT_GUIDE.md`

---

## Deployment Checklist Summary

```
Database:
  ☐ Run migration 20250128000001
  ☐ Verify 5 tables created
  ☐ Confirm RLS policies applied
  ☐ Test data isolation

Application:
  ☐ Deploy code
  ☐ Verify environment variables
  ☐ Test API endpoints
  ☐ Verify UI pages load

Validation:
  ☐ Test single product analysis
  ☐ Test batch analysis
  ☐ Verify recommendations generate
  ☐ Check alert creation
  ☐ Test audit logging

Monitoring:
  ☐ Set up performance monitoring
  ☐ Create alert rules
  ☐ Configure logging
  ☐ Document baseline metrics

Post-Launch:
  ☐ Monitor for 48 hours
  ☐ Check error rates
  ☐ Verify data growth is normal
  ☐ Test with real business data
```

**Deployment Status**: ✅ Ready for Production
**Last Updated**: January 28, 2025
**Estimated Deploy Time**: 15-30 minutes
