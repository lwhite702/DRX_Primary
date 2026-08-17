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

const modules = {
  "_generated/api.js": async () => generatedApi,
  "checkout.ts": async () => checkout,
  "customers.ts": async () => customers,
  "intake.ts": async () => intake,
  "offline.ts": async () => offline,
  "onboarding.ts": async () => onboarding,
  "products.ts": async () => products,
};

describe("Android offline checkout", () => {
  it("preserves a valid offline sale, records inventory conflicts, and deduplicates retries", async () => {
    const t = convexTest(schema, modules);
    const owner = t.withIdentity({ subject: "android_owner_1", email: "owner@example.test" });
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
    await owner.mutation(api.offline.configurePolicy, {
      enabled: true,
      authorizationWindowMinutes: 60,
      perSaleLimitCents: 10_000,
      perDeviceSessionLimitCents: 50_000,
      offlineCreditLimitCents: 10_000,
      maxQueuedSales: 10,
    });
    const deviceId = "android-test-device-0001";
    await owner.mutation(api.offline.registerDevice, { deviceId, appVersion: "0.1.0" });
    const authorization = await owner.mutation(api.offline.issueAuthorization, { deviceId });
    const input = {
      authorizationId: authorization.authorizationId,
      deviceId,
      idempotencyKey: "offline-sale-0001",
      sequence: 1,
      occurredAt: authorization.issuedAt + 1,
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

    const cases = await owner.query(api.offline.listReconciliationCases, { status: "open" });
    expect(cases).toHaveLength(1);
    expect(cases[0].kind).toBe("inventory_shortfall");
    const catalog = await owner.query(api.products.listProducts, {});
    expect(catalog[0].quantityOnHandGrams).toBe(-1);
  });

  it("rejects cross-tenant authorization use", async () => {
    const t = convexTest(schema, modules);
    const firstOwner = t.withIdentity({ subject: "tenant_owner_a", email: "a@example.test" });
    const secondOwner = t.withIdentity({ subject: "tenant_owner_b", email: "b@example.test" });
    await firstOwner.mutation(api.onboarding.createBusinessOnboarding, { businessName: "Tenant A", collectTax: false });
    const productId = await firstOwner.mutation(api.products.createProduct, { sku: "A-001", productName: "Tenant A Product", sellingPriceCents: 1000, unitCostCents: 500 });
    await firstOwner.mutation(api.offline.configurePolicy, { enabled: true, authorizationWindowMinutes: 60, perSaleLimitCents: 10_000, perDeviceSessionLimitCents: 20_000, offlineCreditLimitCents: 5_000, maxQueuedSales: 5 });
    const deviceId = "android-tenant-device-a";
    await firstOwner.mutation(api.offline.registerDevice, { deviceId, appVersion: "0.1.0" });
    const authorization = await firstOwner.mutation(api.offline.issueAuthorization, { deviceId });
    await secondOwner.mutation(api.onboarding.createBusinessOnboarding, { businessName: "Tenant B", collectTax: false });
    await expect(secondOwner.mutation(api.offline.syncSale, { authorizationId: authorization.authorizationId, deviceId, idempotencyKey: "cross-tenant-attempt", sequence: 1, occurredAt: authorization.issuedAt + 1, items: [{ productId, quantityGrams: 1, unitPriceCents: 1000 }], paymentMethod: "cash", amountPaidCents: 1000 })).rejects.toThrow("outside the active tenant");
  });
});
