import { v } from "convex/values";
import type { Doc, Id } from "./_generated/dataModel";
import { mutation, query } from "./_generated/server";
import { requireUserAndBusiness } from "./helpers/auth";
import { allocateFifoInventoryBatches } from "./helpers/fifo";
import { calculateTaxCents } from "./helpers/money";
import { requirePermission } from "./helpers/permissions";

const paymentMethod = v.union(
  v.literal("cash"),
  v.literal("card"),
  v.literal("credit"),
);

const checkoutResult = v.object({
  saleId: v.id("sales"),
  orderNumber: v.string(),
  status: v.union(v.literal("COMPLETED"), v.literal("ALREADY_PROCESSED")),
  subtotalCents: v.number(),
  taxableSubtotalCents: v.number(),
  taxAmountCents: v.number(),
  totalAmountCents: v.number(),
  changeAmountCents: v.number(),
  allocationsCount: v.number(),
});

const saleRecord = v.object({
  _id: v.id("sales"),
  _creationTime: v.number(),
  businessId: v.id("businesses"),
  customerId: v.optional(v.id("customers")),
  orderNumber: v.string(),
  orderStatus: v.string(),
  subtotalCents: v.number(),
  taxableSubtotalCents: v.optional(v.number()),
  taxAmountCents: v.number(),
  totalAmountCents: v.number(),
  amountPaidCents: v.number(),
  changeAmountCents: v.number(),
  paymentMethod: v.string(),
  checkoutFingerprint: v.optional(v.string()),
  createdBy: v.string(),
  offlineAuthorizationId: v.optional(v.id("offlineAuthorizations")),
  offlineDeviceId: v.optional(v.string()),
  occurredAt: v.optional(v.number()),
  createdAt: v.number(),
  updatedAt: v.number(),
});

function requireNonnegativeSafeInteger(value: number, field: string): void {
  if (!Number.isSafeInteger(value) || value < 0) {
    throw new Error(
      `INVALID_ARGUMENT: ${field} must be a nonnegative integer number of cents`,
    );
  }
}

function normalizeItems(
  items: Array<{ productId: Id<"products">; quantityGrams: number }>,
): Array<{ productId: Id<"products">; quantityGrams: number }> {
  if (items.length === 0) {
    throw new Error("INVALID_ARGUMENT: Checkout cart cannot be empty");
  }

  const quantitiesByProduct = new Map<string, number>();
  for (const item of items) {
    if (!Number.isFinite(item.quantityGrams) || item.quantityGrams <= 0) {
      throw new Error(
        "INVALID_ARGUMENT: Item quantity must be a positive finite number",
      );
    }
    const productId = String(item.productId);
    const quantity =
      (quantitiesByProduct.get(productId) ?? 0) + item.quantityGrams;
    if (!Number.isFinite(quantity) || quantity <= 0) {
      throw new Error(
        "INVALID_ARGUMENT: Aggregated item quantity must be a positive finite number",
      );
    }
    quantitiesByProduct.set(productId, quantity);
  }

  return Array.from(quantitiesByProduct.entries())
    .sort(([left], [right]) => left.localeCompare(right))
    .map(([productId, quantityGrams]) => ({
      productId: productId as Id<"products">,
      quantityGrams,
    }));
}

function createCheckoutFingerprint(input: {
  customerId?: Id<"customers">;
  items: Array<{ productId: Id<"products">; quantityGrams: number }>;
  paymentMethod: "cash" | "card" | "credit";
  amountPaidCents: number;
}): string {
  return JSON.stringify({
    customerId: input.customerId ? String(input.customerId) : null,
    items: input.items.map((item) => [
      String(item.productId),
      item.quantityGrams,
    ]),
    paymentMethod: input.paymentMethod,
    amountPaidCents: input.amountPaidCents,
  });
}

export const processCheckout = mutation({
  args: {
    customerId: v.optional(v.id("customers")),
    orderNumber: v.string(),
    items: v.array(
      v.object({
        productId: v.id("products"),
        quantityGrams: v.number(),
      }),
    ),
    paymentMethod,
    amountPaidCents: v.number(),
  },
  returns: checkoutResult,
  handler: async (ctx, args) => {
    const auth = await requireUserAndBusiness(ctx);
    requirePermission(auth.userRecord, "PROCESS_CHECKOUT");
    requireNonnegativeSafeInteger(args.amountPaidCents, "amountPaidCents");

    const originalOrderNumber = args.orderNumber;
    const orderNumber = originalOrderNumber.trim();
    if (!orderNumber || orderNumber.length > 128) {
      throw new Error(
        "INVALID_ARGUMENT: Order number must be between 1 and 128 characters",
      );
    }

    const normalizedItems = normalizeItems(args.items);
    const fingerprint = createCheckoutFingerprint({
      customerId: args.customerId,
      items: normalizedItems,
      paymentMethod: args.paymentMethod,
      amountPaidCents: args.amountPaidCents,
    });

    let existingOrder =
      originalOrderNumber !== orderNumber
        ? await ctx.db
            .query("sales")
            .withIndex("by_businessId_and_orderNumber", (q) =>
              q
                .eq("businessId", auth.businessId)
                .eq("orderNumber", originalOrderNumber),
            )
            .unique()
        : null;
    existingOrder ??= await ctx.db
      .query("sales")
      .withIndex("by_businessId_and_orderNumber", (q) =>
        q.eq("businessId", auth.businessId).eq("orderNumber", orderNumber),
      )
      .unique();

    if (existingOrder) {
      let existingFingerprint = existingOrder.checkoutFingerprint;
      if (!existingFingerprint) {
        const existingLineItems = await ctx.db
          .query("salesLineItems")
          .withIndex("by_saleId", (q) => q.eq("saleId", existingOrder._id))
          .collect();
        if (
          existingLineItems.length > 0 &&
          (existingOrder.paymentMethod === "cash" ||
            existingOrder.paymentMethod === "card" ||
            existingOrder.paymentMethod === "credit")
        ) {
          existingFingerprint = createCheckoutFingerprint({
            customerId: existingOrder.customerId,
            items: normalizeItems(
              existingLineItems.map((lineItem) => ({
                productId: lineItem.productId,
                quantityGrams: lineItem.quantityGrams,
              })),
            ),
            paymentMethod: existingOrder.paymentMethod,
            amountPaidCents: existingOrder.amountPaidCents,
          });
        }
      }
      if (existingFingerprint !== fingerprint) {
        throw new Error(
          "IDEMPOTENCY_CONFLICT: Order number was already used for a different checkout payload",
        );
      }
      return {
        saleId: existingOrder._id,
        orderNumber: existingOrder.orderNumber,
        status: "ALREADY_PROCESSED" as const,
        subtotalCents: existingOrder.subtotalCents,
        taxableSubtotalCents:
          existingOrder.taxableSubtotalCents ?? existingOrder.subtotalCents,
        taxAmountCents: existingOrder.taxAmountCents,
        totalAmountCents: existingOrder.totalAmountCents,
        changeAmountCents: existingOrder.changeAmountCents,
        allocationsCount: 0,
      };
    }

    let customer: Doc<"customers"> | null = null;
    if (args.customerId) {
      customer = await ctx.db.get(args.customerId);
      if (!customer || customer.businessId !== auth.businessId) {
        throw new Error(`NOT_FOUND: Customer '${args.customerId}' not found`);
      }
      if (!customer.isActive) {
        throw new Error("FORBIDDEN: Customer account is inactive");
      }
    }

    if (args.paymentMethod === "credit" && !customer) {
      throw new Error("INVALID_ARGUMENT: Credit sales require a customer");
    }

    let subtotalCents = 0;
    let taxableSubtotalCents = 0;
    const processedLineItems: Array<{
      product: Doc<"products">;
      quantityGrams: number;
      unitPriceCents: number;
      lineTotalCents: number;
      unitCostCents: number;
    }> = [];

    for (const item of normalizedItems) {
      const product = await ctx.db.get(item.productId);
      if (!product || product.businessId !== auth.businessId) {
        throw new Error(
          `NOT_FOUND: Product '${item.productId}' not found in catalog`,
        );
      }
      if (!product.isActive) {
        throw new Error(
          `FORBIDDEN: Product '${product.productName}' is inactive`,
        );
      }
      if (
        !product.allowFractionalWeight &&
        !Number.isInteger(item.quantityGrams)
      ) {
        throw new Error(
          `INVALID_ARGUMENT: Product '${product.productName}' requires a whole-unit quantity`,
        );
      }
      if (product.quantityOnHandGrams < item.quantityGrams) {
        throw new Error(
          `INSUFFICIENT_STOCK: Product '${product.productName}' does not have enough stock`,
        );
      }
      requireNonnegativeSafeInteger(
        product.sellingPriceCents,
        "sellingPriceCents",
      );
      requireNonnegativeSafeInteger(product.unitCostCents, "unitCostCents");

      const lineTotalCents = Math.round(
        item.quantityGrams * product.sellingPriceCents,
      );
      if (!Number.isSafeInteger(lineTotalCents) || lineTotalCents <= 0) {
        throw new Error(
          "INVALID_ARGUMENT: Calculated line total is outside the safe range",
        );
      }
      subtotalCents += lineTotalCents;
      if (product.isTaxable !== false) {
        taxableSubtotalCents += lineTotalCents;
      }
      if (
        !Number.isSafeInteger(subtotalCents) ||
        !Number.isSafeInteger(taxableSubtotalCents)
      ) {
        throw new Error(
          "INVALID_ARGUMENT: Calculated checkout subtotal is outside the safe range",
        );
      }

      processedLineItems.push({
        product,
        quantityGrams: item.quantityGrams,
        unitPriceCents: product.sellingPriceCents,
        lineTotalCents,
        unitCostCents: product.unitCostCents,
      });
    }

    const taxRateBps = auth.businessRecord.collectTax
      ? auth.businessRecord.taxRateBps
      : 0;
    requireNonnegativeSafeInteger(taxRateBps, "taxRateBps");
    if (taxRateBps > 10_000) {
      throw new Error("INVALID_ARGUMENT: taxRateBps cannot exceed 10000");
    }
    const taxAmountCents = calculateTaxCents(taxableSubtotalCents, taxRateBps);
    const totalAmountCents = subtotalCents + taxAmountCents;
    if (!Number.isSafeInteger(totalAmountCents)) {
      throw new Error(
        "INVALID_ARGUMENT: Calculated checkout total is outside the safe range",
      );
    }

    if (
      args.paymentMethod === "cash" &&
      args.amountPaidCents < totalAmountCents
    ) {
      throw new Error(
        `PAYMENT_ERROR: Amount paid (${args.amountPaidCents}¢) is less than total order amount (${totalAmountCents}¢)`,
      );
    }
    if (
      args.paymentMethod === "card" &&
      args.amountPaidCents !== totalAmountCents
    ) {
      throw new Error(
        "PAYMENT_ERROR: Card tender amount must equal the order total",
      );
    }
    if (args.paymentMethod === "credit" && args.amountPaidCents !== 0) {
      throw new Error(
        "PAYMENT_ERROR: Credit sales cannot record a tender amount",
      );
    }

    if (args.paymentMethod === "credit" && customer) {
      const newCreditUsedCents =
        customer.totalCreditUsedCents + totalAmountCents;
      if (
        customer.creditLimitCents > 0 &&
        newCreditUsedCents > customer.creditLimitCents
      ) {
        throw new Error(
          `CREDIT_LIMIT_EXCEEDED: Transaction total (${totalAmountCents}¢) exceeds available customer credit`,
        );
      }
    }

    const now = Date.now();
    const changeAmountCents = Math.max(
      0,
      args.amountPaidCents - totalAmountCents,
    );
    const saleId = await ctx.db.insert("sales", {
      businessId: auth.businessId,
      customerId: args.customerId,
      orderNumber,
      orderStatus: "completed",
      subtotalCents,
      taxableSubtotalCents,
      taxAmountCents,
      totalAmountCents,
      amountPaidCents: args.amountPaidCents,
      changeAmountCents,
      paymentMethod: args.paymentMethod,
      checkoutFingerprint: fingerprint,
      createdBy: auth.userId,
      createdAt: now,
      updatedAt: now,
    });

    let allocationsCount = 0;
    for (const lineItem of processedLineItems) {
      const lineItemId = await ctx.db.insert("salesLineItems", {
        saleId,
        productId: lineItem.product._id,
        quantityGrams: lineItem.quantityGrams,
        unitPriceCents: lineItem.unitPriceCents,
        lineTotalCents: lineItem.lineTotalCents,
        unitCostCents: lineItem.unitCostCents,
        createdAt: now,
      });

      const allocations = await allocateFifoInventoryBatches(
        ctx,
        auth.businessId,
        lineItem.product._id,
        lineItem.quantityGrams,
      );
      for (const allocation of allocations) {
        await ctx.db.insert("salesAllocations", {
          saleId,
          lineItemId,
          productId: lineItem.product._id,
          batchId: allocation.batchId,
          quantityGrams: allocation.allocatedGrams,
          unitCostPerGramCents: allocation.unitCostPerGramCents,
          extendedCostCents: allocation.extendedCostCents,
          createdAt: now,
        });
      }
      allocationsCount += allocations.length;

      await ctx.db.patch(lineItem.product._id, {
        quantityOnHandGrams:
          lineItem.product.quantityOnHandGrams - lineItem.quantityGrams,
        updatedAt: now,
      });
    }

    if (customer && args.customerId) {
      await ctx.db.patch(args.customerId, {
        totalPurchasesCents: customer.totalPurchasesCents + totalAmountCents,
        totalCreditUsedCents:
          customer.totalCreditUsedCents +
          (args.paymentMethod === "credit" ? totalAmountCents : 0),
        purchaseCount: customer.purchaseCount + 1,
        updatedAt: now,
      });
    }

    await ctx.db.insert("auditEvents", {
      businessId: auth.businessId,
      userId: auth.userId,
      action: "POS_CHECKOUT_COMPLETED",
      entityType: "sale",
      entityId: saleId,
      metadata: JSON.stringify({
        orderNumber,
        subtotalCents,
        taxableSubtotalCents,
        taxAmountCents,
        totalAmountCents,
        itemCount: processedLineItems.length,
      }),
      timestamp: now,
    });

    return {
      saleId,
      orderNumber,
      status: "COMPLETED" as const,
      subtotalCents,
      taxableSubtotalCents,
      taxAmountCents,
      totalAmountCents,
      changeAmountCents,
      allocationsCount,
    };
  },
});

export const getSalesHistory = query({
  args: {},
  returns: v.array(saleRecord),
  handler: async (ctx) => {
    const auth = await requireUserAndBusiness(ctx);
    requirePermission(auth.userRecord, "VIEW_FINANCIALS");
    return await ctx.db
      .query("sales")
      .withIndex("by_businessId", (q) => q.eq("businessId", auth.businessId))
      .order("desc")
      .take(50);
  },
});
