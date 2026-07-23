import { mutation, query } from "./_generated/server";
import { v } from "convex/values";
import { requireUserAndBusiness } from "./helpers/auth";
import { calculateTaxCents } from "./helpers/money";
import { allocateFifoInventoryBatches } from "./helpers/fifo";

export const processCheckout = mutation({
  args: {
    clerkUserId: v.optional(v.string()),
    customerId: v.optional(v.id("customers")),
    orderNumber: v.string(),
    items: v.array(
      v.object({
        productId: v.id("products"),
        quantityGrams: v.number(),
      })
    ),
    paymentMethod: v.string(), // "cash" | "card" | "credit"
    amountPaidCents: v.number(),
  },
  handler: async (ctx, args) => {
    const auth = await requireUserAndBusiness(ctx, args.clerkUserId);
    const now = Date.now();

    if (!args.items || args.items.length === 0) {
      throw new Error("INVALID_ARGUMENT: Checkout cart cannot be empty");
    }

    // 1. Verify idempotency / order number uniqueness
    const existingOrder = await ctx.db
      .query("sales")
      .withIndex("by_businessId_and_orderNumber", (q: any) =>
        q.eq("businessId", auth.businessId).eq("orderNumber", args.orderNumber)
      )
      .unique();

    if (existingOrder) {
      return {
        saleId: existingOrder._id,
        orderNumber: existingOrder.orderNumber,
        status: "ALREADY_PROCESSED",
        totalAmountCents: existingOrder.totalAmountCents,
      };
    }

    // 2. Authoritative Price & Line Item Calculation
    let subtotalCents = 0;
    const processedLineItems: Array<{
      productId: typeof args.items[0]["productId"];
      quantityGrams: number;
      unitPriceCents: number;
      lineTotalCents: number;
      unitCostCents: number;
    }> = [];

    for (const item of args.items) {
      const product = await ctx.db.get(item.productId);
      if (!product || product.businessId !== auth.businessId) {
        throw new Error(`NOT_FOUND: Product '${item.productId}' not found in catalog`);
      }

      if (!product.isActive) {
        throw new Error(`FORBIDDEN: Product '${product.productName}' is inactive`);
      }

      const lineTotalCents = Math.round(item.quantityGrams * product.sellingPriceCents);
      subtotalCents += lineTotalCents;

      processedLineItems.push({
        productId: item.productId,
        quantityGrams: item.quantityGrams,
        unitPriceCents: product.sellingPriceCents,
        lineTotalCents,
        unitCostCents: product.unitCostCents,
      });
    }

    // 3. Authoritative Tax Calculation using integer basis points
    const taxRateBps = auth.businessRecord.collectTax
      ? auth.businessRecord.taxRateBps
      : 0;
    const taxAmountCents = calculateTaxCents(subtotalCents, taxRateBps);
    const totalAmountCents = subtotalCents + taxAmountCents;

    if (args.paymentMethod === "cash" && args.amountPaidCents < totalAmountCents) {
      throw new Error(
        `PAYMENT_ERROR: Amount paid (${args.amountPaidCents}¢) is less than total order amount (${totalAmountCents}¢)`
      );
    }

    const changeAmountCents = Math.max(0, args.amountPaidCents - totalAmountCents);

    // 4. Perform Sales Record Insertion
    const saleId = await ctx.db.insert("sales", {
      businessId: auth.businessId,
      customerId: args.customerId,
      orderNumber: args.orderNumber,
      orderStatus: "completed",
      subtotalCents,
      taxAmountCents,
      totalAmountCents,
      amountPaidCents: args.amountPaidCents,
      changeAmountCents,
      paymentMethod: args.paymentMethod,
      createdBy: auth.userId,
      createdAt: now,
      updatedAt: now,
    });

    // 5. FIFO Batch Allocation & Line Item + Allocation Insertions
    const allAllocations: Array<{
      lineItemId: string;
      batchId: string;
      quantityGrams: number;
      extendedCostCents: number;
    }> = [];

    for (const lineItem of processedLineItems) {
      // Insert Line Item
      const lineItemId = await ctx.db.insert("salesLineItems", {
        saleId,
        productId: lineItem.productId,
        quantityGrams: lineItem.quantityGrams,
        unitPriceCents: lineItem.unitPriceCents,
        lineTotalCents: lineItem.lineTotalCents,
        unitCostCents: lineItem.unitCostCents,
        createdAt: now,
      });

      // Allocate FIFO batches
      const allocations = await allocateFifoInventoryBatches(
        ctx,
        auth.businessId,
        lineItem.productId,
        lineItem.quantityGrams
      );

      for (const alloc of allocations) {
        await ctx.db.insert("salesAllocations", {
          saleId,
          lineItemId,
          productId: lineItem.productId,
          batchId: alloc.batchId,
          quantityGrams: alloc.allocatedGrams,
          unitCostPerGramCents: alloc.unitCostPerGramCents,
          extendedCostCents: alloc.extendedCostCents,
          createdAt: now,
        });

        allAllocations.push({
          lineItemId,
          batchId: alloc.batchId,
          quantityGrams: alloc.allocatedGrams,
          extendedCostCents: alloc.extendedCostCents,
        });
      }

      // Update product total stock
      const product = await ctx.db.get(lineItem.productId);
      if (product) {
        await ctx.db.patch(lineItem.productId, {
          quantityOnHandGrams: product.quantityOnHandGrams - lineItem.quantityGrams,
          updatedAt: now,
        });
      }
    }

    // 6. Update Customer Record (if attached)
    if (args.customerId) {
      const customer = await ctx.db.get(args.customerId);
      if (customer && customer.businessId === auth.businessId) {
        await ctx.db.patch(args.customerId, {
          totalPurchasesCents: customer.totalPurchasesCents + totalAmountCents,
          purchaseCount: customer.purchaseCount + 1,
          updatedAt: now,
        });
      }
    }

    // 7. Insert Immutable Audit Log Event
    await ctx.db.insert("auditEvents", {
      businessId: auth.businessId,
      userId: auth.userId,
      action: "POS_CHECKOUT_COMPLETED",
      entityType: "sale",
      entityId: saleId,
      metadata: JSON.stringify({
        orderNumber: args.orderNumber,
        subtotalCents,
        taxAmountCents,
        totalAmountCents,
        itemCount: args.items.length,
      }),
      timestamp: now,
    });

    return {
      saleId,
      orderNumber: args.orderNumber,
      status: "COMPLETED",
      subtotalCents,
      taxAmountCents,
      totalAmountCents,
      changeAmountCents,
      allocationsCount: allAllocations.length,
    };
  },
});

export const getSalesHistory = query({
  args: {
    clerkUserId: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const auth = await requireUserAndBusiness(ctx, args.clerkUserId);
    const sales = await ctx.db
      .query("sales")
      .withIndex("by_businessId", (q) => q.eq("businessId", auth.businessId))
      .order("desc")
      .take(50);

    return sales;
  },
});
