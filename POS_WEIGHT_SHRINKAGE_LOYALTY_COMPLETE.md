# POS Weight-Based Sales, Shrinkage Tracking, and Loyalty Program
## Complete Implementation Guide

**Status**: ✅ PRODUCTION READY  
**Version**: 1.0  
**Last Updated**: February 2025

---

## OVERVIEW

This document describes the complete implementation of weight-based inventory management, shrinkage tracking, random inventory audits, and a loyalty program for the DRX POS system.

### Features Implemented

1. **No-Sale / Drawer Events** - Record drawer opens without sales
2. **Shrinkage Tracking** - Log personal use, comps, damaged items, theft
3. **Random Inventory Checks** - Automatic audit prompts every N transactions
4. **Weight-Based Selling** - Sell products in grams with 0.01g precision
5. **Bulk Pricing** - Automatic tiered pricing based on weight
6. **Loyalty Program** - Automatic tier progression with discounts
7. **Complete Audit Trail** - All actions logged and uneditable

---

## DATABASE SCHEMA

### New Tables

#### `drawer_events`
Logs every no-sale drawer open event for cash reconciliation.

```sql
- id (UUID, PK)
- business_id (UUID, FK)
- location_id (UUID, optional)
- user_id (UUID, FK)
- event_type (VARCHAR) - "no_sale", "drawer_open"
- note (TEXT, optional)
- created_at (TIMESTAMP)
```

#### `shrinkage_events`
Records inventory removal without sale (personal use, damage, etc).

```sql
- id (UUID, PK)
- business_id (UUID, FK)
- inventory_id (UUID, FK)
- user_id (UUID, FK)
- quantity_grams (DECIMAL 12,4)
- cost_value (DECIMAL 12,2) - auto-calculated from unit cost
- shrinkage_type (VARCHAR) - "personal_use", "store_use", "damaged", "theft", "sample", "other"
- note (TEXT, optional)
- created_at (TIMESTAMP)
```

#### `inventory_checks`
Random inventory audit results.

```sql
- id (UUID, PK)
- business_id (UUID, FK)
- inventory_id (UUID, FK)
- user_id (UUID, FK)
- expected_weight_grams (DECIMAL 12,4)
- measured_weight_grams (DECIMAL 12,4)
- delta_grams (DECIMAL 12,4)
- delta_percentage (DECIMAL 5,2)
- discrepancy_flagged (BOOLEAN)
- created_at (TIMESTAMP)
```

#### `bulk_pricing_rules`
Define volume-based pricing tiers.

```sql
- id (UUID, PK)
- business_id (UUID, FK)
- inventory_id (UUID, FK, optional) - NULL means global rule
- min_weight_grams (DECIMAL 12,4)
- max_weight_grams (DECIMAL 12,4, optional)
- price_per_gram (DECIMAL 12,4)
- tier_name (VARCHAR) - "1g", "3.5g", "7g", "10g+", etc.
- is_active (BOOLEAN)
- created_at (TIMESTAMP)
- updated_at (TIMESTAMP)
```

#### `stock_movements`
Enhanced inventory tracking.

```sql
- id (UUID, PK)
- business_id (UUID, FK)
- inventory_id (UUID, FK)
- movement_type (VARCHAR) - "sale", "shrinkage", "inventory_variance", "adjustment"
- quantity_change (DECIMAL 16,4, optional)
- weight_change_grams (DECIMAL 12,4, optional)
- reason (TEXT)
- related_sale_id (UUID, FK, optional)
- related_shrinkage_id (UUID, FK, optional)
- related_check_id (UUID, FK, optional)
- created_by (UUID, FK)
- created_at (TIMESTAMP)
```

#### `loyalty_tier_changes`
Audit trail for loyalty tier upgrades.

```sql
- id (UUID, PK)
- customer_id (UUID, FK)
- business_id (UUID, FK)
- old_tier (VARCHAR)
- new_tier (VARCHAR)
- old_discount_rate (DECIMAL 5,4)
- new_discount_rate (DECIMAL 5,4)
- reason (TEXT)
- created_by (UUID, FK)
- created_at (TIMESTAMP)
```

### Extended Tables

#### `inventory` - New Columns
```sql
- base_unit (VARCHAR) - "g" or "oz"
- convert_to_grams (DECIMAL 12,4) - multiplier from base_unit to grams
- inventory_in_grams (DECIMAL 16,4) - primary stock unit
- allow_fractional_weight (BOOLEAN) - allows 0.01g precision
- price_per_gram (DECIMAL 12,4) - base price per gram
```

#### `customers` - New Columns
```sql
- purchase_count (INTEGER) - total purchases
- loyalty_tier (VARCHAR) - "none", "silver", "gold", "platinum"
- discount_rate (DECIMAL 5,4) - loyalty discount percentage
- next_tier_at (INTEGER) - purchase count needed for next tier
- loyalty_updated_at (TIMESTAMP) - last tier change
```

#### `sales_line_items` - New Columns
```sql
- weight_sold_grams (DECIMAL 12,4) - actual grams sold
- price_per_gram (DECIMAL 12,4) - price used for this line
- bulk_tier_applied (VARCHAR) - which tier was used
- loyalty_discount_applied (DECIMAL 5,4) - loyalty % on this line
```

#### `business_settings` - New Columns
```sql
- random_inventory_check_frequency (INTEGER) - check every N transactions (default: 15)
- random_check_tolerance_percentage (DECIMAL 5,2) - flag if variance > % (default: 5.0)
- enable_weight_based_sales (BOOLEAN) - feature toggle (default: true)
- require_supervisor_pin_for_shrinkage (BOOLEAN) - PIN required (default: false)
- default_bulk_pricing_tiers (JSONB) - default tier config
- loyalty_tier_config (JSONB) - tier definitions with purchase thresholds
- transaction_count (INTEGER) - counter for random checks
```

---

## RPC FUNCTIONS

### record_drawer_event()
```sql
record_drawer_event(
  p_business_id UUID,
  p_event_type VARCHAR DEFAULT 'no_sale',
  p_note TEXT DEFAULT NULL
)
RETURNS (success BOOLEAN, event_id UUID, error_message TEXT)
```

Records drawer open event for cash reconciliation.

**Usage**:
```typescript
const result = await posWeightEngine.recordDrawerEvent(businessId, "no_sale", "Drawer opened at 2:30 PM");
if (result.success) {
  console.log("Event recorded:", result.event_id);
}
```

### record_shrinkage_event()
```sql
record_shrinkage_event(
  p_business_id UUID,
  p_inventory_id UUID,
  p_quantity_grams DECIMAL,
  p_shrinkage_type VARCHAR DEFAULT 'personal_use',
  p_note TEXT DEFAULT NULL
)
RETURNS (success BOOLEAN, shrinkage_id UUID, new_inventory_grams DECIMAL, error_message TEXT)
```

Records shrinkage, updates inventory, logs audit trail.

**Usage**:
```typescript
const result = await posWeightEngine.recordShrinkage(
  businessId,
  inventoryId,
  3.5, // grams
  "personal_use",
  "Staff member sample"
);
```

### record_inventory_check()
```sql
record_inventory_check(
  p_business_id UUID,
  p_inventory_id UUID,
  p_measured_weight_grams DECIMAL
)
RETURNS (
  success BOOLEAN,
  check_id UUID,
  expected_weight_grams DECIMAL,
  measured_weight_grams DECIMAL,
  delta_grams DECIMAL,
  delta_percentage DECIMAL,
  discrepancy_flagged BOOLEAN,
  error_message TEXT
)
```

Records inventory check result. If discrepancy exceeds tolerance, automatically logs as shrinkage.

**Usage**:
```typescript
const result = await posWeightEngine.recordInventoryCheck(businessId, inventoryId, 28.5);
if (result.discrepancy_flagged) {
  console.log("Discrepancy detected, logged as shrinkage");
}
```

### get_bulk_pricing()
```sql
get_bulk_pricing(
  p_business_id UUID,
  p_inventory_id UUID,
  p_weight_grams DECIMAL
)
RETURNS (
  price_per_gram DECIMAL,
  tier_name VARCHAR,
  min_weight_grams DECIMAL,
  max_weight_grams DECIMAL,
  total_price DECIMAL
)
```

Gets applicable bulk pricing tier for weight.

### update_customer_loyalty_tier()
```sql
update_customer_loyalty_tier(
  p_business_id UUID,
  p_customer_id UUID
)
RETURNS (
  success BOOLEAN,
  old_tier VARCHAR,
  new_tier VARCHAR,
  old_discount DECIMAL,
  new_discount DECIMAL,
  error_message TEXT
)
```

Auto-upgrades loyalty tier based on purchase count. Logs change in audit trail.

### apply_loyalty_discount()
```sql
apply_loyalty_discount(
  p_business_id UUID,
  p_customer_id UUID,
  p_subtotal DECIMAL
)
RETURNS (
  loyalty_tier VARCHAR,
  discount_rate DECIMAL,
  discount_amount DECIMAL,
  final_price DECIMAL
)
```

Calculates loyalty discount on subtotal.

### process_weight_based_checkout()
```sql
process_weight_based_checkout(
  p_business_id UUID,
  p_customer_id UUID,
  p_order_type VARCHAR,
  p_payment_method VARCHAR,
  p_line_items JSONB,
  p_tax_amount DECIMAL DEFAULT 0,
  p_fees JSONB DEFAULT '[]',
  p_delivery_management_id UUID DEFAULT NULL,
  p_delivery_address TEXT DEFAULT NULL,
  p_delivery_price DECIMAL DEFAULT 0,
  p_amount_paid DECIMAL DEFAULT 0,
  p_apply_loyalty_discount BOOLEAN DEFAULT TRUE
)
RETURNS (
  sale_id UUID,
  order_number VARCHAR,
  subtotal_before_discount DECIMAL,
  loyalty_discount_amount DECIMAL,
  subtotal_after_discount DECIMAL,
  tax_amount DECIMAL,
  total_amount DECIMAL,
  change_amount DECIMAL,
  customer_loyalty_tier VARCHAR,
  customer_new_purchase_count INTEGER,
  success BOOLEAN,
  error_message TEXT
)
```

Complete checkout with weight support, loyalty discount, and tier update.

### increment_transaction_counter()
```sql
increment_transaction_counter(
  p_business_id UUID
)
RETURNS (
  current_count INTEGER,
  should_prompt_check BOOLEAN,
  check_frequency INTEGER
)
```

Increments transaction counter, returns whether random check should trigger.

---

## TYPESCRIPT SERVICE: POSWeightEngine

### Constructor
```typescript
const engine = new POSWeightEngine();
```

### Methods

#### getBulkPricing()
```typescript
async getBulkPricing(
  businessId: string,
  inventoryId: string,
  weightGrams: number
): Promise<{
  price_per_gram: number;
  tier_name?: string;
  total_price: number;
}>
```

#### getLoyaltyInfo()
```typescript
async getLoyaltyInfo(
  businessId: string,
  customerId: string
): Promise<LoyaltyInfo>
```

#### applyLoyaltyDiscount()
```typescript
async applyLoyaltyDiscount(
  businessId: string,
  customerId: string,
  subtotal: number
): Promise<{
  loyalty_tier: string;
  discount_rate: number;
  discount_amount: number;
  final_price: number;
}>
```

#### validateWeightAvailable()
```typescript
async validateWeightAvailable(
  businessId: string,
  inventoryId: string,
  weightGrams: number
): Promise<{
  valid: boolean;
  available_weight_grams?: number;
  error?: string;
}>
```

#### recordShrinkage()
```typescript
async recordShrinkage(
  businessId: string,
  inventoryId: string,
  quantityGrams: number,
  shrinkageType?: string,
  note?: string
): Promise<{
  success: boolean;
  shrinkage_id?: string;
  new_inventory_grams?: number;
  error?: string;
}>
```

#### recordDrawerEvent()
```typescript
async recordDrawerEvent(
  businessId: string,
  eventType?: string,
  note?: string
): Promise<{
  success: boolean;
  event_id?: string;
  error?: string;
}>
```

#### recordInventoryCheck()
```typescript
async recordInventoryCheck(
  businessId: string,
  inventoryId: string,
  measuredWeightGrams: number
): Promise<{
  success: boolean;
  check_id?: string;
  delta_grams?: number;
  delta_percentage?: number;
  discrepancy_flagged?: boolean;
  error?: string;
}>
```

#### updateCustomerLoyaltyTier()
```typescript
async updateCustomerLoyaltyTier(
  businessId: string,
  customerId: string
): Promise<{
  success: boolean;
  old_tier?: string;
  new_tier?: string;
  new_discount?: number;
  tier_changed?: boolean;
  error?: string;
}>
```

#### shouldTriggerRandomCheck()
```typescript
async shouldTriggerRandomCheck(
  businessId: string
): Promise<{
  should_check: boolean;
  transaction_count?: number;
  check_frequency?: number;
}>
```

---

## UI COMPONENTS

### ShrinkageForm
```tsx
<ShrinkageForm
  open={boolean}
  onClose={() => void}
  businessId={string}
  onSuccess={() => void}
/>
```

Modal for recording shrinkage with:
- Product selector (shows available weight)
- Quantity input (0.01g minimum)
- Shrinkage type dropdown
- Optional note
- Optional supervisor PIN (configurable)
- Audit warning banner

### InventoryCheckModal
```tsx
<InventoryCheckModal
  open={boolean}
  onClose={() => void}
  businessId={string}
  onSuccess={() => void}
/>
```

Random inventory check prompt:
- Auto-selects random product
- Shows expected weight
- Input for measured weight
- Live variance calculation
- Result display (Pass/Fail)
- Auto-logs shrinkage if discrepancy > tolerance

### WeightEntryModal
```tsx
<WeightEntryModal
  open={boolean}
  onClose={() => void}
  product={object}
  businessId={string}
  onAddToCart={(item) => void}
/>
```

Weight-based product entry:
- Weight numeric input (0.01g min)
- Live bulk tier calculation
- Price breakdown display
- Add to cart button

### NoSaleButton
```tsx
<NoSaleButton
  businessId={string}
  onSuccess={() => void}
/>
```

Simple button to record no-sale events.

### LoyaltyBadge
```tsx
<LoyaltyBadge
  tier={string}
  discount_rate={number}
  purchase_count={number}
/>
```

Visual display of loyalty tier.

### ShrinkageReport
```tsx
<ShrinkageReport
  businessId={string}
/>
```

Analytics dashboard:
- Total events, cost loss, average per event
- Event type breakdown
- Filterable event table

---

## INTEGRATION WITH POS

### Sales Page Updates
- Weight-based button for products with `base_unit='g'`
- Loyalty badge display
- Admin functions panel (No Sale, Shrinkage, Inv Check)
- Modal integrations
- Automatic loyalty tier update on checkout

### Checkout Flow
1. Validate inventory (weight or quantity)
2. Apply loyalty discount if applicable
3. Create sale with all line items
4. Update inventory (weight or quantity decrement)
5. Increment customer purchase count
6. Auto-update loyalty tier if threshold reached
7. Log to stock_movements table
8. Return sale_id with all metadata

---

## CONFIGURATION

### Business Settings
```typescript
// Enable features
enable_weight_based_sales: true
require_supervisor_pin_for_shrinkage: false

// Random checks
random_inventory_check_frequency: 15 // every 15 transactions
random_check_tolerance_percentage: 5.0 // flag if > 5% variance

// Default bulk pricing tiers
default_bulk_pricing_tiers: [
  { min_grams: 1, max_grams: 3.4, tier_name: "1g" },
  { min_grams: 3.5, max_grams: 6.9, tier_name: "3.5g" },
  { min_grams: 7, max_grams: 9.9, tier_name: "7g" },
  { min_grams: 10, max_grams: null, tier_name: "10g+" }
]

// Loyalty tier configuration
loyalty_tier_config: {
  none: { min_purchases: 0, discount: 0 },
  silver: { min_purchases: 5, discount: 0.05 },
  gold: { min_purchases: 15, discount: 0.10 },
  platinum: { min_purchases: 30, discount: 0.15 }
}
```

### Product Configuration
```typescript
// For weight-based products
{
  base_unit: "g",
  inventory_in_grams: 1000.00,
  allow_fractional_weight: true,
  price_per_gram: 0.25
}

// For quantity-based products (unchanged)
{
  base_unit: null,
  quantity_on_hand: 100,
  selling_price: 25.00
}
```

---

## AUDIT TRAIL

All actions are logged in `system_audit_log`:
- No-sale events → event_type: 'no_sale'
- Shrinkage → action: 'shrinkage_recorded', entity_type: 'inventory'
- Inventory checks → (automatic shrinkage logging if discrepancy)
- Loyalty tier changes → action: 'loyalty_tier_updated', entity_type: 'customer'
- Checkouts → related via sale_id and stock_movements

### Audit Log Fields
```sql
- action: VARCHAR(255) - action name
- entity_type: VARCHAR(100) - "inventory", "customer", "sale", etc.
- entity_id: UUID - primary entity affected
- user_id: UUID - who performed action
- old_values: JSONB - before state
- new_values: JSONB - after state
- business_id: UUID - business scope
- action_detail: TEXT - additional context
- created_at: TIMESTAMP
```

---

## PERMISSIONS

### Required Role Checks
- **Shrinkage**: Requires manager/admin role (checked in component)
- **Supervisor PIN**: Optional (configured in business_settings)
- **Inventory Checks**: Requires manager/admin role
- **Price/Tier Changes**: All via RLS policies

### Row-Level Security
All new tables enforce `has_business_access()` check via RLS policies.

---

## ERROR HANDLING

### Common Scenarios

**Insufficient Weight**
```
"Insufficient weight. Available: 28.5g, Requested: 30.0g"
```

**Discrepancy Too Large**
```
"Discrepancy detected and logged"
Alert shows delta_grams and delta_percentage
```

**Product Not Found**
```
"Inventory item not found"
```

**Business Access Denied**
```
"Access denied to business"
```

---

## EXAMPLES

### Example 1: Weight-Based Sale
```typescript
// User selects product with base_unit='g'
const product = { id: 'prod-123', base_unit: 'g', inventory_in_grams: 500 };

// User enters weight
const weightGrams = 7.5;

// Get bulk pricing
const pricing = await posWeightEngine.getBulkPricing(businessId, product.id, weightGrams);
// Returns: { price_per_gram: 0.20, tier_name: "7g", total_price: 1.50 }

// Add to cart
posEngine.addItem({
  inventory_id: product.id,
  product_name: "Premium Strain (7.5g)",
  sku: "STRAIN-001",
  quantity: 1,
  unit_price: 1.50
});

// Checkout
const result = await posWeightEngine.checkout(businessId, fees);
// inventory_in_grams decremented by 7.5
// Stock movement recorded with weight_change_grams: -7.5
```

### Example 2: Shrinkage Recording
```typescript
// Manager clicks "Shrinkage" button
const result = await posWeightEngine.recordShrinkage(
  businessId,
  inventoryId,
  3.5, // grams
  "personal_use",
  "Staff member taste test"
);

if (result.success) {
  // shrinkage_events record created
  // inventory_in_grams decremented by 3.5
  // stock_movements record created
  // system_audit_log record created
  // New inventory: result.new_inventory_grams
}
```

### Example 3: Random Inventory Check
```typescript
// After 15th transaction
const shouldCheck = await posWeightEngine.shouldTriggerRandomCheck(businessId);
// Returns: { should_check: true, transaction_count: 15, check_frequency: 15 }

// UI shows modal
const product = await posWeightEngine.getRandomCheckProduct(businessId);
// Returns random product: { product_name: "Strain A", expected_weight_grams: 100 }

// User measures and enters
const checkResult = await posWeightEngine.recordInventoryCheck(
  businessId,
  product.inventory_id,
  98.5 // measured grams
);

if (checkResult.discrepancy_flagged) {
  // Delta: 1.5g (1.5%)
  // Auto-logged as shrinkage
  // Admin notification triggered
}
```

### Example 4: Loyalty Tier Upgrade
```typescript
// After 5th purchase for customer
const loyaltyResult = await posWeightEngine.updateCustomerLoyaltyTier(businessId, customerId);
// Returns: { old_tier: "none", new_tier: "silver", new_discount: 0.05, tier_changed: true }

// Next checkout
const discountResult = await posWeightEngine.applyLoyaltyDiscount(businessId, customerId, 100);
// Returns: { discount_amount: 5, final_price: 95 }
```

---

## TESTING CHECKLIST

- [x] No Sale logs correctly in drawer_events
- [x] Personal use subtracts inventory accurately (grams)
- [x] Shrinkage records correct cost loss
- [x] Random inventory check fires every N sales
- [x] Weight sales work to 0.01g accuracy
- [x] Bulk pricing tiers apply correctly
- [x] Loyalty discounts apply after purchase threshold
- [x] All logs accurate & audit trail complete
- [x] Reports update in real-time
- [x] No double-writes or inventory duplicates
- [x] Permissions enforced for shrinkage/price changes
- [x] Supervisor PIN optional per config
- [x] AI recommendations don't interfere

---

## DEPLOYMENT

### Migration Order
1. Deploy schema file 12_pos_weight_shrinkage_loyalty.sql
2. Deploy RPC file 13_pos_weight_shrinkage_loyalty_rpc.sql
3. Deploy checkout RPC file 14_pos_weight_checkout_rpc.sql
4. Deploy TypeScript service: lib/utils/pos-weight-engine.ts
5. Deploy UI components: components/pos/*
6. Deploy reports component: components/reports/shrinkage-report.tsx
7. Update sales page: app/sales/page.tsx

### Verification
```bash
# Check tables exist
SELECT * FROM drawer_events LIMIT 0;
SELECT * FROM shrinkage_events LIMIT 0;
SELECT * FROM inventory_checks LIMIT 0;

# Check RPC functions
SELECT proname FROM pg_proc WHERE proname LIKE 'record_%' OR proname LIKE 'get_%' OR proname LIKE 'update_%' OR proname LIKE 'apply_%' OR proname LIKE 'increment_%';

# Check inventory columns
SELECT column_name FROM information_schema.columns WHERE table_name='inventory' AND column_name IN ('base_unit', 'inventory_in_grams', 'price_per_gram');

# Check customers columns
SELECT column_name FROM information_schema.columns WHERE table_name='customers' AND column_name IN ('loyalty_tier', 'purchase_count', 'discount_rate');
```

---

## NOTES

- All shrinkage is **irreversible** and fully audited
- Weight precision is **0.01g minimum** for fractional weights
- Loyalty tier updates are **automatic** after checkout
- Random checks are **deterministic** based on transaction count
- Bulk pricing lookup **prefers product-specific** over global rules
- All database operations enforce **business isolation** via RLS
- Cost calculation for shrinkage uses **inventory.unit_cost**
- Customer purchase count increments on **every checkout**

---

## PRODUCTION READY CONFIRMATION

✅ Database schema complete and tested  
✅ RPC functions implemented with error handling  
✅ TypeScript service fully functional  
✅ React UI components production-grade  
✅ Audit trail comprehensive  
✅ Permissions enforced  
✅ Error handling robust  
✅ Performance optimized  

**Status**: READY FOR PRODUCTION DEPLOYMENT
