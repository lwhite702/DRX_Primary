import { describe, expect, it } from "vitest";
import { convexTest } from "convex-test";
import schema from "../../convex/schema";
import { api } from "../../convex/_generated/api";
import * as checkout from "../../convex/checkout";
import * as customers from "../../convex/customers";
import * as generatedApi from "../../convex/_generated/api";
import * as intake from "../../convex/intake";
import * as offline from "../../convex/offline";
import * as onboarding from "../../convex/onboarding";
import * as products from "../../convex/products";
import * as reporting from "../../convex/reporting";

const modules = {
  "_generated/api.js": async () => generatedApi,
  "checkout.ts": async () => checkout,
  "customers.ts": async () => customers,
  "intake.ts": async () => intake,
  "offline.ts": async () => offline,
  "onboarding.ts": async () => onboarding,
  "products.ts": async () => products,
  "reporting.ts": async () => reporting,
};

describe("Android offline checkout", () => {
  it("preserves a valid offline sale, records inventory conflicts, and deduplicates retries", async () => {
    const t = convexTest(schema, modules);
    const owner = t.withIdentity({
      subject: "android_owner_1",
      email: "owner@example.test",
    });
    await owner.mutation(api.onboarding.createBusinessOnboarding, {
      businessName: "Offline Test Store",
      collectTax: false,
    });
    const productId = await owner.mutation(api.products.createProduct, {
      sku: "OFF-001",
      productName: "Offline Product",
      sellingPriceCents: 1000,
      unitCostCents: 400,
      reorderLevelGrams: 1,
    });
    await owner.mutation(api.intake.recordIntake, {
      productId,
      totalWeightGrams: 2,
      totalCostCents: 800,
      supplier: "Synthetic test supplier",
    });
    const customerId = await owner.mutation(api.customers.createCustomer, {
      firstName: "Legacy Offline Customer",
      creditLimitCents: 0,
    });
    await t.run(async (ctx) => {
      await ctx.db.patch(customerId, {
        totalPurchasesCents: 5_000,
        loyaltyEligibleSpendCents: undefined,
      });
    });
    await owner.mutation(api.offline.configurePolicy, {
      enabled: true,
      authorizationWindowMinutes: 60,
      perSaleLimitCents: 10_000,
      perDeviceSessionLimitCents: 50_000,
      offlineCreditLimitCents: 10_000,
      maxQueuedSales: 10,
    });
    const deviceId = "android-test-device-0001";
    await owner.mutation(api.offline.registerDevice, {
      deviceId,
      appVersion: "0.1.0",
    });
    const authorization = await owner.mutation(api.offline.issueAuthorization, {
      deviceId,
    });
    const input = {
      authorizationId: authorization.authorizationId,
      deviceId,
      idempotencyKey: "offline-sale-0001",
      sequence: 1,
      occurredAt: authorization.issuedAt + 1,
      customerId,
      items: [{ productId, quantityGrams: 3, unitPriceCents: 1000 }],
      paymentMethod: "cash" as const,
      amountPaidCents: 3000,
    };
    const first = await owner.mutation(api.offline.syncSale, input);
    expect(first.status).toBe("committed");
    expect(first.saleId).toBeTruthy();
    expect(first.conflicts).toContain("inventory_shortfall");

    const retry = await owner.mutation(api.offline.syncSale, input);
    expect(retry.status).toBe("duplicate");
    expect(retry.saleId).toBe(first.saleId);

    const cases = await owner.query(api.offline.listReconciliationCases, {
      status: "open",
    });
    expect(cases).toHaveLength(1);
    expect(cases[0].kind).toBe("inventory_shortfall");
    const catalog = await owner.query(api.products.listProducts, {});
    expect(catalog[0].quantityOnHandGrams).toBe(-1);
    const persisted = await t.run(async (ctx) => ({
      customer: await ctx.db.get(customerId),
      sale: first.saleId ? await ctx.db.get(first.saleId) : null,
    }));
    expect(persisted.customer?.loyaltyEligibleSpendCents).toBe(8_000);
    expect(persisted.sale).toMatchObject({
      merchandiseRevenueCents: 3_000,
      loyaltyEligibleSpendCents: 3_000,
    });
    const aggregate = await owner.query(api.reporting.getSalesAggregate, {
      startAt: 0,
      endAt: Date.now() + 1_000,
      timezone: "UTC",
    });
    expect(aggregate.cogsCents).toBe(800);
    expect(aggregate.cogsAllocationCoverage).toEqual({
      inventoryLineCount: 1,
      fullyAllocatedLineCount: 0,
      partiallyAllocatedLineCount: 1,
      unallocatedLineCount: 0,
      expectedQuantity: 3,
      allocatedQuantity: 2,
      unallocatedQuantity: 1,
      coverageBps: 6_667,
    });
  });

  it("rejects cross-tenant authorization use", async () => {
    const t = convexTest(schema, modules);
    const firstOwner = t.withIdentity({
      subject: "tenant_owner_a",
      email: "a@example.test",
    });
    const secondOwner = t.withIdentity({
      subject: "tenant_owner_b",
      email: "b@example.test",
    });
    await firstOwner.mutation(api.onboarding.createBusinessOnboarding, {
      businessName: "Tenant A",
      collectTax: false,
    });
    const productId = await firstOwner.mutation(api.products.createProduct, {
      sku: "A-001",
      productName: "Tenant A Product",
      sellingPriceCents: 1000,
      unitCostCents: 500,
    });
    await firstOwner.mutation(api.offline.configurePolicy, {
      enabled: true,
      authorizationWindowMinutes: 60,
      perSaleLimitCents: 10_000,
      perDeviceSessionLimitCents: 20_000,
      offlineCreditLimitCents: 5_000,
      maxQueuedSales: 5,
    });
    const deviceId = "android-tenant-device-a";
    await firstOwner.mutation(api.offline.registerDevice, {
      deviceId,
      appVersion: "0.1.0",
    });
    const authorization = await firstOwner.mutation(
      api.offline.issueAuthorization,
      { deviceId },
    );
    await secondOwner.mutation(api.onboarding.createBusinessOnboarding, {
      businessName: "Tenant B",
      collectTax: false,
    });
    await expect(
      secondOwner.mutation(api.offline.syncSale, {
        authorizationId: authorization.authorizationId,
        deviceId,
        idempotencyKey: "cross-tenant-attempt",
        sequence: 1,
        occurredAt: authorization.issuedAt + 1,
        items: [{ productId, quantityGrams: 1, unitPriceCents: 1000 }],
        paymentMethod: "cash",
        amountPaidCents: 1000,
      }),
    ).rejects.toThrow("outside the active tenant");
  });

  it("requires an owner or admin to approve a new Android device", async () => {
    const t = convexTest(schema, modules);
    const owner = t.withIdentity({
      subject: "device_owner",
      email: "owner@example.test",
    });
    const onboarded = await owner.mutation(
      api.onboarding.createBusinessOnboarding,
      {
        businessName: "Authorized Devices",
        collectTax: false,
      },
    );
    await t.run(async (ctx) => {
      await ctx.db.insert("users", {
        clerkUserId: "device_member",
        email: "member@example.test",
        role: "MEMBER",
        businessId: onboarded.businessId,
        status: "ACTIVE",
        createdAt: Date.now(),
        updatedAt: Date.now(),
      });
    });
    const member = t.withIdentity({
      subject: "device_member",
      email: "member@example.test",
    });
    await expect(
      member.mutation(api.offline.registerDevice, {
        deviceId: "android-member-device-0001",
        appVersion: "0.1.0",
      }),
    ).rejects.toThrow("Owner or admin role required");
  });

  it("rejects a cash customer from another tenant without mutating that customer", async () => {
    const t = convexTest(schema, modules);
    const firstOwner = t.withIdentity({
      subject: "cash_owner_a",
      email: "a@example.test",
    });
    const secondOwner = t.withIdentity({
      subject: "cash_owner_b",
      email: "b@example.test",
    });
    await firstOwner.mutation(api.onboarding.createBusinessOnboarding, {
      businessName: "Cash Tenant A",
      collectTax: false,
    });
    const productId = await firstOwner.mutation(api.products.createProduct, {
      sku: "CASH-A",
      productName: "Cash Product",
      sellingPriceCents: 1000,
      unitCostCents: 500,
    });
    await firstOwner.mutation(api.offline.configurePolicy, {
      enabled: true,
      authorizationWindowMinutes: 60,
      perSaleLimitCents: 10_000,
      perDeviceSessionLimitCents: 20_000,
      offlineCreditLimitCents: 5_000,
      maxQueuedSales: 5,
    });
    const deviceId = "android-cash-device-a";
    await firstOwner.mutation(api.offline.registerDevice, {
      deviceId,
      appVersion: "0.1.0",
    });
    const authorization = await firstOwner.mutation(
      api.offline.issueAuthorization,
      { deviceId },
    );
    await secondOwner.mutation(api.onboarding.createBusinessOnboarding, {
      businessName: "Cash Tenant B",
      collectTax: false,
    });
    const foreignCustomerId = await secondOwner.mutation(
      api.customers.createCustomer,
      { firstName: "Foreign", creditLimitCents: 0 },
    );

    await expect(
      firstOwner.mutation(api.offline.syncSale, {
        authorizationId: authorization.authorizationId,
        deviceId,
        idempotencyKey: "cross-tenant-cash-customer",
        sequence: 1,
        occurredAt: authorization.issuedAt + 1,
        customerId: foreignCustomerId,
        items: [{ productId, quantityGrams: 1, unitPriceCents: 1000 }],
        paymentMethod: "cash",
        amountPaidCents: 1000,
      }),
    ).rejects.toThrow("Offline customer is outside the active tenant");

    const foreignCustomer = await t.run((ctx) => ctx.db.get(foreignCustomerId));
    expect(foreignCustomer?.purchaseCount).toBe(0);
    expect(foreignCustomer?.totalPurchasesCents).toBe(0);
  });

  it("keeps quarantined idempotent retries in a terminal quarantined state", async () => {
    const t = convexTest(schema, modules);
    const owner = t.withIdentity({
      subject: "quarantine_owner",
      email: "owner@example.test",
    });
    await owner.mutation(api.onboarding.createBusinessOnboarding, {
      businessName: "Quarantine Store",
      collectTax: false,
    });
    const productId = await owner.mutation(api.products.createProduct, {
      sku: "Q-001",
      productName: "Quarantine Product",
      sellingPriceCents: 1000,
      unitCostCents: 500,
    });
    await owner.mutation(api.offline.configurePolicy, {
      enabled: true,
      authorizationWindowMinutes: 60,
      perSaleLimitCents: 10_000,
      perDeviceSessionLimitCents: 20_000,
      offlineCreditLimitCents: 5_000,
      maxQueuedSales: 5,
    });
    const deviceId = "android-quarantine-device";
    await owner.mutation(api.offline.registerDevice, {
      deviceId,
      appVersion: "0.1.0",
    });
    const authorization = await owner.mutation(api.offline.issueAuthorization, {
      deviceId,
    });
    const input = {
      authorizationId: authorization.authorizationId,
      deviceId,
      idempotencyKey: "quarantine-retry",
      sequence: 1,
      occurredAt: authorization.expiresAt + 600_000,
      items: [{ productId, quantityGrams: 1, unitPriceCents: 1000 }],
      paymentMethod: "cash" as const,
      amountPaidCents: 1000,
    };
    expect((await owner.mutation(api.offline.syncSale, input)).status).toBe(
      "quarantined",
    );
    expect((await owner.mutation(api.offline.syncSale, input)).status).toBe(
      "quarantined",
    );
  });

  it("aggregates duplicate product lines before updating inventory", async () => {
    const t = convexTest(schema, modules);
    const owner = t.withIdentity({
      subject: "aggregate_owner",
      email: "owner@example.test",
    });
    await owner.mutation(api.onboarding.createBusinessOnboarding, {
      businessName: "Aggregate Store",
      collectTax: false,
    });
    const productId = await owner.mutation(api.products.createProduct, {
      sku: "AGG-001",
      productName: "Aggregate Product",
      sellingPriceCents: 1000,
      unitCostCents: 500,
    });
    await owner.mutation(api.intake.recordIntake, {
      productId,
      totalWeightGrams: 10,
      totalCostCents: 5000,
    });
    await owner.mutation(api.offline.configurePolicy, {
      enabled: true,
      authorizationWindowMinutes: 60,
      perSaleLimitCents: 10_000,
      perDeviceSessionLimitCents: 20_000,
      offlineCreditLimitCents: 5_000,
      maxQueuedSales: 5,
    });
    const deviceId = "android-aggregate-device";
    await owner.mutation(api.offline.registerDevice, {
      deviceId,
      appVersion: "0.1.0",
    });
    const authorization = await owner.mutation(api.offline.issueAuthorization, {
      deviceId,
    });
    await owner.mutation(api.offline.syncSale, {
      authorizationId: authorization.authorizationId,
      deviceId,
      idempotencyKey: "aggregate-lines",
      sequence: 1,
      occurredAt: authorization.issuedAt + 1,
      items: [
        { productId, quantityGrams: 2, unitPriceCents: 1000 },
        { productId, quantityGrams: 2, unitPriceCents: 1000 },
      ],
      paymentMethod: "cash",
      amountPaidCents: 4000,
    });
    const product = await t.run((ctx) => ctx.db.get(productId));
    expect(product?.quantityOnHandGrams).toBe(6);
  });

  it("uses product taxability and handles fractional units and inactive customers safely", async () => {
    const t = convexTest(schema, modules);
    const owner = t.withIdentity({
      subject: "offline_invariants_owner",
      email: "owner@example.test",
    });
    await owner.mutation(api.onboarding.createBusinessOnboarding, {
      businessName: "Offline Invariants Store",
      collectTax: true,
      taxRateBps: 1000,
    });
    const taxableProductId = await owner.mutation(api.products.createProduct, {
      sku: "OFF-TAX",
      productName: "Taxable Offline Product",
      sellingPriceCents: 1000,
      unitCostCents: 400,
      isTaxable: true,
    });
    const exemptProductId = await owner.mutation(api.products.createProduct, {
      sku: "OFF-EXEMPT",
      productName: "Exempt Offline Product",
      sellingPriceCents: 500,
      unitCostCents: 200,
      isTaxable: false,
    });
    const unitProductId = await owner.mutation(api.products.createProduct, {
      sku: "OFF-UNIT",
      productName: "Whole Unit Offline Product",
      sellingPriceCents: 1000,
      unitCostCents: 400,
      allowFractionalWeight: false,
    });
    const inactiveCustomerId = await owner.mutation(
      api.customers.createCustomer,
      {
        firstName: "Inactive",
        creditLimitCents: 1000,
      },
    );
    await t.run(async (ctx) => {
      await ctx.db.patch(inactiveCustomerId, { isActive: false });
    });
    const unlimitedCustomerId = await owner.mutation(
      api.customers.createCustomer,
      {
        firstName: "Unlimited",
        creditLimitCents: 0,
      },
    );
    await owner.mutation(api.offline.configurePolicy, {
      enabled: true,
      authorizationWindowMinutes: 60,
      perSaleLimitCents: 10_000,
      perDeviceSessionLimitCents: 20_000,
      offlineCreditLimitCents: 5_000,
      maxQueuedSales: 5,
    });
    const deviceId = "android-offline-invariants";
    await owner.mutation(api.offline.registerDevice, {
      deviceId,
      appVersion: "0.1.0",
    });
    const authorization = await owner.mutation(api.offline.issueAuthorization, {
      deviceId,
    });
    const common = {
      authorizationId: authorization.authorizationId,
      deviceId,
      occurredAt: authorization.issuedAt + 1,
      paymentMethod: "cash" as const,
    };

    const committed = await owner.mutation(api.offline.syncSale, {
      ...common,
      idempotencyKey: "offline-taxability",
      sequence: 1,
      items: [
        { productId: taxableProductId, quantityGrams: 1, unitPriceCents: 1000 },
        { productId: exemptProductId, quantityGrams: 1, unitPriceCents: 500 },
      ],
      amountPaidCents: 1600,
    });
    expect(committed).toMatchObject({
      status: "committed",
      totalAmountCents: 1600,
    });
    const sale = await t.run(async (ctx) =>
      committed.saleId ? await ctx.db.get(committed.saleId) : null,
    );
    expect(sale).toMatchObject({
      subtotalCents: 1500,
      taxableSubtotalCents: 1000,
      taxAmountCents: 100,
    });

    const fractionalQuarantine = await owner.mutation(api.offline.syncSale, {
      ...common,
      idempotencyKey: "offline-fractional-unit",
      sequence: 2,
      items: [
        {
          productId: unitProductId,
          quantityGrams: 0.5,
          unitPriceCents: 1000,
        },
      ],
      amountPaidCents: 550,
    });
    expect(fractionalQuarantine).toMatchObject({
      status: "quarantined",
      saleId: null,
      totalAmountCents: 550,
    });
    const fractionalRetry = await owner.mutation(api.offline.syncSale, {
      ...common,
      idempotencyKey: "offline-fractional-unit",
      sequence: 2,
      items: [
        {
          productId: unitProductId,
          quantityGrams: 0.5,
          unitPriceCents: 1000,
        },
      ],
      amountPaidCents: 550,
    });
    expect(fractionalRetry.status).toBe("quarantined");

    const quarantined = await owner.mutation(api.offline.syncSale, {
      ...common,
      idempotencyKey: "offline-inactive-customer",
      sequence: 3,
      customerId: inactiveCustomerId,
      items: [
        {
          productId: taxableProductId,
          quantityGrams: 1,
          unitPriceCents: 1000,
        },
      ],
      amountPaidCents: 1100,
    });
    expect(quarantined).toMatchObject({
      status: "quarantined",
      saleId: null,
    });
    const quarantinedRetry = await owner.mutation(api.offline.syncSale, {
      ...common,
      idempotencyKey: "offline-inactive-customer",
      sequence: 3,
      customerId: inactiveCustomerId,
      items: [
        {
          productId: taxableProductId,
          quantityGrams: 1,
          unitPriceCents: 1000,
        },
      ],
      amountPaidCents: 1100,
    });
    expect(quarantinedRetry.status).toBe("quarantined");
    const inactiveCustomer = await t.run((ctx) =>
      ctx.db.get(inactiveCustomerId),
    );
    expect(inactiveCustomer).toMatchObject({
      purchaseCount: 0,
      totalCreditUsedCents: 0,
      totalPurchasesCents: 0,
    });

    const unlimitedCredit = await owner.mutation(api.offline.syncSale, {
      ...common,
      idempotencyKey: "offline-unlimited-credit",
      sequence: 4,
      customerId: unlimitedCustomerId,
      items: [
        {
          productId: taxableProductId,
          quantityGrams: 1,
          unitPriceCents: 1000,
        },
      ],
      paymentMethod: "credit",
      amountPaidCents: 0,
    });
    expect(unlimitedCredit.status).toBe("committed");
    expect(unlimitedCredit.conflicts).not.toContain("credit_limit_exceeded");
    const unlimitedCustomer = await t.run((ctx) =>
      ctx.db.get(unlimitedCustomerId),
    );
    expect(unlimitedCustomer?.totalCreditUsedCents).toBe(1100);
  });

  it("quarantines tampered fractional envelopes, normalizes legacy defaults, and continues", async () => {
    const t = convexTest(schema, modules);
    const owner = t.withIdentity({
      subject: "offline_quantity_owner",
      email: "quantity@example.test",
    });
    await owner.mutation(api.onboarding.createBusinessOnboarding, {
      businessName: "Offline Quantity Store",
      collectTax: false,
    });
    const configuredProductId = await owner.mutation(
      api.products.createProduct,
      {
        sku: "OFF-QTY-CONFIGURED",
        productName: "Configured Fractional Product",
        sellingPriceCents: 1_000,
        unitCostCents: 400,
        allowFractionalWeight: true,
      },
    );
    await owner.mutation(api.products.updateCommerceConfig, {
      productId: configuredProductId,
      sellingUnit: "gram",
      quantityPrecision: 2,
      minimumSaleQuantity: 0.25,
      quantityIncrement: 0.05,
      suggestedQuantityPresets: [0.25, 0.5],
      suggestedDollarPresetsCents: [500],
      bulkPriceTiers: [],
    });
    await owner.mutation(api.intake.recordIntake, {
      productId: configuredProductId,
      totalWeightGrams: 5,
      totalCostCents: 2_000,
    });
    const missingConfigProductId = await owner.mutation(
      api.products.createProduct,
      {
        sku: "OFF-QTY-MISSING",
        productName: "Missing Fractional Configuration",
        sellingPriceCents: 1_000,
        unitCostCents: 400,
        allowFractionalWeight: true,
      },
    );
    await t.run((ctx) =>
      ctx.db.patch(missingConfigProductId, {
        sellingUnit: undefined,
        quantityPrecision: undefined,
        minimumSaleQuantity: undefined,
        quantityIncrement: undefined,
      }),
    );
    await owner.mutation(api.offline.configurePolicy, {
      enabled: true,
      authorizationWindowMinutes: 60,
      perSaleLimitCents: 10_000,
      perDeviceSessionLimitCents: 20_000,
      offlineCreditLimitCents: 5_000,
      maxQueuedSales: 10,
    });
    const deviceId = "android-quantity-device";
    await owner.mutation(api.offline.registerDevice, {
      deviceId,
      appVersion: "0.6.0",
    });
    const authorization = await owner.mutation(api.offline.issueAuthorization, {
      deviceId,
    });
    const common = {
      authorizationId: authorization.authorizationId,
      deviceId,
      occurredAt: authorization.issuedAt + 1,
      paymentMethod: "cash" as const,
    };
    const invalidCases = [
      {
        idempotencyKey: "offline-quantity-below-minimum",
        items: [
          {
            productId: configuredProductId,
            quantityGrams: 0.2,
            unitPriceCents: 1_000,
          },
        ],
        reason: "quantity_below_minimum",
      },
      {
        idempotencyKey: "offline-quantity-excess-precision",
        items: [
          {
            productId: configuredProductId,
            quantityGrams: 0.251,
            unitPriceCents: 1_000,
          },
        ],
        reason: "quantity_precision_exceeded",
      },
      {
        idempotencyKey: "offline-quantity-off-increment",
        items: [
          {
            productId: configuredProductId,
            quantityGrams: 0.26,
            unitPriceCents: 1_000,
          },
        ],
        reason: "quantity_increment_mismatch",
      },
      {
        idempotencyKey: "offline-quantity-split-tamper",
        items: [
          {
            productId: configuredProductId,
            quantityGrams: 0.125,
            unitPriceCents: 1_000,
          },
          {
            productId: configuredProductId,
            quantityGrams: 0.125,
            unitPriceCents: 1_000,
          },
        ],
        reason: "quantity_precision_exceeded",
      },
    ] as const;
    for (const [index, invalidCase] of invalidCases.entries()) {
      const result = await owner.mutation(api.offline.syncSale, {
        ...common,
        idempotencyKey: invalidCase.idempotencyKey,
        sequence: index + 1,
        items: [...invalidCase.items],
        amountPaidCents: 1_000,
      });
      expect(result).toMatchObject({
        status: "quarantined",
        saleId: null,
        quarantineReason: invalidCase.reason,
      });
    }

    const legacyDefault = await owner.mutation(api.offline.syncSale, {
      ...common,
      idempotencyKey: "offline-quantity-legacy-default",
      sequence: invalidCases.length + 1,
      items: [
        {
          productId: missingConfigProductId,
          quantityGrams: 0.5,
          unitPriceCents: 1_000,
        },
      ],
      amountPaidCents: 500,
    });
    expect(legacyDefault).toMatchObject({
      status: "committed",
      quarantineReason: null,
    });

    const valid = await owner.mutation(api.offline.syncSale, {
      ...common,
      idempotencyKey: "offline-quantity-valid-after-quarantine",
      sequence: invalidCases.length + 2,
      items: [
        {
          productId: configuredProductId,
          quantityGrams: 0.25,
          unitPriceCents: 1_000,
        },
      ],
      amountPaidCents: 250,
    });
    expect(valid).toMatchObject({
      status: "committed",
      quarantineReason: null,
    });
    const configuredProduct = await t.run((ctx) =>
      ctx.db.get(configuredProductId),
    );
    expect(configuredProduct?.quantityOnHandGrams).toBe(4.75);
  });
});
