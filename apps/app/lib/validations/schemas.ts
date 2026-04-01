import { z } from "zod";

// Business Profile Schemas
export const businessProfileSchema = z.object({
  id: z.string().uuid().optional(),
  business_name: z.string().min(1).max(255),
  business_type: z.string().max(100).optional(),
  address: z.string().optional(),
  city: z.string().max(100).optional(),
  state: z.string().max(50).optional(),
  zip_code: z.string().max(20).optional(),
  phone_number: z.string().max(20).optional(),
  email: z.string().email().optional(),
  owner_id: z.string().uuid(),
  is_active: z.boolean().default(true),
});

export type BusinessProfile = z.infer<typeof businessProfileSchema>;

// Inventory Schemas
export const inventorySchema = z.object({
  id: z.string().uuid().optional(),
  business_id: z.string().uuid(),
  sku: z.string().min(1).max(100),
  product_name: z.string().min(1).max(255),
  description: z.string().optional(),
  category: z.string().max(100).optional(),
  unit_of_measure: z.enum(["g", "oz"]).default("g"),
  quantity_on_hand: z.number().int().min(0).default(0),
  reorder_level: z.number().int().min(0).default(10),
  unit_cost: z.number().nonnegative().optional(),
  selling_price: z.number().nonnegative().optional(),
  supplier_id: z.string().uuid().optional(),
});

export type Inventory = z.infer<typeof inventorySchema>;

// Customer Schemas
export const customerSchema = z.object({
  id: z.string().uuid().optional(),
  business_id: z.string().uuid(),
  alias: z.preprocess(
    (val) => (val === "" || val === null ? undefined : val),
    z.string().max(100).optional(),
  ),
  first_name: z.preprocess(
    (val) => (val === "" || val === null ? undefined : val),
    z.string().max(100).optional(),
  ),
  last_name: z.preprocess(
    (val) => (val === "" || val === null ? undefined : val),
    z.string().max(100).optional(),
  ),
  phone_number: z.preprocess(
    (val) => (val === "" || val === null ? undefined : val),
    z.string().max(20).optional(),
  ),
  email: z.preprocess(
    (val) => (val === "" || val === null ? undefined : val),
    z.string().email().optional(),
  ),
  address: z.preprocess(
    (val) => (val === "" || val === null ? undefined : val),
    z.string().optional(),
  ),
  notes: z.preprocess(
    (val) => (val === "" || val === null ? undefined : val),
    z.string().optional(),
  ),
  city: z.preprocess(
    (val) => (val === "" || val === null ? undefined : val),
    z.string().max(100).optional(),
  ),
  state: z.preprocess(
    (val) => (val === "" || val === null ? undefined : val),
    z.string().max(50).optional(),
  ),
  zip_code: z.preprocess(
    (val) => (val === "" || val === null ? undefined : val),
    z.string().max(20).optional(),
  ),
  customer_type: z.preprocess(
    (val) => (val === "" || val === null ? undefined : val),
    z.string().max(50).optional(),
  ),
  fixed_price_per_gram: z.coerce.number().nonnegative().optional().nullable(),
  ephemeral: z.boolean().optional(),
  ephemeral_retention_days: z.union([z.literal(1), z.literal(7), z.literal(30)]).optional(),
  is_active: z.boolean().default(true),
});

export type Customer = z.infer<typeof customerSchema>;

// Credit Transaction Schemas
export const creditTransactionSchema = z.object({
  id: z.string().uuid().optional(),
  business_id: z.string().uuid(),
  customer_id: z.string().uuid(),
  transaction_type: z.enum(["extension", "payment"]),
  amount: z.number().positive(),
  description: z.string().optional(),
  due_date: z.string().date().optional(),
  paid_date: z.string().date().optional(),
  status: z.enum(["pending", "completed", "cancelled"]).default("pending"),
});

export type CreditTransaction = z.infer<typeof creditTransactionSchema>;

// Credit Limit Schemas
export const creditLimitSchema = z.object({
  id: z.string().uuid().optional(),
  business_id: z.string().uuid(),
  customer_id: z.string().uuid(),
  max_credit_limit: z.number().nonnegative(),
  current_balance: z.number().nonnegative().default(0),
});

export type CreditLimit = z.infer<typeof creditLimitSchema>;

// Sales Schemas
export const salesLineItemSchema = z.object({
  inventory_id: z.string().uuid(),
  quantity: z.number().int().positive(),
  unit_price: z.number().nonnegative(),
  line_total: z.number().nonnegative().optional(),
});

export const salesSchema = z.object({
  id: z.string().uuid().optional(),
  business_id: z.string().uuid(),
  customer_id: z.string().uuid().optional(),
  order_number: z.string().optional(),
  order_type: z.string().max(50).optional(),
  order_status: z
    .enum(["pending", "completed", "cancelled", "refunded"])
    .default("pending"),
  subtotal: z.number().nonnegative().optional(),
  tax_amount: z.number().nonnegative().default(0),
  total_amount: z.number().nonnegative().optional(),
  payment_method: z.string().max(50).optional(),
  line_items: z.array(salesLineItemSchema).optional(),
});

export type Sales = z.infer<typeof salesSchema>;
export type SalesLineItem = z.infer<typeof salesLineItemSchema>;

// POS Checkout Schema
export const miscFeeSchema = z.object({
  type: z.string(),
  amount: z.number().nonnegative(),
});

export const posCheckoutSchema = z.object({
  business_id: z.string().uuid(),
  customer_id: z.string().uuid().optional().nullable(),
  order_type: z.string().max(50).default("retail"),
  payment_method: z.enum(["cash", "card", "credit", "mixed", "zelle"]),
  payment_ref: z.string().optional(),
  line_items: z.array(salesLineItemSchema).min(1),
  tax_amount: z.number().nonnegative().default(0),
  fees: z.array(miscFeeSchema).optional().default([]),
});

export type POSCheckout = z.infer<typeof posCheckoutSchema>;

// AI Insight Schemas
export const aiInsightSchema = z.object({
  id: z.string().uuid().optional(),
  business_id: z.string().uuid(),
  insight_type: z.enum([
    "pricing",
    "inventory",
    "credit",
    "cashflow",
    "general",
  ]),
  insight_title: z.string().min(1).max(255),
  insight_content: z.string().min(1),
  priority: z.enum(["low", "medium", "high", "critical"]).default("medium"),
  action_recommended: z.string().optional(),
  status: z.enum(["pending", "reviewed", "dismissed"]).default("pending"),
});

export type AIInsight = z.infer<typeof aiInsightSchema>;

// User Role Schemas
export const userRoleSchema = z.object({
  id: z.string().uuid().optional(),
  business_id: z.string().uuid(),
  user_id: z.string().uuid(),
  role: z.enum(["owner", "manager", "staff", "cashier"]),
  permissions: z.record(z.any()).default({}),
});

export type UserRole = z.infer<typeof userRoleSchema>;

// AI Pricing Recommendation Schemas
export const aiPricingRecommendationSchema = z.object({
  id: z.string().uuid().optional(),
  business_id: z.string().uuid(),
  inventory_id: z.string().uuid(),
  current_price: z.number().nonnegative(),
  recommended_price: z.number().nonnegative(),
  recommended_range_min: z.number().nonnegative(),
  recommended_range_max: z.number().nonnegative(),
  confidence_score: z.number().min(0).max(100).optional(),
  reasoning: z.string(),
  factors: z.record(z.any()).optional(),
  status: z.enum(["pending", "applied", "rejected"]).default("pending"),
  applied_at: z.string().datetime().optional(),
});

export type AIPricingRecommendation = z.infer<
  typeof aiPricingRecommendationSchema
>;

// Inventory Forecast Schemas
export const inventoryForecastSchema = z.object({
  id: z.string().uuid().optional(),
  business_id: z.string().uuid(),
  inventory_id: z.string().uuid(),
  current_stock: z.number().int().nonnegative(),
  velocity_7d: z.number().optional(),
  velocity_30d: z.number().optional(),
  velocity_90d: z.number().optional(),
  velocity_trend: z
    .enum(["accelerating", "stable", "declining", "stagnant"])
    .optional(),
  projected_stockout_date: z.string().date().optional(),
  days_until_stockout: z.number().int().optional(),
  recommended_restock_quantity: z.number().int().nonnegative().optional(),
  restock_urgency: z.enum(["low", "medium", "high", "critical"]).optional(),
  inventory_risk_level: z.enum(["low", "medium", "high"]).optional(),
  restock_cost: z.number().nonnegative().optional(),
  cash_exposure: z.number().nonnegative().optional(),
  reasoning: z.string().optional(),
  confidence_score: z.number().min(0).max(100).optional(),
  forecast_factors: z.record(z.any()).optional(),
});

export type InventoryForecast = z.infer<typeof inventoryForecastSchema>;

// AI Decision Log Schema
export const aiDecisionLogSchema = z.object({
  id: z.string().uuid().optional(),
  business_id: z.string().uuid(),
  product_id: z.string().uuid().optional(),
  decision_type: z.enum(["pricing", "inventory", "forecast"]),
  old_value: z.record(z.any()).optional(),
  new_value: z.record(z.any()).optional(),
  ai_recommendation: z.record(z.any()),
  reasoning: z.string().optional(),
  decided_by: z.enum(["system", "user"]),
  decided_by_user_id: z.string().uuid().optional(),
  override_reason: z.string().optional(),
});

export type AIDecisionLog = z.infer<typeof aiDecisionLogSchema>;

// Inventory Alert Schema
export const inventoryAlertSchema = z.object({
  id: z.string().uuid().optional(),
  business_id: z.string().uuid(),
  inventory_id: z.string().uuid(),
  alert_type: z.string(),
  severity: z.enum(["low", "medium", "high", "critical"]),
  message: z.string(),
  data: z.record(z.any()).optional(),
  acknowledged: z.boolean().default(false),
  acknowledged_by: z.string().uuid().optional(),
  acknowledged_at: z.string().datetime().optional(),
});

export type InventoryAlert = z.infer<typeof inventoryAlertSchema>;

// Sales Velocity Cache Schema
export const salesVelocityCacheSchema = z.object({
  id: z.string().uuid().optional(),
  business_id: z.string().uuid(),
  inventory_id: z.string().uuid(),
  velocity_7d: z.number().optional(),
  velocity_30d: z.number().optional(),
  velocity_90d: z.number().optional(),
  last_7d_units: z.number().int().optional(),
  last_30d_units: z.number().int().optional(),
  last_90d_units: z.number().int().optional(),
  cache_updated_at: z.string().datetime().optional(),
});

export type SalesVelocityCache = z.infer<typeof salesVelocityCacheSchema>;
