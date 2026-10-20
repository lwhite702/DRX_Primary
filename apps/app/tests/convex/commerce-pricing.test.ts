import { describe, expect, it } from "vitest";
import {
  calculateCheckoutPricing,
  calculateQuantityForDollarAmount,
  calculateSuggestedQuantityForDollarAmount,
  type CommerceProduct,
} from "../../convex/helpers/pricing";

const fractionalProduct: CommerceProduct = {
  productId: "product-1",
  productName: "Fractional Product",
  baseUnitPriceCents: 1_000,
  taxable: true,
  allowFractional: true,
  quantityPrecision: 2,
  minimumSaleQuantity: 0.25,
  quantityIncrement: 0.05,
  bulkPriceTiers: [
    { minimumQuantity: 2, unitPriceCents: 900 },
    { minimumQuantity: 5, unitPriceCents: 800 },
  ],
};

describe("shared commerce pricing", () => {
  it("charges exact bundle totals at fractional thresholds and keeps the rate for larger sales", () => {
    const product = { ...fractionalProduct, baseUnitPriceCents: 3_500,
      bulkPriceTiers: [
        { minimumQuantity: 2, unitPriceCents: 3_000, bundlePriceCents: 6_000 },
        { minimumQuantity: 3.5, unitPriceCents: 2_571, bundlePriceCents: 9_000 },
        { minimumQuantity: 7, unitPriceCents: 2_000, bundlePriceCents: 14_000 },
      ] };
    for (const [quantity, total] of [[1, 3_500], [2, 6_000], [3.5, 9_000], [7, 14_000], [7.5, 15_000]]) {
      expect(calculateCheckoutPricing({ lines: [{ product, quantity }], loyaltyDiscountRateBps: 0, loyaltyCombinationPolicy: "best_only" }).lines[0].lineSubtotalCents).toBe(total);
    }
    expect(calculateSuggestedQuantityForDollarAmount({ amountCents: 9_000, product }).suggestedQuantity).toBe(3.5);
  });
  it("anchors quantity increments at the configured minimum", () => {
    const anchoredProduct = {
      ...fractionalProduct,
      quantityPrecision: 1,
      minimumSaleQuantity: 0.3,
      quantityIncrement: 0.2,
    };
    expect(
      calculateCheckoutPricing({
        lines: [{ product: anchoredProduct, quantity: 0.3 }],
        loyaltyDiscountRateBps: 0,
        loyaltyCombinationPolicy: "best_only",
      }).lines[0].quantity,
    ).toBe(0.3);
    expect(
      calculateCheckoutPricing({
        lines: [{ product: anchoredProduct, quantity: 0.5 }],
        loyaltyDiscountRateBps: 0,
        loyaltyCombinationPolicy: "best_only",
      }).lines[0].quantity,
    ).toBe(0.5);
    expect(() =>
      calculateCheckoutPricing({
        lines: [{ product: anchoredProduct, quantity: 0.4 }],
        loyaltyDiscountRateBps: 0,
        loyaltyCombinationPolicy: "best_only",
      }),
    ).toThrow("minimum increment");
  });
  it("rounds a fractional line once after choosing the highest applicable bulk tier", () => {
    const result = calculateCheckoutPricing({
      lines: [{ product: fractionalProduct, quantity: 2.345 }],
      loyaltyDiscountRateBps: 0,
      loyaltyCombinationPolicy: "best_only",
    });

    expect(result.lines[0]).toMatchObject({
      quantity: 2.35,
      baseUnitPriceCents: 1_000,
      appliedUnitPriceCents: 900,
      baseLineTotalCents: 2_350,
      lineSubtotalCents: 2_115,
      bulkDiscountCents: 235,
      loyaltyDiscountCents: 0,
      lineDiscountCents: 235,
    });
    expect(result).toMatchObject({
      merchandiseSubtotalCents: 2_350,
      discountCents: 235,
      merchandiseTotalCents: 2_115,
    });
  });

  it("keeps the operator-confirmed dollar amount while retaining its quantity and price variance", () => {
    const product = { ...fractionalProduct, baseUnitPriceCents: 3_500, bulkPriceTiers: [] };
    const result = calculateCheckoutPricing({
      lines: [{ product, quantity: 0.7, requestedAmountCents: 2_500 }],
      loyaltyDiscountRateBps: 0,
      loyaltyCombinationPolicy: "best_only",
    });

    expect(result.lines[0]).toMatchObject({
      quantity: 0.7,
      requestedAmountCents: 2_500,
      lineSubtotalCents: 2_500,
      appliedUnitPriceCents: 2_500 / 0.7,
      operatorPriceAdjustmentCents: 50,
    });
    expect(result).toMatchObject({
      merchandiseSubtotalCents: 2_450,
      merchandiseTotalCents: 2_500,
      priceAdjustmentCents: 50,
    });
  });

  it("stacks loyalty after bulk pricing when configured", () => {
    const result = calculateCheckoutPricing({
      lines: [{ product: fractionalProduct, quantity: 5 }],
      loyaltyDiscountRateBps: 1_000,
      loyaltyCombinationPolicy: "stack",
    });

    expect(result.lines[0]).toMatchObject({
      baseLineTotalCents: 5_000,
      lineSubtotalCents: 3_600,
      bulkDiscountCents: 1_000,
      loyaltyDiscountCents: 400,
      lineDiscountCents: 1_400,
    });
  });

  it("uses only the better bulk or loyalty benefit under best-only policy", () => {
    const result = calculateCheckoutPricing({
      lines: [{ product: fractionalProduct, quantity: 5 }],
      loyaltyDiscountRateBps: 2_500,
      loyaltyCombinationPolicy: "best_only",
    });

    expect(result.lines[0]).toMatchObject({
      appliedUnitPriceCents: 1_000,
      lineSubtotalCents: 3_750,
      bulkDiscountCents: 0,
      loyaltyDiscountCents: 1_250,
      lineDiscountCents: 1_250,
    });
  });

  it("rejects quantities below the minimum or outside the configured increment", () => {
    expect(() =>
      calculateCheckoutPricing({
        lines: [{ product: fractionalProduct, quantity: 0.1 }],
        loyaltyDiscountRateBps: 0,
        loyaltyCombinationPolicy: "best_only",
      }),
    ).toThrow("minimum sale quantity");

    expect(() =>
      calculateCheckoutPricing({
        lines: [
          {
            product: {
              ...fractionalProduct,
              minimumSaleQuantity: 0.25,
              quantityIncrement: 0.25,
            },
            quantity: 0.3,
          },
        ],
        loyaltyDiscountRateBps: 0,
        loyaltyCombinationPolicy: "best_only",
      }),
    ).toThrow("minimum increment");
  });

  it("converts a dollar amount to a precision-safe suggested quantity", () => {
    expect(
      calculateQuantityForDollarAmount({
        amountCents: 2_115,
        unitPriceCents: 900,
        quantityPrecision: 2,
      }),
    ).toBe(2.35);
    expect(
      calculateSuggestedQuantityForDollarAmount({
        amountCents: 1_800,
        product: fractionalProduct,
      }),
    ).toMatchObject({
      suggestedQuantity: 2,
      appliedUnitPriceCents: 900,
      estimatedSubtotalCents: 1_800,
    });
  });
});
