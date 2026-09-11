import { mutation } from "./_generated/server";
import { v } from "convex/values";
import { MutationCtx } from "./_generated/server";
import { Doc } from "./_generated/dataModel";
import { requireUserAndBusiness } from "./helpers/auth";
import { requirePermission } from "./helpers/permissions";

type Settlement = {
  status:
    "credit_reversed" | "no_tender" | "manual_confirmed" | "external_confirmed";
  reference?: string;
};

function requireReason(reason: string): string {
  const normalized = reason.trim();
  if (!normalized) {
    throw new Error("INVALID_ARGUMENT: A reason is required");
  }
  return normalized;
}

function resolveSettlement(
  sale: Doc<"sales">,
  tenderReversalConfirmed: boolean | undefined,
  externalReference: string | undefined,
): Settlement {
  if (sale.paymentMethod === "credit") return { status: "credit_reversed" };
  if (sale.paymentMethod === "comp") return { status: "no_tender" };
  if (!tenderReversalConfirmed) {
    throw new Error(
      "SETTLEMENT_REQUIRED: Confirm the tender reversal before completing this action",
    );
  }
  if (sale.paymentMethod === "card") {
    const reference = externalReference?.trim();
    if (!reference) {
      throw new Error(
        "SETTLEMENT_REQUIRED: Card reversals require an external reference",
      );
    }
    return { status: "external_confirmed", reference };
  }
  return {
    status: "manual_confirmed",
    reference: externalReference?.trim() || undefined,
  };
}

async function restoreSaleInventory(
  ctx: MutationCtx,
  sale: Doc<"sales">,
  now: number,
): Promise<number> {
  const allocations = await ctx.db
    .query("salesAllocations")
    .withIndex("by_saleId", (q) => q.eq("saleId", sale._id))
    .collect();

  for (const allocation of allocations) {
    const [batch, product] = await Promise.all([
      ctx.db.get(allocation.batchId),
      ctx.db.get(allocation.productId),
    ]);
    if (
      !batch ||
      !product ||
      batch.businessId !== sale.businessId ||
      product.businessId !== sale.businessId ||
      batch.productId !== allocation.productId
    ) {
      throw new Error(
        "INTEGRITY_ERROR: Sale allocation no longer matches its tenant inventory records",
      );
    }
    const restoredBatchQuantity =
      batch.remainingQuantityGrams + allocation.quantityGrams;
    if (restoredBatchQuantity > batch.originalQuantityGrams) {
      throw new Error(
        "INTEGRITY_ERROR: Restock would exceed the batch's original quantity; use scrap disposition or reconcile inventory first",
      );
    }
    await ctx.db.patch(batch._id, {
      remainingQuantityGrams: restoredBatchQuantity,
      updatedAt: now,
    });
    await ctx.db.patch(product._id, {
      quantityOnHandGrams:
        product.quantityOnHandGrams + allocation.quantityGrams,
      updatedAt: now,
    });
  }

  return allocations.length;
}

async function reverseCustomerAccounting(
  ctx: MutationCtx,
  sale: Doc<"sales">,
  now: number,
): Promise<void> {
  if (!sale.customerId) return;
  const customer = await ctx.db.get(sale.customerId);
  if (!customer || customer.businessId !== sale.businessId) {
    throw new Error(
      "INTEGRITY_ERROR: Sale customer no longer matches the sale tenant",
    );
  }
  if (
    sale.paymentMethod === "credit" &&
    customer.totalCreditUsedCents < sale.totalAmountCents
  ) {
    throw new Error(
      "INTEGRITY_ERROR: Recorded credit balance is too low to reverse this sale automatically",
    );
  }

  await ctx.db.patch(customer._id, {
    totalPurchasesCents: Math.max(
      0,
      customer.totalPurchasesCents - sale.totalAmountCents,
    ),
    totalCreditUsedCents:
      sale.paymentMethod === "credit"
        ? customer.totalCreditUsedCents - sale.totalAmountCents
        : customer.totalCreditUsedCents,
    purchaseCount: Math.max(0, customer.purchaseCount - 1),
    updatedAt: now,
  });
}

async function getManagedSale(ctx: MutationCtx, saleId: Doc<"sales">["_id"]) {
  const auth = await requireUserAndBusiness(ctx);
  requirePermission(auth.userRecord, "MANAGE_SALES_RETURNS");
  const sale = await ctx.db.get(saleId);
  if (!sale || sale.businessId !== auth.businessId) {
    throw new Error(`NOT_FOUND: Sale '${saleId}' not found`);
  }
  return { auth, sale };
}

export const voidOrder = mutation({
  args: {
    saleId: v.id("sales"),
    reason: v.string(),
    tenderReversalConfirmed: v.optional(v.boolean()),
    externalReference: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const { auth, sale } = await getManagedSale(ctx, args.saleId);
    if (sale.orderStatus === "cancelled") {
      return { saleId: sale._id, status: "ALREADY_VOIDED" as const };
    }
    if (sale.orderStatus !== "completed") {
      throw new Error(
        `INVALID_STATE: Only completed sales can be voided; current status is '${sale.orderStatus}'`,
      );
    }

    const reason = requireReason(args.reason);
    const settlement = resolveSettlement(
      sale,
      args.tenderReversalConfirmed,
      args.externalReference,
    );
    const now = Date.now();
    const restoredAllocations = await restoreSaleInventory(ctx, sale, now);
    await reverseCustomerAccounting(ctx, sale, now);

    await ctx.db.patch(sale._id, {
      orderStatus: "cancelled",
      voidReason: reason,
      voidSettlementStatus: settlement.status,
      voidReference: settlement.reference,
      voidedBy: auth.userId,
      voidedAt: now,
      updatedAt: now,
    });
    await ctx.db.insert("auditEvents", {
      businessId: auth.businessId,
      userId: auth.userId,
      action: "POS_ORDER_VOIDED",
      entityType: "sale",
      entityId: sale._id,
      metadata: JSON.stringify({
        reasonProvided: true,
        settlementStatus: settlement.status,
        restoredAllocations,
      }),
      timestamp: now,
    });

    return { saleId: sale._id, status: "VOIDED" as const, restoredAllocations };
  },
});

export const refundOrder = mutation({
  args: {
    saleId: v.id("sales"),
    reason: v.string(),
    disposition: v.union(v.literal("restock"), v.literal("scrap")),
    tenderRefundConfirmed: v.optional(v.boolean()),
    externalReference: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const { auth, sale } = await getManagedSale(ctx, args.saleId);
    if (sale.orderStatus === "refunded") {
      return { saleId: sale._id, status: "ALREADY_REFUNDED" as const };
    }
    if (sale.orderStatus !== "completed") {
      throw new Error(
        `INVALID_STATE: Only completed sales can be refunded; current status is '${sale.orderStatus}'`,
      );
    }

    const reason = requireReason(args.reason);
    const settlement = resolveSettlement(
      sale,
      args.tenderRefundConfirmed,
      args.externalReference,
    );
    const now = Date.now();
    const restoredAllocations =
      args.disposition === "restock"
        ? await restoreSaleInventory(ctx, sale, now)
        : 0;
    await reverseCustomerAccounting(ctx, sale, now);

    await ctx.db.patch(sale._id, {
      orderStatus: "refunded",
      refundReason: reason,
      refundDisposition: args.disposition,
      refundSettlementStatus: settlement.status,
      refundReference: settlement.reference,
      refundedBy: auth.userId,
      refundedAt: now,
      updatedAt: now,
    });
    await ctx.db.insert("auditEvents", {
      businessId: auth.businessId,
      userId: auth.userId,
      action: "POS_ORDER_REFUNDED",
      entityType: "sale",
      entityId: sale._id,
      metadata: JSON.stringify({
        reasonProvided: true,
        disposition: args.disposition,
        settlementStatus: settlement.status,
        restoredAllocations,
      }),
      timestamp: now,
    });

    return {
      saleId: sale._id,
      status: "REFUNDED" as const,
      disposition: args.disposition,
      restoredAllocations,
    };
  },
});
