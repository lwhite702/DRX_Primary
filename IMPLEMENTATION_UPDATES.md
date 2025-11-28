# POS Enhancements Implementation Guide

## Overview
This document outlines the new features added to the DRX CRM Point of Sale (POS) system:
1. **AI Price Recommendations** - Intelligent pricing suggestions based on market analysis
2. **Delivery Management** - Complete delivery option configuration with address and pricing
3. **Amount Paid Calculation** - Smart calculation of product quantity based on amount paid

## New Database Tables

### 1. Delivery Management Table
```sql
CREATE TABLE delivery_management (
  id UUID PRIMARY KEY,
  business_id UUID REFERENCES business_profile(id),
  name VARCHAR(255) NOT NULL,
  provider VARCHAR(100),
  base_price DECIMAL(12, 2) DEFAULT 0,
  is_active BOOLEAN DEFAULT TRUE,
  allow_price_override BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP,
  updated_at TIMESTAMP
);
```

**Purpose**: Stores delivery service configurations for each business
- `name`: Name of the delivery service (e.g., "Local Pickup", "Standard Delivery")
- `provider`: Delivery provider name (e.g., "UPS", "DHL", "Custom")
- `base_price`: Default delivery price
- `allow_price_override`: Allows changing price on per-order basis

### 2. AI Pricing Recommendations Table
```sql
CREATE TABLE ai_pricing_recommendations (
  id UUID PRIMARY KEY,
  business_id UUID REFERENCES business_profile(id),
  inventory_id UUID REFERENCES inventory(id),
  recommended_price DECIMAL(12, 2),
  confidence_score DECIMAL(5, 2),
  current_price DECIMAL(12, 2),
  price_change_percentage DECIMAL(5, 2),
  recommendation_reason TEXT,
  status VARCHAR(50) DEFAULT 'pending',
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP,
  updated_at TIMESTAMP
);
```

**Purpose**: Stores AI-generated price recommendations
- `confidence_score`: 0-100 indicating how confident the AI is about this recommendation
- `status`: pending | accepted | rejected | applied
- `recommendation_reason`: Explanation for why this price was recommended

### 3. Sales Table Extensions
Added columns to track delivery and payment information:
- `delivery_management_id`: Links to delivery option
- `delivery_address`: Customer's delivery address
- `delivery_price`: Price charged for delivery
- `amount_paid`: Total amount customer paid
- `change_amount`: Change to give back to customer

### 4. Inventory Table Extensions
Added fields to support product quantity calculations:
- `ai_pricing_enabled`: Boolean to enable/disable AI pricing for this product
- `quantity_unit`: Unit of measurement (unit, gram, ml, etc.)
- `unit_to_serving_ratio`: Conversion ratio for calculating servings

## New RPC Functions

### 1. process_pos_checkout_enhanced()
Enhanced checkout function that handles delivery and amount paid:
```sql
CREATE OR REPLACE FUNCTION process_pos_checkout_enhanced(
  p_business_id UUID,
  p_customer_id UUID,
  p_order_type VARCHAR(50),
  p_payment_method VARCHAR(50),
  p_line_items JSONB,
  p_tax_amount DECIMAL(12, 2) DEFAULT 0,
  p_fees JSONB DEFAULT '[]'::jsonb,
  p_delivery_management_id UUID DEFAULT NULL,
  p_delivery_address TEXT DEFAULT NULL,
  p_delivery_price DECIMAL(12, 2) DEFAULT 0,
  p_amount_paid DECIMAL(12, 2) DEFAULT 0
)
```

**Returns**: Table with sale_id, order_number, total_amount, change_amount, success, error_message

### 2. calculate_quantity_from_amount()
Calculates product quantity based on amount paid:
```sql
CREATE OR REPLACE FUNCTION calculate_quantity_from_amount(
  p_inventory_id UUID,
  p_amount_paid DECIMAL(12, 2)
)
```

**Returns**: quantity, amount_used, change_amount, unit_price

### 3. get_ai_pricing_recommendations()
Retrieves active AI pricing recommendations for a business:
```sql
CREATE OR REPLACE FUNCTION get_ai_pricing_recommendations(
  p_business_id UUID,
  p_limit INT DEFAULT 10
)
```

**Returns**: Recommendations sorted by confidence score

### 4. apply_ai_pricing_recommendation()
Applies an AI pricing recommendation to an inventory item:
```sql
CREATE OR REPLACE FUNCTION apply_ai_pricing_recommendation(
  p_business_id UUID,
  p_recommendation_id UUID,
  p_override BOOLEAN DEFAULT FALSE
)
```

## Updated POSEngine Class

### New Types
```typescript
export type DeliveryOption = {
  id: string;
  name: string;
  provider?: string;
  base_price: number;
  allow_price_override: boolean;
};

export type AIPricingRecommendation = {
  id: string;
  inventory_id: string;
  product_name: string;
  current_price: number;
  recommended_price: number;
  confidence_score: number;
  price_change_percentage: number;
  recommendation_reason?: string;
};
```

### New Methods

#### setDelivery()
```typescript
setDelivery(
  delivery_id: string | undefined,
  delivery_address?: string,
  delivery_price?: number
): CartState
```
Sets delivery information on the cart.

#### setAmountPaid()
```typescript
setAmountPaid(amount: number): CartState
```
Records the amount paid by customer and automatically calculates change.

#### calculateQuantityFromAmount()
```typescript
calculateQuantityFromAmount(unitPrice: number, amountPaid: number): {
  quantity: number;
  amountUsed: number;
  changeAmount: number;
}
```
Calculates how many units can be purchased with the given amount.

#### getDeliveryOptions()
```typescript
async getDeliveryOptions(business_id: string): Promise<DeliveryOption[]>
```
Retrieves all active delivery options for a business.

#### getAIPricingRecommendations()
```typescript
async getAIPricingRecommendations(business_id: string): Promise<AIPricingRecommendation[]>
```
Retrieves active AI pricing recommendations.

#### applyAIPricingRecommendation()
```typescript
async applyAIPricingRecommendation(
  business_id: string,
  recommendationId: string
): Promise<{ success: boolean; message?: string; newPrice?: number; }>
```
Applies an AI pricing recommendation to update product price.

## Updated Sales Page UI

### New Components

#### Delivery Management Section
- Dropdown to select delivery option
- Address input field
- Display of delivery price
- Automatically included in total calculation

#### AI Pricing Recommendations Card
- Shows active recommendations with confidence scores
- Displays current vs. recommended prices
- Shows percentage change
- One-click apply button
- Displays recommendation reason

#### Amount Paid Input
- Input field for amount paid
- Real-time calculation of change amount
- Visual summary showing breakdown:
  - Amount Paid
  - Total
  - Change (highlighted in green)

### Modified Totals Section
- Added delivery price to totals
- Updated total calculation to include delivery
- Cart state now tracks change_amount

## Usage Examples

### Example 1: Processing Sale with Delivery

```typescript
// Get delivery options
const options = await posEngine.getDeliveryOptions(businessId);

// Set delivery
posEngine.setDelivery(deliveryId, "123 Main St", 10.00);

// Checkout includes delivery
await posEngine.checkout(businessId, fees);
```

### Example 2: Processing Sale with Amount Paid

```typescript
// Customer pays $50 for $45 order
posEngine.setAmountPaid(50);
const cart = posEngine.getCart();
console.log(cart.change_amount); // 5.00

// Checkout records amount paid and change
await posEngine.checkout(businessId, fees);
```

### Example 3: Applying AI Pricing

```typescript
// Get recommendations
const recs = await posEngine.getAIPricingRecommendations(businessId);

// Apply recommended price
const result = await posEngine.applyAIPricingRecommendation(
  businessId,
  recs[0].id
);
```

## Migration Instructions

1. **Apply Database Schema**
   ```bash
   # Run in Supabase SQL Editor:
   # Copy and execute: db/migrations_combined.sql
   ```

2. **Deploy Updated Code**
   ```bash
   git push origin feat/pos-enable-ai-pricing-delivery-management-amount-paid-calc
   ```

3. **Test Features**
   - Create a delivery option in admin panel
   - Create AI pricing recommendations (via API or admin)
   - Test POS flow with delivery
   - Test amount paid calculation
   - Verify order records include delivery and payment info

## Database Migration Scripts

### To Add Delivery Options (Admin Panel)
```sql
INSERT INTO delivery_management (business_id, name, provider, base_price, allow_price_override)
VALUES (
  'your-business-id',
  'Standard Delivery',
  'DHL',
  10.00,
  true
);
```

### To Create AI Pricing Recommendation
```sql
INSERT INTO ai_pricing_recommendations (
  business_id,
  inventory_id,
  recommended_price,
  confidence_score,
  current_price,
  price_change_percentage,
  recommendation_reason,
  status
) VALUES (
  'your-business-id',
  'inventory-item-id',
  25.99,
  85.5,
  22.99,
  13.04,
  'Based on market analysis and demand trends',
  'pending'
);
```

## Configuration Requirements

### For AI Pricing to Work
- Business needs to have inventory items set up
- AI system needs to generate recommendations (separate AI service)
- Recommendations status must be 'pending' to show in UI

### For Delivery to Work
- Business admin must configure at least one delivery option
- Delivery options must have `is_active = true`
- Each order can use any active delivery option

### For Amount Paid to Work
- No special configuration needed
- Automatically calculates change on any order
- Records in sales table for reconciliation

## Error Handling

### Common Issues

1. **"Supabase client not available"**
   - Check authentication is working
   - Verify RLS policies allow access

2. **"Insufficient stock"**
   - System validates stock before checkout
   - User gets clear error message with item details

3. **"Delivery option not found"**
   - Verify delivery_id exists and is_active = true
   - Check business_id matches authenticated user's business

## Performance Considerations

- Delivery options are loaded once on page mount
- AI recommendations cached for session (can reload manually)
- Amount paid calculation is local (no server calls)
- Changes are only saved on checkout

## Security

- All database functions use RLS policies
- Delivery management scoped to business
- AI recommendations only show for active items
- Amount paid is validated at checkout time
- Change calculation uses precise DECIMAL types

## Future Enhancements

1. **AI Pricing Service Integration**
   - Connect to external AI service for recommendations
   - Automatic recommendation generation

2. **Delivery Tracking**
   - Integration with delivery provider APIs
   - Real-time tracking updates

3. **Advanced Quantity Calculations**
   - Weight-based calculations
   - Volume-based pricing
   - Bulk discount calculations

4. **Payment Method Integration**
   - Multiple payment provider support
   - Partial payment handling
   - Installment plans

## Files Modified

- `lib/utils/pos-engine.ts` - Enhanced POSEngine with new methods
- `app/sales/page.tsx` - Updated UI with delivery, AI pricing, and amount paid
- `db/schema/10_delivery_management.sql` - New tables
- `db/schema/11_pos_enhanced_rpc.sql` - Enhanced RPC functions
- `db/migrations_combined.sql` - Combined all migrations

## Support & Questions

For issues or questions about these features, refer to:
- Database schema files in `db/schema/`
- POSEngine implementation in `lib/utils/pos-engine.ts`
- POS UI implementation in `app/sales/page.tsx`
