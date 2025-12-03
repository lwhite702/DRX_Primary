# POS Weight-Based Sales, Shrinkage & Loyalty - Quick Reference

## 🚀 Apply Migration in 3 Steps

### Method 1: Supabase Dashboard (Easiest)

```
1. Open: https://supabase.com/dashboard/project/[PROJECT_ID]/sql/new
2. Paste content from: db/migrations/20250228000001_pos_weight_shrinkage_loyalty_consolidated.sql
3. Click "Run" → Wait 30-60 seconds → Done ✓
```

### Method 2: Dashboard JSON Import

```
1. Go to dashboard migration tool
2. Upload: db/migrations/20250228000001_pos_weight_shrinkage_loyalty_consolidated.json
3. Review 28 steps → Click "Apply" → Done ✓
```

### Method 3: CLI

```bash
psql -f db/migrations/20250228000001_pos_weight_shrinkage_loyalty_consolidated.sql
```

---

## 📦 Files Provided

| File | Size | Format | Use Case |
|------|------|--------|----------|
| `20250228000001_pos_weight_shrinkage_loyalty_consolidated.sql` | 35 KB | SQL | Dashboard, CLI, direct execution |
| `20250228000001_pos_weight_shrinkage_loyalty_consolidated.json` | 37 KB | JSON | Dashboard tools, API integration |
| `MIGRATION_GUIDE.md` | 12 KB | Markdown | Step-by-step deployment guide |
| `CONSOLIDATED_MIGRATION_SUMMARY.md` | 15 KB | Markdown | Executive overview |

---

## ✅ What Gets Created

### 6 New Tables
- `drawer_events` (no-sale events)
- `shrinkage_events` (waste/damage/theft)
- `inventory_checks` (random spot-checks)
- `bulk_pricing_rules` (weight tier pricing)
- `stock_movements` (complete inventory history)
- `loyalty_tier_changes` (customer promotions)

### 5 Table Updates
- `inventory` + 5 columns (weight tracking)
- `customers` + 5 columns (loyalty)
- `business_settings` + 8 columns (config)
- `sales_line_items` + 4 columns (weight/loyalty)
- `system_audit_log` + 3 columns (logging)

### 9 RPC Functions
- `record_drawer_event()` - No-sale events
- `record_shrinkage_event()` - Shrinkage tracking
- `get_random_inventory_check_product()` - Random audit
- `record_inventory_check()` - Audit results
- `get_bulk_pricing()` - Bulk tier pricing
- `update_customer_loyalty_tier()` - Loyalty promotion
- `apply_loyalty_discount()` - Calculate discount
- `process_weight_based_sale_item()` - Weight sale
- `process_weight_based_checkout()` - Complete sale
- `increment_transaction_counter()` - Random check tracking

---

## 🔍 Verify After Migration

### Command 1: Check Tables
```sql
SELECT table_name FROM information_schema.tables 
WHERE table_schema = 'public' 
AND table_name IN ('drawer_events', 'shrinkage_events', 'inventory_checks', 'bulk_pricing_rules', 'stock_movements', 'loyalty_tier_changes')
ORDER BY table_name;
```

### Command 2: Check Functions
```sql
SELECT routine_name FROM information_schema.routines 
WHERE routine_schema = 'public' 
AND routine_name LIKE '%drawer_event%' OR routine_name LIKE '%shrinkage%' OR routine_name LIKE '%inventory_check%'
ORDER BY routine_name;
```

### Command 3: Check New Columns
```sql
-- Check inventory columns
SELECT column_name FROM information_schema.columns 
WHERE table_name = 'inventory' 
AND column_name IN ('base_unit', 'inventory_in_grams', 'price_per_gram')
ORDER BY column_name;

-- Check customers columns
SELECT column_name FROM information_schema.columns 
WHERE table_name = 'customers' 
AND column_name IN ('purchase_count', 'loyalty_tier', 'discount_rate')
ORDER BY column_name;
```

### Visual Verification
1. Open Supabase Dashboard
2. Go to **Database** → **Tables**
3. Search for: `drawer_events`, `shrinkage_events`, etc.
4. Go to **Database** → **Functions**
5. Search for: `record_drawer_event`, `get_bulk_pricing`, etc.

---

## 🧪 Quick Test

Copy & paste into SQL Editor to verify functions work:

```sql
-- Test: Record a no-sale event
SELECT * FROM record_drawer_event(
  '[YOUR_BUSINESS_ID]'::uuid,
  'no_sale',
  'Test event'
);

-- Test: Get random inventory product (adjust business_id)
SELECT * FROM get_random_inventory_check_product(
  '[YOUR_BUSINESS_ID]'::uuid
);

-- Test: Check new columns exist
SELECT column_name, data_type 
FROM information_schema.columns
WHERE table_name = 'inventory'
AND column_name IN ('base_unit', 'inventory_in_grams', 'price_per_gram')
ORDER BY ordinal_position;
```

---

## 🎯 Default Configuration

### Bulk Pricing Tiers
```json
[
  {"tier": "1g", "min": 1, "max": 3.4},
  {"tier": "3.5g", "min": 3.5, "max": 6.9},
  {"tier": "7g", "min": 7, "max": 9.9},
  {"tier": "10g+", "min": 10, "max": null}
]
```

### Loyalty Tiers
```
none:      0 purchases  (0% discount)
silver:    5 purchases  (5% discount)
gold:     15 purchases (10% discount)
platinum: 30 purchases (15% discount)
```

### Settings
```
Check Frequency:        Every 15 transactions
Check Tolerance:        ±5% weight variance
Weight Precision:       0.01 grams (DECIMAL 12,4)
Currency Precision:     $0.01 (DECIMAL 12,2)
```

---

## 📋 Rollback (If Needed)

**WARNING**: Rollback deletes all new tables with their data!

```sql
-- Drop tables (cascade = delete all related data)
DROP TABLE IF EXISTS loyalty_tier_changes CASCADE;
DROP TABLE IF EXISTS stock_movements CASCADE;
DROP TABLE IF EXISTS bulk_pricing_rules CASCADE;
DROP TABLE IF EXISTS inventory_checks CASCADE;
DROP TABLE IF EXISTS shrinkage_events CASCADE;
DROP TABLE IF EXISTS drawer_events CASCADE;

-- Drop all functions
DROP FUNCTION IF EXISTS increment_transaction_counter(UUID);
DROP FUNCTION IF EXISTS process_weight_based_checkout(UUID,UUID,VARCHAR,VARCHAR,JSONB,DECIMAL,JSONB,UUID,TEXT,DECIMAL,DECIMAL,BOOLEAN);
DROP FUNCTION IF EXISTS process_weight_based_sale_item(UUID,UUID,DECIMAL);
DROP FUNCTION IF EXISTS apply_loyalty_discount(UUID,UUID,DECIMAL);
DROP FUNCTION IF EXISTS update_customer_loyalty_tier(UUID,UUID);
DROP FUNCTION IF EXISTS get_bulk_pricing(UUID,UUID,DECIMAL);
DROP FUNCTION IF EXISTS record_inventory_check(UUID,UUID,DECIMAL);
DROP FUNCTION IF EXISTS get_random_inventory_check_product(UUID);
DROP FUNCTION IF EXISTS record_shrinkage_event(UUID,UUID,DECIMAL,VARCHAR,TEXT);
DROP FUNCTION IF EXISTS record_drawer_event(UUID,VARCHAR,TEXT);
```

---

## 🐛 Troubleshooting

| Problem | Solution |
|---------|----------|
| "Table already exists" | ✅ Migration is idempotent - safe to ignore or re-run |
| "Function has_business_access not found" | ❌ Run base migrations (01-11) first |
| "Column already exists" | ✅ ALTER TABLE IF NOT EXISTS is safe - ignore |
| "Permission denied" | ❌ Verify user has admin/owner role in Supabase |
| Slow execution | ⏳ Normal for first run - 30-60 seconds |
| RLS policy error | ✅ Expected - policies enforce business isolation |

---

## 📚 More Information

- **Full Guide**: See `MIGRATION_GUIDE.md`
- **Executive Summary**: See `CONSOLIDATED_MIGRATION_SUMMARY.md`
- **Implementation**: See `/lib/utils/pos-weight-engine.ts` for TypeScript usage

---

## ⏱️ Checklist Before Going Live

- [ ] Migration applied successfully (no errors)
- [ ] All 6 tables exist (Database → Tables)
- [ ] All 9 functions exist (Database → Functions)
- [ ] Test `record_drawer_event()` with real business_id
- [ ] Test `get_bulk_pricing()` with real inventory_id
- [ ] Verify RLS policies in place
- [ ] Frontend deployed with TypeScript service
- [ ] React components integrated
- [ ] Business settings configured (tiers, frequency, tolerance)
- [ ] Test end-to-end weight-based checkout
- [ ] Monitor system_audit_log for first few transactions

---

## 🎉 Success Criteria

You'll know migration worked if:

1. ✅ No SQL errors during execution
2. ✅ All 6 new tables appear in Database → Tables
3. ✅ All 9 functions appear in Database → Functions
4. ✅ New columns visible on inventory, customers, etc.
5. ✅ Can call `record_drawer_event()` successfully
6. ✅ Can call `get_bulk_pricing()` successfully
7. ✅ Weight-based sales work end-to-end
8. ✅ Loyalty discounts apply at checkout
9. ✅ Random inventory checks trigger correctly

---

## 📞 Support

- **Docs**: MIGRATION_GUIDE.md in /db/migrations/
- **Status**: ✅ Production Ready
- **Version**: 1.0.0
- **Updated**: 2025-02-28
