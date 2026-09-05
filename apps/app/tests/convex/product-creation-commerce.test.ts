import { convexTest } from "convex-test";
import { describe, expect, it } from "vitest";
import { api } from "../../convex/_generated/api";
import * as generatedApi from "../../convex/_generated/api";
import * as products from "../../convex/products";
import * as onboarding from "../../convex/onboarding";
import schema from "../../convex/schema";
import {
  creationCommerceDefaults,
  newProductCommerceSchema,
  parsePresetInput,
} from "../../lib/commerce/product-creation";

const modules = {
  "_generated/api.js": async () => generatedApi,
  "products.ts": async () => products,
  "onboarding.ts": async () => onboarding,
};
const config = {
  sellingUnit: "g",
  decimalPrecision: 2,
  minimumSaleQuantity: 0.1,
  quantityIncrement: 0.25,
  suggestedDollarAmounts: [10, 20],
  suggestedQuantities: [0.1, 0.35, 0.6],
};
const input = {
  sku: "SYNTHETIC",
  productName: "Synthetic product",
  sellingPriceCents: 1000,
  unitCostCents: 300,
  allowFractionalWeight: true,
  commerceConfig: config,
};

async function setup() {
  const t = convexTest(schema, modules);
  const owner = t.withIdentity({
    subject: "owner",
    email: "owner@example.test",
  });
  await owner.mutation(api.onboarding.createBusinessOnboarding, {
    businessName: "Synthetic store",
    collectTax: false,
  });
  return { t, owner };
}

describe("fractional product creation", () => {
  it("commits precise rules and presets with the product, audit, and reciprocal suggestion", async () => {
    const { t, owner } = await setup();
    const productId = await owner.mutation(api.products.createProduct, input);
    const rows = await owner.query(api.products.listProducts, {});
    expect(rows).toMatchObject([
      {
        _id: productId,
        sellingUnit: "g",
        allowFractionalWeight: true,
        minimumSaleQuantity: 0.1,
        quantityIncrement: 0.25,
        quantityPrecision: 2,
        suggestedDollarPresetsCents: [1000, 2000],
        suggestedQuantityPresets: [0.1, 0.35, 0.6],
      },
    ]);
    const suggestion = await owner.query(
      api.products.suggestQuantityForDollarAmount,
      { productId, amountCents: 1000 },
    );
    // Existing checkout chooses the nearest permitted quantity (not a budget cap).
    expect(suggestion).toMatchObject({
      suggestedQuantity: 1.1,
      estimatedSubtotalCents: 1100,
      sellingUnit: "g",
    });
    const audits = await t.run((ctx) => ctx.db.query("auditEvents").take(20));
    expect(audits.filter((e) => e.action === "PRODUCT_CREATED")).toHaveLength(
      1,
    );
  });

  it.each([
    { quantityIncrement: 0 },
    { decimalPrecision: 7 },
    { decimalPrecision: 1 },
    { minimumSaleQuantity: 0.000000001 },
    { suggestedQuantities: [0.25] },
    { suggestedDollarAmounts: [1.001] },
    { suggestedQuantities: Array(9).fill(0.1) },
  ])("rejects invalid rules without creating a product: %j", async (patch) => {
    const { owner } = await setup();
    await expect(
      owner.mutation(api.products.createProduct, {
        ...input,
        commerceConfig: { ...config, ...patch },
      }),
    ).rejects.toThrow();
    expect(await owner.query(api.products.listProducts, {})).toEqual([]);
  });

  it("defaults new UI configs to whole units and preserves legacy API callers", async () => {
    const { owner } = await setup();
    const { fractionalEnabled, bulkPriceTiers, ...commerceConfig } =
      creationCommerceDefaults("unit");
    expect(bulkPriceTiers).toEqual([]);
    await owner.mutation(api.products.createProduct, {
      ...input,
      allowFractionalWeight: fractionalEnabled,
      commerceConfig,
    });
    expect(await owner.query(api.products.listProducts, {})).toMatchObject([
      {
        allowFractionalWeight: false,
        quantityPrecision: 0,
        quantityIncrement: 1,
      },
    ]);
    await owner.mutation(api.products.createProduct, {
      sku: "LEGACY",
      productName: "Legacy caller",
      sellingPriceCents: 1000,
      unitCostCents: 100,
    });
    expect(
      (await owner.query(api.products.listProducts, {})).find(
        (p) => p.sku === "LEGACY",
      )?.allowFractionalWeight,
    ).toBe(true);
  });

  it("atomically records optional Android starting stock with a costed FIFO batch", async () => {
    const { t, owner } = await setup();
    const productId = await owner.mutation(api.products.createProduct, {
      ...input,
      initialQuantity: 3.75,
    });
    expect(await owner.query(api.products.listProducts, {})).toMatchObject([
      { quantityOnHandGrams: 3.75 },
    ]);
    expect(
      await t.run((ctx) =>
        ctx.db
          .query("inventoryBatches")
          .withIndex("by_productId", (q) => q.eq("productId", productId))
          .take(10),
      ),
    ).toMatchObject([
      {
        originalQuantityGrams: 3.75,
        remainingQuantityGrams: 3.75,
        unitCostPerGramCents: 300,
      },
    ]);
    await expect(
      owner.mutation(api.products.createProduct, {
        ...input,
        sku: "BAD",
        initialQuantity: 0.001,
      }),
    ).rejects.toThrow("Starting stock");
    expect(await owner.query(api.products.listProducts, {})).toHaveLength(1);
  });

  it("enforces owner scope, role denial, unauthenticated denial and duplicate SKU protection", async () => {
    const { t, owner } = await setup();
    const other = t.withIdentity({
      subject: "other",
      email: "other@example.test",
    });
    await other.mutation(api.onboarding.createBusinessOnboarding, {
      businessName: "Second store",
    });
    await owner.mutation(api.products.createProduct, input);
    expect(await other.query(api.products.listProducts, {})).toEqual([]);
    await expect(
      owner.mutation(api.products.createProduct, input),
    ).rejects.toThrow("ALREADY_EXISTS");
    await expect(t.mutation(api.products.createProduct, input)).rejects.toThrow(
      "UNAUTHENTICATED",
    );
    await t.run(async (ctx) => {
      const user = await ctx.db
        .query("users")
        .withIndex("by_clerkUserId", (q) => q.eq("clerkUserId", "other"))
        .unique();
      await ctx.db.patch(user!._id, { role: "MEMBER" });
    });
    await expect(
      other.mutation(api.products.createProduct, input),
    ).rejects.toThrow("FORBIDDEN");
  });

  it("never silently filters malformed preset text", () => {
    expect(
      newProductCommerceSchema.safeParse({
        ...creationCommerceDefaults("g", true),
        suggestedQuantities: parsePresetInput("0.5, nope"),
      }).success,
    ).toBe(false);
    expect(
      newProductCommerceSchema.safeParse({
        ...creationCommerceDefaults("g", true),
        suggestedQuantities: parsePresetInput("0.5,"),
      }).success,
    ).toBe(false);
  });
});
