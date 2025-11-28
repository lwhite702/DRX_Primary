# POS Weight-Based Sales, Shrinkage, Loyalty & Inventory Management
## Consolidated Migration Guide

**Migration Date**: 2025-02-28  
**Migration ID**: `20250228000001`  
**Status**: Production Ready  

---

## Overview

This consolidated migration combines all SQL schema changes and RPC functions for the complete POS feature set:

- ✅ Weight-based sales (0.01g precision)
- ✅ Shrinkage/waste tracking (5 types: personal_use, store_use, damaged, theft, sample)
- ✅ Random inventory checks (configurable frequency & tolerance)
- ✅ Bulk pricing tiers (1g, 3.5g, 7g, 10g+)
- ✅ Loyalty program (none → silver → gold → platinum)
- ✅ Complete audit trail (stock movements & tier changes)

---

## Files Included

### 1. **JSON Migration Format** (Dashboard Compatible)
**File**: `20250228000001_pos_weight_shrinkage_loyalty_consolidated.json`

**Format**: Structured JSON with 28 sequential steps
- Ideal for dashboard import/upload systems
- Each step has name, description, and SQL
- Can be processed one-at-a-time or batch

**Use This For**:
- Dashboard migration tools
- Custom CI/CD pipelines
- Programmatic schema management

### 2. **SQL Format** (Direct Execution)
**File**: `20250228000001_pos_weight_shrinkage_loyalty_consolidated.sql`

**Format**: Single SQL file with sections and comments
- Complete, ready-to-run SQL
- Can be copy-pasted directly into Supabase SQL Editor
- Idempotent (all CREATE commands use IF NOT EXISTS)

**Use This For**:
- Supabase SQL Editor
- Direct psql execution
- Quick testing and development

---

## How to Apply the Migration

### Option 1: Via Supabase Dashboard (Recommended)

1. **Open SQL Editor**:
   - Go to https://supabase.com/dashboard/project/[PROJECT_ID]/sql/new
   - Or navigate to your project → SQL Editor → New Query

2. **Paste SQL**:
   - Open `20250228000001_pos_weight_shrinkage_loyalty_consolidated.sql`
   - Copy entire content
   - Paste into Supabase SQL Editor

3. **Execute**:
   - Click "Run" or press Ctrl+Enter
   - Monitor for any errors (should see green checkmarks)
   - Wait for completion (typically 30-60 seconds)

4. **Verify**:
   - Go to **Database** → **Tables** to verify new tables exist
   - Go to **Database** → **Functions** to verify 9 RPC functions exist
   - Check tables: `drawer_events`, `shrinkage_events`, `inventory_checks`, `bulk_pricing_rules`, `stock_movements`, `loyalty_tier_changes`

### Option 2: Via Dashboard Migration Tool

If your dashboard has a migrations feature:

1. **Upload JSON**:
   - Select `20250228000001_pos_weight_shrinkage_loyalty_consolidated.json`
   - Dashboard should parse the 28 steps

2. **Review Steps**:
   - Dashboard shows each step with name and SQL preview
   - Verify table/function names are correct

3. **Apply**:
   - Click "Apply Migration" or "Run All Steps"
   - Dashboard executes steps sequentially
   - Monitor progress bar and error messages

### Option 3: Via Command Line (psql)

```bash
# Set connection variables
export PGPASSWORD="[DB_PASSWORD]"
export PGHOST="db.[PROJECT_ID].supabase.co"
export PGUSER="postgres"
export PGDATABASE="postgres"

# Run migration
psql -f db/migrations/20250228000001_pos_weight_shrinkage_loyalty_consolidated.sql

# Or pipe directly
psql < db/migrations/20250228000001_pos_weight_shrinkage_loyalty_consolidated.sql
```

---

## What Gets Created

### New Tables (6)

| Table | Purpose | Records |
|-------|---------|---------|
| `drawer_events` | No-sale register events | 1 per no-sale |
| `shrinkage_events` | Waste/damage/theft events | 1 per event |
| `inventory_checks` | Random spot-check audits | 1 per check |
| `bulk_pricing_rules` | Weight-tier pricing | Per business |
| `stock_movements` | All inventory changes | 1 per movement |
| `loyalty_tier_changes` | Loyalty tier history | 1 per promotion |

### Table Alterations (3)

**inventory**: 5 new columns
- `base_unit` (default: 'g')
- `convert_to_grams` (default: 1.0)
- `inventory_in_grams` (DECIMAL 16,4 for precision)
- `allow_fractional_weight` (default: TRUE)
- `price_per_gram` (DECIMAL 12,4)

**customers**: 5 new columns
- `purchase_count` (INTEGER, default: 0)
- `loyalty_tier` (VARCHAR, default: 'none')
- `discount_rate` (DECIMAL 5,4, default: 0)
- `next_tier_at` (INTEGER, default: 5)
- `loyalty_updated_at` (TIMESTAMP)

**business_settings**: 8 new columns + JSONB configs
- `random_inventory_check_frequency` (default: 15)
- `random_check_tolerance_percentage` (default: 5.0%)
- `enable_weight_based_sales` (default: TRUE)
- `require_supervisor_pin_for_shrinkage` (default: FALSE)
- `default_bulk_pricing_tiers` (JSONB with 4 tiers)
- `loyalty_tier_config` (JSONB with tier definitions)
- `transaction_count` (INTEGER, default: 0)

**sales_line_items**: 4 new columns
- `weight_sold_grams` (DECIMAL 12,4)
- `price_per_gram` (DECIMAL 12,4)
- `bulk_tier_applied` (VARCHAR)
- `loyalty_discount_applied` (DECIMAL 5,4)

**system_audit_log**: 3 new columns
- `action_detail` (TEXT for shrinkage type/reason)
- `business_id` (UUID reference)
- `ip_address` (VARCHAR)

### New RPC Functions (9)

| Function | Purpose | Parameters |
|----------|---------|------------|
| `record_drawer_event()` | Log no-sale events | business_id, event_type, note |
| `record_shrinkage_event()` | Log shrinkage | business_id, inventory_id, grams, type, note |
| `get_random_inventory_check_product()` | Select random product for audit | business_id |
| `record_inventory_check()` | Record spot-check results | business_id, inventory_id, measured_grams |
| `get_bulk_pricing()` | Calculate bulk tier pricing | business_id, inventory_id, weight_grams |
| `update_customer_loyalty_tier()` | Promote loyalty tier | business_id, customer_id |
| `apply_loyalty_discount()` | Calculate loyalty discount | business_id, customer_id, subtotal |
| `process_weight_based_sale_item()` | Process weight-based item | business_id, inventory_id, weight_grams |
| `increment_transaction_counter()` | Track for random checks | business_id |
| `process_weight_based_checkout()` | Complete weight-based sale | 12 parameters including line items JSONB |

### Row Level Security (RLS)

All new tables have RLS enabled with policies requiring `has_business_access()`:

```sql
CREATE POLICY [table_name]_business_access
  ON [table_name]
  FOR ALL
  USING (auth.uid() IS NOT NULL AND has_business_access(auth.uid(), business_id));
```

---

## Default Configurations

### Default Bulk Pricing Tiers
```json
[
  {"min_grams": 1, "max_grams": 3.4, "tier_name": "1g"},
  {"min_grams": 3.5, "max_grams": 6.9, "tier_name": "3.5g"},
  {"min_grams": 7, "max_grams": 9.9, "tier_name": "7g"},
  {"min_grams": 10, "max_grams": null, "tier_name": "10g+"}
]
```

### Default Loyalty Tiers
```json
{
  "none": {"min_purchases": 0, "discount": 0},
  "silver": {"min_purchases": 5, "discount": 0.05},
  "gold": {"min_purchases": 15, "discount": 0.10},
  "platinum": {"min_purchases": 30, "discount": 0.15}
}
```

### Inventory Check Settings
- **Check Frequency**: Every 15th transaction
- **Tolerance**: ±5% weight variance before flagging
- **Auto-Shrinkage**: Discrepancies >5% auto-logged as "inventory_variance"

---

## Post-Migration Verification Checklist

- [ ] Migration executed without errors
- [ ] 6 new tables exist in Database → Tables
- [ ] 9 new RPC functions exist in Database → Functions
- [ ] `inventory` table has 5 new columns
- [ ] `customers` table has 5 new columns
- [ ] `business_settings` table has 8 new columns + 2 JSONB configs
- [ ] `sales_line_items` table has 4 new columns
- [ ] All tables show "RLS enabled" = true
- [ ] Test `record_drawer_event()` with test business_id
- [ ] Test `get_random_inventory_check_product()` with test business_id

---

## Testing After Migration

### Quick Test Script

```sql
-- Test 1: Insert test drawer event
SELECT * FROM record_drawer_event(
  '[YOUR_BUSINESS_ID]'::uuid,
  'no_sale',
  'Test event'
);

-- Test 2: Get random inventory check product
SELECT * FROM get_random_inventory_check_product(
  '[YOUR_BUSINESS_ID]'::uuid
);

-- Test 3: Check new columns on inventory
SELECT id, base_unit, inventory_in_grams, price_per_gram 
FROM inventory 
WHERE business_id = '[YOUR_BUSINESS_ID]'::uuid 
LIMIT 1;

-- Test 4: Check loyalty tier configuration
SELECT loyalty_tier_config 
FROM business_settings 
WHERE business_id = '[YOUR_BUSINESS_ID]'::uuid;
```

---

## Rollback Instructions

If needed, you can rollback individual tables/functions:

```sql
-- Drop new tables (cascade deletes dependent data)
DROP TABLE IF EXISTS loyalty_tier_changes CASCADE;
DROP TABLE IF EXISTS stock_movements CASCADE;
DROP TABLE IF EXISTS bulk_pricing_rules CASCADE;
DROP TABLE IF EXISTS inventory_checks CASCADE;
DROP TABLE IF EXISTS shrinkage_events CASCADE;
DROP TABLE IF EXISTS drawer_events CASCADE;

-- Drop new functions
DROP FUNCTION IF EXISTS increment_transaction_counter(UUID);
DROP FUNCTION IF EXISTS process_weight_based_checkout(...);
DROP FUNCTION IF EXISTS process_weight_based_sale_item(...);
DROP FUNCTION IF EXISTS apply_loyalty_discount(...);
DROP FUNCTION IF EXISTS update_customer_loyalty_tier(...);
DROP FUNCTION IF EXISTS get_bulk_pricing(...);
DROP FUNCTION IF EXISTS record_inventory_check(...);
DROP FUNCTION IF EXISTS get_random_inventory_check_product(...);
DROP FUNCTION IF EXISTS record_shrinkage_event(...);
DROP FUNCTION IF EXISTS record_drawer_event(...);

-- Remove new columns (existing data preserved)
ALTER TABLE business_settings DROP COLUMN IF EXISTS random_inventory_check_frequency;
ALTER TABLE business_settings DROP COLUMN IF EXISTS random_check_tolerance_percentage;
ALTER TABLE business_settings DROP COLUMN IF EXISTS enable_weight_based_sales;
ALTER TABLE business_settings DROP COLUMN IF EXISTS require_supervisor_pin_for_shrinkage;
ALTER TABLE business_settings DROP COLUMN IF EXISTS default_bulk_pricing_tiers;
ALTER TABLE business_settings DROP COLUMN IF EXISTS loyalty_tier_config;
ALTER TABLE business_settings DROP COLUMN IF EXISTS transaction_count;

-- ... (continue for other tables)
```

---

## Integration With Frontend

The TypeScript service `/lib/utils/pos-weight-engine.ts` works directly with these RPC functions:

```typescript
import { POSWeightEngine } from '@/lib/utils/pos-weight-engine';

const engine = new POSWeightEngine(supabaseClient, businessId);

// Record no-sale
const { success } = await engine.recordNoSale('no_sale', 'Test note');

// Record shrinkage
const { success, shrinkage_id } = await engine.recordShrinkage(
  inventoryId, 
  5.5, // grams
  'personal_use',
  'Staff personal use'
);

// Get bulk pricing
const { price_per_gram, tier_name, total_price } = await engine.getBulkPricing(
  inventoryId,
  7.5 // grams
);

// Apply loyalty discount
const { discount_amount, final_price } = await engine.applyLoyaltyDiscount(
  customerId,
  100.00 // subtotal
);
```

---

## Performance Notes

- **Indexes**: All new tables have appropriate indexes on business_id, created_at
- **Query Speed**: RLS policies add ~2-5ms per query (expected)
- **Stock Movements**: Large volume over time - archive old records after 6-12 months
- **DECIMAL Precision**: Weight stored as DECIMAL(12,4) = 0.01g minimum resolution

---

## Support & Troubleshooting

### Error: "Table 'drawer_events' already exists"
- Migration is idempotent - re-running is safe
- If you see this error, the migration likely already succeeded

### Error: "Function has_business_access does not exist"
- Ensure base migrations (01-11) are applied first
- Run base migrations before this consolidated migration

### Error: "Column 'inventory_in_grams' already exists"
- Table already has the column from previous run
- Safe to ignore - migrate is idempotent

### Performance Issues After Migration
- Run `VACUUM ANALYZE` on all new tables to update statistics
- Check indexes are being used: `EXPLAIN` queries to verify

---

## Files Reference

| File | Format | Use Case |
|------|--------|----------|
| `20250228000001_pos_weight_shrinkage_loyalty_consolidated.json` | JSON (28 steps) | Dashboard tools, API-based migration |
| `20250228000001_pos_weight_shrinkage_loyalty_consolidated.sql` | SQL (idempotent) | Direct SQL editor, CLI, scripting |
| `MIGRATION_GUIDE.md` | Documentation | This file - reference |

---

## Questions or Issues?

1. Check tables exist: Database → Tables → Search "drawer_events"
2. Check functions exist: Database → Functions → Search "record_drawer_event"
3. Review RLS policies: Database → Tables → [table] → Policies
4. Check audit log: `SELECT * FROM system_audit_log ORDER BY created_at DESC LIMIT 10;`

---

**Migration Version**: 1.0.0  
**Last Updated**: 2025-02-28  
**Status**: ✅ Production Ready
