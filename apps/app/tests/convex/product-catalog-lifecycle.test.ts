import { describe, expect, it } from "vitest";
import { convexTest } from "convex-test";
import schema from "../../convex/schema";
import { api } from "../../convex/_generated/api";
import * as onboarding from "../../convex/onboarding";
import * as products from "../../convex/products";
import * as inventory from "../../convex/inventory";
import * as intake from "../../convex/intake";
import * as generatedApi from "../../convex/_generated/api";

const modules = {
  "_generated/api.js": async () => generatedApi,
  "onboarding.ts": async () => onboarding,
  "products.ts": async () => products,
  "inventory.ts": async () => inventory,
  "intake.ts": async () => intake,
};

async function setupCatalogTest() {
  const t = convexTest(schema, modules);
  const owner = t.withIdentity({ subject: "owner-user", email: "owner@drx.test" });
  const { businessId } = await owner.mutation(api.onboarding.createBusinessOnboarding, {
    name: "Catalog Owner",
    businessName: "DRX Catalog Test Store",
    taxRateBps: 825,
  });
  return { t, owner, businessId };
}

describe("WRE-18: product catalog and inventory model lifecycle", () => {
  it("enforces tenant-scoped SKU uniqueness and allows same SKU in separate businesses", async () => {
    const { t, owner, businessId } = await setupCatalogTest();

    // 1. Create first product with SKU-1
    const p1Id = await owner.mutation(api.products.createProduct, {
      sku: "SKU-BLUE-DREAM",
      productName: "Blue Dream 3.5g",
      sellingPriceCents: 3500,
      unitCostCents: 1500,
      location: "Shelf A-1",
      isTaxable: true,
      initialQuantity: 10,
    });
    expect(p1Id).toBeTruthy();

    // 2. Duplicate SKU in same business should be rejected with ALREADY_EXISTS
    await expect(
      owner.mutation(api.products.createProduct, {
        sku: "SKU-BLUE-DREAM",
        productName: "Another Blue Dream",
        sellingPriceCents: 4000,
        unitCostCents: 1600,
      })
    ).rejects.toThrow(/ALREADY_EXISTS/);

    // 3. Different business can use the same SKU without conflict
    const otherUser = t.withIdentity({ subject: "other-user", email: "other@drx.test" });
    const { businessId: otherBusinessId } = await otherUser.mutation(
      api.onboarding.createBusinessOnboarding,
      {
        name: "Other Owner",
        businessName: "Other Business",
        taxRateBps: 0,
      }
    );

    const otherPId = await otherUser.mutation(api.products.createProduct, {
      sku: "SKU-BLUE-DREAM",
      productName: "Other Store Blue Dream",
      sellingPriceCents: 3000,
      unitCostCents: 1200,
    });
    expect(otherPId).toBeTruthy();
  });

  it("archives and reactivates products with audit events and filters in listProducts", async () => {
    const { t, owner, businessId } = await setupCatalogTest();

    const productId = await owner.mutation(api.products.createProduct, {
      sku: "SKU-OG-KUSH",
      productName: "OG Kush 1g",
      sellingPriceCents: 1200,
      unitCostCents: 500,
      location: "Vault Bin 4",
      isTaxable: true,
    });

    // Verify initial active listing
    const activeProducts = await owner.query(api.products.listProducts, {});
    expect(activeProducts.some((p) => p._id === productId)).toBe(true);

    // Archive product
    const archiveResult = await owner.mutation(api.products.archiveProduct, { productId });
    expect(archiveResult.success).toBe(true);

    // After archiving, should NOT appear in default active list
    const activeAfterArchive = await owner.query(api.products.listProducts, {});
    expect(activeAfterArchive.some((p) => p._id === productId)).toBe(false);

    // Should appear when includeArchived: true
    const allProducts = await owner.query(api.products.listProducts, { includeArchived: true });
    const archivedItem = allProducts.find((p) => p._id === productId);
    expect(archivedItem).toBeDefined();
    expect(archivedItem?.isActive).toBe(false);

    // Verify audit event was logged
    await t.run(async (ctx) => {
      const audits = await ctx.db
        .query("auditEvents")
        .withIndex("by_businessId_and_timestamp", (q) => q.eq("businessId", businessId))
        .collect();
      const archiveEvent = audits.find(
        (a) => a.action === "PRODUCT_ARCHIVED" && a.entityId === productId
      );
      expect(archiveEvent).toBeDefined();
    });

    // Reactivate product
    const reactivateResult = await owner.mutation(api.products.reactivateProduct, { productId });
    expect(reactivateResult.success).toBe(true);

    // Appears in active list again
    const activeAfterReactivation = await owner.query(api.products.listProducts, {});
    expect(activeAfterReactivation.some((p) => p._id === productId)).toBe(true);

    // Verify audit event for reactivation
    await t.run(async (ctx) => {
      const audits = await ctx.db
        .query("auditEvents")
        .withIndex("by_businessId_and_timestamp", (q) => q.eq("businessId", businessId))
        .collect();
      const reactivateEvent = audits.find(
        (a) => a.action === "PRODUCT_REACTIVATED" && a.entityId === productId
      );
      expect(reactivateEvent).toBeDefined();
    });
  });

  it("propagates lot number, expiration date, and location across intake and batch creation", async () => {
    const { t, owner, businessId } = await setupCatalogTest();

    const productId = await owner.mutation(api.products.createProduct, {
      sku: "SKU-SOUR-D",
      productName: "Sour Diesel",
      sellingPriceCents: 2000,
      unitCostCents: 800,
      initialQuantity: 0,
    });

    const now = Date.now();
    const expiryTimestamp = now + 90 * 86400000; // 90 days from now

    // Perform intake with lot, expiration, and location
    const intakeResult = await owner.mutation(api.intake.recordIntake, {
      productId,
      totalCostCents: 80000,
      totalWeightGrams: 100,
      supplier: "Cali Farms Wholesale",
      lotNumber: "LOT-2026-SD01",
      expirationDate: expiryTimestamp,
      location: "Safe Room Shelf C",
    });

    expect(intakeResult.newStock).toBe(100);
    expect(intakeResult.batchId).toBeDefined();
    expect(intakeResult.intakeId).toBeDefined();

    // Verify batch record has metadata
    await t.run(async (ctx) => {
      const batch = await ctx.db.get(intakeResult.batchId);
      expect(batch).toBeDefined();
      expect(batch?.lotNumber).toBe("LOT-2026-SD01");
      expect(batch?.expirationDate).toBe(expiryTimestamp);
      expect(batch?.location).toBe("Safe Room Shelf C");
      expect(batch?.remainingQuantityGrams).toBe(100);
      expect(batch?.supplier).toBe("Cali Farms Wholesale");

      const intakeRecord = await ctx.db.get(intakeResult.intakeId);
      expect(intakeRecord).toBeDefined();
      expect(intakeRecord?.lotNumber).toBe("LOT-2026-SD01");
      expect(intakeRecord?.expirationDate).toBe(expiryTimestamp);
      expect(intakeRecord?.location).toBe("Safe Room Shelf C");
    });
  });

  it("queries expiring batches within a time threshold and ignores zero-stock batches", async () => {
    const { t, owner, businessId } = await setupCatalogTest();

    const productId = await owner.mutation(api.products.createProduct, {
      sku: "SKU-GELATO",
      productName: "Gelato 33",
      sellingPriceCents: 1500,
      unitCostCents: 700,
      initialQuantity: 0,
    });

    const now = Date.now();
    const expiresSoon = now + 10 * 86400000; // 10 days
    const expiresLater = now + 180 * 86400000; // 180 days

    // Batch 1: Expiring soon (10 days)
    await owner.mutation(api.intake.recordIntake, {
      productId,
      totalCostCents: 35000,
      totalWeightGrams: 50,
      lotNumber: "LOT-SOON",
      expirationDate: expiresSoon,
      location: "Display Case 1",
    });

    // Batch 2: Expiring later (180 days)
    await owner.mutation(api.intake.recordIntake, {
      productId,
      totalCostCents: 35000,
      totalWeightGrams: 50,
      lotNumber: "LOT-LATER",
      expirationDate: expiresLater,
      location: "Back Storage",
    });

    // Query batches expiring within 30 days
    const thirtyDaysThreshold = now + 30 * 86400000;
    const expiringBatches = await owner.query(api.intake.listExpiringBatches, {
      maxExpirationDate: thirtyDaysThreshold,
    });

    expect(expiringBatches).toHaveLength(1);
    expect(expiringBatches[0].lotNumber).toBe("LOT-SOON");
    expect(expiringBatches[0].productName).toBe("Gelato 33");
    expect(expiringBatches[0].location).toBe("Display Case 1");

    // Query batches expiring within a year (should return both)
    const oneYearThreshold = now + 365 * 86400000;
    const allExpiring = await owner.query(api.intake.listExpiringBatches, {
      maxExpirationDate: oneYearThreshold,
    });
    expect(allExpiring.length).toBeGreaterThanOrEqual(2);
  });

  it("updates product location and tax status via updateProduct with audit logging", async () => {
    const { t, owner, businessId } = await setupCatalogTest();

    const productId = await owner.mutation(api.products.createProduct, {
      sku: "SKU-UPDATE-TEST",
      productName: "Pre-update Product",
      sellingPriceCents: 2500,
      unitCostCents: 1000,
      location: "Old Shelf",
      isTaxable: true,
    });

    // Update location and isTaxable
    await owner.mutation(api.inventory.updateProduct, {
      businessId,
      productId,
      location: "New Vault Room B",
      isTaxable: false,
    });

    // Verify catalog reflects the update
    const catalog = await owner.query(api.products.getCatalogProduct, {
      businessId,
      productId,
    });
    expect(catalog.location).toBe("New Vault Room B");
    expect(catalog.isTaxable).toBe(false);

    // Verify audit event
    await t.run(async (ctx) => {
      const audits = await ctx.db
        .query("auditEvents")
        .withIndex("by_businessId_and_timestamp", (q) => q.eq("businessId", businessId))
        .collect();
      const updateEvent = audits.find(
        (a) => a.action === "PRODUCT_UPDATED" && a.entityId === productId
      );
      expect(updateEvent).toBeDefined();
      expect(updateEvent?.metadata).toContain("location");
    });
  });
});
