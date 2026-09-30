import type { FunctionReturnType } from "convex/server";
import { api } from "@/convex/_generated/api";
import { fromCanonical, gramFactorForUnit, type DRXUnit } from "@/lib/units/convert";

export function catalogResponse(product: FunctionReturnType<typeof api.products.getCatalogProduct>) {
  const unit = (product.sellingUnit ?? "g") as DRXUnit;
  const isConverted = typeof product.gramFactor === "number";
  const factor = product.gramFactor ?? gramFactorForUnit(unit);

  const displayQty = product.quantityOnHandGrams;
  const displayReorder = product.reorderLevelGrams;
  const inventoryInGrams = product.quantityOnHandGrams * factor;

  return {
    id: product._id,
    businessId: product.businessId,
    sku: product.sku,
    barcode: product.barcode,
    productName: product.productName,
    description: product.description,
    category: product.category,
    location: product.location,
    isTaxable: product.isTaxable,
    quantityOnHand: displayQty,
    inventoryInGrams,
    reorderLevel: displayReorder,
    gramFactor: factor,
    unitCost: product.unitCostCents / 100,
    sellingPrice: product.sellingPriceCents / 100,
    unitOfMeasure: product.sellingUnit,
    baseUnit: product.sellingUnit,
    allowFractionalWeight: product.allowFractionalWeight,
    isActive: product.isActive,
    is_active: product.isActive,
    createdAt: new Date(product.createdAt).toISOString(),
    updatedAt: new Date(product.updatedAt).toISOString(),
  };
}
