import { z } from "zod";

export const bulkPriceTierSchema = z.object({
  id: z.string().min(1),
  label: z.string().trim().min(1).max(50),
  minimumQuantity: z.number().positive(),
  unitPrice: z.number().positive(),
  totalPrice: z.number().positive().optional(),
});

function migrateLegacyProductConfig(value: unknown) {
  if (!value || typeof value !== "object" || Array.isArray(value)) return value;
  const candidate = { ...(value as Record<string, unknown>) };
  const legacyIncrement = candidate.minimumIncrement;
  if (candidate.minimumSaleQuantity === undefined && legacyIncrement !== undefined) {
    candidate.minimumSaleQuantity = legacyIncrement;
  }
  if (candidate.quantityIncrement === undefined && legacyIncrement !== undefined) {
    candidate.quantityIncrement = legacyIncrement;
  }
  delete candidate.minimumIncrement;
  return candidate;
}

function isAnchoredQuantity(
  quantity: number,
  minimum: number,
  increment: number,
  precision: number,
) {
  const scale = 10 ** precision;
  const scaledQuantity = Math.round(quantity * scale);
  const scaledMinimum = Math.round(minimum * scale);
  const scaledIncrement = Math.round(increment * scale);
  return (
    scaledIncrement > 0 &&
    Math.abs(quantity * scale - scaledQuantity) < 1e-6 &&
    scaledQuantity >= scaledMinimum &&
    (scaledQuantity - scaledMinimum) % scaledIncrement === 0
  );
}

export const productCommerceConfigSchema = z.preprocess(
  migrateLegacyProductConfig,
  z
    .object({
      fractionalEnabled: z.boolean(),
      sellingUnit: z.string().trim().min(1).max(12),
      decimalPrecision: z.number().int().min(0).max(6),
      minimumSaleQuantity: z.number().positive(),
      quantityIncrement: z.number().positive(),
      suggestedDollarAmounts: z.array(z.number().positive()).max(8),
      suggestedQuantities: z.array(z.number().positive()).max(8),
      bulkPriceTiers: z.array(bulkPriceTierSchema).max(12),
    })
    .superRefine((value, context) => {
      const scale = 10 ** value.decimalPrecision;
      if (
        Math.abs(
          value.minimumSaleQuantity * scale -
            Math.round(value.minimumSaleQuantity * scale),
        ) > 1e-6
      ) {
        context.addIssue({
          code: z.ZodIssueCode.custom,
          path: ["minimumSaleQuantity"],
          message: "Minimum sale quantity must fit the configured precision",
        });
      }
      if (
        Math.abs(
          value.quantityIncrement * scale -
            Math.round(value.quantityIncrement * scale),
        ) > 1e-6
      ) {
        context.addIssue({
          code: z.ZodIssueCode.custom,
          path: ["quantityIncrement"],
          message: "Quantity increment must fit the configured precision",
        });
      }
      for (const [index, quantity] of value.suggestedQuantities.entries()) {
        if (
          !isAnchoredQuantity(
            quantity,
            value.minimumSaleQuantity,
            value.quantityIncrement,
            value.decimalPrecision,
          )
        ) {
          context.addIssue({
            code: z.ZodIssueCode.custom,
            path: ["suggestedQuantities", index],
            message: "Suggested quantity must align to minimum + increments",
          });
        }
      }
      const thresholds = new Set<number>();
      for (const [index, tier] of value.bulkPriceTiers.entries()) {
        if (!isAnchoredQuantity(tier.minimumQuantity, value.minimumSaleQuantity, value.quantityIncrement, value.decimalPrecision)) {
          context.addIssue({ code: z.ZodIssueCode.custom, path: ["bulkPriceTiers", index, "minimumQuantity"], message: "Bulk quantity must match the selling rules" });
        }
        if (tier.totalPrice !== undefined && (!Number.isSafeInteger(Math.round(tier.totalPrice * 100)) || Math.abs(tier.totalPrice * 100 - Math.round(tier.totalPrice * 100)) > 1e-6)) {
          context.addIssue({ code: z.ZodIssueCode.custom, path: ["bulkPriceTiers", index, "totalPrice"], message: "Bundle total must use at most two decimal places" });
        }
        if (thresholds.has(tier.minimumQuantity)) {
          context.addIssue({
            code: z.ZodIssueCode.custom,
            path: ["bulkPriceTiers", index, "minimumQuantity"],
            message: "Bulk thresholds must be unique",
          });
        }
        thresholds.add(tier.minimumQuantity);
      }
      if (value.bulkPriceTiers.some((tier, index, tiers) => index > 0 && tier.minimumQuantity <= tiers[index - 1].minimumQuantity)) {
        context.addIssue({ code: z.ZodIssueCode.custom, path: ["bulkPriceTiers"], message: "Bulk quantities must increase" });
      }
    }),
);

export const loyaltyTierSchema = z.object({
  id: z.string().min(1),
  label: z.string().trim().min(1).max(50),
  minimumSpendCents: z.number().int().nonnegative(),
  discountRate: z.number().min(0).max(1),
});

export const merchantCommerceSettingsSchema = z
  .object({
    loyaltyCombinationPolicy: z.enum(["stack", "best_only"]),
    loyaltyTiers: z.array(loyaltyTierSchema).max(12),
    deliveryFeeTaxable: z.boolean(),
    dispatchSlaMinutes: z.number().int().min(1).max(120),
    escalationDelayMinutes: z.number().int().min(1).max(240),
    managerNotificationTargets: z.array(z.string().trim().min(1).max(200)).max(20),
    cardProcessorFeeEnabled: z.boolean().optional(),
    cardProcessorFeeType: z.enum(["percentage", "flat", "both"]).optional(),
    cardProcessorFeeBps: z.number().int().min(0).max(5000).optional(),
    cardProcessorFeeFlatCents: z.number().int().min(0).max(50000).optional(),
  })
  .superRefine((value, context) => {
    let previous = -1;
    const sorted = [...value.loyaltyTiers].sort(
      (left, right) => left.minimumSpendCents - right.minimumSpendCents,
    );
    for (const [index, tier] of sorted.entries()) {
      if (tier.minimumSpendCents <= previous) {
        context.addIssue({
          code: z.ZodIssueCode.custom,
          path: ["loyaltyTiers", index, "minimumSpendCents"],
          message: "Loyalty spend thresholds must increase",
        });
      }
      previous = tier.minimumSpendCents;
    }
  });

export const commerceSettingsSchema = z.object({
  merchant: merchantCommerceSettingsSchema,
  productConfigs: z.record(z.string().uuid(), productCommerceConfigSchema),
});

export type ProductCommerceConfig = z.infer<typeof productCommerceConfigSchema>;
export type MerchantCommerceSettings = z.infer<typeof merchantCommerceSettingsSchema>;
export type CommerceSettings = z.infer<typeof commerceSettingsSchema>;

export function getDefaultProductCommerceConfig(): ProductCommerceConfig {
  return {
    fractionalEnabled: false,
    sellingUnit: "unit",
    decimalPrecision: 0,
    minimumSaleQuantity: 1,
    quantityIncrement: 1,
    suggestedDollarAmounts: [10, 20, 50],
    suggestedQuantities: [1, 3, 7],
    bulkPriceTiers: [],
  };
}

export function getDefaultCommerceSettings(): CommerceSettings {
  return {
    merchant: {
      loyaltyCombinationPolicy: "best_only",
      loyaltyTiers: [],
      deliveryFeeTaxable: false,
      dispatchSlaMinutes: 5,
      escalationDelayMinutes: 10,
      managerNotificationTargets: [],
    },
    productConfigs: {},
  };
}

export function readCommerceSettings(settingsData: unknown): CommerceSettings {
  if (!settingsData || typeof settingsData !== "object" || Array.isArray(settingsData)) {
    return getDefaultCommerceSettings();
  }

  const candidate = (settingsData as Record<string, unknown>).commerce;
  const parsed = commerceSettingsSchema.safeParse(candidate);
  return parsed.success ? parsed.data : getDefaultCommerceSettings();
}
