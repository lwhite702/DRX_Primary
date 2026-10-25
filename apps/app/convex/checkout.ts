import { v } from "convex/values";
import { appendCreditEntry } from "./helpers/creditLedger";
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
import { requirePermission, hasPermission } from "./helpers/permissions";
import {
  calculateCheckoutPricing,
  resolveLoyaltyDiscountRate,
  validateSaleQuantity,
  type CheckoutPricing,
  type CommerceProduct,
  type PricedLine,
} from "./helpers/pricing";
import {
  encryptDeliveryAddress,
  hashDeliveryAddress,
} from "./helpers/deliveryCrypto";
import { normalizeProductCommerceConfig } from "./helpers/productCommerce";
import { normalizeManualLineName } from "./helpers/manualLinePolicy";

import { checkoutFee, normalizeFees, totalFees, normalizePaymentReference, calculateSettlement, ALLOWED_SPLIT_TENDER_METHODS, type CheckoutFee, type CheckoutPaymentMethod } from "./helpers/checkoutSettlement";

import { priceOverride, normalizeOverrides, deliveryTerms, validateDeliveryTerms, type PriceOverride, type DeliveryTerms } from "./helpers/checkoutTerms";

const paymentTenderInput = v.object({
  method: v.string(),
  amountCents: v.number(),
  reference: v.optional(v.string()),
  processorFeeCents: v.optional(v.number()),
});

const paymentMethod = v.union(
  v.literal("cash"),
  v.literal("card"),
  v.literal("credit"),
  v.literal("mixed"),
  v.literal("split"),
  v.literal("zelle"),
  v.literal("p2p_cashapp"),
  v.literal("p2p_paypal"),
  v.literal("p2p_zelle"),
  v.literal("p2p_onepay"),
  v.literal("p2p_chime"),
  v.literal("p2p_venmo"),
  v.literal("p2p_other"),
  v.literal("comp"),
);

const deliveryInput = v.object({
  address: v.string(),
  ...deliveryTerms,
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
      requestedAmountCents: v.optional(v.number()),
      operatorPriceAdjustmentCents: v.number(),
    }),
  ),
  merchandiseSubtotalCents: v.number(),
  feeRevenueCents: v.optional(v.number()),
  discountCents: v.number(),
  priceAdjustmentCents: v.optional(v.number()),
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
  priceAdjustmentCents: v.optional(v.number()),
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
  priceAdjustmentCents: v.optional(v.number()),
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
  deliveryFeeCents: v.optional(v.number()),
  discountAmountCents: v.optional(v.number()),
  isComp: v.optional(v.boolean()),
  creditAmountCents: v.optional(v.number()),
  vendorDeliveryExpenseKnown: v.optional(v.boolean()),
  checkoutFingerprint: v.optional(v.string()),
  voidReason: v.optional(v.string()),
  voidSettlementStatus: v.optional(v.string()),
  voidReference: v.optional(v.string()),
  voidedBy: v.optional(v.string()),
  voidedAt: v.optional(v.number()),
  refundReason: v.optional(v.string()),
  refundDisposition: v.optional(v.string()),
  refundSettlementStatus: v.optional(v.string()),
  refundReference: v.optional(v.string()),
  refundedBy: v.optional(v.string()),
  refundedAt: v.optional(v.number()),
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
  items: Array<{ productId: Id<"products">; quantityGrams: number; requestedAmountCents?: number }>,
): Array<{ productId: Id<"products">; quantityGrams: number; requestedAmountCents?: number }> {
  const standardQuantities = new Map<string, number>();
  const fixedAmountLines: Array<{ productId: Id<"products">; quantityGrams: number; requestedAmountCents: number }> = [];
  for (const item of items) {
    if (!Number.isFinite(item.quantityGrams) || item.quantityGrams <= 0) {
      throw new Error(
        "INVALID_ARGUMENT: Item quantity must be a positive finite number",
      );
    }
    if (item.requestedAmountCents !== undefined && (!Number.isSafeInteger(item.requestedAmountCents) || item.requestedAmountCents <= 0)) {
      throw new Error("INVALID_ARGUMENT: requestedAmountCents must be positive integer cents");
    }
    if (item.requestedAmountCents !== undefined) {
      fixedAmountLines.push({ ...item, requestedAmountCents: item.requestedAmountCents });
      continue;
    }
    const productId = String(item.productId);
    const quantity = (standardQuantities.get(productId) ?? 0) + item.quantityGrams;
    if (!Number.isFinite(quantity) || quantity <= 0) {
      throw new Error("INVALID_ARGUMENT: Aggregated item quantity must be a positive finite number");
    }
    standardQuantities.set(productId, quantity);
  }
  const standardLines = [...standardQuantities.entries()].map(([productId, quantityGrams]) => ({
    productId: productId as Id<"products">,
    quantityGrams,
  }));
  return [...standardLines, ...fixedAmountLines].sort((left, right) => String(left.productId).localeCompare(String(right.productId)));
}

type RequestedAmountPricing = Omit<CheckoutPricing, "lines"> & {
  lines: Array<PricedLine & {
    requestedAmountCents?: number;
    operatorPriceAdjustmentCents: number;
  }>;
  priceAdjustmentCents: number;
};

function calculateCheckoutPricingWithRequestedAmounts(input: {
  lines: Array<{
    product: CommerceProduct;
    quantity: number;
    requestedAmountCents?: number;
  }>;
  loyaltyDiscountRateBps: number;
  loyaltyCombinationPolicy: "stack" | "best_only";
}): RequestedAmountPricing {
  const pricing = calculateCheckoutPricing({
    lines: input.lines.map(({ product, quantity }) => ({ product, quantity })),
    loyaltyDiscountRateBps: input.loyaltyDiscountRateBps,
    loyaltyCombinationPolicy: input.loyaltyCombinationPolicy,
  });
  const lines = pricing.lines.map((line, index) => {
    const requestedAmountCents = input.lines[index]?.requestedAmountCents;
    if (requestedAmountCents === undefined) {
      return { ...line, operatorPriceAdjustmentCents: 0 };
    }
    if (!Number.isSafeInteger(requestedAmountCents) || requestedAmountCents <= 0) {
      throw new Error("INVALID_ARGUMENT: requestedAmountCents must be positive integer cents");
    }
    if (!input.lines[index]?.product.allowFractional) {
      throw new Error("INVALID_ARGUMENT: requestedAmountCents is only supported for fractional products");
    }
    return {
      ...line,
      requestedAmountCents,
      operatorPriceAdjustmentCents: requestedAmountCents - line.lineSubtotalCents,
      lineSubtotalCents: requestedAmountCents,
      appliedUnitPriceCents: requestedAmountCents / line.quantity,
    };
  });

  return {
    ...pricing,
    lines,
    taxableMerchandiseCents: lines.reduce(
      (total, line) => total + (line.taxable ? line.lineSubtotalCents : 0),
      0,
    ),
    priceAdjustmentCents: lines.reduce(
      (total, line) => total + line.operatorPriceAdjustmentCents,
      0,
    ),
    merchandiseTotalCents: lines.reduce(
      (total, line) => total + line.lineSubtotalCents,
      0,
    ),
  };
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
  items: Array<{ productId: Id<"products">; quantityGrams: number; requestedAmountCents?: number }>;
  manualItems: ManualItem[];
  paymentMethod: CheckoutPaymentMethod;
  fees?: CheckoutFee[];
  priceOverrides?: PriceOverride[];
  paymentReference?: string;
  deliveryFeeCents?: number;
  discountAmountCents?: number;
  isComp?: boolean;
  amountPaidCents: number;
  delivery?: DeliveryTerms & { address: string };
}): Promise<string> {
  return JSON.stringify({
    customerId: input.customerId ? String(input.customerId) : null,
    items: input.items.map((item) => item.requestedAmountCents === undefined
      ? [String(item.productId), item.quantityGrams]
      : [String(item.productId), item.quantityGrams, item.requestedAmountCents]),
    manualItems: input.manualItems.map((item) => ({
      lineId: item.lineId,
      name: item.name,
      quantity: item.quantity,
      unitPriceCents: item.unitPriceCents,
    })),
    ...(input.fees?.length ? { fees: input.fees } : {}),
    ...(input.priceOverrides?.length ? { priceOverrides: input.priceOverrides } : {}),
    ...(input.paymentReference ? { paymentReference: input.paymentReference } : {}),
    ...(input.deliveryFeeCents !== undefined ? { deliveryFeeCents: input.deliveryFeeCents } : {}),
    ...(input.discountAmountCents !== undefined ? { discountAmountCents: input.discountAmountCents } : {}),
    ...(input.isComp !== undefined ? { isComp: input.isComp } : {}),
    paymentMethod: input.paymentMethod,
    amountPaidCents: input.amountPaidCents,
    delivery: input.delivery
      ? {
          addressHash: await hashDeliveryAddress(input.delivery.address),
          vendorFeeCents: input.delivery.vendorFeeCents,
          chargeCustomer: input.delivery.chargeCustomer,
          ...(input.delivery.customerFeeCents === undefined ? {} : { customerFeeCents: input.delivery.customerFeeCents }),
          ...(input.delivery.profileId ? { profileId: input.delivery.profileId } : {}),
          ...(input.delivery.vendorExpenseKnown === undefined ? {} : { vendorExpenseKnown: input.delivery.vendorExpenseKnown }),
          ...(input.delivery.dispatchType ? { dispatchType: input.delivery.dispatchType } : {}),
          ...(input.delivery.feeSplitMode ? { feeSplitMode: input.delivery.feeSplitMode } : {}),
          ...(input.delivery.estimatedArrivalMinutes !== undefined ? { estimatedArrivalMinutes: input.delivery.estimatedArrivalMinutes } : {}),
          ...(input.delivery.uberTrackingUrl ? { uberTrackingUrl: input.delivery.uberTrackingUrl } : {}),
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
        requestedAmountCents: v.optional(v.number()),
      }),
    ),
    manualItems: v.optional(v.array(manualItemInput)),
    fees: v.optional(v.array(checkoutFee)),
    priceOverrides: v.optional(v.array(priceOverride)),
    delivery: v.optional(
      v.object(deliveryTerms),
    ),
    deliveryFeeCents: v.optional(v.number()),
    discountAmountCents: v.optional(v.number()),
  },
  returns: quoteResult,
  handler: async (ctx, args) => {
    const auth = await requireUserAndBusiness(ctx);
    requirePermission(auth.userRecord, "PROCESS_CHECKOUT");
    if (args.deliveryFeeCents !== undefined) {
      requireNonnegativeSafeInteger(args.deliveryFeeCents, "deliveryFeeCents");
    }
    if (args.discountAmountCents !== undefined) {
      requireNonnegativeSafeInteger(args.discountAmountCents, "discountAmountCents");
    }
    if (
      (args.deliveryFeeCents !== undefined && args.deliveryFeeCents > 0) ||
      (args.discountAmountCents !== undefined && args.discountAmountCents > 0)
    ) {
      requirePermission(auth.userRecord, "APPLY_CHECKOUT_OVERRIDE");
    }
    const feeRevenueCents = totalFees(normalizeFees(args.fees));
    const items = normalizeItems(args.items);
    const overrides = normalizeOverrides(auth.userRecord, items, args.priceOverrides);
    const normalizedManualItems = normalizeManualItems(args.manualItems);
    requireNonemptyCart(items.length, normalizedManualItems.length);
    const manualItems = await resolveManualItems(
      ctx,
      auth.businessId,
      normalizedManualItems,
    );
    await validateDeliveryTerms(ctx, auth.businessId, args.delivery);
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
      priceAdjustmentCents: 0,
      merchandiseTotalCents: 0,
    } : calculateCheckoutPricingWithRequestedAmounts({
      lines: products.map(({ item, product }) => {
        const commerceConfig = normalizeProductCommerceConfig(product);
        return {
          quantity: item.quantityGrams,
          requestedAmountCents: item.requestedAmountCents,
          product: {
          productId: String(product._id),
          productName: product.productName,
          baseUnitPriceCents: overrides.find(override => override.productId === product._id)?.unitPriceCents ?? product.sellingPriceCents,
          taxable: product.isTaxable !== false,
          allowFractional: product.allowFractionalWeight,
            quantityPrecision: commerceConfig.quantityPrecision,
            minimumSaleQuantity: commerceConfig.minimumSaleQuantity,
            quantityIncrement: commerceConfig.quantityIncrement,
            bulkPriceTiers: overrides.some(override => override.productId === product._id) ? [] : commerceConfig.bulkPriceTiers,
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
        operatorPriceAdjustmentCents: 0,
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

    const baseMerchandiseTotalCents =
      pricing.merchandiseTotalCents + manualMerchandiseTotalCents;
    const baseDiscountCents = pricing.discountCents + manualDiscountCents;
    const additionalDiscountCents = args.discountAmountCents ?? 0;
    if (additionalDiscountCents > baseMerchandiseTotalCents) {
      throw new Error("INVALID_ARGUMENT: Discount cannot exceed subtotal");
    }
    const discountCents = baseDiscountCents + additionalDiscountCents;
    const discountedSubtotalCents = Math.max(0, baseMerchandiseTotalCents - additionalDiscountCents);
    const discountRatio =
      baseMerchandiseTotalCents > 0
        ? discountedSubtotalCents / baseMerchandiseTotalCents
        : 1;
    const discountedTaxableMerchandiseCents = Math.round(
      taxableMerchandiseCents * discountRatio,
    );

    const deliveryRevenueCents =
      args.delivery?.customerFeeCents ??
      (args.delivery?.chargeCustomer ? args.delivery.vendorFeeCents : 0) +
        (args.deliveryFeeCents ?? 0);
    const deliveryTaxCents =
      args.delivery?.chargeCustomer && settings?.deliveryFeeTaxable
        ? calculateTaxCents(deliveryRevenueCents, taxRateBps)
        : 0;

    const merchandiseTaxCents = calculateTaxCents(
      discountedTaxableMerchandiseCents,
      taxRateBps,
    );
    const taxableSubtotalCents =
      discountedTaxableMerchandiseCents +
      (deliveryTaxCents > 0 ? deliveryRevenueCents : 0);

    const taxAmountCents = merchandiseTaxCents + deliveryTaxCents;
    const totalAmountCents =
      discountedSubtotalCents + feeRevenueCents + deliveryRevenueCents + taxAmountCents;
    requireNonnegativeSafeInteger(totalAmountCents, "totalAmountCents");
    return {
      lines: [...inventoryLines, ...manualLines],
      ...(feeRevenueCents ? { feeRevenueCents } : {}),
      merchandiseSubtotalCents:
        pricing.merchandiseSubtotalCents + manualMerchandiseSubtotalCents,
      discountCents,
      priceAdjustmentCents: pricing.priceAdjustmentCents,
      subtotalCents: baseMerchandiseTotalCents,
      taxableSubtotalCents,
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
        requestedAmountCents: v.optional(v.number()),
      }),
    ),
    manualItems: v.optional(v.array(manualItemInput)),
    fees: v.optional(v.array(checkoutFee)),
    priceOverrides: v.optional(v.array(priceOverride)),
    paymentMethod,
    paymentReference: v.optional(v.string()),
    paymentTenders: v.optional(v.array(paymentTenderInput)),
    deliveryFeeCents: v.optional(v.number()),
    discountAmountCents: v.optional(v.number()),
    isComp: v.optional(v.boolean()),
    expectedTotalCents: v.optional(v.number()),
    amountPaidCents: v.number(),
    delivery: v.optional(deliveryInput),
  },
  returns: checkoutResult,
  handler: async (ctx, args) => {
    const auth = await requireUserAndBusiness(ctx);
    requirePermission(auth.userRecord, "PROCESS_CHECKOUT");
    requireNonnegativeSafeInteger(args.amountPaidCents, "amountPaidCents");
    if (args.deliveryFeeCents !== undefined) {
      requireNonnegativeSafeInteger(args.deliveryFeeCents, "deliveryFeeCents");
    }
    if (args.discountAmountCents !== undefined) {
      requireNonnegativeSafeInteger(args.discountAmountCents, "discountAmountCents");
    }
    if (
      (args.deliveryFeeCents !== undefined && args.deliveryFeeCents > 0) ||
      (args.discountAmountCents !== undefined && args.discountAmountCents > 0) ||
      args.isComp
    ) {
      requirePermission(auth.userRecord, "APPLY_CHECKOUT_OVERRIDE");
    }

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
    const overrides = normalizeOverrides(auth.userRecord, normalizedItems, args.priceOverrides);
    const normalizedManualItems = normalizeManualItems(args.manualItems);
    requireNonemptyCart(normalizedItems.length, normalizedManualItems.length);
    const resolvedManualItems = await resolveManualItems(
      ctx,
      auth.businessId,
      normalizedManualItems,
    );
    await validateDeliveryTerms(ctx, auth.businessId, args.delivery);
    const normalizedDelivery = args.delivery
      ? {
          ...args.delivery,
          uberTrackingUrl: args.delivery.uberTrackingUrl?.trim() || undefined,
        }
      : undefined;
    const fingerprint = await createCheckoutFingerprint({
      customerId: args.customerId,
      items: normalizedItems,
      manualItems: normalizedManualItems,
      paymentMethod: args.paymentMethod,
      fees,
      priceOverrides: overrides,
      paymentReference,
      deliveryFeeCents: args.deliveryFeeCents,
      discountAmountCents: args.discountAmountCents,
      isComp: args.isComp,
      amountPaidCents: args.amountPaidCents,
      delivery: normalizedDelivery,
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
        priceAdjustmentCents: existingOrder.priceAdjustmentCents ?? 0,
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
      priceAdjustmentCents: 0,
      merchandiseTotalCents: 0,
    } : calculateCheckoutPricingWithRequestedAmounts({
      lines: normalizedItems.map((item) => {
        const product = productsById.get(String(item.productId))!;
        const commerceConfig = normalizeProductCommerceConfig(product);
        return {
          quantity: item.quantityGrams,
          requestedAmountCents: item.requestedAmountCents,
          product: {
            productId: String(product._id),
            productName: product.productName,
            baseUnitPriceCents: overrides.find(override => override.productId === product._id)?.unitPriceCents ?? product.sellingPriceCents,
            taxable: product.isTaxable !== false,
            allowFractional: product.allowFractionalWeight,
            quantityPrecision: commerceConfig.quantityPrecision,
            minimumSaleQuantity: commerceConfig.minimumSaleQuantity,
            quantityIncrement: commerceConfig.quantityIncrement,
            bulkPriceTiers: overrides.some(override => override.productId === product._id) ? [] : commerceConfig.bulkPriceTiers,
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
      ...(line.requestedAmountCents === undefined ? {} : { requestedAmountCents: line.requestedAmountCents }),
      unitPriceCents: line.appliedUnitPriceCents,
      lineTotalCents: line.lineSubtotalCents,
      unitCostCents: productsById.get(line.productId)!.unitCostCents,
      baseLineTotalCents: line.baseLineTotalCents,
      bulkDiscountCents: line.bulkDiscountCents,
      loyaltyDiscountCents: line.loyaltyDiscountCents,
      operatorPriceAdjustmentCents: line.operatorPriceAdjustmentCents,
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
      const aggregateQuantity = processedLineItems
        .filter((candidate) => candidate.product._id === lineItem.product._id)
        .reduce((total, candidate) => total + candidate.quantityGrams, 0);
      if (lineItem.product.quantityOnHandGrams < aggregateQuantity) {
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
    const baseMerchandiseSubtotalCents =
      pricing.merchandiseSubtotalCents + manualMerchandiseSubtotalCents;
    const baseDiscountCents = pricing.discountCents + manualDiscountCents;
    const baseSubtotalCents =
      pricing.merchandiseTotalCents + manualMerchandiseTotalCents;

    let subtotalCents = baseSubtotalCents;
    let merchandiseSubtotalCents = baseMerchandiseSubtotalCents;
    let discountCents = baseDiscountCents + (args.discountAmountCents ?? 0);
    let deliveryRevenueCents =
      args.delivery?.customerFeeCents ??
      (args.delivery?.chargeCustomer ? args.delivery.vendorFeeCents : 0) +
        (args.deliveryFeeCents ?? 0);
    const vendorDeliveryExpenseCents = args.delivery?.vendorFeeCents ?? 0;

    const taxRateBps = auth.businessRecord.collectTax
      ? auth.businessRecord.taxRateBps
      : 0;
    requireNonnegativeSafeInteger(taxRateBps, "taxRateBps");
    if (taxRateBps > 10_000) {
      throw new Error("INVALID_ARGUMENT: taxRateBps cannot exceed 10000");
    }

    const baseTaxableMerchandiseCents =
      pricing.taxableMerchandiseCents + manualTaxableCents;
    const additionalDiscountCents = args.discountAmountCents ?? 0;
    if (additionalDiscountCents > subtotalCents) {
      throw new Error("INVALID_ARGUMENT: Discount cannot exceed subtotal");
    }
    const discountedSubtotalCents = Math.max(
      0,
      subtotalCents - additionalDiscountCents,
    );
    const discountRatio =
      subtotalCents > 0 ? discountedSubtotalCents / subtotalCents : 1;
    const discountedTaxableMerchandiseCents = Math.round(
      baseTaxableMerchandiseCents * discountRatio,
    );

    let merchandiseTaxCents = 0;
    let deliveryTaxCents = 0;
    let taxableSubtotalCents = 0;
    let taxAmountCents = 0;
    let totalAmountCents = 0;

    if (args.isComp) {
      totalAmountCents = 0;
      taxAmountCents = 0;
      merchandiseTaxCents = 0;
      deliveryTaxCents = 0;
      taxableSubtotalCents = 0;
    } else {
      deliveryTaxCents =
        args.delivery &&
        args.delivery.chargeCustomer &&
        commerceSettings?.deliveryFeeTaxable
          ? calculateTaxCents(deliveryRevenueCents, taxRateBps)
          : 0;
      merchandiseTaxCents = calculateTaxCents(
        discountedTaxableMerchandiseCents,
        taxRateBps,
      );
      taxableSubtotalCents =
        discountedTaxableMerchandiseCents +
        (deliveryTaxCents > 0 ? deliveryRevenueCents : 0);
      taxAmountCents = merchandiseTaxCents + deliveryTaxCents;
      totalAmountCents =
        discountedSubtotalCents +
        feeRevenueCents +
        deliveryRevenueCents +
        taxAmountCents;
    }
    if (!Number.isSafeInteger(totalAmountCents)) {
      throw new Error(
        "INVALID_ARGUMENT: Calculated checkout total is outside the safe range",
      );
    }

    if (args.expectedTotalCents !== undefined && args.expectedTotalCents !== totalAmountCents) throw new Error("QUOTE_CHANGED: Refresh and review the checkout total");
    const { creditAmountCents, changeAmountCents } = calculateSettlement(
      args.paymentMethod,
      totalAmountCents,
      args.amountPaidCents,
      args.paymentTenders,
    );

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
          `CREDIT_LIMIT_EXCEEDED: Credit tender amount (${creditAmountCents}¢) exceeds available customer credit`,
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
      priceAdjustmentCents: pricing.priceAdjustmentCents,
      merchandiseRevenueCents: discountedSubtotalCents,
      deliveryRevenueCents,
      vendorDeliveryExpenseCents,
      ...(args.delivery?.vendorExpenseKnown === undefined ? {} : { vendorDeliveryExpenseKnown: args.delivery.vendorExpenseKnown }),
      deliveryTaxCents,
      merchandiseTaxCents,
      loyaltyEligibleSpendCents: discountedSubtotalCents,
      cogsCents: 0,
      taxableSubtotalCents,
      taxAmountCents,
      totalAmountCents,
      amountPaidCents: args.amountPaidCents,
      changeAmountCents,
      paymentMethod: args.paymentMethod,
      ...(paymentReference ? { paymentReference } : {}),
      ...(args.paymentTenders?.length ? { paymentTenders: args.paymentTenders } : {}),
      ...(fees.length ? { fees, feeRevenueCents } : {}),
      ...(args.deliveryFeeCents !== undefined ? { deliveryFeeCents: args.deliveryFeeCents } : {}),
      ...(args.discountAmountCents !== undefined ? { discountAmountCents: args.discountAmountCents } : {}),
      ...(args.isComp !== undefined ? { isComp: args.isComp } : {}),
      creditAmountCents,
      checkoutFingerprint: fingerprint,
      createdBy: auth.userId,
      createdAt: now,
      updatedAt: now,
    });

    let deliveryId: Id<"deliveries"> | undefined;
    if (normalizedDelivery) {
      const dispatchDueAt =
        now + (commerceSettings?.deliveryDispatchSlaMinutes ?? 5) * 60_000;
      deliveryId = await ctx.db.insert("deliveries", {
        businessId: auth.businessId,
        saleId,
        customerId: args.customerId,
        ...(normalizedDelivery.profileId ? { profileId: normalizedDelivery.profileId } : {}),
        ...(normalizedDelivery.vendorExpenseKnown === undefined ? {} : { vendorExpenseKnown: normalizedDelivery.vendorExpenseKnown }),
        ...(normalizedDelivery.dispatchType ? { dispatchType: normalizedDelivery.dispatchType } : {}),
        ...(normalizedDelivery.feeSplitMode ? { feeSplitMode: normalizedDelivery.feeSplitMode } : {}),
        ...(normalizedDelivery.estimatedArrivalMinutes !== undefined ? { estimatedArrivalMinutes: normalizedDelivery.estimatedArrivalMinutes } : {}),
        ...(normalizedDelivery.uberTrackingUrl ? { uberTrackingUrl: normalizedDelivery.uberTrackingUrl } : {}),
        addressEncrypted: "pending",
        addressEncryptionVersion: 0,
        vendorFeeCents: vendorDeliveryExpenseCents,
        customerFeeCents: deliveryRevenueCents,
        deliveryTaxCents,
        chargeCustomer: normalizedDelivery.chargeCustomer,
        status: "ready_for_dispatch",
        dispatchDueAt,
        createdBy: auth.userId,
        createdAt: now,
        updatedAt: now,
      });
      const encrypted = await encryptDeliveryAddress(normalizedDelivery.address, {
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
          chargeCustomer: normalizedDelivery.chargeCustomer,
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
        ...(lineItem.requestedAmountCents === undefined ? {} : { requestedAmountCents: lineItem.requestedAmountCents }),
        operatorPriceAdjustmentCents: lineItem.operatorPriceAdjustmentCents,
        baseUnitPriceCents: lineItem.product.sellingPriceCents,
        ...(overrides.find(override => override.productId === lineItem.product._id) ? { priceOverrideReason: overrides.find(override => override.productId === lineItem.product._id)!.reason, catalogUnitPriceCents: lineItem.product.sellingPriceCents } : {}),
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

    }
    const quantitiesByProduct = new Map<string, { product: (typeof processedLineItems)[number]["product"]; quantity: number }>();
    for (const lineItem of processedLineItems) {
      const key = String(lineItem.product._id);
      const existing = quantitiesByProduct.get(key);
      quantitiesByProduct.set(key, {
        product: lineItem.product,
        quantity: (existing?.quantity ?? 0) + lineItem.quantityGrams,
      });
    }
    for (const { product, quantity } of quantitiesByProduct.values()) {
      const remainingQuantity = product.quantityOnHandGrams - quantity;
      await ctx.db.patch(product._id, { quantityOnHandGrams: remainingQuantity, updatedAt: now });
      await ctx.db.insert("auditEvents", {
        businessId: auth.businessId,
        userId: auth.userId,
        action: "INVENTORY_SOLD",
        entityType: "product",
        entityId: product._id,
        metadata: JSON.stringify({ saleId, delta: -quantity, reason: "Checkout", previousQuantity: product.quantityOnHandGrams, quantity: remainingQuantity }),
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
      if (creditAmountCents > 0) await appendCreditEntry(ctx, { customer, userId: auth.userId, kind: "sale", deltaCents: creditAmountCents, saleId });
      await ctx.db.patch(args.customerId, {
        totalPurchasesCents: customer.totalPurchasesCents + totalAmountCents,
        loyaltyEligibleSpendCents:
          (customer.loyaltyEligibleSpendCents ??
            customer.totalPurchasesCents ??
            0) + discountedSubtotalCents,
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
        priceAdjustmentCents: pricing.priceAdjustmentCents,
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
      priceAdjustmentCents: pricing.priceAdjustmentCents,
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

export const getSalesHistorySummary = query({
  args: {
    limit: v.optional(v.number()),
  },
  returns: v.any(),
  handler: async (ctx, args) => {
    const auth = await requireUserAndBusiness(ctx);
    requirePermission(auth.userRecord, "VIEW_FINANCIALS");
    const canViewCustomers = hasPermission(auth.userRecord, "VIEW_CUSTOMERS");
    const count = Math.min(Math.max(1, args.limit ?? 50), 100);
    const sales = await ctx.db
      .query("sales")
      .withIndex("by_businessId", (q) => q.eq("businessId", auth.businessId))
      .order("desc")
      .take(count);

    return await Promise.all(
      sales.map(async (sale) => {
        const allLineItems = await ctx.db
          .query("salesLineItems")
          .withIndex("by_saleId", (q) => q.eq("saleId", sale._id))
          .collect();
        const itemCount = allLineItems.length;
        const lineItems = allLineItems.slice(0, 10);
        const itemNames = await Promise.all(
          lineItems.map(async (i) => {
            let name = i.manualName;
            if (!name && i.productId) {
              const product = await ctx.db.get(i.productId);
              name = product?.productName;
            }
            return name || "Inventory Item";
          }),
        );
        const itemSummary =
          itemNames.length > 0
            ? itemNames.slice(0, 3).join(", ") +
              (itemCount > 3 ? ` +${itemCount - 3} more` : "")
            : null;

        let customer: any = null;
        if (canViewCustomers && sale.customerId) {
          const doc = await ctx.db.get(sale.customerId);
          customer = doc && doc.businessId === auth.businessId ? doc : null;
        }

        const delivery = await ctx.db
          .query("deliveries")
          .withIndex("by_saleId", (q) => q.eq("saleId", sale._id))
          .unique();

        return {
          sale,
          itemCount,
          itemSummary,
          customer,
          delivery:
            delivery && delivery.businessId === auth.businessId
              ? {
                  _id: delivery._id,
                  status: delivery.status,
                  dispatchType: delivery.dispatchType,
                  feeSplitMode: delivery.feeSplitMode,
                  chargeCustomer: delivery.chargeCustomer,
                  vendorFeeCents: delivery.vendorFeeCents,
                  customerFeeCents: delivery.customerFeeCents,
                  estimatedArrivalMinutes: delivery.estimatedArrivalMinutes,
                  uberTrackingUrl: delivery.uberTrackingUrl,
                }
              : null,
          items: lineItems.map((item, idx) => ({
            id: item._id ?? `${sale._id}-line-${idx}`,
            productName: item.manualName ?? "Inventory Item",
            unitPrice: (item.unitPriceCents ?? 0) / 100,
            lineTotal: (item.lineTotalCents ?? 0) / 100,
            quantity: item.quantityGrams ?? 1,
          })),
        };
      })
    );
  },
});

export const getSaleDetail = query({
  args: { saleId: v.string() },
  returns: v.any(),
  handler: async (ctx, args) => {
    const auth = await requireUserAndBusiness(ctx);
    requirePermission(auth.userRecord, "VIEW_FINANCIALS");
    const id = ctx.db.normalizeId("sales", args.saleId);
    const sale = id ? await ctx.db.get(id) : null;
    if (!sale || sale.businessId !== auth.businessId) throw new Error("NOT_FOUND: Sale not found");
    const lineItems = await ctx.db.query("salesLineItems").withIndex("by_saleId", q => q.eq("saleId", sale._id)).take(200);
    const itemsWithNames = await Promise.all(
      lineItems.map(async (item) => {
        let productName = item.manualName;
        if (!productName && item.productId) {
          const product = await ctx.db.get(item.productId);
          productName = product?.productName;
        }
        return {
          ...item,
          productName: productName ?? "Inventory Item",
        };
      })
    );
    const allocations = await ctx.db.query("salesAllocations").withIndex("by_saleId", q => q.eq("saleId", sale._id)).take(500);
    const canViewCustomers = hasPermission(auth.userRecord, "VIEW_CUSTOMERS");
    const customer = canViewCustomers && sale.customerId ? await ctx.db.get(sale.customerId) : null;
    const delivery = await ctx.db.query("deliveries").withIndex("by_saleId", q => q.eq("saleId", sale._id)).unique();
    const costOfGoodsSoldCents = allocations.reduce((sum, allocation) => sum + allocation.extendedCostCents, 0);
    const safeDelivery =
      delivery && delivery.businessId === auth.businessId
        ? {
            _id: delivery._id,
            saleId: delivery.saleId,
            businessId: delivery.businessId,
            customerId: delivery.customerId,
            profileId: delivery.profileId,
            vendorExpenseKnown: delivery.vendorExpenseKnown,
            dispatchType: (delivery as any).dispatchType,
            feeSplitMode: (delivery as any).feeSplitMode,
            estimatedArrivalMinutes: (delivery as any).estimatedArrivalMinutes,
            uberTrackingUrl: (delivery as any).uberTrackingUrl,
            vendorFeeCents: delivery.vendorFeeCents,
            customerFeeCents: delivery.customerFeeCents,
            deliveryTaxCents: delivery.deliveryTaxCents,
            chargeCustomer: delivery.chargeCustomer,
            status: delivery.status,
            dispatchDueAt: delivery.dispatchDueAt,
            assignedToUserId: delivery.assignedToUserId,
            estimatedArrivalAt: delivery.estimatedArrivalAt,
            createdAt: delivery.createdAt,
            updatedAt: delivery.updatedAt,
            address: "Address on file",
          }
        : null;
    return {
      sale,
      customer: customer && customer.businessId === auth.businessId ? customer : null,
      delivery: safeDelivery,
      items: itemsWithNames,
      allocations,
      costOfGoodsSoldCents,
      grossProfitCents: sale.totalAmountCents - costOfGoodsSoldCents,
      grossMarginPercent: sale.totalAmountCents > 0 ? ((sale.totalAmountCents - costOfGoodsSoldCents) / sale.totalAmountCents) * 100 : 0,
    };
  },
});

export const getCustomerRecentFavorites = query({
  args: {
    customerId: v.string(),
  },
  returns: v.array(
    v.object({
      productId: v.id("products"),
      name: v.string(),
      sku: v.optional(v.string()),
      unitPriceCents: v.number(),
      lastQuantityGrams: v.number(),
      orderCount: v.number(),
    }),
  ),
  handler: async (ctx, args) => {
    const auth = await requireUserAndBusiness(ctx);
    requirePermission(auth.userRecord, "VIEW_CUSTOMERS");

    const customerId = ctx.db.normalizeId("customers", args.customerId);
    if (!customerId) return [];

    const customer = await ctx.db.get(customerId);
    if (!customer || customer.businessId !== auth.businessId || !customer.isActive) {
      return [];
    }

    const sales = await ctx.db
      .query("sales")
      .withIndex("by_customerId", (q) => q.eq("customerId", customerId))
      .order("desc")
      .take(25);

    const productStats = new Map<
      string,
      { lastQuantityGrams: number; orderCount: number; lastSeenAt: number }
    >();

    for (const sale of sales) {
      if (
        sale.businessId !== auth.businessId ||
        sale.orderStatus === "cancelled" ||
        sale.orderStatus === "canceled" ||
        sale.orderStatus === "voided" ||
        sale.orderStatus === "refunded"
      ) {
        continue;
      }

      const lineItems = await ctx.db
        .query("salesLineItems")
        .withIndex("by_saleId", (q) => q.eq("saleId", sale._id))
        .take(50);

      for (const line of lineItems) {
        if (!line.productId) continue;
        const productIdStr = String(line.productId);
        const existing = productStats.get(productIdStr);
        if (existing) {
          existing.orderCount += 1;
        } else {
          productStats.set(productIdStr, {
            lastQuantityGrams: line.quantityGrams,
            orderCount: 1,
            lastSeenAt: sale.createdAt,
          });
        }
      }
    }

    const sorted = Array.from(productStats.entries()).sort(
      (a, b) =>
        b[1].orderCount - a[1].orderCount || b[1].lastSeenAt - a[1].lastSeenAt,
    );

    const results = [];
    for (const [productIdStr, stats] of sorted) {
      if (results.length >= 5) break;
      const product = await ctx.db.get(productIdStr as Id<"products">);
      if (product && product.businessId === auth.businessId && product.isActive) {
        results.push({
          productId: product._id,
          name: product.productName,
          ...(product.sku ? { sku: product.sku } : {}),
          unitPriceCents: product.sellingPriceCents,
          lastQuantityGrams: stats.lastQuantityGrams,
          orderCount: stats.orderCount,
        });
      }
    }

    return results;
  },
});

export const updateSale = mutation({
  args: {
    saleId: v.string(),
    customerId: v.optional(v.union(v.string(), v.null())),
    paymentMethod: v.optional(v.string()),
    paymentReference: v.optional(v.union(v.string(), v.null())),
    paymentTenders: v.optional(v.array(paymentTenderInput)),
  },
  returns: v.any(),
  handler: async (ctx, args) => {
    const auth = await requireUserAndBusiness(ctx);
    const changesCustomer = args.customerId !== undefined;
    const changesPayment =
      args.paymentMethod !== undefined ||
      args.paymentReference !== undefined ||
      args.paymentTenders !== undefined;
    if (!changesCustomer && !changesPayment) throw new Error("INVALID_ARGUMENT: No sale changes were provided");
    if (changesCustomer) {
      requirePermission(auth.userRecord, "PROCESS_CHECKOUT");
      requirePermission(auth.userRecord, "MANAGE_CUSTOMERS");
    }
    if (changesPayment) {
      requirePermission(auth.userRecord, "MANAGE_SALES_RETURNS");
    }
    const id = ctx.db.normalizeId("sales", args.saleId);
    const sale = id ? await ctx.db.get(id) : null;
    if (!sale || sale.businessId !== auth.businessId) throw new Error("NOT_FOUND: Sale not found");
    if (args.customerId !== undefined) {
      if (sale.orderStatus !== "completed") throw new Error("INVALID_STATE: Only completed sales can change customer attribution");
      if (sale.paymentMethod === "credit" || (sale.creditAmountCents ?? 0) > 0) throw new Error("INVALID_STATE: Credit sale customer reassignment requires reconciliation");
      const customer = args.customerId ? (() => { const customerId = ctx.db.normalizeId("customers", args.customerId!); return customerId ? ctx.db.get(customerId) : null; })() : Promise.resolve(null);
      const resolved = await customer;
      if (args.customerId && (!resolved || resolved.businessId !== auth.businessId || !resolved.isActive)) throw new Error("NOT_FOUND: Customer not found");
      const now = Date.now();
      if (sale.customerId !== resolved?._id) {
        const totalCents = sale.totalAmountCents;
        let loyaltyCents = sale.loyaltyEligibleSpendCents;
        if (loyaltyCents === undefined) {
          loyaltyCents = sale.merchandiseRevenueCents ?? Math.max(0, (sale.subtotalCents ?? 0) - (sale.discountCents ?? 0));
          await ctx.db.patch(sale._id, { loyaltyEligibleSpendCents: loyaltyCents });
        }
        if (![totalCents, loyaltyCents].every(value => Number.isSafeInteger(value) && value >= 0)) throw new Error("INVALID_STATE: Sale totals require reconciliation");

        const adjustCustomer = async (target: Doc<"customers">, direction: 1 | -1) => {
          const currentTotal = target.totalPurchasesCents;
          const currentLoyalty = target.loyaltyEligibleSpendCents ?? target.totalPurchasesCents;
          const currentCount = target.purchaseCount;
          if (![currentTotal, currentLoyalty, currentCount].every(value => Number.isSafeInteger(value) && value >= 0)) throw new Error("INVALID_STATE: Customer purchase totals require reconciliation");
          let nextTotal = currentTotal + direction * totalCents;
          let nextLoyalty = currentLoyalty + direction * loyaltyCents;
          const nextCount = currentCount + direction;
          if (direction < 0 && nextCount === 0) {
            nextTotal = 0;
            nextLoyalty = 0;
          }
          if (![nextTotal, nextLoyalty, nextCount].every(value => Number.isSafeInteger(value) && value >= 0)) throw new Error("INVALID_STATE: Customer purchase totals require reconciliation");
          await ctx.db.patch(target._id, {
            totalPurchasesCents: nextTotal,
            loyaltyEligibleSpendCents: nextLoyalty,
            purchaseCount: nextCount,
            updatedAt: now,
            ...(direction > 0 ? { lastActivityAt: now } : {}),
          });
        };

        if (sale.customerId) {
          const previous = await ctx.db.get(sale.customerId);
          if (!previous || previous.businessId !== auth.businessId) throw new Error("INVALID_STATE: Previous sale customer requires reconciliation");
          await adjustCustomer(previous, -1);
        }
        if (resolved) await adjustCustomer(resolved, 1);

        const deliveries = await ctx.db.query("deliveries").withIndex("by_saleId", q => q.eq("saleId", sale._id)).take(2);
        if (deliveries.length > 1 || deliveries.some(delivery => delivery.businessId !== auth.businessId)) throw new Error("INVALID_STATE: Delivery ownership requires reconciliation");
        for (const delivery of deliveries) await ctx.db.patch(delivery._id, { customerId: resolved?._id, updatedAt: now });
      }
      await ctx.db.patch(sale._id, { customerId: resolved?._id, updatedAt: Date.now() });
    }
    const patch: Record<string, unknown> = { updatedAt: Date.now() };
    const validPaymentMethods = new Set([
      "cash",
      "card",
      "split",
      "zelle",
      "p2p_cashapp",
      "p2p_paypal",
      "p2p_zelle",
      "p2p_onepay",
      "p2p_chime",
      "p2p_venmo",
      "p2p_other",
    ]);
    const hasCreditBalance = sale.creditAmountCents !== undefined && sale.creditAmountCents > 0;

    if (args.paymentMethod !== undefined) {
      if (sale.paymentMethod === "credit" || args.paymentMethod === "credit" || hasCreditBalance) {
        throw new Error("INVALID_STATE: Credit payment changes require reconciliation");
      }
      if (!validPaymentMethods.has(args.paymentMethod)) {
        throw new Error("INVALID_ARGUMENT: Invalid payment method");
      }
      patch.paymentMethod = args.paymentMethod;
    }
    if (args.paymentReference !== undefined) patch.paymentReference = args.paymentReference ?? undefined;
    if (args.paymentTenders !== undefined) {
      if (
        sale.paymentMethod === "credit" ||
        hasCreditBalance ||
        args.paymentTenders.some((t) => t.method === "credit")
      ) {
        throw new Error("INVALID_STATE: Credit payment changes require reconciliation");
      }
      for (const tender of args.paymentTenders) {
        if (!ALLOWED_SPLIT_TENDER_METHODS.has(tender.method) || tender.method === "credit") {
          throw new Error("INVALID_ARGUMENT: Invalid payment tender method");
        }
        if (!Number.isSafeInteger(tender.amountCents) || tender.amountCents <= 0) {
          throw new Error("INVALID_ARGUMENT: Payment tender amount must be a positive integer");
        }
      }
      if (args.paymentTenders.length > 0) {
        const tendersSum = args.paymentTenders.reduce((sum, t) => sum + t.amountCents, 0);
        if (tendersSum !== sale.totalAmountCents) {
          throw new Error("INVALID_ARGUMENT: Payment tenders sum does not match sale total");
        }
      }
      const effectiveMethod = args.paymentMethod ?? sale.paymentMethod;
      if (effectiveMethod === "split" && args.paymentTenders.length === 0) {
        throw new Error("INVALID_ARGUMENT: Split payment requires tender breakdown");
      }
      patch.paymentTenders = args.paymentTenders;
    } else if (args.paymentMethod === "split") {
      const existingTenders = sale.paymentTenders ?? [];
      const tendersSum = existingTenders.reduce((sum, t) => sum + t.amountCents, 0);
      if (existingTenders.length === 0 || tendersSum !== sale.totalAmountCents) {
        throw new Error("INVALID_ARGUMENT: Split payment requires tender breakdown matching sale total");
      }
    }
    await ctx.db.patch(sale._id, patch);
    await ctx.db.insert("auditEvents", {
      businessId: auth.businessId,
      userId: auth.userId,
      action: "SALE_UPDATED",
      entityType: "sale",
      entityId: sale._id,
      metadata: JSON.stringify({
        customerChanged: args.customerId !== undefined,
        paymentChanged: changesPayment,
      }),
      timestamp: Date.now(),
    });
    return { success: true, sale: await ctx.db.get(sale._id) };
  },
});
