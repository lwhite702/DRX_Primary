import { describe, expect, it } from "vitest";
import {
  hasNormalizedOfflineQuantityConfig,
  OfflineQuantityValidationError,
  validateOfflineSaleQuantities,
  type OfflineQuantityProduct,
} from "./offlineSaleValidation";
import type { OfflineSaleItem } from "../offline/types";

describe("offlineSaleValidation", () => {
  const wholeProduct: OfflineQuantityProduct = {
    _id: "prod_whole",
    allowFractionalWeight: false,
    quantityPrecision: 0,
    minimumSaleQuantity: 1,
    quantityIncrement: 1,
  };

  const fractionalProduct: OfflineQuantityProduct = {
    _id: "prod_frac",
    allowFractionalWeight: true,
    quantityPrecision: 3,
    minimumSaleQuantity: 0.125,
    quantityIncrement: 0.125,
  };

  describe("hasNormalizedOfflineQuantityConfig", () => {
    it("returns true for valid whole-quantity configuration", () => {
      expect(hasNormalizedOfflineQuantityConfig(wholeProduct)).toBe(true);
    });

    it("returns true for valid fractional-quantity configuration", () => {
      expect(hasNormalizedOfflineQuantityConfig(fractionalProduct)).toBe(true);
    });

    it("returns false if precision exceeds 6", () => {
      expect(
        hasNormalizedOfflineQuantityConfig({
          ...fractionalProduct,
          quantityPrecision: 7,
        }),
      ).toBe(false);
    });

    it("returns false if precision is negative", () => {
      expect(
        hasNormalizedOfflineQuantityConfig({
          ...fractionalProduct,
          quantityPrecision: -1,
        }),
      ).toBe(false);
    });

    it("returns false if fractional weight is false but precision is > 0", () => {
      expect(
        hasNormalizedOfflineQuantityConfig({
          ...wholeProduct,
          quantityPrecision: 2,
        }),
      ).toBe(false);
    });

    it("returns false if minimum sale quantity is 0 or negative", () => {
      expect(
        hasNormalizedOfflineQuantityConfig({
          ...wholeProduct,
          minimumSaleQuantity: 0,
        }),
      ).toBe(false);
      expect(
        hasNormalizedOfflineQuantityConfig({
          ...wholeProduct,
          minimumSaleQuantity: -1,
        }),
      ).toBe(false);
    });

    it("returns false if quantity increment is 0 or negative", () => {
      expect(
        hasNormalizedOfflineQuantityConfig({
          ...wholeProduct,
          quantityIncrement: 0,
        }),
      ).toBe(false);
      expect(
        hasNormalizedOfflineQuantityConfig({
          ...wholeProduct,
          quantityIncrement: -0.5,
        }),
      ).toBe(false);
    });
  });

  describe("validateOfflineSaleQuantities", () => {
    it("accepts valid whole and fractional sale items", () => {
      const items: OfflineSaleItem[] = [
        {
          productId: "prod_whole",
          quantityGrams: 2,
          unitPriceCents: 500,
        },
        {
          productId: "prod_frac",
          quantityGrams: 0.5, // 0.125 + 3 * 0.125
          unitPriceCents: 1000,
        },
      ];
      expect(() =>
        validateOfflineSaleQuantities(items, [wholeProduct, fractionalProduct]),
      ).not.toThrow();
    });

    it("throws OFFLINE_PRODUCT_QUANTITY_CONFIG_UNAVAILABLE when product is missing from catalog", () => {
      const items: OfflineSaleItem[] = [
        {
          productId: "prod_unknown",
          quantityGrams: 1,
          unitPriceCents: 100,
        },
      ];
      expect(() =>
        validateOfflineSaleQuantities(items, [wholeProduct]),
      ).toThrowError(
        new OfflineQuantityValidationError("OFFLINE_PRODUCT_QUANTITY_CONFIG_UNAVAILABLE"),
      );
    });

    it("throws OFFLINE_QUANTITY_BELOW_MINIMUM when item quantity is below minimum", () => {
      const items: OfflineSaleItem[] = [
        {
          productId: "prod_frac",
          quantityGrams: 0.05, // Below minimum 0.125
          unitPriceCents: 1000,
        },
      ];
      expect(() =>
        validateOfflineSaleQuantities(items, [fractionalProduct]),
      ).toThrowError(
        new OfflineQuantityValidationError("OFFLINE_QUANTITY_BELOW_MINIMUM"),
      );
    });

    it("throws OFFLINE_QUANTITY_PRECISION_INVALID when item exceeds precision", () => {
      const items: OfflineSaleItem[] = [
        {
          productId: "prod_whole",
          quantityGrams: 1.5, // Whole requires precision 0
          unitPriceCents: 500,
        },
      ];
      expect(() =>
        validateOfflineSaleQuantities(items, [wholeProduct]),
      ).toThrowError(
        new OfflineQuantityValidationError("OFFLINE_QUANTITY_PRECISION_INVALID"),
      );
    });

    it("throws OFFLINE_QUANTITY_INCREMENT_INVALID when quantity does not align with step", () => {
      const items: OfflineSaleItem[] = [
        {
          productId: "prod_frac",
          quantityGrams: 0.2, // minimum 0.125, increment 0.125: steps are 0.125, 0.250, 0.375...
          unitPriceCents: 1000,
        },
      ];
      expect(() =>
        validateOfflineSaleQuantities(items, [fractionalProduct]),
      ).toThrowError(
        new OfflineQuantityValidationError("OFFLINE_QUANTITY_INCREMENT_INVALID"),
      );
    });
  });
});
