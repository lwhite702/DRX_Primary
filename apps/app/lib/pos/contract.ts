import { z } from "zod";

export const posModeSchema = z.enum(["quick", "full"]);
export const posPaymentMethodSchema = z.enum([
  "cash",
  "card",
  "credit",
  "mixed",
  "zelle",
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
  inventoryId: z.string().uuid(),
  quantityDelta: z.number().int(),
  reason: z.string().min(1),
  lowStockThreshold: z.number().int().nonnegative().optional(),
});

export const cartLineItemSchema = z.object({
  id: z.string().min(1),
  inventoryId: z.string().uuid().nullable(),
  name: z.string().min(1),
  sku: z.string().min(1).optional().nullable(),
  barcode: z.string().min(1).optional().nullable(),
  unitPrice: z.number().nonnegative(),
  qty: z.number().int().positive(),
  source: posCartItemSourceSchema,
  weightGrams: z.number().positive().optional(),
  pricePerGram: z.number().positive().optional(),
  bulkTierApplied: z.string().min(1).optional(),
  loyaltyDiscountApplied: z.number().nonnegative().optional(),
  originalPrice: z.number().nonnegative().optional(),
  overrideReason: z.string().min(1).optional(),
});

export const posFeeSchema = z.object({
  type: z.string().min(1),
  amount: z.number().nonnegative().optional(),
  value: z.string().optional(),
});

export const quickPosPaymentSchema = z.object({
  method: posQuickPaymentMethodSchema,
  receipt: posReceiptOptionSchema,
  creditConfirmed: z.boolean().default(false),
});

export const fullPosPaymentSchema = z.object({
  method: posPaymentMethodSchema,
  receipt: posReceiptOptionSchema.default("none"),
  creditConfirmed: z.boolean().default(false),
});

export const quickCheckoutPayloadSchema = z.object({
  mode: z.literal("quick"),
  idempotencyKey: z.string().uuid(),
  customerId: z.string().uuid().nullable().optional(),
  source: posCheckoutSourceSchema.optional().default("quick-pos"),
  payment: quickPosPaymentSchema,
  items: z.array(cartLineItemSchema).min(1),
});

export const quickPosQuotePayloadSchema = quickCheckoutPayloadSchema.pick({
  mode: true,
  customerId: true,
  items: true,
});

export const fullCheckoutPayloadSchema = z.object({
  mode: z.literal("full"),
  idempotencyKey: z.string().uuid(),
  customerId: z.string().uuid().nullable().optional(),
  source: posCheckoutSourceSchema.optional().default("legacy-sales"),
  payment: fullPosPaymentSchema,
  items: z
    .array(
      cartLineItemSchema.extend({
        inventoryId: z.string().uuid(),
        source: z.literal("inventory"),
      }),
    )
    .min(1),
  taxAmount: z.number().nonnegative().default(0),
  fees: z.array(posFeeSchema).optional().default([]),
  paymentRef: z.string().min(1).optional(),
  amountPaid: z.number().nonnegative().optional(),
  deliveryManagementId: z.string().uuid().nullable().optional(),
  deliveryAddress: z.string().optional(),
  deliveryPrice: z.number().nonnegative().optional().default(0),
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
  quantity_on_hand: z.number().int().nonnegative(),
});

export const quickPosBootstrapResponseSchema = z.object({
  favorites: z.array(quickPosBootstrapItemSchema),
  recentlySold: z.array(quickPosBootstrapItemSchema),
  creditPolicy: z.object({
    enabled: z.boolean(),
  }),
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
