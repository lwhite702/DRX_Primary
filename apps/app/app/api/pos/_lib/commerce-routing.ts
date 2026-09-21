import { api } from "@/convex/_generated/api";
import { businessClient } from "@/lib/business/convex-server";

type RoutableCartItem = { inventoryId?: string | null; source: "inventory" | "manual" };

/** Read canonical product commerce configuration before choosing the checkout path. */
export async function hasConfiguredCanonicalCommerce(businessId: string, items: RoutableCartItem[]) {
  const inventoryIds = new Set(items.filter(item => item.source === "inventory" && item.inventoryId).map(item => item.inventoryId!));
  if (inventoryIds.size === 0) return false;
  const { client } = await businessClient(businessId);
  const result = await client.query(api.products.listCatalogPage, { businessId, paginationOpts: { cursor: null, numItems: 200 } });
  return result.page.some(product => inventoryIds.has(String(product._id)) && (Boolean(product.allowFractionalWeight) || (product.bulkPriceTiers?.length ?? 0) > 0));
}
