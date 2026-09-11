import { describe, expect, it } from "vitest";
import { convexTest } from "convex-test";
import schema from "../../convex/schema";
import { api } from "../../convex/_generated/api";
import * as onboarding from "../../convex/onboarding";
import * as products from "../../convex/products";
import * as session from "../../convex/session";
import * as commerceIdentity from "../../convex/commerceIdentity";
import * as generatedApi from "../../convex/_generated/api";
const modules = { "_generated/api.js": async () => generatedApi, "onboarding.ts": async () => onboarding,
  "products.ts": async () => products, "session.ts": async () => session, "commerceIdentity.ts": async () => commerceIdentity };
it("resolves canonical and migrated IDs inside the authenticated tenant without legacy storage", async () => {
  const t = convexTest(schema, modules);
  const owner = t.withIdentity({ subject: "commerce-owner", email: "owner@example.invalid" });
  const { businessId } = await owner.mutation(api.onboarding.createBusinessOnboarding, { name: "Owner", businessName: "Synthetic commerce", taxRateBps: 0 });
  const productId = await owner.mutation(api.products.createProduct, { sku: "SKU", productName: "Synthetic", sellingPriceCents: 200, unitCostCents: 100 });
  await t.run(async ctx => { await ctx.db.patch(businessId, { legacyPrismaBusinessId: "old-business" }); await ctx.db.patch(productId, { legacyPrismaId: "old-product" }); });
  expect(await owner.query(api.session.currentBusiness, { selectedBusinessId: "old-business" })).toMatchObject({ businessId, userId: "commerce-owner" });
  expect(await owner.query(api.commerceIdentity.resolveCart, { businessId, productIds: [productId, "old-product"] })).toMatchObject({ productIds: [productId, productId] });
  await expect(owner.query(api.session.currentBusiness, { selectedBusinessId: "unrelated" })).rejects.toThrow(/FORBIDDEN/);
  await expect(t.query(api.session.currentBusiness, {})).rejects.toThrow(/UNAUTHENTICATED/);
  const other = t.withIdentity({ subject: "other-owner", email: "other@example.invalid" });
  const otherBusiness = await other.mutation(api.onboarding.createBusinessOnboarding, { name: "Other", businessName: "Other", taxRateBps: 0 });
  await expect(other.query(api.commerceIdentity.resolveCart, { businessId: otherBusiness.businessId, productIds: [productId] })).rejects.toThrow(/NOT_FOUND/);
  await expect(other.query(api.commerceIdentity.resolveCart, { businessId: otherBusiness.businessId, productIds: ["old-product"] })).rejects.toThrow(/NOT_FOUND/);
});

it("retains migrated manager permissions and denies suspended businesses", async () => {
  const t = convexTest(schema, modules);
  const owner = t.withIdentity({ subject: "manager", email: "manager@example.invalid" });
  const { businessId } = await owner.mutation(api.onboarding.createBusinessOnboarding, { name: "Manager", businessName: "Synthetic manager", taxRateBps: 0 });
  await t.run(async ctx => {
    const user = await ctx.db.query("users").first();
    await ctx.db.patch(user!._id, { role: "manager" });
  });
  await expect(owner.mutation(api.products.createProduct, { sku: "MANAGER", productName: "Synthetic", sellingPriceCents: 100, unitCostCents: 10 })).resolves.toBeTruthy();
  await t.run(ctx => ctx.db.patch(businessId, { isActive: false }));
  await expect(owner.query(api.session.currentBusiness, {})).rejects.toThrow(/FORBIDDEN/);
});

it("keeps tenant permission grants separate from platform authority and supplied actor IDs", async () => {
  const t = convexTest(schema, modules);
  const owner = t.withIdentity({ subject: "permission-owner", email: "owner@example.invalid" });
  const { businessId } = await owner.mutation(api.onboarding.createBusinessOnboarding, { name: "Owner", businessName: "Synthetic policy", taxRateBps: 0 });
  await t.run(async ctx => { const user = await ctx.db.query("users").first(); await ctx.db.patch(user!._id, { permissions: { "users.manage_all": true } }); });
  expect((await owner.query(api.session.permission, { businessId, permission: "settings.configure_pos" })).allowed).toBe(true);
  expect((await owner.query(api.session.permission, { businessId, permission: "users.manage_all" })).allowed).toBe(false);
  expect((await owner.query(api.session.permission, { businessId, userId: "another-actor", permission: "inventory.manage" })).allowed).toBe(false);
  expect((await owner.query(api.session.permission, { businessId: "other-business", permission: "inventory.manage" })).allowed).toBe(false);
});
