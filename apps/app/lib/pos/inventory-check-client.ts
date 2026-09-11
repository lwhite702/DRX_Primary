import { z } from "zod";
const nonnegative = z.number().finite().nonnegative();
const productSchema = z.object({ inventory_id: z.string().min(1), product_name: z.string(), expected_weight_grams: nonnegative });
const receiptSchema = z.object({ success: z.literal(true), check_id: z.string().min(1), expected_weight_grams: nonnegative, measured_weight_grams: nonnegative, delta_grams: nonnegative, delta_percentage: nonnegative.nullable(), discrepancy_flagged: z.boolean(), shrinkage_id: z.string().nullable() });
export type CheckProduct = z.infer<typeof productSchema>;
export type CheckReceipt = z.infer<typeof receiptSchema>;
export interface CheckRequest { requestId: string; inventoryId: string; expectedWeightGrams: number; measuredWeightGrams: number }
export class InventoryCheckRejectedError extends Error { constructor(public code: string, message: string) { super(message); } }
const messages: Record<string, string> = { APPROVAL_REQUIRED: "Supervisor approval is required", STALE_STOCK: "Stock changed. Load a fresh check before measuring again.", INSUFFICIENT_STOCK: "Inventory requires reconciliation", INVALID_STATE: "Inventory or approval settings require reconciliation", INVALID_ARGUMENT: "Check the measured quantity", NOT_FOUND: "Product unavailable", FORBIDDEN: "Inventory permission is required", UNAUTHORIZED: "Sign in before checking inventory" };
export async function getCheckProduct(businessId: string, signal?: AbortSignal): Promise<CheckProduct> {
  const response = await fetch("/api/pos/inventory-check", { cache: "no-store", headers: { "X-Business-Id": businessId }, signal });
  const value = await response.json().catch(() => null);
  const parsed = productSchema.safeParse(value);
  if (!response.ok || !parsed.success) throw new Error(response.status === 404 ? "No products available for check" : "Inventory check could not be loaded");
  return parsed.data;
}
export async function recordCheck(businessId: string, request: CheckRequest): Promise<CheckReceipt> {
  const response = await fetch("/api/pos/inventory-check", { method: "POST", cache: "no-store", headers: { "Content-Type": "application/json", "X-Business-Id": businessId }, body: JSON.stringify(request) });
  const value = await response.json().catch(() => null);
  if (!response.ok && value && typeof value.code === "string" && messages[value.code]) throw new InventoryCheckRejectedError(value.code, messages[value.code]);
  const parsed = receiptSchema.safeParse(value);
  if (!response.ok || !parsed.success || parsed.data.expected_weight_grams !== request.expectedWeightGrams || parsed.data.measured_weight_grams !== request.measuredWeightGrams) throw new Error("Inventory check could not be confirmed. Retry the same request.");
  return parsed.data;
}
