import { describe, expect, it } from "vitest";
import {
  calculateDeliveryFinancials,
  calculateFractionalLine,
  suggestQuantityForDollars,
  type FractionalProductConfig,
} from "@/lib/quick-pos/commerce";

const config: FractionalProductConfig = {
  sellingUnit: "g",
  decimalPrecision: 2,
  minimumSaleQuantity: 0.01,
  quantityIncrement: 0.01,
  baseUnitPrice: 4,
  bulkPriceTiers: [
    { id: "five", label: "5g+", minimumQuantity: 5, unitPrice: 3.5 },
    { id: "ten", label: "10g+", minimumQuantity: 10, unitPrice: 3 },
  ],
};

describe("fractional commerce calculations", () => {
  it("suggests a sellable quantity from a dollar amount using the active bulk tier", () => {
    expect(suggestQuantityForDollars(25, config)).toEqual({
      quantity: 7.14,
      sellingUnit: "g",
      unitPrice: 3.5,
      lineTotal: 24.99,
      bulkTier: { id: "five", label: "5g+", minimumQuantity: 5, unitPrice: 3.5 },
      belowMinimum: false,
    });
  });

  it("calculates a quantity-entered line and applies the highest eligible tier", () => {
    expect(calculateFractionalLine(10.25, config)).toEqual({
      quantity: 10.25,
      sellingUnit: "g",
      unitPrice: 3,
      lineTotal: 30.75,
      bulkTier: { id: "ten", label: "10g+", minimumQuantity: 10, unitPrice: 3 },
    });
  });

  it("rejects an amount below the configured minimum sale quantity", () => {
    expect(suggestQuantityForDollars(0.01, config)).toMatchObject({
      quantity: 0,
      lineTotal: 0,
      belowMinimum: true,
    });
  });

  it("anchors quantity and dollar suggestions at a minimum distinct from the increment", () => {
    const anchoredConfig: FractionalProductConfig = {
      sellingUnit: "g",
      decimalPrecision: 6,
      minimumSaleQuantity: 0.1,
      quantityIncrement: 0.25,
      baseUnitPrice: 10,
      bulkPriceTiers: [],
    };

    expect(calculateFractionalLine(0.34, anchoredConfig)).toMatchObject({
      quantity: 0.35,
      lineTotal: 3.5,
    });
    expect(calculateFractionalLine(0.22, anchoredConfig)).toMatchObject({
      quantity: 0.1,
      lineTotal: 1,
    });
    expect(suggestQuantityForDollars(3.6, anchoredConfig)).toMatchObject({
      quantity: 0.35,
      lineTotal: 3.5,
      belowMinimum: false,
    });
  });

  it("preserves a valid six-decimal anchored quantity", () => {
    const preciseConfig: FractionalProductConfig = {
      sellingUnit: "kg",
      decimalPrecision: 6,
      minimumSaleQuantity: 0.000001,
      quantityIncrement: 0.000002,
      baseUnitPrice: 1_000_000,
      bulkPriceTiers: [],
    };

    expect(calculateFractionalLine(0.000005, preciseConfig)).toMatchObject({
      quantity: 0.000005,
      lineTotal: 5,
    });
  });

  it("separates charged and absorbed delivery economics", () => {
    expect(
      calculateDeliveryFinancials({
        vendorFeeCents: 1250,
        feeAllocation: "charge_customer",
        feeTaxable: true,
        taxRate: 0.08,
      }),
    ).toEqual({
      deliveryRevenueCents: 1250,
      vendorDeliveryExpenseCents: 1250,
      deliveryTaxCents: 100,
      customerChargeCents: 1350,
      deliveryProfitCents: 0,
    });

    expect(
      calculateDeliveryFinancials({
        vendorFeeCents: 1250,
        feeAllocation: "absorb",
        feeTaxable: true,
        taxRate: 0.08,
      }),
    ).toEqual({
      deliveryRevenueCents: 0,
      vendorDeliveryExpenseCents: 1250,
      deliveryTaxCents: 0,
      customerChargeCents: 0,
      deliveryProfitCents: -1250,
    });
  });
});
