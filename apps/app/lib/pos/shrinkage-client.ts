export class ShrinkageRejectedError extends Error {}
export interface ShrinkageRequest {
  requestId: string;
  inventoryId: string;
  quantityGrams: number;
  shrinkageType: "personal_use" | "damaged" | "theft" | "expired" | "lost" | "store_use" | "sample" | "other" | "damage" | "spillage";
  note?: string;
}
export async function recordShrinkage(businessId: string, request: ShrinkageRequest) {
  const response = await fetch("/api/pos/shrinkage", { method: "POST", cache: "no-store", headers: { "Content-Type": "application/json", "X-Business-Id": businessId }, body: JSON.stringify(request) });
  const value: unknown = await response.json().catch(() => null);
  const result = value && typeof value === "object" ? value as Record<string, unknown> : {};
  if (!response.ok || result.success !== true || typeof result.shrinkage_id !== "string" || typeof result.new_inventory_grams !== "number" || !Number.isFinite(result.new_inventory_grams) || result.new_inventory_grams < 0 || typeof result.costCents !== "number" || !Number.isSafeInteger(result.costCents) || result.costCents < 0 || typeof result.replayed !== "boolean") {
    const messages: Record<string, string> = {
      APPROVAL_REQUIRED: "Supervisor approval is required",
      INSUFFICIENT_STOCK: "Insufficient stock to record this shrinkage",
      INVALID_STATE: "Inventory or approval settings require reconciliation",
      FORBIDDEN: "Inventory permission is required",
    };
    const code = typeof result.code === "string" ? result.code : "";
    const message = messages[code] ?? "Shrinkage could not be confirmed. Retry the same request.";
    if (!response.ok && ["APPROVAL_REQUIRED", "INSUFFICIENT_STOCK", "INVALID_ARGUMENT", "NOT_FOUND", "FORBIDDEN", "UNAUTHORIZED", "INVALID_STATE"].includes(code)) throw new ShrinkageRejectedError(message);
    throw new Error(message);
  }
  return result as { success: true; shrinkage_id: string; new_inventory_grams: number; costCents: number; replayed: boolean };
}
