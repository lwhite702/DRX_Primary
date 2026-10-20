import { z } from "zod";

export const posModeSchema = z.enum(["quick", "full"]);
export const posPaymentMethodSchema = z.enum([
  "cash",
  "card",
  "credit",
  "mixed",
  "split",
  "zelle",
  "p2p_cashapp",
  "p2p_paypal",
  "p2p_zelle",
  "p2p_onepay",
  "p2p_chime",
  "p2p_venmo",
  "p2p_other",
]);
export const posQuickPaymentMethodSchema = z.enum(["cash", "card", "credit"]);
export const posReceiptOptionSchema = z.enum(["print", "sms", "none"]);
export const posCartItemSourceSchema = z.enum(["inventory", "manual"]);
export const posCheckoutSourceSchema = z.enum([
  "quick-pos",
  "legacy-sales",
  "checkout-enhanced",
  "sales-api",
]);

export const posPaymentTenderSchema = z.object({
  method: z.enum([
    "cash",
    "card",
    "credit",
    "zelle",
    "p2p_cashapp",
    "p2p_paypal",
    "p2p_zelle",
    "p2p_onepay",
    "p2p_chime",
    "p2p_venmo",
    "p2p_other",
  ]),
  amountCents: z.number().int().positive(),
  reference: z.string().max(120).optional(),
  processorFeeCents: z.number().int().nonnegative().optional(),
});

const quickPosCommerceConfigSchema = z.object({
  fractionalEnabled: z.boolean(),
  sellingUnit: z.string().min(1),
  decimalPrecision: z.number().int().min(0).max(6),
  minimumSaleQuantity: z.number().positive(),
  quantityIncrement: z.number().positive(),
  baseUnitPrice: z.number().positive(),
  suggestedDollarAmounts: z.array(z.number().positive()),
  suggestedQuantities: z.array(z.number().positive()),
  bulkPriceTiers: z.array(
    z.object({
      id: z.string().min(1),
      label: z.string().min(1),
      minimumQuantity: z.number().positive(),
      unitPrice: z.number().positive(),
      totalPrice: z.number().positive().optional(),
    }),
  ),
});

export const posScopeSchema = z.object({
  tenantId: z.string().uuid().nullable().optional(),
  businessId: z.string().uuid(),
  locationId: z.string().uuid().nullable().optional(),
});

export const posProductSchema = z.object({
  id: z.string().uuid(),
  name: z.string().min(1),
  sku: z.string().min(1).optional().nullable(),
  barcode: z.string().min(1).optional().nullable(),
  price: z.number().nonnegative(),
  quantityOnHand: z.number().int().nonnegative(),
  lowStockThreshold: z.number().int().nonnegative().default(10),
});

export const stockAdjustmentSchema = z.object({
  inventoryId: z.string().min(1).max(128),
  quantityDelta: z.number().int(),
  reason: z.string().min(1),
  lowStockThreshold: z.number().int().nonnegative().optional(),
});

export const cartLineItemSchema = z.object({
  id: z.string().min(1),
  inventoryId: z.string().min(1).max(128).nullable(),
  name: z.string().min(1),
  sku: z.string().min(1).optional().nullable(),
  barcode: z.string().min(1).optional().nullable(),
  unitPrice: z.number().nonnegative(),
  qty: z.number().int().positive(),
  source: posCartItemSourceSchema,
  weightGrams: z.number().positive().optional(),
  requestedAmountCents: z.number().int().positive().optional(),
  pricePerGram: z.number().positive().optional(),
  bulkTierApplied: z.string().min(1).optional(),
  loyaltyDiscountApplied: z.number().nonnegative().optional(),
  originalPrice: z.number().nonnegative().optional(),
  overrideReason: z.string().min(1).optional(),
  commerceConfig: quickPosCommerceConfigSchema.optional(),
});

export const posFeeSchema = z.object({
  type: z.string().min(1),
  amount: z.number().nonnegative().optional(),
  value: z.string().optional(),
});

export const quickPosPaymentSchema = z.object({
  method: posPaymentMethodSchema,
  receipt: posReceiptOptionSchema,
  creditConfirmed: z.boolean().default(false),
  cardFeeCents: z.number().int().nonnegative().optional(),
  paymentRef: z.string().max(120).optional(),
  tenders: z.array(posPaymentTenderSchema).optional(),
});

export const quickPosDeliverySchema = z.object({
  enabled: z.boolean(),
  address: z.string().trim().max(500).default(""),
  vendorFeeCents: z.number().int().nonnegative(),
  feeAllocation: z.enum(["charge_customer", "absorb"]),
  feeTaxable: z.boolean(),
  dispatchType: z.enum(["merchant_dispatch", "customer_pickup_car"]).optional(),
  feeSplitMode: z.enum(["pass_full", "absorb_full", "split_half", "custom"]).optional(),
  customerFeeCents: z.number().int().nonnegative().optional(),
  estimatedArrivalMinutes: z.number().int().positive().max(1440).optional(),
  uberTrackingUrl: z.string().trim().max(1000).optional(),
});

export const fullPosPaymentSchema = z.object({
  method: posPaymentMethodSchema,
  receipt: posReceiptOptionSchema.default("none"),
  creditConfirmed: z.boolean().default(false),
  cardFeeCents: z.number().int().nonnegative().optional(),
  tenders: z.array(posPaymentTenderSchema).optional(),
});

export const quickCheckoutPayloadSchema = z.object({
  mode: z.literal("quick"),
  idempotencyKey: z.string().uuid(),
  customerId: z.string().min(1).max(128).nullable().optional(),
  source: posCheckoutSourceSchema.optional().default("quick-pos"),
  payment: quickPosPaymentSchema,
  amountPaid: z.number().nonnegative().optional(),
  paymentRef: z.string().max(120).optional(),
  paymentTenders: z.array(posPaymentTenderSchema).optional(),
  fees: z.array(posFeeSchema).optional(),
  delivery: quickPosDeliverySchema.optional(),
  discountAmountCents: z.number().int().nonnegative().optional(),
  discountReason: z.string().min(1).max(100).optional(),
  items: z.array(cartLineItemSchema).min(1),
});

export const quickPosQuotePayloadSchema = quickCheckoutPayloadSchema.pick({
  mode: true,
  customerId: true,
  delivery: true,
  fees: true,
  discountAmountCents: true,
  discountReason: true,
  items: true,
});

export const fullCheckoutPayloadSchema = z.object({
  mode: z.literal("full"),
  idempotencyKey: z.string().uuid(),
  customerId: z.string().min(1).max(128).nullable().optional(),
  source: posCheckoutSourceSchema.optional().default("legacy-sales"),
  payment: fullPosPaymentSchema,
  items: z
    .array(
      cartLineItemSchema.extend({
        inventoryId: z.string().min(1).max(128),
        source: z.literal("inventory"),
        qty: z.number().positive(),
      }),
    )
    .min(1),
  discountAmountCents: z.number().int().nonnegative().optional(),
  discountReason: z.string().min(1).max(100).optional(),
  expectedTotal: z.number().nonnegative().optional(),
  taxAmount: z.number().nonnegative().default(0),
  fees: z.array(posFeeSchema).optional().default([]),
  paymentRef: z.string().min(1).optional(),
  paymentTenders: z.array(posPaymentTenderSchema).optional(),
  amountPaid: z.number().nonnegative().optional(),
  deliveryManagementId: z.string().min(1).max(128).nullable().optional(),
  deliveryAddress: z.string().optional(),
  deliveryPrice: z.number().nonnegative().optional().default(0),
  delivery: quickPosDeliverySchema.optional(),
});

export const checkoutPayloadSchema = z.discriminatedUnion("mode", [
  quickCheckoutPayloadSchema,
  fullCheckoutPayloadSchema,
]);

export const receiptOutputSchema = z.object({
  saleId: z.string().uuid().or(z.string().min(1)),
  total: z.number().nonnegative(),
  receipt: posReceiptOptionSchema,
  channels: z
    .array(z.object({ type: z.string().min(1), value: z.string().min(1) }))
    .default([]),
});

export const quickPosBootstrapItemSchema = z.object({
  id: z.string(),
  name: z.string(),
  price: z.number().nonnegative(),
  sku: z.string().optional().nullable(),
  barcode: z.string().optional().nullable(),
  quantity_on_hand: z.number().nonnegative(),
  commerce_config: quickPosCommerceConfigSchema.optional(),
  fractional_config: quickPosCommerceConfigSchema.optional(),
});

export const quickPosBootstrapResponseSchema = z.object({
  favorites: z.array(quickPosBootstrapItemSchema).default([]),
  recentlySold: z.array(quickPosBootstrapItemSchema).default([]),
  creditPolicy: z.object({
    enabled: z.boolean(),
  }).optional(),
  deliveryPolicy: z.object({
    feeTaxable: z.boolean(),
    dispatchSlaMinutes: z.number().int().positive().optional(),
  }).optional(),
  cardFeePolicy: z.object({
    enabled: z.boolean(),
    feeType: z.enum(["percent", "percentage", "flat", "both"]),
    feeBps: z.number().int().nonnegative(),
    feeFlatCents: z.number().int().nonnegative(),
  }).optional(),
});

export type PosMode = z.infer<typeof posModeSchema>;
export type PosPaymentMethod = z.infer<typeof posPaymentMethodSchema>;
export type PosQuickPaymentMethod = z.infer<typeof posQuickPaymentMethodSchema>;
export type PosReceiptOption = z.infer<typeof posReceiptOptionSchema>;
export type PosCartItemSource = z.infer<typeof posCartItemSourceSchema>;
export type PosCheckoutSource = z.infer<typeof posCheckoutSourceSchema>;
export type PosScope = z.infer<typeof posScopeSchema>;
export type PosProduct = z.infer<typeof posProductSchema>;
export type StockAdjustment = z.infer<typeof stockAdjustmentSchema>;
export type CartLineItem = z.infer<typeof cartLineItemSchema>;
export type PosFee = z.infer<typeof posFeeSchema>;
export type QuickCheckoutPayload = z.infer<typeof quickCheckoutPayloadSchema>;
export type QuickPosQuotePayload = z.infer<typeof quickPosQuotePayloadSchema>;
export type FullCheckoutPayload = z.infer<typeof fullCheckoutPayloadSchema>;
export type CheckoutPayload = z.infer<typeof checkoutPayloadSchema>;
export type ReceiptOutput = z.infer<typeof receiptOutputSchema>;
export type QuickPosBootstrapItem = z.infer<typeof quickPosBootstrapItemSchema>;
export type QuickPosBootstrapResponseContract = z.infer<
  typeof quickPosBootstrapResponseSchema
>;

// Backward-compatible aliases for existing imports during the transition.
export const posCheckoutSchema = checkoutPayloadSchema;
export type PosCheckoutRequest = CheckoutPayload;
