import type { OfflineSaleItem } from "../offline/types";

export type OfflineQuantityProduct = {
  _id: string;
  allowFractionalWeight?: boolean;
  quantityPrecision?: number;
  minimumSaleQuantity?: number;
  quantityIncrement?: number;
};

export class OfflineQuantityValidationError extends Error {
  constructor(public readonly code: string) {
    super(code);
    this.name = "OfflineQuantityValidationError";
  }
}

export function hasNormalizedOfflineQuantityConfig(product: OfflineQuantityProduct) {
  return typeof product.allowFractionalWeight === "boolean" &&
    Number.isInteger(product.quantityPrecision) &&
    product.quantityPrecision !== undefined &&
    product.quantityPrecision >= 0 &&
    product.quantityPrecision <= 6 &&
    (product.allowFractionalWeight || product.quantityPrecision === 0) &&
    product.minimumSaleQuantity !== undefined &&
    Number.isFinite(product.minimumSaleQuantity) &&
    product.minimumSaleQuantity > 0 &&
    product.quantityIncrement !== undefined &&
    Number.isFinite(product.quantityIncrement) &&
    product.quantityIncrement > 0;
}

function requireQuantityRules(product: OfflineQuantityProduct) {
  const precision = product.quantityPrecision;
  const minimum = product.minimumSaleQuantity;
  const increment = product.quantityIncrement;
  if (!hasNormalizedOfflineQuantityConfig(product)) {
    throw new OfflineQuantityValidationError("OFFLINE_PRODUCT_QUANTITY_CONFIG_UNAVAILABLE");
  }
  return { precision: precision!, minimum: minimum!, increment: increment! };
}

function approximatelyInteger(value: number) {
  return Math.abs(value - Math.round(value)) <= 1e-7;
}

export function validateOfflineSaleQuantities(
  items: OfflineSaleItem[],
  products: OfflineQuantityProduct[],
) {
  const productsById = new Map(products.map((product) => [product._id, product]));
  for (const item of items) {
    const product = productsById.get(item.productId);
    if (!product) {
      throw new OfflineQuantityValidationError("OFFLINE_PRODUCT_QUANTITY_CONFIG_UNAVAILABLE");
    }
    const rules = requireQuantityRules(product);
    if (!Number.isFinite(item.quantityGrams) || item.quantityGrams < rules.minimum) {
      throw new OfflineQuantityValidationError("OFFLINE_QUANTITY_BELOW_MINIMUM");
    }
    const scale = 10 ** rules.precision;
    if (!approximatelyInteger(item.quantityGrams * scale)) {
      throw new OfflineQuantityValidationError("OFFLINE_QUANTITY_PRECISION_INVALID");
    }
    if (!approximatelyInteger((item.quantityGrams - rules.minimum) / rules.increment)) {
      throw new OfflineQuantityValidationError("OFFLINE_QUANTITY_INCREMENT_INVALID");
    }
  }
}
