export async function quoteWeight(businessId: string, inventoryId: string, weightGrams: number, signal?: AbortSignal) {
  if (!Number.isFinite(weightGrams) || weightGrams <= 0) throw new Error("Enter a positive weight");
  const response = await fetch("/api/pos/quote", {
    method: "POST", cache: "no-store", signal,
    headers: { "Content-Type": "application/json", "X-Business-Id": businessId },
    body: JSON.stringify({ mode: "quick", items: [{ id: `weight-${inventoryId}`, inventoryId, name: "Weighted item", unitPrice: 0, qty: 1, source: "inventory", weightGrams }] }),
  });
  const result = await response.json();
  const lines = result?.quote?.lines;
  if (!response.ok || result.success !== true || !Array.isArray(lines) || lines.length !== 1) throw new Error("Weight pricing is unavailable. Try again.");
  const line = lines[0];
  if (line.source !== "inventory" || line.quantity !== weightGrams || !Number.isSafeInteger(line.appliedUnitPriceCents) || line.appliedUnitPriceCents < 0 || !Number.isSafeInteger(line.lineSubtotalCents) || line.lineSubtotalCents < 0) throw new Error("Weight pricing could not be verified");
  return { price_per_gram: line.appliedUnitPriceCents / 100, total_price: line.lineSubtotalCents / 100, ...(line.bulkDiscountCents > 0 ? { tier_name: "Bulk pricing" } : {}) };
}
