import type { Doc } from "../_generated/dataModel";
import { gramFactorForUnit, type DRXUnit } from "../../lib/units/convert";

export const FRACTIONAL_COMMERCE_DEFAULTS = {
  sellingUnit: "unit",
  quantityPrecision: 6,
  minimumSaleQuantity: 0.000001,
  quantityIncrement: 0.000001,
} as const;

export const WHOLE_COMMERCE_DEFAULTS = {
  sellingUnit: "unit",
  quantityPrecision: 0,
  minimumSaleQuantity: 1,
  quantityIncrement: 1,
} as const;

export function defaultCommerceConfig(allowFractionalWeight: boolean) {
  return allowFractionalWeight
    ? FRACTIONAL_COMMERCE_DEFAULTS
    : WHOLE_COMMERCE_DEFAULTS;
}

export function normalizeProductCommerceConfig(
  product: Pick<
    Doc<"products">,
    | "allowFractionalWeight"
    | "sellingUnit"
    | "gramFactor"
    | "quantityPrecision"
    | "minimumSaleQuantity"
    | "quantityIncrement"
    | "suggestedQuantityPresets"
    | "suggestedDollarPresetsCents"
    | "bulkPriceTiers"
  >,
) {
  const defaults = defaultCommerceConfig(product.allowFractionalWeight);
  const effectiveSellingUnit = (product.sellingUnit ?? defaults.sellingUnit) as DRXUnit;
  const hasCompleteQuantityConfig =
    product.quantityPrecision !== undefined &&
    product.minimumSaleQuantity !== undefined &&
    product.quantityIncrement !== undefined;
  return {
    sellingUnit: effectiveSellingUnit,
    gramFactor: product.gramFactor ?? gramFactorForUnit(effectiveSellingUnit),
    quantityPrecision: hasCompleteQuantityConfig
      ? product.quantityPrecision!
      : defaults.quantityPrecision,
    minimumSaleQuantity: hasCompleteQuantityConfig
      ? product.minimumSaleQuantity!
      : defaults.minimumSaleQuantity,
    quantityIncrement: hasCompleteQuantityConfig
      ? product.quantityIncrement!
      : defaults.quantityIncrement,
    suggestedQuantityPresets: product.suggestedQuantityPresets ?? [],
    suggestedDollarPresetsCents: product.suggestedDollarPresetsCents ?? [],
    bulkPriceTiers: product.bulkPriceTiers ?? [],
  };
}
