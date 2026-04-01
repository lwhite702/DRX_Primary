// Database Types based on provided schema
export interface Business {
  id: string;
  name: string;
}

export interface Inventory {
  id: string;
  business_id: string;
  product_name: string;
  sku: string | null;
  description: string | null;
  category: string | null;
  // Stock fields - schema uses both for different product types
  quantity_on_hand: number;
  inventory_in_grams: number | null; // For weight-based products
  reorder_level: number | null;
  low_stock_threshold: number | null;
  // Pricing
  cost_price: number;
  selling_price: number;
  // Units
  base_unit: string | null; // 'g', 'oz', 'unit', etc.
  unit_of_measure: string | null;
  quantity_unit: string | null;
  // Cannabis-specific
  thc_percentage: number | null;
  cbd_percentage: number | null;
  strain_type: string | null;
  batch_number: string | null;
  ai_pricing_enabled: boolean;
  created_at?: string;
  updated_at?: string;
}

export interface Customer {
  id: string;
  business_id: string;
  alias?: string;
  first_name?: string | null;
  last_name?: string | null;
  email?: string | null;
  phone?: string | null;
  address?: string | null;
  notes?: string | null;
  credit_limit: number;
  loyalty_tier: "bronze" | "silver" | "gold";
  loyalty_points: number;
  fixed_price_per_gram?: number;
  ephemeral?: boolean;
  ephemeral_expires_at?: string | null;
  created_at?: string;
  updated_at?: string;
}

export interface Sale {
  id: string;
  business_id: string;
  customer_id: string | null;
  total_amount: number;
  payment_method: string;
  payment_ref: string | null;
  status: string;
  delivery_management_id: string | null;
  delivery_price: number | null;
  amount_paid: number;
  change_amount: number;
  created_at?: string;
}

export interface SaleLineItem {
  id: string;
  sale_id: string;
  inventory_id: string;
  quantity: number; // Supports decimals for fractional weights
  unit_price: number;
  line_total: number;
}

export interface CreditTransaction {
  id: string;
  business_id: string;
  customer_id: string;
  amount: number;
  transaction_type: "purchase" | "payment";
  status: string;
  due_date: string | null;
  created_at?: string;
}

export interface InventoryIntake {
  id: string;
  business_id: string;
  status: "pending" | "approved";
  supplier: string | null;
  total_cost: number;
  created_at?: string;
}

export interface BulkPricingTier {
  id?: string;
  business_id: string;
  inventory_id: string;
  min_weight_grams: number;
  max_weight_grams: number | null;
  price_per_gram: number;
  tier_name: string;
  is_active: boolean;
}

export interface ProductUnitAlias {
  id: string;
  business_id: string;
  alias_name: string;
  standard_unit: "g" | "oz";
  quantity: number;
  is_enabled: boolean;
  is_system_default: boolean;
  created_at?: string;
  updated_at?: string;
}
