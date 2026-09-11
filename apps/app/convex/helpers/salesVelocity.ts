import type { QueryCtx, MutationCtx } from "../_generated/server";
import type { Id } from "../_generated/dataModel";

const DAY = 86_400_000;

/** Bounded canonical demand; callers must enforce business authorization. */
export async function readSalesVelocity(
  ctx: QueryCtx | MutationCtx,
  businessId: Id<"businesses">,
  productId: Id<"products">,
  now: number,
  maxLines = 4096,
): Promise<{ units: number[]; velocity: { velocity7d: number; velocity30d: number; velocity90d: number }; linesRead: number }> {
  if (!Number.isInteger(maxLines) || maxLines < 0 || maxLines > 4096 || !Number.isSafeInteger(now) || now < 0) throw new Error("INVALID_ARGUMENT: Invalid sales history bounds");
  const lines = await ctx.db.query("salesLineItems").withIndex("by_productId", q => q.eq("productId", productId)).take(maxLines + 1);
  if (lines.length > maxLines) throw new Error("CAPACITY_EXCEEDED: Analysis history requires pagination");
  const units = [0, 0, 0], windows = [7, 30, 90];
  for (const line of lines) {
    const sale = await ctx.db.get(line.saleId);
    if (!sale || sale.businessId !== businessId) throw new Error("INVALID_STATE: Sale reference requires reconciliation");
    if (["pending", "cancelled", "refunded"].includes(sale.orderStatus)) continue;
    if (sale.orderStatus !== "completed") throw new Error("INVALID_STATE: Unknown sale status");
    const occurredAt = sale.occurredAt ?? sale.createdAt;
    if (!Number.isSafeInteger(occurredAt) || occurredAt < 0 || !Number.isFinite(line.quantityGrams) || line.quantityGrams <= 0) throw new Error("INVALID_STATE: Invalid sales history");
    if (occurredAt > now) continue;
    for (let i = 0; i < windows.length; i++) if (occurredAt >= now - windows[i] * DAY) units[i] += line.quantityGrams;
  }
  if (units.some(value => !Number.isFinite(value) || value > Number.MAX_SAFE_INTEGER)) throw new Error("INVALID_STATE: Sales quantity overflow");
  return { units, velocity: { velocity7d: units[0] / 7, velocity30d: units[1] / 30, velocity90d: units[2] / 90 }, linesRead: lines.length };
}
