import { describe, expect, it } from "vitest";
import {
  commerceSettingsSchema,
  getDefaultCommerceSettings,
  productCommerceConfigSchema,
} from "@/lib/commerce/config";

describe("commerce configuration", () => {
  it("provides the agreed delivery reminder and loyalty defaults", () => {
    expect(getDefaultCommerceSettings().merchant).toMatchObject({
      loyaltyCombinationPolicy: "best_only",
      deliveryFeeTaxable: false,
      dispatchSlaMinutes: 5,
      escalationDelayMinutes: 10,
    });
  });

  it("rejects duplicate bulk thresholds and non-increasing loyalty thresholds", () => {
    const result = commerceSettingsSchema.safeParse({
      merchant: getDefaultCommerceSettings().merchant,
      productConfigs: {
        "11111111-1111-4111-8111-111111111111": {
          fractionalEnabled: true,
          sellingUnit: "g",
          decimalPrecision: 2,
          minimumSaleQuantity: 0.01,
          quantityIncrement: 0.01,
          suggestedDollarAmounts: [10, 20],
          suggestedQuantities: [3.5, 7],
          bulkPriceTiers: [
            { id: "a", label: "5g+", minimumQuantity: 5, unitPrice: 4 },
            { id: "b", label: "Duplicate", minimumQuantity: 5, unitPrice: 3.5 },
          ],
        },
      },
    });

    expect(result.success).toBe(false);
  });

  it("preserves separate minimum and increment values through six decimals", () => {
    const result = productCommerceConfigSchema.parse({
      fractionalEnabled: true,
      sellingUnit: "g",
      decimalPrecision: 6,
      minimumSaleQuantity: 0.1,
      quantityIncrement: 0.25,
      suggestedDollarAmounts: [5, 10],
      suggestedQuantities: [0.1, 0.35, 0.6],
      bulkPriceTiers: [],
    });

    expect(result).toMatchObject({
      decimalPrecision: 6,
      minimumSaleQuantity: 0.1,
      quantityIncrement: 0.25,
    });
  });

  it("rejects presets that are not minimum plus a whole number of increments", () => {
    const result = productCommerceConfigSchema.safeParse({
      fractionalEnabled: true,
      sellingUnit: "g",
      decimalPrecision: 6,
      minimumSaleQuantity: 0.1,
      quantityIncrement: 0.25,
      suggestedDollarAmounts: [5],
      suggestedQuantities: [0.25],
      bulkPriceTiers: [],
    });

    expect(result.success).toBe(false);
  });

  it("migrates the legacy combined increment without overwriting explicit fields", () => {
    const migrated = productCommerceConfigSchema.parse({
      fractionalEnabled: true,
      sellingUnit: "g",
      decimalPrecision: 2,
      minimumIncrement: 0.25,
      suggestedDollarAmounts: [5],
      suggestedQuantities: [0.25, 0.5],
      bulkPriceTiers: [],
    });
    const explicit = productCommerceConfigSchema.parse({
      fractionalEnabled: true,
      sellingUnit: "g",
      decimalPrecision: 2,
      minimumIncrement: 1,
      minimumSaleQuantity: 0.1,
      quantityIncrement: 0.25,
      suggestedDollarAmounts: [5],
      suggestedQuantities: [0.1, 0.35],
      bulkPriceTiers: [],
    });

    expect(migrated).toMatchObject({
      minimumSaleQuantity: 0.25,
      quantityIncrement: 0.25,
    });
    expect(explicit).toMatchObject({
      minimumSaleQuantity: 0.1,
      quantityIncrement: 0.25,
    });
    expect(explicit).not.toHaveProperty("minimumIncrement");
  });
});
