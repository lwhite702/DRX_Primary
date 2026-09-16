import { z } from "zod";
import {
  productCommerceConfigSchema,
  type ProductCommerceConfig,
} from "./config";

// Creation uses the same quantity lattice as checkout; it must never round
// an invalid preset or accept fractional rules for a whole-unit product.
export const newProductCommerceSchema = productCommerceConfigSchema.superRefine(
  (value, ctx) => {
    for (const field of ["minimumSaleQuantity", "quantityIncrement"] as const) {
      const scaled = value[field] * 10 ** value.decimalPrecision;
      if (
        !Number.isSafeInteger(Math.round(scaled)) ||
        Math.round(scaled) <= 0
      ) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: [field],
          message: "Quantity must fit the selected decimal places",
        });
      }
    }
    if (
      !value.fractionalEnabled &&
      (value.decimalPrecision !== 0 ||
        !Number.isInteger(value.minimumSaleQuantity) ||
        !Number.isInteger(value.quantityIncrement))
    ) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["quantityIncrement"],
        message:
          "Whole-unit products require whole-number quantities and zero decimal places",
      });
    }
    if (value.fractionalEnabled && value.decimalPrecision === 0) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["decimalPrecision"],
        message: "Choose at least one decimal place for fractional sales",
      });
    }
    for (const amount of value.suggestedDollarAmounts) {
      if (
        !Number.isSafeInteger(Math.round(amount * 100)) ||
        Math.abs(amount * 100 - Math.round(amount * 100)) > 1e-6
      ) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ["suggestedDollarAmounts"],
          message: "Dollar presets must use at most two decimal places",
        });
      }
    }
  },
);

export function creationCommerceDefaults(
  sellingUnit = "g",
  fractionalEnabled = false,
): ProductCommerceConfig {
  return {
    fractionalEnabled,
    sellingUnit,
    decimalPrecision: fractionalEnabled ? 2 : 0,
    minimumSaleQuantity: fractionalEnabled ? 0.01 : 1,
    quantityIncrement: fractionalEnabled ? 0.01 : 1,
    suggestedDollarAmounts: [],
    suggestedQuantities: [],
    bulkPriceTiers: [],
  };
}

export function parsePresetInput(value: string): number[] {
  if (!value.trim()) return [];
  return value
    .split(",")
    .map((part) => (part.trim() ? Number(part.trim()) : NaN));
}

export function canonicalCreationCommerce(config: ProductCommerceConfig) {
  const parsed = newProductCommerceSchema.parse(config);
  return {
    sellingUnit: parsed.sellingUnit,
    quantityPrecision: parsed.decimalPrecision,
    minimumSaleQuantity: parsed.minimumSaleQuantity,
    quantityIncrement: parsed.quantityIncrement,
    suggestedQuantityPresets: parsed.suggestedQuantities,
    suggestedDollarPresetsCents: parsed.suggestedDollarAmounts.map((amount) =>
      Math.round(amount * 100),
    ),
    bulkPriceTiers: parsed.bulkPriceTiers.map((tier) => ({
      minimumQuantity: tier.minimumQuantity,
      unitPriceCents: Math.round(tier.unitPrice * 100),
    })),
  };
}
