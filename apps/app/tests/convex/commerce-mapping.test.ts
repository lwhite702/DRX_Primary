import { convexTest } from "convex-test";
import { describe, expect, it } from "vitest";
import { api } from "../../convex/_generated/api";
import * as customers from "../../convex/customers";
import * as generatedApi from "../../convex/_generated/api";
import * as onboarding from "../../convex/onboarding";
import * as products from "../../convex/products";
import * as settings from "../../convex/settings";
import schema from "../../convex/schema";

const modules = {
  "_generated/api.js": async () => generatedApi,
  "customers.ts": async () => customers,
  "onboarding.ts": async () => onboarding,
  "products.ts": async () => products,
  "settings.ts": async () => settings,
};

async function setupMappedTenant(subject: string) {
  const t = convexTest(schema, modules);
  const owner = t.withIdentity({
    subject,
    email: `${subject}@example.test`,
  });
  const onboardingResult = await owner.mutation(
    api.onboarding.createBusinessOnboarding,
    {
      businessName: `${subject} store`,
      collectTax: false,
    },
  );
  const productId = await owner.mutation(api.products.createProduct, {
    sku: `${subject}-SKU`,
    productName: `${subject} product`,
    sellingPriceCents: 1_000,
    unitCostCents: 400,
  });
  return { t, owner, businessId: onboardingResult.businessId, productId };
}

describe("Convex legacy Prisma identity mapping", () => {
  it("atomically links immutable business and tenant-unique product identities during commerce configuration", async () => {
    const { owner, businessId, productId } = await setupMappedTenant(
      "mapping_owner",
    );

    await owner.mutation(api.products.updateCommerceConfig, {
      productId,
      legacyPrismaBusinessId: "prisma-business-001",
      legacyPrismaId: "prisma-product-001",
      sellingUnit: "unit",
      quantityPrecision: 0,
      minimumSaleQuantity: 1,
      quantityIncrement: 1,
      suggestedQuantityPresets: [1, 2],
      suggestedDollarPresetsCents: [1_000],
      bulkPriceTiers: [],
    });

    const settingsResult = await owner.query(
      api.settings.getBusinessSettings,
      {},
    );
    expect(settingsResult.business).toMatchObject({
      _id: businessId,
      legacyPrismaBusinessId: "prisma-business-001",
    });
    expect(await owner.query(api.products.listProducts, {})).toMatchObject([
      {
        _id: productId,
        legacyPrismaId: "prisma-product-001",
      },
    ]);

    await expect(
      owner.mutation(api.products.updateCommerceConfig, {
        productId,
        legacyPrismaBusinessId: "different-prisma-business",
        legacyPrismaId: "prisma-product-001",
        sellingUnit: "unit",
        quantityPrecision: 0,
        minimumSaleQuantity: 1,
        quantityIncrement: 1,
        suggestedQuantityPresets: [1],
        suggestedDollarPresetsCents: [1_000],
        bulkPriceTiers: [],
      }),
    ).rejects.toThrow("already linked");
  });

  it("links business, product, and customer identities through authenticated idempotent mutations", async () => {
    const { owner, businessId, productId } = await setupMappedTenant(
      "direct_mapping_owner",
    );
    expect(
      await owner.mutation(api.settings.linkLegacyPrismaBusiness, {
        legacyPrismaBusinessId: "prisma-business-direct",
      }),
    ).toEqual({
      businessId,
      legacyPrismaBusinessId: "prisma-business-direct",
    });
    expect(
      await owner.mutation(api.products.linkLegacyPrismaProduct, {
        productId,
        legacyPrismaId: "prisma-product-direct",
      }),
    ).toEqual({ productId, legacyPrismaId: "prisma-product-direct" });
    const secondProductId = await owner.mutation(api.products.createProduct, {
      sku: "direct-mapping-second-SKU",
      productName: "Second synthetic mapping product",
      sellingPriceCents: 1_000,
      unitCostCents: 400,
    });
    await expect(
      owner.mutation(api.products.linkLegacyPrismaProduct, {
        productId: secondProductId,
        legacyPrismaId: "prisma-product-direct",
      }),
    ).rejects.toThrow("already linked");

    const firstCustomerId = await owner.mutation(
      api.customers.createCustomer,
      { firstName: "Synthetic First" },
    );
    const secondCustomerId = await owner.mutation(
      api.customers.createCustomer,
      { firstName: "Synthetic Second" },
    );
    const firstLink = await owner.mutation(
      api.customers.linkLegacyPrismaCustomer,
      {
        customerId: firstCustomerId,
        legacyPrismaId: "prisma-customer-direct",
      },
    );
    expect(firstLink).toEqual({
      customerId: firstCustomerId,
      legacyPrismaId: "prisma-customer-direct",
    });
    expect(
      await owner.mutation(api.customers.linkLegacyPrismaCustomer, {
        customerId: firstCustomerId,
        legacyPrismaId: "prisma-customer-direct",
      }),
    ).toEqual(firstLink);
    await expect(
      owner.mutation(api.customers.linkLegacyPrismaCustomer, {
        customerId: secondCustomerId,
        legacyPrismaId: "prisma-customer-direct",
      }),
    ).rejects.toThrow("already linked");
    expect(await owner.query(api.customers.listCustomers, {})).toMatchObject([
      { _id: firstCustomerId, legacyPrismaId: "prisma-customer-direct" },
      { _id: secondCustomerId },
    ]);
  });
});
