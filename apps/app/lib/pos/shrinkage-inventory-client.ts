export interface ShrinkageProduct { id: string; productName: string; sku: string; inventoryInGrams: number; baseUnit?: string }
export async function loadShrinkageInventory(businessId: string, signal?: AbortSignal): Promise<ShrinkageProduct[]> {
  const products: ShrinkageProduct[] = [], cursors = new Set<string>();
  let cursor: string | undefined;
  for (;;) {
    const response = await fetch(`/api/inventory?limit=200${cursor ? `&cursor=${encodeURIComponent(cursor)}` : ""}`, { headers: { "X-Business-Id": businessId }, cache: "no-store", signal });
    const result = await response.json();
    if (!response.ok || !result || !Array.isArray(result.data) || typeof result.isDone !== "boolean") throw new Error("Inventory could not be loaded");
    for (const product of result.data) {
      if (typeof product.id !== "string" || typeof product.productName !== "string" || typeof product.sku !== "string" || typeof product.inventoryInGrams !== "number" || !Number.isFinite(product.inventoryInGrams)) throw new Error("Inventory requires reconciliation");
      if (product.inventoryInGrams > 0) products.push(product);
    }
    if (result.isDone) return products;
    if (typeof result.continueCursor !== "string" || !result.continueCursor || cursors.has(result.continueCursor)) throw new Error("Inventory page could not be confirmed");
    cursors.add(result.continueCursor); cursor = result.continueCursor;
  }
}
