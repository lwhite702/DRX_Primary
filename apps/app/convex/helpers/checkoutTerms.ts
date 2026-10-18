import { v } from "convex/values";
import type { Doc, Id } from "../_generated/dataModel";
import type { QueryCtx, MutationCtx } from "../_generated/server";
import { requirePermission } from "./permissions";

export const priceOverride = v.object({ productId: v.id("products"), unitPriceCents: v.number(), reason: v.string() });
export type PriceOverride = { productId: Id<"products">; unitPriceCents: number; reason: string };
export function normalizeOverrides(user: Doc<"users">, items: Array<{ productId: Id<"products"> }>, values?: PriceOverride[]) {
  if (!values?.length) return [];
  requirePermission(user, "MANAGE_PRICING");
  if (values.length > 50) throw new Error("INVALID_ARGUMENT: Too many price overrides");
  const ids = new Set(items.map(item => String(item.productId)));
  const seen = new Set<string>();
  return values.map(value => {
    const reason = value.reason.trim();
    if (!ids.has(value.productId) || seen.has(value.productId) || !reason || reason.length > 200 || !Number.isSafeInteger(value.unitPriceCents) || value.unitPriceCents < 0) throw new Error("INVALID_ARGUMENT: Invalid price override");
    seen.add(value.productId);
    return { ...value, reason };
  }).sort((a, b) => String(a.productId).localeCompare(String(b.productId)));
}

export const deliveryTerms = {
  vendorFeeCents: v.number(),
  chargeCustomer: v.boolean(),
  customerFeeCents: v.optional(v.number()),
  profileId: v.optional(v.id("deliveryProfiles")),
  vendorExpenseKnown: v.optional(v.boolean()),
  dispatchType: v.optional(
    v.union(
      v.literal("merchant_dispatch"),
      v.literal("customer_pickup_car"),
    ),
  ),
  feeSplitMode: v.optional(
    v.union(
      v.literal("pass_full"),
      v.literal("absorb_full"),
      v.literal("split_half"),
      v.literal("custom"),
    ),
  ),
  estimatedArrivalMinutes: v.optional(v.number()),
  uberTrackingUrl: v.optional(v.string()),
};
export type DeliveryTerms = {
  vendorFeeCents: number;
  chargeCustomer: boolean;
  customerFeeCents?: number;
  profileId?: Id<"deliveryProfiles">;
  vendorExpenseKnown?: boolean;
  dispatchType?: "merchant_dispatch" | "customer_pickup_car";
  feeSplitMode?: "pass_full" | "absorb_full" | "split_half" | "custom";
  estimatedArrivalMinutes?: number;
  uberTrackingUrl?: string;
};
export async function validateDeliveryTerms(ctx: QueryCtx | MutationCtx, businessId: Id<"businesses">, delivery?: DeliveryTerms) {
  if (!delivery) return;
  const customerFee = delivery.customerFeeCents ?? (delivery.chargeCustomer ? delivery.vendorFeeCents : 0);
  if (![delivery.vendorFeeCents, customerFee].every(value => Number.isSafeInteger(value) && value >= 0) || (!delivery.chargeCustomer && customerFee !== 0)) throw new Error("INVALID_ARGUMENT: Invalid delivery charge");
  // Existing native/quick callers retain their positive vendor-fee contract.
  if (delivery.customerFeeCents === undefined && delivery.vendorFeeCents === 0) throw new Error("INVALID_ARGUMENT: Delivery vendor fee must be positive");
  if (delivery.estimatedArrivalMinutes !== undefined) {
    if (!Number.isSafeInteger(delivery.estimatedArrivalMinutes) || delivery.estimatedArrivalMinutes < 0) {
      throw new Error("INVALID_ARGUMENT: Invalid estimated arrival minutes");
    }
  }
  if (delivery.uberTrackingUrl !== undefined && delivery.uberTrackingUrl.length > 2000) {
    throw new Error("INVALID_ARGUMENT: Invalid Uber tracking URL");
  }
  if (delivery.profileId) {
    const profile = await ctx.db.get(delivery.profileId);
    if (!profile || profile.businessId !== businessId || !profile.isActive) throw new Error("NOT_FOUND: Delivery profile is unavailable");
    if ((!profile.allowPriceOverride && profile.basePriceCents !== customerFee) || (profile.vendorFeeCents ?? 0) !== delivery.vendorFeeCents || (profile.vendorFeeCents !== undefined) !== (delivery.vendorExpenseKnown !== false)) throw new Error("CONFLICT: Delivery profile changed; refresh the quote");
  }
}
