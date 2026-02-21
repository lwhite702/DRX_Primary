import { z } from "zod";

const receiptSchema = z.enum(["print", "sms", "none"]);

const quickItemSchema = z.object({
  id: z.string().min(1),
  inventoryId: z.string().uuid().nullable(),
  name: z.string().min(1),
  unitPrice: z.number().nonnegative(),
  qty: z.number().int().positive(),
  source: z.enum(["inventory", "manual"]),
});

const quickPaymentSchema = z.object({
  method: z.enum(["cash", "card", "credit"]),
  receipt: receiptSchema,
  creditConfirmed: z.boolean().default(false),
});

const quickCheckoutSchema = z.object({
  mode: z.literal("quick"),
  idempotencyKey: z.string().uuid(),
  customerId: z.string().uuid().nullable().optional(),
  payment: quickPaymentSchema,
  items: z.array(quickItemSchema).min(1),
});

const fullItemSchema = z.object({
  id: z.string().min(1),
  inventoryId: z.string().uuid(),
  name: z.string().min(1),
  unitPrice: z.number().nonnegative(),
  qty: z.number().int().positive(),
  source: z.literal("inventory"),
});

const fullPaymentSchema = z.object({
  method: z.enum(["cash", "card", "credit", "mixed", "zelle"]),
  receipt: receiptSchema.default("none"),
  creditConfirmed: z.boolean().default(false),
});

const feeSchema = z.object({
  type: z.string().min(1),
  amount: z.number().nonnegative().optional(),
});

const fullCheckoutSchema = z.object({
  mode: z.literal("full"),
  idempotencyKey: z.string().uuid(),
  customerId: z.string().uuid().nullable().optional(),
  payment: fullPaymentSchema,
  items: z.array(fullItemSchema).min(1),
  taxAmount: z.number().nonnegative().default(0),
  fees: z.array(feeSchema).optional().default([]),
});

export const posCheckoutSchema = z.discriminatedUnion("mode", [
  quickCheckoutSchema,
  fullCheckoutSchema,
]);

export type PosCheckoutRequest = z.infer<typeof posCheckoutSchema>;
