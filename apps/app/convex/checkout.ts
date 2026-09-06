import { v } from "convex/values";
import type { Doc, Id } from "./_generated/dataModel";
import {
  mutation,
  query,
  type MutationCtx,
  type QueryCtx,
} from "./_generated/server";
import { internal } from "./_generated/api";
import { requireUserAndBusiness } from "./helpers/auth";
import { allocateFifoInventoryBatches } from "./helpers/fifo";
import { calculateTaxCents } from "./helpers/money";
import { requirePermission } from "./helpers/permissions";
import {
  calculateCheckoutPricing,
  resolveLoyaltyDiscountRate,
  validateSaleQuantity,
} from "./helpers/pricing";
import {
  encryptDeliveryAddress,
  hashDeliveryAddress,
} from "./helpers/deliveryCrypto";
import { normalizeProductCommerceConfig } from "./helpers/productCommerce";
import { normalizeManualLineName } from "./helpers/manualLinePolicy";

import { checkoutFee, normalizeFees, totalFees, normalizePaymentReference, calculateSettlement, type CheckoutFee, type CheckoutPaymentMethod } from "./helpers/checkoutSettlement";

const paymentMethod = v.union(
  v.literal("cash"),
  v.literal("card"),
  v.literal("credit"),
  v.literal("mixed"),
  v.literal("zelle"),
);

const deliveryInput = v.object({
  address: v.string(),
  vendorFeeCents: v.number(),
  chargeCustomer: v.boolean(),
});

const manualItemInput = v.object({
  lineId: v.string(),
  name: v.string(),
  quantity: v.number(),
  unitPriceCents: v.number(),
});

type ManualItem = {
  lineId: string;
  name: string;
  quantity: number;
  unitPriceCents: number;
};

type ResolvedManualItem = ManualItem & {
  unitCostCents: number;
  isTaxable: boolean;
  manualCostKnown: boolean;
  manualPolicyId?: Id<"manualLinePolicies">;
};

const quoteResult = v.object({
  lines: v.array(
    v.object({
      productId: v.string(),
      source: v.union(v.literal("inventory"), v.literal("manual")),
      lineId: v.string(),
      productName: v.string(),
      taxable: v.boolean(),
      quantity: v.number(),
      baseUnitPriceCents: v.number(),
      appliedUnitPriceCents: v.number(),
      baseLineTotalCents: v.number(),
      lineSubtotalCents: v.number(),
      bulkDiscountCents: v.number(),
      loyaltyDiscountCents: v.number(),
      lineDiscountCents: v.number(),
    }),
  ),
  merchandiseSubtotalCents: v.number(),
  feeRevenueCents: v.optional(v.number()),
  discountCents: v.number(),
  subtotalCents: v.number(),
  taxableSubtotalCents: v.number(),
  merchandiseTaxCents: v.number(),
  deliveryRevenueCents: v.number(),
  vendorDeliveryExpenseCents: v.number(),
  deliveryTaxCents: v.number(),
  taxAmountCents: v.number(),
  totalAmountCents: v.number(),
});

const checkoutResult = v.object({
  saleId: v.id("sales"),
  orderNumber: v.string(),
  status: v.union(v.literal("COMPLETED"), v.literal("ALREADY_PROCESSED")),
  subtotalCents: v.number(),
  merchandiseSubtotalCents: v.number(),
  feeRevenueCents: v.optional(v.number()),
  discountCents: v.number(),
  merchandiseTaxCents: v.number(),
  deliveryRevenueCents: v.number(),
  vendorDeliveryExpenseCents: v.number(),
  deliveryTaxCents: v.number(),
  taxableSubtotalCents: v.number(),
  taxAmountCents: v.number(),
  totalAmountCents: v.number(),
  changeAmountCents: v.number(),
  allocationsCount: v.number(),
  deliveryId: v.optional(v.id("deliveries")),
});

const saleRecord = v.object({
  _id: v.id("sales"),
  _creationTime: v.number(),
  businessId: v.id("businesses"),
  customerId: v.optional(v.id("customers")),
  orderNumber: v.string(),
  orderStatus: v.string(),
  subtotalCents: v.number(),
  merchandiseSubtotalCents: v.optional(v.number()),
  discountCents: v.optional(v.number()),
  merchandiseRevenueCents: v.optional(v.number()),
  deliveryRevenueCents: v.optional(v.number()),
  vendorDeliveryExpenseCents: v.optional(v.number()),
  deliveryTaxCents: v.optional(v.number()),
  merchandiseTaxCents: v.optional(v.number()),
  loyaltyEligibleSpendCents: v.optional(v.number()),
  cogsCents: v.optional(v.number()),
  taxableSubtotalCents: v.optional(v.number()),
  taxAmountCents: v.number(),
  totalAmountCents: v.number(),
  amountPaidCents: v.number(),
  changeAmountCents: v.number(),
  paymentMethod: v.string(),
  paymentReference: v.optional(v.string()),
  fees: v.optional(v.array(checkoutFee)),
  feeRevenueCents: v.optional(v.number()),
  creditAmountCents: v.optional(v.number()),
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

function normalizeManualItems(
  items: Array<{
    lineId: string;
    name: string;
    quantity: number;
    unitPriceCents: number;
  }> = [],
): ManualItem[] {
  const lineIds = new Set<string>();
  return items.map((item) => {
    const lineId = item.lineId.trim();
    if (!lineId || lineId.length > 128) {
      throw new Error(
        "INVALID_ARGUMENT: manual lineId must be between 1 and 128 characters",
      );
    }
    if (lineIds.has(lineId)) {
      throw new Error("INVALID_ARGUMENT: manual lineIds must be unique");
    }
    lineIds.add(lineId);
    const { name } = normalizeManualLineName(item.name);
    const quantityValidation = validateSaleQuantity({
      quantity: item.quantity,
      allowFractional: true,
      quantityPrecision: 6,
      minimumSaleQuantity: 0.000001,
      quantityIncrement: 0.000001,
    });
    if (!quantityValidation.valid) {
      throw new Error(
        `INVALID_ARGUMENT: manual quantity is invalid (${quantityValidation.reason})`,
      );
    }
    if (!Number.isSafeInteger(item.unitPriceCents) || item.unitPriceCents <= 0) {
      throw new Error(
        "INVALID_ARGUMENT: manual unitPriceCents must be positive integer cents",
      );
    }
    const lineTotalCents = Math.round(
      quantityValidation.quantity * item.unitPriceCents,
    );
    if (!Number.isSafeInteger(lineTotalCents) || lineTotalCents <= 0) {
      throw new Error(
        "INVALID_ARGUMENT: Calculated manual line total is outside the safe range",
      );
    }
    return {
      lineId,
      name,
      quantity: quantityValidation.quantity,
      unitPriceCents: item.unitPriceCents,
    };
  });
}

async function resolveManualItems(
  ctx: QueryCtx | MutationCtx,
  businessId: Id<"businesses">,
  items: ManualItem[],
): Promise<ResolvedManualItem[]> {
  return Promise.all(
    items.map(async (item) => {
      const { nameKey } = normalizeManualLineName(item.name);
      const policy = await ctx.db
        .query("manualLinePolicies")
        .withIndex("by_businessId_and_nameKey", (q) =>
          q.eq("businessId", businessId).eq("nameKey", nameKey),
        )
        .unique();
      const activePolicy = policy?.isActive ? policy : null;
      return {
        ...item,
        isTaxable: activePolicy?.isTaxable ?? true,
        unitCostCents: activePolicy?.unitCostCents ?? 0,
        manualCostKnown: activePolicy?.unitCostCents !== undefined,
        manualPolicyId: activePolicy?._id,
      };
    }),
  );
}

function requireNonemptyCart(inventoryCount: number, manualCount: number): void {
  if (inventoryCount + manualCount === 0) {
    throw new Error("INVALID_ARGUMENT: Checkout cart cannot be empty");
  }
  if (inventoryCount + manualCount > 50) {
    throw new Error("INVALID_ARGUMENT: Checkout cart cannot exceed 50 lines");
  }
}

async function createCheckoutFingerprint(input: {
  customerId?: Id<"customers">;
  items: Array<{ productId: Id<"products">; quantityGrams: number }>;
  manualItems: ManualItem[];
  paymentMethod: CheckoutPaymentMethod;
  fees?: CheckoutFee[];
  paymentReference?: string;
  amountPaidCents: number;
  delivery?: {
    address: string;
    vendorFeeCents: number;
    chargeCustomer: boolean;
  };
}): Promise<string> {
  return JSON.stringify({
    customerId: input.customerId ? String(input.customerId) : null,
    items: input.items.map((item) => [
      String(item.productId),
      item.quantityGrams,
    ]),
    manualItems: input.manualItems.map((item) => ({
      lineId: item.lineId,
      name: item.name,
      quantity: item.quantity,
      unitPriceCents: item.unitPriceCents,
    })),
    ...(input.fees?.length ? { fees: input.fees } : {}),
    ...(input.paymentReference ? { paymentReference: input.paymentReference } : {}),
    paymentMethod: input.paymentMethod,
    amountPaidCents: input.amountPaidCents,
    delivery: input.delivery
      ? {
          addressHash: await hashDeliveryAddress(input.delivery.address),
          vendorFeeCents: input.delivery.vendorFeeCents,
          chargeCustomer: input.delivery.chargeCustomer,
        }
      : null,
  });
}

export const quoteCheckout = query({
  args: {
    customerId: v.optional(v.id("customers")),
    items: v.array(
      v.object({
        productId: v.id("products"),
        quantityGrams: v.number(),
      }),
    ),
    manualItems: v.optional(v.array(manualItemInput)),
    fees: v.optional(v.array(checkoutFee)),
    delivery: v.optional(
      v.object({
        vendorFeeCents: v.number(),
        chargeCustomer: v.boolean(),
      }),
    ),
  },
  returns: quoteResult,
  handler: async (ctx, args) => {
    const auth = await requireUserAndBusiness(ctx);
    requirePermission(auth.userRecord, "PROCESS_CHECKOUT");
    const feeRevenueCents = totalFees(normalizeFees(args.fees));
    const items = normalizeItems(args.items);
    const normalizedManualItems = normalizeManualItems(args.manualItems);
    requireNonemptyCart(items.length, normalizedManualItems.length);
    const manualItems = await resolveManualItems(
      ctx,
      auth.businessId,
      normalizedManualItems,
    );
    if (args.delivery) {
      requireNonnegativeSafeInteger(
        args.delivery.vendorFeeCents,
        "delivery.vendorFeeCents",
      );
      if (args.delivery.vendorFeeCents === 0) {
        throw new Error("INVALID_ARGUMENT: Delivery vendor fee must be positive");
      }
    }
    let customer: Doc<"customers"> | null = null;
    if (args.customerId) {
      customer = await ctx.db.get(args.customerId);
      if (
        !customer ||
        customer.businessId !== auth.businessId ||
        !customer.isActive
      ) {
        throw new Error(`NOT_FOUND: Customer '${args.customerId}' not found`);
      }
    }
    const settings = await ctx.db
      .query("businessSettings")
      .withIndex("by_businessId", (q) => q.eq("businessId", auth.businessId))
      .unique();
    const loyaltyDiscountRateBps = customer
      ? resolveLoyaltyDiscountRate(
          customer.loyaltyEligibleSpendCents ?? customer.totalPurchasesCents,
          settings?.loyaltyTiers ?? [],
        )
      : 0;
    const products = await Promise.all(
      items.map(async (item) => {
        const product = await ctx.db.get(item.productId);
        if (
          !product ||
          product.businessId !== auth.businessId ||
          !product.isActive
        ) {
          throw new Error(`NOT_FOUND: Product '${item.productId}' not found in catalog`);
        }
        return { item, product };
      }),
    );
    const pricing = products.length === 0 ? {
      lines: [],
      merchandiseSubtotalCents: 0,
      taxableMerchandiseCents: 0,
      discountCents: 0,
      merchandiseTotalCents: 0,
    } : calculateCheckoutPricing({
      lines: products.map(({ item, product }) => {
        const commerceConfig = normalizeProductCommerceConfig(product);
        return {
          quantity: item.quantityGrams,
          product: {
          productId: String(product._id),
          productName: product.productName,
          baseUnitPriceCents: product.sellingPriceCents,
          taxable: product.isTaxable !== false,
          allowFractional: product.allowFractionalWeight,
            quantityPrecision: commerceConfig.quantityPrecision,
            minimumSaleQuantity: commerceConfig.minimumSaleQuantity,
            quantityIncrement: commerceConfig.quantityIncrement,
            bulkPriceTiers: commerceConfig.bulkPriceTiers,
          },
        };
      }),
      loyaltyDiscountRateBps,
      loyaltyCombinationPolicy:
        settings?.loyaltyCombinationPolicy ?? "best_only",
    });
    const taxRateBps = auth.businessRecord.collectTax
      ? auth.businessRecord.taxRateBps
      : 0;
    const inventoryLines = pricing.lines.map((line) => ({
      ...line,
      source: "inventory" as const,
      lineId: line.productId,
    }));
    const manualLines = manualItems.map((item) => {
      const baseLineTotalCents = Math.round(
        item.quantity * item.unitPriceCents,
      );
      const loyaltyDiscountCents = Math.round(
        (baseLineTotalCents * loyaltyDiscountRateBps) / 10_000,
      );
      const lineSubtotalCents =
        baseLineTotalCents - loyaltyDiscountCents;
      return {
        productId: `manual:${item.lineId}`,
        source: "manual" as const,
        lineId: item.lineId,
        productName: item.name,
        taxable: item.isTaxable,
        quantity: item.quantity,
        baseUnitPriceCents: item.unitPriceCents,
        appliedUnitPriceCents: item.unitPriceCents,
        baseLineTotalCents,
        lineSubtotalCents,
        bulkDiscountCents: 0,
        loyaltyDiscountCents,
        lineDiscountCents: loyaltyDiscountCents,
      };
    });
    const manualMerchandiseSubtotalCents = manualLines.reduce(
      (total, line) => total + line.baseLineTotalCents,
      0,
    );
    const manualDiscountCents = manualLines.reduce(
      (total, line) => total + line.loyaltyDiscountCents,
      0,
    );
    const manualMerchandiseTotalCents = manualLines.reduce(
      (total, line) => total + line.lineSubtotalCents,
      0,
    );
    const manualTaxableCents = manualLines.reduce(
      (total, line) => total + (line.taxable ? line.lineSubtotalCents : 0),
      0,
    );
    const taxableMerchandiseCents =
      pricing.taxableMerchandiseCents + manualTaxableCents;
    const merchandiseTaxCents = calculateTaxCents(
      taxableMerchandiseCents,
      taxRateBps,
    );
    const deliveryRevenueCents = args.delivery?.chargeCustomer
      ? args.delivery.vendorFeeCents
      : 0;
    const deliveryTaxCents =
      args.delivery?.chargeCustomer && settings?.deliveryFeeTaxable
        ? calculateTaxCents(deliveryRevenueCents, taxRateBps)
        : 0;
    const taxAmountCents = merchandiseTaxCents + deliveryTaxCents;
    const totalAmountCents = pricing.merchandiseTotalCents + manualMerchandiseTotalCents + feeRevenueCents + deliveryRevenueCents + taxAmountCents;
    requireNonnegativeSafeInteger(totalAmountCents, "totalAmountCents");
    return {
      lines: [...inventoryLines, ...manualLines],
      ...(feeRevenueCents ? { feeRevenueCents } : {}),
      merchandiseSubtotalCents:
        pricing.merchandiseSubtotalCents + manualMerchandiseSubtotalCents,
      discountCents: pricing.discountCents + manualDiscountCents,
      subtotalCents:
        pricing.merchandiseTotalCents + manualMerchandiseTotalCents,
      taxableSubtotalCents:
        taxableMerchandiseCents +
        (deliveryTaxCents > 0 ? deliveryRevenueCents : 0),
      merchandiseTaxCents,
      deliveryRevenueCents,
      vendorDeliveryExpenseCents: args.delivery?.vendorFeeCents ?? 0,
      deliveryTaxCents,
      taxAmountCents,
      totalAmountCents,
    };
  },
});

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
    manualItems: v.optional(v.array(manualItemInput)),
    fees: v.optional(v.array(checkoutFee)),
    paymentMethod,
    paymentReference: v.optional(v.string()),
    amountPaidCents: v.number(),
    delivery: v.optional(deliveryInput),
  },
  returns: checkoutResult,
  handler: async (ctx, args) => {
    const auth = await requireUserAndBusiness(ctx);
    requirePermission(auth.userRecord, "PROCESS_CHECKOUT");
    requireNonnegativeSafeInteger(args.amountPaidCents, "amountPaidCents");
    const fees = normalizeFees(args.fees);
    const feeRevenueCents = totalFees(fees);
    const paymentReference = normalizePaymentReference(args.paymentReference);

    const originalOrderNumber = args.orderNumber;
    const orderNumber = originalOrderNumber.trim();
    if (!orderNumber || orderNumber.length > 128) {
      throw new Error(
        "INVALID_ARGUMENT: Order number must be between 1 and 128 characters",
      );
    }

    const normalizedItems = normalizeItems(args.items);
    const normalizedManualItems = normalizeManualItems(args.manualItems);
    requireNonemptyCart(normalizedItems.length, normalizedManualItems.length);
    const resolvedManualItems = await resolveManualItems(
      ctx,
      auth.businessId,
      normalizedManualItems,
    );
    if (args.delivery) {
      requireNonnegativeSafeInteger(
        args.delivery.vendorFeeCents,
        "delivery.vendorFeeCents",
      );
      if (args.delivery.vendorFeeCents === 0) {
        throw new Error("INVALID_ARGUMENT: Delivery vendor fee must be positive");
      }
    }
    const fingerprint = await createCheckoutFingerprint({
      customerId: args.customerId,
      items: normalizedItems,
      manualItems: normalizedManualItems,
      paymentMethod: args.paymentMethod,
      fees,
      paymentReference,
      amountPaidCents: args.amountPaidCents,
      delivery: args.delivery,
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
          existingFingerprint = await createCheckoutFingerprint({
            customerId: existingOrder.customerId,
            items: normalizeItems(
              existingLineItems
                .filter(
                  (lineItem) => lineItem.productId !== undefined,
                )
                .map((lineItem) => ({
                  productId: lineItem.productId!,
                  quantityGrams: lineItem.quantityGrams,
                })),
            ),
            manualItems: [],
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
      const existingDelivery = await ctx.db
        .query("deliveries")
        .withIndex("by_saleId", (q) => q.eq("saleId", existingOrder._id))
        .unique();
      return {
        saleId: existingOrder._id,
        orderNumber: existingOrder.orderNumber,
        status: "ALREADY_PROCESSED" as const,
        subtotalCents: existingOrder.subtotalCents,
        ...(existingOrder.feeRevenueCents ? { feeRevenueCents: existingOrder.feeRevenueCents } : {}),
        merchandiseSubtotalCents:
          existingOrder.merchandiseSubtotalCents ?? existingOrder.subtotalCents,
        discountCents: existingOrder.discountCents ?? 0,
        merchandiseTaxCents:
          existingOrder.merchandiseTaxCents ?? existingOrder.taxAmountCents,
        deliveryRevenueCents: existingOrder.deliveryRevenueCents ?? 0,
        vendorDeliveryExpenseCents:
          existingOrder.vendorDeliveryExpenseCents ?? 0,
        deliveryTaxCents: existingOrder.deliveryTaxCents ?? 0,
        taxableSubtotalCents:
          existingOrder.taxableSubtotalCents ?? existingOrder.subtotalCents,
        taxAmountCents: existingOrder.taxAmountCents,
        totalAmountCents: existingOrder.totalAmountCents,
        changeAmountCents: existingOrder.changeAmountCents,
        allocationsCount: 0,
        deliveryId: existingDelivery?._id,
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

    const productsById = new Map<string, Doc<"products">>();
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

      productsById.set(String(product._id), product);
    }

    const commerceSettings = await ctx.db
      .query("businessSettings")
      .withIndex("by_businessId", (q) => q.eq("businessId", auth.businessId))
      .unique();
    const loyaltyDiscountRateBps = customer
      ? resolveLoyaltyDiscountRate(
          customer.loyaltyEligibleSpendCents ?? customer.totalPurchasesCents,
          commerceSettings?.loyaltyTiers ?? [],
        )
      : 0;
    const pricing = normalizedItems.length === 0 ? {
      lines: [],
      merchandiseSubtotalCents: 0,
      taxableMerchandiseCents: 0,
      discountCents: 0,
      merchandiseTotalCents: 0,
    } : calculateCheckoutPricing({
      lines: normalizedItems.map((item) => {
        const product = productsById.get(String(item.productId))!;
        const commerceConfig = normalizeProductCommerceConfig(product);
        return {
          quantity: item.quantityGrams,
          product: {
            productId: String(product._id),
            productName: product.productName,
            baseUnitPriceCents: product.sellingPriceCents,
            taxable: product.isTaxable !== false,
            allowFractional: product.allowFractionalWeight,
            quantityPrecision: commerceConfig.quantityPrecision,
            minimumSaleQuantity: commerceConfig.minimumSaleQuantity,
            quantityIncrement: commerceConfig.quantityIncrement,
            bulkPriceTiers: commerceConfig.bulkPriceTiers,
          },
        };
      }),
      loyaltyDiscountRateBps,
      loyaltyCombinationPolicy:
        commerceSettings?.loyaltyCombinationPolicy ?? "best_only",
    });
    const processedLineItems = pricing.lines.map((line) => ({
      product: productsById.get(line.productId)!,
      quantityGrams: line.quantity,
      unitPriceCents: line.appliedUnitPriceCents,
      lineTotalCents: line.lineSubtotalCents,
      unitCostCents: productsById.get(line.productId)!.unitCostCents,
      baseLineTotalCents: line.baseLineTotalCents,
      bulkDiscountCents: line.bulkDiscountCents,
      loyaltyDiscountCents: line.loyaltyDiscountCents,
    }));
    const processedManualLineItems = resolvedManualItems.map((item) => {
      const lineCostCents = Math.round(item.quantity * item.unitCostCents);
      if (!Number.isSafeInteger(lineCostCents) || lineCostCents < 0) {
        throw new Error(
          "INVALID_ARGUMENT: Calculated manual line cost is outside the safe range",
        );
      }
      const baseLineTotalCents = Math.round(
        item.quantity * item.unitPriceCents,
      );
      const loyaltyDiscountCents = Math.round(
        (baseLineTotalCents * loyaltyDiscountRateBps) / 10_000,
      );
      return {
        ...item,
        baseLineTotalCents,
        loyaltyDiscountCents,
        lineTotalCents: baseLineTotalCents - loyaltyDiscountCents,
        lineCostCents,
      };
    });
    for (const lineItem of processedLineItems) {
      if (lineItem.product.quantityOnHandGrams < lineItem.quantityGrams) {
        throw new Error(
          `INSUFFICIENT_STOCK: Product '${lineItem.product.productName}' does not have enough stock`,
        );
      }
    }

    const manualMerchandiseSubtotalCents = processedManualLineItems.reduce(
      (total, line) => total + line.baseLineTotalCents,
      0,
    );
    const manualDiscountCents = processedManualLineItems.reduce(
      (total, line) => total + line.loyaltyDiscountCents,
      0,
    );
    const manualMerchandiseTotalCents = processedManualLineItems.reduce(
      (total, line) => total + line.lineTotalCents,
      0,
    );
    const manualTaxableCents = processedManualLineItems.reduce(
      (total, line) => total + (line.isTaxable ? line.lineTotalCents : 0),
      0,
    );
    const merchandiseSubtotalCents =
      pricing.merchandiseSubtotalCents + manualMerchandiseSubtotalCents;
    const discountCents = pricing.discountCents + manualDiscountCents;
    const subtotalCents =
      pricing.merchandiseTotalCents + manualMerchandiseTotalCents;
    const deliveryRevenueCents = args.delivery?.chargeCustomer
      ? args.delivery.vendorFeeCents
      : 0;
    const vendorDeliveryExpenseCents = args.delivery?.vendorFeeCents ?? 0;

    const taxRateBps = auth.businessRecord.collectTax
      ? auth.businessRecord.taxRateBps
      : 0;
    requireNonnegativeSafeInteger(taxRateBps, "taxRateBps");
    if (taxRateBps > 10_000) {
      throw new Error("INVALID_ARGUMENT: taxRateBps cannot exceed 10000");
    }
    const merchandiseTaxCents = calculateTaxCents(
      pricing.taxableMerchandiseCents + manualTaxableCents,
      taxRateBps,
    );
    const deliveryTaxCents =
      args.delivery &&
      args.delivery.chargeCustomer &&
      commerceSettings?.deliveryFeeTaxable
        ? calculateTaxCents(deliveryRevenueCents, taxRateBps)
        : 0;
    const taxableSubtotalCents =
      pricing.taxableMerchandiseCents +
      manualTaxableCents +
      (deliveryTaxCents > 0 ? deliveryRevenueCents : 0);
    const taxAmountCents = merchandiseTaxCents + deliveryTaxCents;
    const totalAmountCents =
      subtotalCents + feeRevenueCents + deliveryRevenueCents + taxAmountCents;
    if (!Number.isSafeInteger(totalAmountCents)) {
      throw new Error(
        "INVALID_ARGUMENT: Calculated checkout total is outside the safe range",
      );
    }

    const { creditAmountCents, changeAmountCents } = calculateSettlement(args.paymentMethod, totalAmountCents, args.amountPaidCents);

    if (creditAmountCents > 0 && !customer) throw new Error("INVALID_ARGUMENT: Unpaid mixed sales require a customer");
    if (creditAmountCents > 0 && customer) {
      requireNonnegativeSafeInteger(customer.totalCreditUsedCents, "totalCreditUsedCents");
      requireNonnegativeSafeInteger(customer.creditLimitCents, "creditLimitCents");
      const newCreditUsedCents =
        customer.totalCreditUsedCents + creditAmountCents;
      requireNonnegativeSafeInteger(newCreditUsedCents, "newCreditUsedCents");
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
    const saleId = await ctx.db.insert("sales", {
      businessId: auth.businessId,
      customerId: args.customerId,
      orderNumber,
      orderStatus: "completed",
      subtotalCents,
      merchandiseSubtotalCents,
      discountCents,
      merchandiseRevenueCents: subtotalCents,
      deliveryRevenueCents,
      vendorDeliveryExpenseCents,
      deliveryTaxCents,
      merchandiseTaxCents,
      loyaltyEligibleSpendCents: subtotalCents,
      cogsCents: 0,
      taxableSubtotalCents,
      taxAmountCents,
      totalAmountCents,
      amountPaidCents: args.amountPaidCents,
      changeAmountCents,
      paymentMethod: args.paymentMethod,
      ...(paymentReference ? { paymentReference } : {}),
      ...(fees.length ? { fees, feeRevenueCents } : {}),
      creditAmountCents,
      checkoutFingerprint: fingerprint,
      createdBy: auth.userId,
      createdAt: now,
      updatedAt: now,
    });

    let deliveryId: Id<"deliveries"> | undefined;
    if (args.delivery) {
      const dispatchDueAt =
        now + (commerceSettings?.deliveryDispatchSlaMinutes ?? 5) * 60_000;
      deliveryId = await ctx.db.insert("deliveries", {
        businessId: auth.businessId,
        saleId,
        customerId: args.customerId,
        addressEncrypted: "pending",
        addressEncryptionVersion: 0,
        vendorFeeCents: vendorDeliveryExpenseCents,
        customerFeeCents: deliveryRevenueCents,
        deliveryTaxCents,
        chargeCustomer: args.delivery.chargeCustomer,
        status: "ready_for_dispatch",
        dispatchDueAt,
        createdBy: auth.userId,
        createdAt: now,
        updatedAt: now,
      });
      const encrypted = await encryptDeliveryAddress(args.delivery.address, {
        businessId: String(auth.businessId),
        saleId: String(saleId),
        deliveryId: String(deliveryId),
      });
      await ctx.db.patch(deliveryId, {
        addressEncrypted: encrypted.ciphertext,
        addressEncryptionVersion: encrypted.version,
      });
      await ctx.db.insert("deliveryEvents", {
        businessId: auth.businessId,
        deliveryId,
        actorUserId: auth.userId,
        type: "created",
        toStatus: "ready_for_dispatch",
        metadata: JSON.stringify({
          chargeCustomer: args.delivery.chargeCustomer,
          dispatchDueAt,
        }),
        createdAt: now,
      });
      await ctx.scheduler.runAt(
        dispatchDueAt,
        internal.deliveries.processReminder,
        { deliveryId, kind: "dispatch_overdue", expectedAt: dispatchDueAt },
      );
    }

    let allocationsCount = 0;
    let cogsCents = 0;
    for (const lineItem of processedLineItems) {
      const lineItemId = await ctx.db.insert("salesLineItems", {
        saleId,
        productId: lineItem.product._id,
        source: "inventory",
        quantityGrams: lineItem.quantityGrams,
        unitPriceCents: lineItem.unitPriceCents,
        lineTotalCents: lineItem.lineTotalCents,
        baseUnitPriceCents: lineItem.product.sellingPriceCents,
        baseLineTotalCents: lineItem.baseLineTotalCents,
        bulkDiscountCents: lineItem.bulkDiscountCents,
        loyaltyDiscountCents: lineItem.loyaltyDiscountCents,
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
        cogsCents += allocation.extendedCostCents;
      }
      allocationsCount += allocations.length;

      await ctx.db.patch(lineItem.product._id, {
        quantityOnHandGrams:
          lineItem.product.quantityOnHandGrams - lineItem.quantityGrams,
        updatedAt: now,
      });
      await ctx.db.insert("auditEvents", {
        businessId: auth.businessId,
        userId: auth.userId,
        action: "INVENTORY_SOLD",
        entityType: "product",
        entityId: lineItem.product._id,
        metadata: JSON.stringify({ saleId, delta: -lineItem.quantityGrams, reason: "Checkout", previousQuantity: lineItem.product.quantityOnHandGrams, quantity: lineItem.product.quantityOnHandGrams - lineItem.quantityGrams }),
        timestamp: now,
      });
    }
    for (const lineItem of processedManualLineItems) {
      await ctx.db.insert("salesLineItems", {
        saleId,
        source: "manual",
        manualLineId: lineItem.lineId,
        manualName: lineItem.name,
        isTaxable: lineItem.isTaxable,
        manualPolicyId: lineItem.manualPolicyId,
        manualCostKnown: lineItem.manualCostKnown,
        quantityGrams: lineItem.quantity,
        unitPriceCents: lineItem.unitPriceCents,
        lineTotalCents: lineItem.lineTotalCents,
        baseUnitPriceCents: lineItem.unitPriceCents,
        baseLineTotalCents: lineItem.baseLineTotalCents,
        bulkDiscountCents: 0,
        loyaltyDiscountCents: lineItem.loyaltyDiscountCents,
        unitCostCents: lineItem.unitCostCents,
        createdAt: now,
      });
      if (lineItem.manualCostKnown) {
        cogsCents += lineItem.lineCostCents;
      }
    }
    await ctx.db.patch(saleId, { cogsCents, updatedAt: now });

    if (customer && args.customerId) {
      await ctx.db.patch(args.customerId, {
        totalPurchasesCents: customer.totalPurchasesCents + totalAmountCents,
        loyaltyEligibleSpendCents:
          (customer.loyaltyEligibleSpendCents ??
            customer.totalPurchasesCents ??
            0) + subtotalCents,
        totalCreditUsedCents:
          customer.totalCreditUsedCents +
          creditAmountCents,
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
        merchandiseSubtotalCents,
        discountCents,
        deliveryRevenueCents,
        vendorDeliveryExpenseCents,
        deliveryTaxCents,
        taxableSubtotalCents,
        taxAmountCents,
        totalAmountCents,
        feeRevenueCents,
        creditAmountCents,
        itemCount: processedLineItems.length + processedManualLineItems.length,
      }),
      timestamp: now,
    });

    return {
      saleId,
      orderNumber,
      status: "COMPLETED" as const,
      ...(feeRevenueCents ? { feeRevenueCents } : {}),
      subtotalCents,
      merchandiseSubtotalCents,
      discountCents,
      merchandiseTaxCents,
      deliveryRevenueCents,
      vendorDeliveryExpenseCents,
      deliveryTaxCents,
      taxableSubtotalCents,
      taxAmountCents,
      totalAmountCents,
      changeAmountCents,
      allocationsCount,
      deliveryId,
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
