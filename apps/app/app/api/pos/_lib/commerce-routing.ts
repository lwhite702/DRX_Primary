import { db } from "@/lib/db";
import { readCommerceSettings } from "@/lib/commerce/config";

type RoutableCartItem = {
  inventoryId?: string | null;
  source: "inventory" | "manual";
};

/**
 * Bulk pricing is merchant configuration, so routing must not trust the cart to
 * announce that a tier exists. Resolve it from the tenant-scoped settings row.
 */
export async function hasConfiguredCanonicalCommerce(
  businessId: string,
  items: RoutableCartItem[],
) {
  const inventoryIds = new Set(
    items
      .filter(
        (item): item is RoutableCartItem & { inventoryId: string } =>
          item.source === "inventory" && Boolean(item.inventoryId),
      )
      .map((item) => item.inventoryId),
  );
  if (inventoryIds.size === 0) return false;

  const settings = await db.businessSettings.findUnique({
    where: { businessId },
    select: { settingsData: true },
  });
  const commerce = readCommerceSettings(settings?.settingsData);

  return [...inventoryIds].some((inventoryId) => {
    const config = commerce.productConfigs[inventoryId];
    return Boolean(
      config?.fractionalEnabled || (config?.bulkPriceTiers.length ?? 0) > 0,
    );
  });
}
