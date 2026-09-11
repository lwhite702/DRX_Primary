import { expect, it } from "vitest";
import { convexTest } from "convex-test";
import schema from "../../convex/schema";
import { api } from "../../convex/_generated/api";
import * as onboarding from "../../convex/onboarding";
import * as commerceSettings from "../../convex/commerceSettings";
import * as generatedApi from "../../convex/_generated/api";
import { getDefaultCommerceSettings } from "../../lib/commerce/config";
import { creationCommerceDefaults } from "../../lib/commerce/product-creation";
const modules = { "_generated/api.js": async () => generatedApi, "onboarding.ts": async () => onboarding, "commerceSettings.ts": async () => commerceSettings };
async function setup(role = "OWNER", permissions?: Record<string, boolean>) {
  const t = convexTest(schema, modules);
  const owner = t.withIdentity({ subject: "settings-owner", email: "settings@example.invalid" });
  const { businessId } = await owner.mutation(api.onboarding.createBusinessOnboarding, { name: "Owner", businessName: "Synthetic settings", taxRateBps: 0 });
  await t.run(async ctx => { const user = await ctx.db.query("users").first(); await ctx.db.patch(user!._id, { role, permissions }); });
  const merchant = { ...getDefaultCommerceSettings().merchant, dispatchSlaMinutes: 8 };
  return { t, owner, businessId, merchant };
}
it.each(["OWNER", "ADMIN", "owner", "admin", "manager"])("preserves %s settings authority in Convex", async role => {
  const { owner, businessId, merchant } = await setup(role);
  await owner.mutation(api.commerceSettings.saveSettings, { businessId, patchJson: JSON.stringify({ merchant }) });
  expect(JSON.parse((await owner.query(api.commerceSettings.getSettings, { businessId })).merchantJson)).toMatchObject(merchant);
});
it.each(["MEMBER", "cashier", "staff", "supervisor"])("denies %s settings reads and writes", async role => {
  const { owner, businessId, merchant } = await setup(role);
  await expect(owner.query(api.commerceSettings.getSettings, { businessId })).rejects.toThrow(/FORBIDDEN/);
  await expect(owner.mutation(api.commerceSettings.saveSettings, { businessId, patchJson: JSON.stringify({ merchant }) })).rejects.toThrow(/FORBIDDEN/);
});
it("honors an explicit grant only in the active tenant and denies inactive businesses", async () => {
  const { t, owner, businessId } = await setup("staff", { "settings.configure_pos": true });
  await expect(owner.query(api.commerceSettings.getSettings, { businessId })).resolves.toBeTruthy();
  await expect(owner.query(api.commerceSettings.getSettings, { businessId: "foreign" })).rejects.toThrow(/FORBIDDEN/);
  await t.run(ctx => ctx.db.patch(businessId, { isActive: false }));
  await expect(owner.query(api.commerceSettings.getSettings, { businessId })).rejects.toThrow(/FORBIDDEN/);
});
it("rolls back merchant changes if a product in the same save is invalid", async () => {
  const { t, owner, businessId, merchant } = await setup();
  await expect(owner.mutation(api.commerceSettings.saveSettings, { businessId, patchJson: JSON.stringify({ merchant, product: {
    inventoryId: "missing", baseUnitPrice: 10, config: creationCommerceDefaults("g", true),
  } }) })).rejects.toThrow(/NOT_FOUND/);
  expect(await t.run(ctx => ctx.db.query("businessSettings").first())).toBeNull();
  const audits = await t.run(ctx => ctx.db.query("auditEvents").collect());
  expect(audits.filter(event => event.action === "COMMERCE_SETTINGS_UPDATED")).toHaveLength(0);
});
it("rejects unrelated notification recipients and fractional basis points", async () => {
  const { owner, businessId, merchant } = await setup();
  await expect(owner.mutation(api.commerceSettings.saveSettings, { businessId, patchJson: JSON.stringify({ merchant: { ...merchant, managerNotificationTargets: ["foreign"] } }) })).rejects.toThrow(/INVALID_ARGUMENT/);
  await expect(owner.mutation(api.commerceSettings.saveSettings, { businessId, patchJson: JSON.stringify({ merchant: { ...merchant, loyaltyTiers: [{ id: "tier", label: "Tier", minimumSpendCents: 0, discountRate: 0.12345 }] } }) })).rejects.toThrow(/INVALID_ARGUMENT/);
});
