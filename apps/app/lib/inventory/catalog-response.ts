import type { FunctionReturnType } from "convex/server";
import { api } from "@/convex/_generated/api";
export function catalogResponse(product: FunctionReturnType<typeof api.products.getCatalogProduct>) {
  return {
          id: product._id, businessId: product.businessId, sku: product.sku,
          productName: product.productName, description: product.description,
          category: product.category, location: product.location, isTaxable: product.isTaxable,
          quantityOnHand: product.quantityOnHandGrams,
          inventoryInGrams: product.quantityOnHandGrams, reorderLevel: product.reorderLevelGrams,
          unitCost: product.unitCostCents / 100, sellingPrice: product.sellingPriceCents / 100,
          unitOfMeasure: product.sellingUnit, baseUnit: product.sellingUnit,
          allowFractionalWeight: product.allowFractionalWeight,
          createdAt: new Date(product.createdAt).toISOString(), updatedAt: new Date(product.updatedAt).toISOString(),
  };
}

