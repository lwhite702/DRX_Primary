import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { convexTest } from "convex-test";
import { api, internal } from "../../convex/_generated/api";
import * as checkout from "../../convex/checkout";
import * as customers from "../../convex/customers";
import * as deliveries from "../../convex/deliveries";
import * as generatedApi from "../../convex/_generated/api";
import * as intake from "../../convex/intake";
import * as onboarding from "../../convex/onboarding";
import * as products from "../../convex/products";
import * as push from "../../convex/push";
import * as reporting from "../../convex/reporting";
import * as settings from "../../convex/settings";
import schema from "../../convex/schema";

const modules = {
  "_generated/api.js": async () => generatedApi,
  "checkout.ts": async () => checkout,
  "customers.ts": async () => customers,
  "deliveries.ts": async () => deliveries,
  "intake.ts": async () => intake,
  "onboarding.ts": async () => onboarding,
  "products.ts": async () => products,
  "push.ts": async () => push,
  "reporting.ts": async () => reporting,
  "settings.ts": async () => settings,
};

async function setupCommerceStore() {
  const t = convexTest(schema, modules);
  const owner = t.withIdentity({
    subject: "commerce_owner",
    email: "owner@example.test",
  });
  const onboardingResult = await owner.mutation(
    api.onboarding.createBusinessOnboarding,
    {
      businessName: "Commerce Delivery Store",
      collectTax: true,
      taxRateBps: 1_000,
    },
  );
  const productId = await owner.mutation(api.products.createProduct, {
    sku: "COMMERCE-1",
    productName: "Fractional Commerce Product",
    sellingPriceCents: 1_000,
    unitCostCents: 400,
    isTaxable: true,
  });
  await owner.mutation(api.products.updateCommerceConfig, {
    productId,
    sellingUnit: "gram",
    quantityPrecision: 2,
    minimumSaleQuantity: 0.25,
    quantityIncrement: 0.05,
    suggestedQuantityPresets: [0.5, 1, 2],
    suggestedDollarPresetsCents: [1_000, 2_000],
    bulkPriceTiers: [{ minimumQuantity: 2, unitPriceCents: 900 }],
  });
  await owner.mutation(api.intake.recordIntake, {
    productId,
    totalWeightGrams: 10,
    totalCostCents: 4_000,
  });
  await owner.mutation(api.settings.updateCommerceSettings, {
    loyaltyCombinationPolicy: "stack",
    loyaltyTiers: [
      {
        name: "Member",
        minimumSpendCents: 0,
        discountRateBps: 1_000,
      },
    ],
    deliveryFeeTaxable: true,
    deliveryDispatchSlaMinutes: 5,
    deliveryManagerEscalationMinutes: 10,
    deliveryManagerNotificationUserIds: ["commerce_owner"],
  });
  return {
    t,
    owner,
    businessId: onboardingResult.businessId,
    productId,
  };
}

describe("Convex commerce and delivery workflow", () => {
  beforeEach(() => {
    process.env.DRX_PII_KEY_CURRENT_B64 = Buffer.alloc(32, 7).toString("base64");
  });

  afterEach(() => {
    delete process.env.DRX_PII_KEY_CURRENT_B64;
    delete process.env.DRX_EXPO_PUSH_URL;
    delete process.env.DRX_APNS_PUSH_URL;
    delete process.env.DRX_APNS_AUTHORIZATION;
    delete process.env.DRX_FCM_PUSH_URL;
    delete process.env.DRX_FCM_AUTHORIZATION;
    vi.unstubAllGlobals();
    vi.useRealTimers();
  });

  it("quotes and records an exact requested amount while allocating stock by confirmed quantity", async () => {
    const { t, owner, productId } = await setupCommerceStore();
    const items = [{ productId, quantityGrams: 0.7, requestedAmountCents: 2_500 }];
    const quote = await owner.query(api.checkout.quoteCheckout, { items });
    expect(quote).toMatchObject({
      merchandiseSubtotalCents: 700,
      subtotalCents: 2_500,
      priceAdjustmentCents: 1_800,
      taxableSubtotalCents: 2_500,
      totalAmountCents: 2_750,
    });
    expect(quote.lines[0]).toMatchObject({
      quantity: 0.7,
      requestedAmountCents: 2_500,
      lineSubtotalCents: 2_500,
      operatorPriceAdjustmentCents: 1_800,
    });

    const result = await owner.mutation(api.checkout.processCheckout, {
      orderNumber: "EXACT-AMOUNT-001",
      items,
      paymentMethod: "card",
      amountPaidCents: quote.totalAmountCents,
    });
    const lines = await t.run((ctx) =>
      ctx.db.query("salesLineItems").withIndex("by_saleId", (q) => q.eq("saleId", result.saleId)).collect(),
    );
    const allocations = await t.run((ctx) =>
      ctx.db.query("salesAllocations").withIndex("by_saleId", (q) => q.eq("saleId", result.saleId)).collect(),
    );
    expect(result.totalAmountCents).toBe(2_750);
    const productAfterCheckout = await t.run((ctx) => ctx.db.get(productId));
    expect(productAfterCheckout?.quantityOnHandGrams).toBeCloseTo(9.3);
    expect(allocations.reduce((sum, allocation) => sum + allocation.quantityGrams, 0)).toBeCloseTo(0.7);
    expect(lines[0]).toMatchObject({
      quantityGrams: 0.7,
      requestedAmountCents: 2_500,
      lineTotalCents: 2_500,
      operatorPriceAdjustmentCents: 1_800,
    });
    const salesHistory = await owner.query(api.checkout.getSalesHistory, {});
    expect(salesHistory.find((sale) => sale._id === result.saleId)?.priceAdjustmentCents).toBe(1_800);
    const replay = await owner.mutation(api.checkout.processCheckout, {
      orderNumber: "EXACT-AMOUNT-001",
      items,
      paymentMethod: "card",
      amountPaidCents: quote.totalAmountCents,
    });
    expect(replay).toMatchObject({ status: "ALREADY_PROCESSED", priceAdjustmentCents: 1_800 });
    const productAfterReplay = await t.run((ctx) => ctx.db.get(productId));
    expect(productAfterReplay?.quantityOnHandGrams).toBeCloseTo(9.3);
  });

  it("deducts duplicate fixed-amount lines from product stock only once in aggregate", async () => {
    const { t, owner, productId } = await setupCommerceStore();
    const items = [
      { productId, quantityGrams: 0.6, requestedAmountCents: 2_000 },
      { productId, quantityGrams: 0.7, requestedAmountCents: 3_000 },
    ];
    const quote = await owner.query(api.checkout.quoteCheckout, { items });
    const result = await owner.mutation(api.checkout.processCheckout, {
      orderNumber: "EXACT-AMOUNT-DUPLICATE-LINES",
      items,
      paymentMethod: "card",
      amountPaidCents: quote.totalAmountCents,
    });

    const productAfterCheckout = await t.run((ctx) => ctx.db.get(productId));
    const allocations = await t.run((ctx) =>
      ctx.db.query("salesAllocations").withIndex("by_saleId", (q) => q.eq("saleId", result.saleId)).collect(),
    );
    expect(productAfterCheckout?.quantityOnHandGrams).toBeCloseTo(8.7);
    expect(allocations.reduce((sum, allocation) => sum + allocation.quantityGrams, 0)).toBeCloseTo(1.3);
  });

  it("rejects fixed-dollar pricing for non-fractional products", async () => {
    const { owner, productId } = await setupCommerceStore();
    await owner.mutation(api.products.updateCommerceConfig, {
      productId,
      allowFractionalQuantity: false,
      sellingUnit: "unit",
      quantityPrecision: 0,
      minimumSaleQuantity: 1,
      quantityIncrement: 1,
      suggestedQuantityPresets: [],
      suggestedDollarPresetsCents: [],
      bulkPriceTiers: [],
    });
    await expect(owner.query(api.checkout.quoteCheckout, {
      items: [{ productId, quantityGrams: 1, requestedAmountCents: 1 }],
    })).rejects.toThrow("requestedAmountCents is only supported for fractional products");
  });

  it("validates commerce presets and tiers from the configured minimum anchor", async () => {
    const { owner, productId } = await setupCommerceStore();
    await expect(
      owner.mutation(api.products.updateCommerceConfig, {
        productId,
        allowFractionalQuantity: true,
        sellingUnit: "gram",
        quantityPrecision: 1,
        minimumSaleQuantity: 0.3,
        quantityIncrement: 0.2,
        suggestedQuantityPresets: [0.3, 0.5],
        suggestedDollarPresetsCents: [],
        bulkPriceTiers: [],
      }),
    ).resolves.toEqual({ success: true });
    await expect(
      owner.mutation(api.products.updateCommerceConfig, {
        productId,
        allowFractionalQuantity: true,
        sellingUnit: "gram",
        quantityPrecision: 1,
        minimumSaleQuantity: 0.3,
        quantityIncrement: 0.2,
        suggestedQuantityPresets: [0.4],
        suggestedDollarPresetsCents: [],
        bulkPriceTiers: [],
      }),
    ).rejects.toThrow("quantity_increment_mismatch");
  });

  it("persists and normalizes one canonical commerce default for new and legacy products", async () => {
    const { t, owner } = await setupCommerceStore();
    const fractionalId = await owner.mutation(api.products.createProduct, {
      sku: "DEFAULT-FRACTIONAL",
      productName: "Default fractional product",
      sellingPriceCents: 1_000,
      unitCostCents: 400,
    });
    const wholeId = await owner.mutation(api.products.createProduct, {
      sku: "DEFAULT-WHOLE",
      productName: "Default whole product",
      sellingPriceCents: 1_000,
      unitCostCents: 400,
      allowFractionalWeight: false,
    });
    await t.run((ctx) =>
      ctx.db.patch(fractionalId, {
        sellingUnit: undefined,
        quantityPrecision: undefined,
        minimumSaleQuantity: undefined,
        quantityIncrement: undefined,
        suggestedQuantityPresets: undefined,
        suggestedDollarPresetsCents: undefined,
        bulkPriceTiers: undefined,
      }),
    );
    const catalog = await owner.query(api.products.listProducts, {});
    expect(catalog.find((product) => product._id === fractionalId)).toMatchObject({
      allowFractionalWeight: true,
      sellingUnit: "unit",
      quantityPrecision: 6,
      minimumSaleQuantity: 0.000001,
      quantityIncrement: 0.000001,
      suggestedQuantityPresets: [],
      suggestedDollarPresetsCents: [],
      bulkPriceTiers: [],
    });
    expect(catalog.find((product) => product._id === wholeId)).toMatchObject({
      allowFractionalWeight: false,
      sellingUnit: "unit",
      quantityPrecision: 0,
      minimumSaleQuantity: 1,
      quantityIncrement: 1,
      suggestedQuantityPresets: [],
      suggestedDollarPresetsCents: [],
      bulkPriceTiers: [],
    });
    const persistedWhole = await t.run((ctx) => ctx.db.get(wholeId));
    expect(persistedWhole).toMatchObject({
      sellingUnit: "unit",
      quantityPrecision: 0,
      minimumSaleQuantity: 1,
      quantityIncrement: 1,
      suggestedQuantityPresets: [],
      suggestedDollarPresetsCents: [],
      bulkPriceTiers: [],
    });
  });

  it("atomically prices fractional bulk and loyalty benefits, encrypts delivery, and separates reporting", async () => {
    const { t, owner, productId } = await setupCommerceStore();
    const suggested = await owner.query(
      api.products.suggestQuantityForDollarAmount,
      { productId, amountCents: 1_800 },
    );
    expect(suggested).toEqual({
      suggestedQuantity: 2,
      appliedUnitPriceCents: 900,
      estimatedSubtotalCents: 1_800,
      sellingUnit: "gram",
    });
    const customerId = await owner.mutation(api.customers.createCustomer, {
      firstName: "Synthetic Loyalty Customer",
      creditLimitCents: 0,
    });
    await t.run(async (ctx) => {
      await ctx.db.patch(customerId, {
        totalPurchasesCents: 10_000,
        loyaltyEligibleSpendCents: undefined,
      });
    });
    const quote = await owner.query(api.checkout.quoteCheckout, {
      customerId,
      items: [{ productId, quantityGrams: 2.35 }],
      delivery: { vendorFeeCents: 500, chargeCustomer: true },
    });
    expect(quote).toMatchObject({
      merchandiseSubtotalCents: 2_350,
      discountCents: 447,
      subtotalCents: 1_903,
      deliveryRevenueCents: 500,
      deliveryTaxCents: 50,
      totalAmountCents: 2_643,
    });
    const result = await owner.mutation(api.checkout.processCheckout, {
      orderNumber: "DELIVERY-001",
      customerId,
      items: [{ productId, quantityGrams: 2.35 }],
      paymentMethod: "cash",
      amountPaidCents: 3_000,
      delivery: {
        address: "123 Synthetic Test Street",
        vendorFeeCents: 500,
        chargeCustomer: true,
      },
    });

    expect(result).toMatchObject({
      merchandiseSubtotalCents: 2_350,
      discountCents: 447,
      subtotalCents: 1_903,
      deliveryRevenueCents: 500,
      deliveryTaxCents: 50,
      taxAmountCents: 240,
      totalAmountCents: 2_643,
      changeAmountCents: 357,
    });
    expect(result.deliveryId).toBeTruthy();

    const persisted = await t.run(async (ctx) => ({
      delivery: result.deliveryId
        ? await ctx.db.get(result.deliveryId)
        : null,
      sale: await ctx.db.get(result.saleId),
      lines: await ctx.db
        .query("salesLineItems")
        .withIndex("by_saleId", (q) => q.eq("saleId", result.saleId))
        .collect(),
      customer: await ctx.db.get(customerId),
    }));
    expect(persisted.delivery?.addressEncrypted).toMatch(/^dv3:/);
    expect(persisted.delivery?.addressEncrypted).not.toContain("Synthetic");
    expect(persisted.delivery).toMatchObject({
      status: "ready_for_dispatch",
      vendorFeeCents: 500,
      customerFeeCents: 500,
      deliveryTaxCents: 50,
    });
    expect(persisted.sale).toMatchObject({
      merchandiseSubtotalCents: 2_350,
      discountCents: 447,
      deliveryRevenueCents: 500,
      vendorDeliveryExpenseCents: 500,
      deliveryTaxCents: 50,
    });
    expect(persisted.lines[0]).toMatchObject({
      quantityGrams: 2.35,
      unitPriceCents: 900,
      lineTotalCents: 1_903,
      baseLineTotalCents: 2_350,
      bulkDiscountCents: 235,
      loyaltyDiscountCents: 212,
    });
    expect(persisted.customer?.loyaltyEligibleSpendCents).toBe(11_903);

    const retry = await owner.mutation(api.checkout.processCheckout, {
      orderNumber: "DELIVERY-001",
      customerId,
      items: [{ productId, quantityGrams: 2.35 }],
      paymentMethod: "cash",
      amountPaidCents: 3_000,
      delivery: {
        address: "123 Synthetic Test Street",
        vendorFeeCents: 500,
        chargeCustomer: true,
      },
    });
    expect(retry).toMatchObject({
      status: "ALREADY_PROCESSED",
      saleId: result.saleId,
      deliveryId: result.deliveryId,
    });
    await expect(
      owner.mutation(api.checkout.processCheckout, {
        orderNumber: "DELIVERY-001",
        customerId,
        items: [{ productId, quantityGrams: 2.35 }],
        paymentMethod: "cash",
        amountPaidCents: 3_000,
        delivery: {
          address: "999 Changed Synthetic Address",
          vendorFeeCents: 500,
          chargeCustomer: true,
        },
      }),
    ).rejects.toThrow("IDEMPOTENCY_CONFLICT");

    const report = await owner.query(api.reporting.getDailySalesAggregate, {});
    expect(report).toMatchObject({
      orderCount: 1,
      merchandiseRevenueCents: 1_903,
      deliveryRevenueCents: 500,
      vendorDeliveryExpenseCents: 500,
      deliveryTaxCents: 50,
      discountCents: 447,
      cogsCents: 940,
      grossProfitCents: 963,
      totalRevenueCents: 2_643,
      netRevenueCents: 2_403,
      totalTaxCents: 240,
    });
    await owner.mutation(api.deliveries.recordFinancialAdjustment, {
      deliveryId: result.deliveryId!,
      kind: "customer_fee_refund",
      idempotencyKey: "customer-refund-001",
      amountCents: 500,
      reason: "Synthetic customer fee refund",
    });
    await expect(
      owner.mutation(api.deliveries.recordFinancialAdjustment, {
        deliveryId: result.deliveryId!,
        kind: "customer_fee_refund",
        idempotencyKey: "customer-refund-over-cap",
        amountCents: 1,
        reason: "Synthetic excess customer fee refund",
      }),
    ).rejects.toThrow("cannot exceed 500 cents");
    const deliveryTaxRefund = await owner.mutation(
      api.deliveries.recordFinancialAdjustment,
      {
        deliveryId: result.deliveryId!,
        kind: "delivery_tax_refund",
        idempotencyKey: "delivery-tax-refund-001",
        amountCents: 50,
        reason: "Synthetic delivery tax refund",
      },
    );
    const deliveryTaxRefundRetry = await owner.mutation(
      api.deliveries.recordFinancialAdjustment,
      {
        deliveryId: result.deliveryId!,
        kind: "delivery_tax_refund",
        idempotencyKey: "delivery-tax-refund-001",
        amountCents: 50,
        reason: "Synthetic delivery tax refund",
      },
    );
    expect(deliveryTaxRefundRetry.adjustmentId).toBe(
      deliveryTaxRefund.adjustmentId,
    );
    await expect(
      owner.mutation(api.deliveries.recordFinancialAdjustment, {
        deliveryId: result.deliveryId!,
        kind: "delivery_tax_refund",
        idempotencyKey: "delivery-tax-refund-over-cap",
        amountCents: 1,
        reason: "Synthetic excess delivery tax refund",
      }),
    ).rejects.toThrow("cannot exceed 50 cents");
    const adjustedReport = await owner.query(
      api.reporting.getDailySalesAggregate,
      {},
    );
    expect(adjustedReport).toMatchObject({
      customerFeeRefundCents: 500,
      deliveryTaxRefundCents: 50,
      deliveryTaxCents: 0,
      totalTaxCents: 190,
      deliveryRevenueCents: 500,
      netRevenueCents: 1_903,
      grossProfitCents: 463,
    });
  });

  it("atomically checks out mixed inventory and validated manual merchandise lines", async () => {
    const { t, owner, productId } = await setupCommerceStore();
    await owner.mutation(api.products.upsertManualLinePolicy, {
      name: "Synthetic manual merchandise",
      isTaxable: true,
      unitCostCents: 100,
    });
    const customerId = await owner.mutation(api.customers.createCustomer, {
      firstName: "Synthetic Mixed Cart Customer",
      creditLimitCents: 0,
    });
    const manualItems = [
      {
        lineId: "manual-service-1",
        name: "Synthetic manual merchandise",
        quantity: 2,
        unitPriceCents: 300,
      },
    ];
    await expect(
      owner.query(api.checkout.quoteCheckout, {
        items: [],
        manualItems: [
          {
            ...manualItems[0],
            unitPriceCents: 12.5,
          },
        ],
      }),
    ).rejects.toThrow("positive integer cents");
    const quote = await owner.query(api.checkout.quoteCheckout, {
      customerId,
      items: [{ productId, quantityGrams: 1 }],
      manualItems,
      delivery: { vendorFeeCents: 500, chargeCustomer: true },
    });
    expect(quote).toMatchObject({
      merchandiseSubtotalCents: 1_600,
      discountCents: 160,
      subtotalCents: 1_440,
      taxableSubtotalCents: 1_940,
      merchandiseTaxCents: 144,
      deliveryTaxCents: 50,
      totalAmountCents: 2_134,
    });
    expect(quote.lines).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          source: "manual",
          lineId: "manual-service-1",
          productId: "manual:manual-service-1",
          productName: "Synthetic manual merchandise",
          lineSubtotalCents: 540,
          loyaltyDiscountCents: 60,
        }),
      ]),
    );
    await owner.mutation(api.settings.updateCommerceSettings, {
      loyaltyCombinationPolicy: "best_only",
      loyaltyTiers: [
        { name: "Member", minimumSpendCents: 0, discountRateBps: 1_000 },
      ],
      deliveryFeeTaxable: true,
      deliveryDispatchSlaMinutes: 5,
      deliveryManagerEscalationMinutes: 10,
      deliveryManagerNotificationUserIds: ["commerce_owner"],
    });
    const bestOnlyQuote = await owner.query(api.checkout.quoteCheckout, {
      customerId,
      items: [],
      manualItems,
    });
    expect(bestOnlyQuote).toMatchObject({
      merchandiseSubtotalCents: 600,
      discountCents: 60,
      subtotalCents: 540,
      merchandiseTaxCents: 54,
    });

    const checkoutResult = await owner.mutation(api.checkout.processCheckout, {
      customerId,
      orderNumber: "MIXED-CART-001",
      items: [{ productId, quantityGrams: 1 }],
      manualItems,
      paymentMethod: "cash",
      amountPaidCents: 2_200,
      delivery: {
        address: "505 Synthetic Mixed Cart Lane",
        vendorFeeCents: 500,
        chargeCustomer: true,
      },
    });
    expect(checkoutResult).toMatchObject({
      subtotalCents: 1_440,
      merchandiseSubtotalCents: 1_600,
      discountCents: 160,
      totalAmountCents: 2_134,
    });
    const persisted = await t.run(async (ctx) => ({
      sale: await ctx.db.get(checkoutResult.saleId),
      lines: await ctx.db
        .query("salesLineItems")
        .withIndex("by_saleId", (q) => q.eq("saleId", checkoutResult.saleId))
        .collect(),
    }));
    expect(persisted.sale).toMatchObject({ cogsCents: 600 });
    expect(persisted.lines).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          source: "manual",
          manualLineId: "manual-service-1",
          manualName: "Synthetic manual merchandise",
          quantityGrams: 2,
          unitPriceCents: 300,
          lineTotalCents: 540,
          loyaltyDiscountCents: 60,
          unitCostCents: 100,
          isTaxable: true,
        }),
      ]),
    );
    const aggregate = await owner.query(api.reporting.getSalesAggregate, {
      startAt: 0,
      endAt: Date.now() + 1_000,
      timezone: "UTC",
    });
    expect(aggregate.cogsCents).toBe(600);
    expect(aggregate.manualCostCoverage).toEqual({
      manualLineCount: 1,
      knownCostLineCount: 1,
      unknownCostLineCount: 0,
      knownManualCogsCents: 200,
      complete: true,
    });
    expect(aggregate.grossProfitComplete).toBe(true);
    expect(aggregate.cogsAllocationCoverage).toEqual({
      inventoryLineCount: 1,
      fullyAllocatedLineCount: 1,
      partiallyAllocatedLineCount: 0,
      unallocatedLineCount: 0,
      expectedQuantity: 1,
      allocatedQuantity: 1,
      unallocatedQuantity: 0,
      coverageBps: 10_000,
    });
  });

  it("keeps ad-hoc manual COGS unknown and never reports gross profit as complete", async () => {
    const { t, owner } = await setupCommerceStore();
    const result = await owner.mutation(api.checkout.processCheckout, {
      orderNumber: "MANUAL-UNKNOWN-001",
      items: [],
      manualItems: [
        {
          lineId: "ad-hoc-1",
          name: "Unconfigured synthetic item",
          quantity: 2,
          unitPriceCents: 300,
        },
      ],
      paymentMethod: "cash",
      amountPaidCents: 660,
    });
    const line = await t.run(async (ctx) =>
      (
        await ctx.db
          .query("salesLineItems")
          .withIndex("by_saleId", (q) => q.eq("saleId", result.saleId))
          .collect()
      )[0],
    );
    expect(line).toMatchObject({
      source: "manual",
      isTaxable: true,
      unitCostCents: 0,
      manualCostKnown: false,
    });
    const aggregate = await owner.query(api.reporting.getSalesAggregate, {
      startAt: 0,
      endAt: Date.now() + 1_000,
      timezone: "UTC",
    });
    expect(aggregate.cogsCents).toBe(0);
    expect(aggregate.manualCostCoverage).toEqual({
      manualLineCount: 1,
      knownCostLineCount: 0,
      unknownCostLineCount: 1,
      knownManualCogsCents: 0,
      complete: false,
    });
    expect(aggregate.grossProfitComplete).toBe(false);
  });

  it("allows only tenant managers to persist manual tax and cost policy", async () => {
    const { t, owner, businessId } = await setupCommerceStore();
    await owner.mutation(api.products.upsertManualLinePolicy, {
      name: "Synthetic nontaxable policy",
      isTaxable: false,
    });
    expect(
      await owner.query(api.checkout.quoteCheckout, {
        items: [],
        manualItems: [
          {
            lineId: "server-tax-policy",
            name: "Synthetic nontaxable policy",
            quantity: 1,
            unitPriceCents: 300,
          },
        ],
      }),
    ).toMatchObject({ merchandiseTaxCents: 0, totalAmountCents: 300 });
    await t.run((ctx) =>
      ctx.db.insert("users", {
        clerkUserId: "manual_policy_member",
        email: "manual-policy-member@example.test",
        role: "MEMBER",
        businessId,
        status: "ACTIVE",
        createdAt: Date.now(),
        updatedAt: Date.now(),
      }),
    );
    const member = t.withIdentity({
      subject: "manual_policy_member",
      email: "manual-policy-member@example.test",
    });
    await expect(
      member.mutation(api.products.upsertManualLinePolicy, {
        name: "Synthetic restricted policy",
        isTaxable: false,
        unitCostCents: 50,
      }),
    ).rejects.toThrow("MANAGE_COMMERCE_SETTINGS");
  });

  it("rejects an encrypted delivery address copied onto a different delivery", async () => {
    const { t, owner, productId } = await setupCommerceStore();
    const first = await owner.mutation(api.checkout.processCheckout, {
      orderNumber: "DELIVERY-AAD-001",
      items: [{ productId, quantityGrams: 1 }],
      paymentMethod: "cash",
      amountPaidCents: 1_500,
      delivery: {
        address: "101 Synthetic First Street",
        vendorFeeCents: 200,
        chargeCustomer: true,
      },
    });
    const second = await owner.mutation(api.checkout.processCheckout, {
      orderNumber: "DELIVERY-AAD-002",
      items: [{ productId, quantityGrams: 1 }],
      paymentMethod: "cash",
      amountPaidCents: 1_500,
      delivery: {
        address: "202 Synthetic Second Street",
        vendorFeeCents: 200,
        chargeCustomer: true,
      },
    });

    const copiedCiphertext = await t.run(async (ctx) => {
      const source = await ctx.db.get(first.deliveryId!);
      if (!source) throw new Error("Missing synthetic source delivery");
      await ctx.db.patch(second.deliveryId!, {
        addressEncrypted: source.addressEncrypted,
        addressEncryptionVersion: source.addressEncryptionVersion,
      });
      return source.addressEncrypted;
    });
    expect(copiedCiphertext).toMatch(/^dv3:/);

    await expect(
      owner.mutation(api.deliveries.getDeliveryAddress, {
        deliveryId: second.deliveryId!,
      }),
    ).rejects.toThrow();
  });

  it("enforces tenant-scoped delivery transitions and records immutable events and adjustments", async () => {
    const { t, owner, businessId, productId } = await setupCommerceStore();
    await t.run(async (ctx) => {
      await ctx.db.insert("users", {
        clerkUserId: "delivery_operator",
        email: "operator@example.test",
        role: "MEMBER",
        businessId,
        status: "ACTIVE",
        createdAt: Date.now(),
        updatedAt: Date.now(),
      });
    });
    const operator = t.withIdentity({
      subject: "delivery_operator",
      email: "operator@example.test",
    });
    const checkoutResult = await owner.mutation(api.checkout.processCheckout, {
      orderNumber: "DELIVERY-TRANSITIONS",
      items: [{ productId, quantityGrams: 1 }],
      paymentMethod: "cash",
      amountPaidCents: 1_500,
      delivery: {
        address: "456 Synthetic Test Avenue",
        vendorFeeCents: 200,
        chargeCustomer: false,
      },
    });
    const deliveryId = checkoutResult.deliveryId!;

    await owner.mutation(api.deliveries.assignDelivery, {
      deliveryId,
      assigneeUserId: "delivery_operator",
    });
    const address = await operator.mutation(
      api.deliveries.getDeliveryAddress,
      { deliveryId },
    );
    expect(address.address).toBe("456 Synthetic Test Avenue");
    await operator.mutation(api.deliveries.markUberOrdered, {
      deliveryId,
      waitMinutes: 15,
    });
    await operator.mutation(api.deliveries.markHandedOff, { deliveryId });
    await operator.mutation(api.deliveries.markDelivered, { deliveryId });
    await owner.mutation(api.deliveries.recordFinancialAdjustment, {
      deliveryId,
      kind: "vendor_credit",
      idempotencyKey: "vendor-credit-001",
      amountCents: 50,
      reason: "Synthetic test vendor credit",
    });
    const duplicateAdjustment = await owner.mutation(
      api.deliveries.recordFinancialAdjustment,
      {
        deliveryId,
        kind: "vendor_credit",
        idempotencyKey: "vendor-credit-001",
        amountCents: 50,
        reason: "Synthetic test vendor credit",
      },
    );
    expect(duplicateAdjustment.adjustmentId).toBeTruthy();
    await expect(
      owner.mutation(api.deliveries.recordFinancialAdjustment, {
        deliveryId,
        kind: "vendor_credit",
        idempotencyKey: "vendor-credit-over-cap",
        amountCents: 201,
        reason: "Synthetic excessive vendor credit",
      }),
    ).rejects.toThrow("cannot exceed 200 cents");

    const detail = await owner.query(api.deliveries.getDelivery, { deliveryId });
    expect(detail.delivery.status).toBe("delivered");
    expect(detail.delivery.addressLabel).toBe("Address on file");
    expect(detail.events.map((event) => event.type)).toEqual([
      "created",
      "assigned",
      "address_accessed",
      "status_changed",
      "status_changed",
      "status_changed",
      "financial_adjustment_recorded",
    ]);
    expect(detail.adjustments).toMatchObject([
      { kind: "vendor_credit", amountCents: 50 },
    ]);

    const otherOwner = t.withIdentity({
      subject: "delivery_other_owner",
      email: "other@example.test",
    });
    await otherOwner.mutation(api.onboarding.createBusinessOnboarding, {
      businessName: "Other Delivery Store",
      collectTax: false,
    });
    await expect(
      otherOwner.query(api.deliveries.getDelivery, { deliveryId }),
    ).rejects.toThrow("Delivery");
  });

  it("emits server-owned reminder outbox entries at T-2, ETA, and manager escalation", async () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-08-21T12:00:00.000Z"));
    const { t, owner, productId } = await setupCommerceStore();
    const result = await owner.mutation(api.checkout.processCheckout, {
      orderNumber: "DELIVERY-REMINDERS",
      items: [{ productId, quantityGrams: 1 }],
      paymentMethod: "cash",
      amountPaidCents: 1_500,
      delivery: {
        address: "789 Synthetic Test Road",
        vendorFeeCents: 200,
        chargeCustomer: false,
      },
    });
    const deliveryId = result.deliveryId!;
    await owner.mutation(api.deliveries.assignDelivery, {
      deliveryId,
      assigneeUserId: "commerce_owner",
    });
    await owner.mutation(api.deliveries.markUberOrdered, {
      deliveryId,
      waitMinutes: 5,
    });

    vi.advanceTimersByTime(3 * 60_000);
    await t.finishInProgressScheduledFunctions();
    vi.advanceTimersByTime(2 * 60_000);
    await t.finishInProgressScheduledFunctions();
    vi.advanceTimersByTime(10 * 60_000);
    await t.finishInProgressScheduledFunctions();
    vi.advanceTimersByTime(5 * 60_000);
    await t.finishInProgressScheduledFunctions();

    const notifications = await owner.query(
      api.deliveries.listNotifications,
      { deliveryId },
    );
    const notificationKinds = notifications.map((entry) => entry.kind);
    expect(notificationKinds).toContain("eta_warning");
    expect(notificationKinds).toContain("eta_due");
    expect(notificationKinds).toContain("manager_escalation");
    expect(notificationKinds.filter((kind) => kind === "overdue")).toHaveLength(2);
    expect(notifications.every((entry) => entry.message.includes("address") === false)).toBe(true);

    const otherTargetNotificationId = await t.run((ctx) =>
      ctx.db.insert("deliveryNotifications", {
        businessId: notifications[0].businessId,
        deliveryId,
        targetUserId: "different_operator",
        kind: "overdue",
        message: "Synthetic other-target reminder",
        scheduledFor: Date.now(),
        createdAt: Date.now(),
      }),
    );
    const unread = await owner.query(
      api.deliveries.listUnreadNotifications,
      { deliveryId },
    );
    expect(unread.length).toBeGreaterThan(0);
    expect(unread.some((entry) => entry._id === otherTargetNotificationId)).toBe(
      false,
    );
    await expect(
      owner.mutation(api.deliveries.acknowledgeNotification, {
        notificationId: otherTargetNotificationId,
      }),
    ).rejects.toThrow("not assigned to this user");
    await expect(
      owner.query(api.deliveries.listNotifications, {}),
    ).rejects.toThrow("deliveryId is required");
    const acknowledgement = await owner.mutation(
      api.deliveries.acknowledgeNotification,
      { notificationId: unread[0]._id },
    );
    const acknowledgementRetry = await owner.mutation(
      api.deliveries.acknowledgeNotification,
      { notificationId: unread[0]._id },
    );
    expect(acknowledgementRetry).toEqual(acknowledgement);
    expect(
      (
        await owner.query(api.deliveries.listUnreadNotifications, {
          deliveryId,
        })
      ).some((entry) => entry._id === unread[0]._id),
    ).toBe(false);
  });

  it("supersedes old-assignee reminders and targets the reassignment handoff", async () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-08-21T12:00:00.000Z"));
    const { t, owner, businessId, productId } = await setupCommerceStore();
    await owner.mutation(api.push.registerDeviceToken, {
      deviceId: "handoff-old-device",
      platform: "android",
      provider: "expo",
      token: "ExponentPushToken[handoff-old-device-token]",
    });
    await t.run((ctx) =>
      ctx.db.insert("users", {
        clerkUserId: "handoff_operator",
        email: "handoff@example.test",
        role: "MEMBER",
        businessId,
        status: "ACTIVE",
        createdAt: Date.now(),
        updatedAt: Date.now(),
      }),
    );
    const otherOperator = t.withIdentity({
      subject: "handoff_operator",
      email: "handoff@example.test",
    });
    const checkoutResult = await owner.mutation(api.checkout.processCheckout, {
      orderNumber: "DELIVERY-HANDOFF-001",
      items: [{ productId, quantityGrams: 1 }],
      paymentMethod: "cash",
      amountPaidCents: 1_100,
      delivery: {
        address: "707 Synthetic Handoff Street",
        vendorFeeCents: 200,
        chargeCustomer: false,
      },
    });
    const deliveryId = checkoutResult.deliveryId!;
    await owner.mutation(api.deliveries.assignDelivery, { deliveryId });
    const uber = await owner.mutation(api.deliveries.markUberOrdered, {
      deliveryId,
      waitMinutes: 5,
    });
    await t.mutation(internal.deliveries.processReminder, {
      deliveryId,
      kind: "eta_warning",
      expectedAt: uber.estimatedArrivalAt,
    });
    expect(
      await owner.query(api.deliveries.listUnreadNotifications, { deliveryId }),
    ).toHaveLength(1);
    const oldOutbox = await t.run(async (ctx) =>
      (
        await ctx.db
          .query("deliveryPushOutbox")
          .withIndex("by_businessId_and_targetUserId", (q) =>
            q.eq("businessId", businessId).eq("targetUserId", "commerce_owner"),
          )
          .collect()
      )[0],
    );

    await owner.mutation(api.deliveries.assignDelivery, {
      deliveryId,
      assigneeUserId: "handoff_operator",
    });
    expect(
      await owner.query(api.deliveries.listUnreadNotifications, { deliveryId }),
    ).toHaveLength(0);
    const newAssigneeUnread = await otherOperator.query(
      api.deliveries.listUnreadNotifications,
      { deliveryId },
    );
    expect(newAssigneeUnread).toEqual([
      expect.objectContaining({
        targetUserId: "handoff_operator",
        kind: "assignment_handoff",
      }),
    ]);
    const history = await owner.query(api.deliveries.listNotifications, {
      deliveryId,
    });
    expect(
      history.some(
        (notification) =>
          notification.kind === "eta_warning" &&
          notification.acknowledgedAt !== undefined,
      ),
    ).toBe(true);
    const oldTargetOutbox = await t.run((ctx) =>
      ctx.db
        .query("deliveryPushOutbox")
        .withIndex("by_businessId_and_targetUserId", (q) =>
          q.eq("businessId", businessId).eq("targetUserId", "commerce_owner"),
        )
        .collect(),
    );
    expect(oldTargetOutbox).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          _id: oldOutbox._id,
          status: "canceled",
          lastErrorCode: "ASSIGNMENT_SUPERSEDED",
        }),
        expect.objectContaining({ status: "queued" }),
      ]),
    );
    const cancellation = oldTargetOutbox.find(
      (outbox) => JSON.parse(outbox.payloadJson).type === "delivery_reminder_canceled",
    )!;
    expect(JSON.parse(cancellation.payloadJson)).toEqual({
      type: "delivery_reminder_canceled",
      outboxId: String(cancellation._id),
      notificationId: expect.any(String),
      deliveryId: String(deliveryId),
      reason: "assignment_changed",
      route: "deliveries",
    });
    await t.run((ctx) =>
      ctx.db.patch(oldOutbox._id, {
        status: "queued",
        nextAttemptAt: Date.now(),
      }),
    );
    expect(
      await t.mutation(internal.push.claimOutbox, { outboxId: oldOutbox._id }),
    ).toBeNull();
    expect((await t.run((ctx) => ctx.db.get(oldOutbox._id)))?.status).toBe(
      "canceled",
    );
  });

  it("registers encrypted device tokens and creates privacy-minimized durable push work", async () => {
    const { t, owner, productId } = await setupCommerceStore();
    const rawToken = "ExponentPushToken[synthetic-secret-device-token]";
    await expect(
      owner.mutation(api.push.registerDeviceToken, {
        deviceId: "android-push-device",
        platform: "android",
        provider: "apns",
        token: rawToken,
      }),
    ).rejects.toThrow("provider is not valid for platform");
    const registration = await owner.mutation(api.push.registerDeviceToken, {
      deviceId: "android-push-device",
      platform: "android",
      provider: "expo",
      token: rawToken,
    });
    expect(registration.status).toBe("active");
    const storedToken = await t.run((ctx) =>
      ctx.db.get(registration.deviceTokenId),
    );
    expect(storedToken?.tokenEncrypted).not.toContain(rawToken);

    const checkoutResult = await owner.mutation(api.checkout.processCheckout, {
      orderNumber: "DELIVERY-PUSH-001",
      items: [{ productId, quantityGrams: 1 }],
      paymentMethod: "cash",
      amountPaidCents: 1_100,
      delivery: {
        address: "909 Synthetic Push Street",
        vendorFeeCents: 200,
        chargeCustomer: false,
      },
    });
    const deliveryId = checkoutResult.deliveryId!;
    await owner.mutation(api.deliveries.assignDelivery, { deliveryId });
    const delivery = await t.run((ctx) => ctx.db.get(deliveryId));
    await t.mutation(internal.deliveries.processReminder, {
      deliveryId,
      kind: "dispatch_overdue",
      expectedAt: delivery!.dispatchDueAt,
    });
    const pushWork = await t.run(async (ctx) =>
      (
        await ctx.db
          .query("deliveryPushOutbox")
          .withIndex("by_businessId_and_targetUserId", (q) =>
            q
              .eq("businessId", delivery!.businessId)
              .eq("targetUserId", "commerce_owner"),
          )
          .collect()
      )[0],
    );
    expect(pushWork).toMatchObject({
      deviceTokenId: registration.deviceTokenId,
      targetUserId: "commerce_owner",
      provider: "expo",
      status: "queued",
      attempts: 0,
    });
    expect(JSON.parse(pushWork.payloadJson)).toEqual({
      type: "delivery_reminder",
      outboxId: String(pushWork._id),
      notificationId: expect.any(String),
      deliveryId: String(deliveryId),
      kind: "dispatch_overdue",
      scheduledFor: expect.any(Number),
      route: "deliveries",
    });
    expect(pushWork.payloadJson).not.toContain("Synthetic Push Street");

    const claimed = await t.mutation(internal.push.claimOutbox, {
      outboxId: pushWork._id,
    });
    expect(claimed).toMatchObject({
      outboxId: pushWork._id,
      provider: "expo",
    });
    expect(claimed?.tokenEncrypted).not.toContain(rawToken);
    await t.mutation(internal.push.recordDispatchResult, {
      outboxId: pushWork._id,
      success: false,
      retryable: true,
      errorCode: "NETWORK_ERROR",
    });
    expect(await t.run((ctx) => ctx.db.get(pushWork._id))).toMatchObject({
      status: "retry_scheduled",
      attempts: 1,
      lastErrorCode: "NETWORK_ERROR",
    });

    const ack = await owner.mutation(api.push.acknowledgeDeliveryPush, {
      outboxId: pushWork._id,
    });
    expect(
      await owner.mutation(api.push.acknowledgeDeliveryPush, {
        outboxId: pushWork._id,
      }),
    ).toEqual(ack);
    const otherOwner = t.withIdentity({
      subject: "push_other_owner",
      email: "push-other@example.test",
    });
    await otherOwner.mutation(api.onboarding.createBusinessOnboarding, {
      businessName: "Other Push Tenant",
      collectTax: false,
    });
    await expect(
      otherOwner.mutation(api.push.acknowledgeDeliveryPush, {
        outboxId: pushWork._id,
      }),
    ).rejects.toThrow("not found");
    await otherOwner.mutation(api.push.registerDeviceToken, {
      deviceId: "shared-android-device",
      platform: "android",
      provider: "expo",
      token: rawToken,
    });
    expect(
      (await t.run((ctx) => ctx.db.get(registration.deviceTokenId)))?.status,
    ).toBe("revoked");
    expect(
      await owner.mutation(api.push.unregisterDeviceToken, {
        deviceId: "android-push-device",
        provider: "expo",
      }),
    ).toEqual({ revokedCount: 0 });
  });

  it("dispatches Expo, APNs, and FCM outbox work through mocked provider boundaries", async () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-08-21T12:00:00.000Z"));
    const { t, owner, productId } = await setupCommerceStore();
    process.env.DRX_EXPO_PUSH_URL = "https://expo.example.test/send";
    process.env.DRX_APNS_PUSH_URL =
      "https://apns.example.test/3/device/{token}";
    process.env.DRX_APNS_AUTHORIZATION = "bearer synthetic-apns-auth";
    process.env.DRX_FCM_PUSH_URL = "https://fcm.example.test/v1/messages:send";
    process.env.DRX_FCM_AUTHORIZATION = "bearer synthetic-fcm-auth";
    const fetchMock = vi.fn(
      async (input: RequestInfo | URL, _init?: RequestInit) =>
        new Response(JSON.stringify(
          String(input).includes("expo")
            ? { data: { status: "ok", id: "synthetic-expo-ticket" } }
            : { id: "synthetic-provider-message" },
        ), {
          status: 200,
          headers: { "content-type": "application/json" },
        }),
    );
    vi.stubGlobal("fetch", fetchMock);
    await owner.mutation(api.push.registerDeviceToken, {
      deviceId: "expo-device",
      platform: "android",
      provider: "expo",
      token: "ExponentPushToken[synthetic-expo-dispatch]",
    });
    await owner.mutation(api.push.registerDeviceToken, {
      deviceId: "apns-device",
      platform: "ios",
      provider: "apns",
      token: "synthetic-apns-device-token",
    });
    await owner.mutation(api.push.registerDeviceToken, {
      deviceId: "fcm-device",
      platform: "android",
      provider: "fcm",
      token: "synthetic-fcm-device-token",
    });
    const checkoutResult = await owner.mutation(api.checkout.processCheckout, {
      orderNumber: "DELIVERY-PUSH-DISPATCH-001",
      items: [{ productId, quantityGrams: 1 }],
      paymentMethod: "cash",
      amountPaidCents: 1_100,
      delivery: {
        address: "111 Synthetic Dispatch Street",
        vendorFeeCents: 200,
        chargeCustomer: false,
      },
    });
    const deliveryId = checkoutResult.deliveryId!;
    await owner.mutation(api.deliveries.assignDelivery, { deliveryId });
    const delivery = await t.run((ctx) => ctx.db.get(deliveryId));
    await t.mutation(internal.deliveries.processReminder, {
      deliveryId,
      kind: "dispatch_overdue",
      expectedAt: delivery!.dispatchDueAt,
    });
    const outboxRows = await t.run((ctx) =>
      ctx.db
        .query("deliveryPushOutbox")
        .withIndex("by_businessId_and_targetUserId", (q) =>
          q
            .eq("businessId", delivery!.businessId)
            .eq("targetUserId", "commerce_owner"),
        )
        .collect(),
    );
    expect(outboxRows).toHaveLength(3);
    await owner.mutation(api.deliveries.markUberOrdered, {
      deliveryId,
      waitMinutes: 5,
    });
    await owner.mutation(api.deliveries.markHandedOff, { deliveryId });
    await owner.mutation(api.deliveries.markDelivered, { deliveryId });
    // Finish due dispatches before jumping past their recovery leases. WebCrypto
    // is asynchronous even under fake timers; expiring a live send creates an
    // artificial retry unrelated to this successful-provider contract.
    vi.advanceTimersByTime(0);
    await t.finishInProgressScheduledFunctions();
    await t.finishAllScheduledFunctions(vi.runAllTimers);
    const persisted = await t.run(async (ctx) =>
      Promise.all(outboxRows.map((outbox) => ctx.db.get(outbox._id))),
    );
    expect(persisted.map((outbox) => ({
      provider: outbox?.provider,
      status: outbox?.status,
      error: outbox?.lastErrorCode,
    }))).toEqual([
      { provider: "expo", status: "sent", error: undefined },
      { provider: "apns", status: "sent", error: undefined },
      { provider: "fcm", status: "sent", error: undefined },
    ]);
    expect(fetchMock).toHaveBeenCalledTimes(3);
    const requests = fetchMock.mock.calls.map(([url, init]) => ({
      url: String(url),
      body: JSON.parse(String(init?.body)),
    }));
    expect(
      requests.find((request) => request.url.includes("expo"))?.body,
    ).toMatchObject({ channelId: "delivery-reminders" });
    expect(
      requests.find((request) => request.url.includes("fcm"))?.body,
    ).toMatchObject({
      message: {
        android: { notification: { channel_id: "delivery-reminders" } },
      },
    });
    expect(
      requests.find((request) => request.url.includes("apns"))?.body,
    ).not.toHaveProperty("address");
    expect(persisted.every((outbox) => outbox?.status === "sent")).toBe(true);
  });

  it("recognizes sales and later delivery adjustments in their own explicit UTC periods", async () => {
    vi.useFakeTimers();
    const saleCreatedAt = Date.parse("2026-08-20T10:00:00.000Z");
    const adjustmentCreatedAt = Date.parse("2026-08-21T10:00:00.000Z");
    vi.setSystemTime(saleCreatedAt);
    const { owner, productId } = await setupCommerceStore();
    const checkoutResult = await owner.mutation(api.checkout.processCheckout, {
      orderNumber: "DELIVERY-PERIOD-001",
      items: [{ productId, quantityGrams: 1 }],
      paymentMethod: "cash",
      amountPaidCents: 2_000,
      delivery: {
        address: "303 Synthetic Period Street",
        vendorFeeCents: 500,
        chargeCustomer: true,
      },
    });
    const salePeriod = {
      startAt: Date.parse("2026-08-20T00:00:00.000Z"),
      endAt: Date.parse("2026-08-21T00:00:00.000Z"),
      timezone: "UTC" as const,
    };
    const adjustmentPeriod = {
      startAt: Date.parse("2026-08-21T00:00:00.000Z"),
      endAt: Date.parse("2026-08-22T00:00:00.000Z"),
      timezone: "UTC" as const,
    };

    const salePeriodBeforeAdjustments = await owner.query(
      api.reporting.getSalesAggregate,
      salePeriod,
    );
    expect(salePeriodBeforeAdjustments).toMatchObject({
      periodStartAt: salePeriod.startAt,
      periodEndAt: salePeriod.endAt,
      timezone: "UTC",
      periodEndExclusive: true,
      accountingBasis: "operational_event",
      cashAccrualClassification: "not_gaap_cash_or_accrual",
      saleRecognitionField: "sales.createdAt",
      adjustmentRecognitionField: "deliveryFinancialAdjustments.createdAt",
      orderCount: 1,
      customerFeeRefundCents: 0,
      deliveryTaxRefundCents: 0,
      vendorCreditsCents: 0,
    });

    vi.setSystemTime(adjustmentCreatedAt);
    await owner.mutation(api.deliveries.recordFinancialAdjustment, {
      deliveryId: checkoutResult.deliveryId!,
      kind: "customer_fee_refund",
      idempotencyKey: "period-customer-refund-001",
      amountCents: 500,
      reason: "Synthetic later-period customer refund",
    });
    await owner.mutation(api.deliveries.recordFinancialAdjustment, {
      deliveryId: checkoutResult.deliveryId!,
      kind: "delivery_tax_refund",
      idempotencyKey: "period-tax-refund-001",
      amountCents: 50,
      reason: "Synthetic later-period tax refund",
    });
    await owner.mutation(api.deliveries.recordFinancialAdjustment, {
      deliveryId: checkoutResult.deliveryId!,
      kind: "vendor_credit",
      idempotencyKey: "period-vendor-credit-001",
      amountCents: 100,
      reason: "Synthetic later-period vendor credit",
    });

    const salePeriodAfterAdjustments = await owner.query(
      api.reporting.getSalesAggregate,
      salePeriod,
    );
    expect(salePeriodAfterAdjustments).toEqual(salePeriodBeforeAdjustments);

    const adjustmentReport = await owner.query(
      api.reporting.getSalesAggregate,
      adjustmentPeriod,
    );
    expect(adjustmentReport).toMatchObject({
      orderCount: 0,
      totalRevenueCents: 0,
      grossCollectedCents: 0,
      netCashActivityCents: -550,
      netRevenueCents: -500,
      totalTaxCents: -50,
      deliveryTaxCents: -50,
      customerFeeRefundCents: 500,
      deliveryTaxRefundCents: 50,
      vendorCreditsCents: 100,
      grossProfitCents: -400,
    });
    await expect(
      owner.query(api.reporting.getSalesAggregate, {
        startAt: adjustmentPeriod.startAt,
        endAt: adjustmentPeriod.startAt,
        timezone: "UTC",
      }),
    ).rejects.toThrow("endAt must be greater than startAt");
  });

  it("validates and applies updates to delivery details including Uber tracking URLs", async () => {
    const { owner, productId } = await setupCommerceStore();
    const checkoutResult = await owner.mutation(api.checkout.processCheckout, {
      orderNumber: "DELIVERY-UPDATE-DETAILS",
      items: [{ productId, quantityGrams: 1 }],
      paymentMethod: "cash",
      amountPaidCents: 1_500,
      delivery: {
        address: "123 Delivery Details Lane",
        vendorFeeCents: 500,
        chargeCustomer: false,
      },
    });
    const deliveryId = checkoutResult.deliveryId!;

    // Rejects non-https URL
    await expect(
      owner.mutation(api.deliveries.updateDeliveryDetails, {
        deliveryId,
        uberTrackingUrl: "http://uber.com/track/123",
      }),
    ).rejects.toThrow("INVALID_ARGUMENT: Invalid Uber tracking URL");

    // Rejects oversized URL (> 2000 chars)
    await expect(
      owner.mutation(api.deliveries.updateDeliveryDetails, {
        deliveryId,
        uberTrackingUrl: `https://uber.com/track/${"a".repeat(2000)}`,
      }),
    ).rejects.toThrow("INVALID_ARGUMENT: Invalid Uber tracking URL");

    // Accepts valid https URL with whitespace and trims it
    await owner.mutation(api.deliveries.updateDeliveryDetails, {
      deliveryId,
      uberTrackingUrl: "  https://uber.com/track/abc123xyz  ",
      dispatchType: "customer_pickup_car",
      feeSplitMode: "absorb_full",
      estimatedArrivalMinutes: 25,
    });

    const deliveriesList = await owner.query(api.deliveries.listDeliveries, {});
    const updated = deliveriesList.find((d) => d._id === deliveryId);
    expect(updated).toMatchObject({
      uberTrackingUrl: "https://uber.com/track/abc123xyz",
      dispatchType: "customer_pickup_car",
      feeSplitMode: "absorb_full",
      estimatedArrivalMinutes: 25,
    });

    // Clears uberTrackingUrl when null is passed
    await owner.mutation(api.deliveries.updateDeliveryDetails, {
      deliveryId,
      uberTrackingUrl: null,
    });

    const deliveriesListAfterClear = await owner.query(api.deliveries.listDeliveries, {});
    const cleared = deliveriesListAfterClear.find((d) => d._id === deliveryId);
    expect(cleared?.uberTrackingUrl).toBeUndefined();
  });
});
