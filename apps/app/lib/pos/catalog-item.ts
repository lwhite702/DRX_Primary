import type { FunctionReturnType } from "convex/server";
import type { api } from "@/convex/_generated/api";
export function posCatalogItem(product: FunctionReturnType<typeof api.products.listCatalogPage>["page"][number]) {
  const config = {
    fractionalEnabled: product.allowFractionalWeight, sellingUnit: product.sellingUnit,
    decimalPrecision: product.quantityPrecision, minimumSaleQuantity: product.minimumSaleQuantity,
    quantityIncrement: product.quantityIncrement, baseUnitPrice: product.sellingPriceCents / 100,
    suggestedDollarAmounts: product.suggestedDollarPresetsCents.map((cents: number) => cents / 100), suggestedQuantities: product.suggestedQuantityPresets,
    bulkPriceTiers: product.bulkPriceTiers.map((tier: { minimumQuantity: number; unitPriceCents: number }, index: number) => ({ id: `${product._id}-${index}`, label: `${tier.minimumQuantity}+`, minimumQuantity: tier.minimumQuantity, unitPrice: tier.unitPriceCents / 100 })),
  };
  return { id: product._id, name: product.productName, sku: product.sku, barcode: product.barcode ?? null, price: product.sellingPriceCents / 100,
    quantity_on_hand: product.quantityOnHandGrams, low_stock_threshold: product.reorderLevelGrams,
    commerce_config: config, fractional_config: product.allowFractionalWeight ? config : undefined };
}
