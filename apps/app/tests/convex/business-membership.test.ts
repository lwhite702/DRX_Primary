import { expect, it } from "vitest";
import { convexTest } from "convex-test";
import schema from "../../convex/schema";
import { api } from "../../convex/_generated/api";
import * as session from "../../convex/session";
import * as onboarding from "../../convex/onboarding";
import * as commerceSettings from "../../convex/commerceSettings";
import * as generatedApi from "../../convex/_generated/api";
import { getDefaultCommerceSettings } from "../../lib/commerce/config";
const modules = {
  "_generated/api.js": async () => generatedApi,
  "session.ts": async () => session,
  "onboarding.ts": async () => onboarding,
  "commerceSettings.ts": async () => commerceSettings,
};
async function setup() {
  const t = convexTest(schema, modules);
  const owner = t.withIdentity({ subject: "operator", email: "operator@example.invalid" });
  const first = await owner.mutation(api.onboarding.createBusinessOnboarding, { businessName: "First" });
  await t.run(ctx => ctx.db.patch(first.businessId, { clerkOrgId: "org-first", address: "Synthetic address", city: "Test City", state: "NY", zipCode: "00000", phoneNumber: "0000000000", email: "store@example.invalid", legacyPrismaBusinessId: "legacy-first" }));
  const secondOwner = t.withIdentity({ subject: "second-owner", email: "second@example.invalid", o: { id: "org-second", rol: "admin" } });
  const second = await secondOwner.mutation(api.onboarding.createBusinessOnboarding, { businessName: "Second", clerkOrgId: "org-second" });
  const membershipId = await t.run(ctx => ctx.db.insert("users", { clerkUserId: "operator", email: "operator@example.invalid", role: "MEMBER", businessId: second.businessId, status: "ACTIVE", createdAt: 1, updatedAt: 1 }));
  return { t, owner, first, second, membershipId };
}
it("selects the exact membership and grants for both signed organization claim formats", async () => {
  const { t, owner, first, second } = await setup();
  expect(await owner.query(api.session.currentBusiness, {})).toMatchObject({ businessId: first.businessId, role: "OWNER" });
  for (const claims of [{ org_id: "org-second" }, { o: { id: "org-second", rol: "admin" } }]) {
    const selected = t.withIdentity({ subject: "operator", ...claims });
    expect(await selected.query(api.session.currentBusiness, {})).toMatchObject({ businessId: second.businessId, role: "MEMBER" });
    expect(await selected.query(api.session.permission, { permission: "settings.configure_pos" })).toMatchObject({ allowed: false });
    await expect(selected.query(api.session.currentBusiness, { selectedBusinessId: first.businessId })).rejects.toThrow(/FORBIDDEN/);
    await expect(selected.query(api.commerceSettings.getSettings, { businessId: second.businessId })).rejects.toThrow(/FORBIDDEN/);
  }
  expect(await owner.query(api.session.currentBusiness, { selectedBusinessId: "legacy-first" })).toMatchObject({ businessId: first.businessId });
  expect(await t.withIdentity({ subject: "operator", org_id: null, o: null }).query(api.session.currentBusiness, {})).toMatchObject({ businessId: first.businessId });
});
it("preserves profile fields and rejects stale organization/operator context", async () => {
  const { t, first } = await setup();
  const selected = t.withIdentity({ subject: "operator", o: { id: "org-first" } });
  expect(await selected.query(api.session.currentBusinessProfile, { expectedOrganizationId: "org-first", expectedUserId: "operator" })).toMatchObject({ id: first.businessId, businessName: "First", address: "Synthetic address", city: "Test City", state: "NY", zipCode: "00000", phoneNumber: "0000000000", email: "store@example.invalid", clerkOrgId: "org-first", createdAt: expect.any(Number) });
  await expect(selected.query(api.session.currentBusinessProfile, { expectedOrganizationId: "org-second" })).rejects.toThrow(/FORBIDDEN/);
  await expect(selected.query(api.session.currentBusinessProfile, { expectedUserId: "another-operator" })).rejects.toThrow(/FORBIDDEN/);
  await expect(t.withIdentity({ subject: "operator", org_id: "org-first", o: { id: "org-second" } }).query(api.session.currentBusiness, {})).rejects.toThrow(/FORBIDDEN/);
});
it("never falls back from an unavailable or suspended organization membership", async () => {
  const { t, first, second, membershipId } = await setup();
  const selected = t.withIdentity({ subject: "operator", org_id: "org-second" });
  await t.run(ctx => ctx.db.patch(membershipId, { status: "SUSPENDED" }));
  await expect(selected.query(api.session.currentBusinessProfile, {})).rejects.toThrow(/FORBIDDEN/);
  await t.run(ctx => ctx.db.delete(membershipId));
  await expect(selected.query(api.session.currentBusiness, {})).rejects.toThrow(/FORBIDDEN/);
  await expect(selected.mutation(api.onboarding.createBusinessOnboarding, { businessName: "No takeover" })).rejects.toThrow(/FORBIDDEN/);
  const foreign = t.withIdentity({ subject: "outsider", org_id: "org-first" });
  await expect(foreign.query(api.session.currentBusinessProfile, {})).rejects.toThrow(/FORBIDDEN/);
  expect(await t.run(ctx => ctx.db.get(second.businessId))).toMatchObject({ ownerId: "second-owner" });
  await t.run(ctx => ctx.db.patch(first.businessId, { isActive: false }));
  await expect(t.withIdentity({ subject: "operator" }).query(api.session.currentBusinessProfile, {})).rejects.toThrow(/FORBIDDEN/);
});
it("requires an explicit default when multiple historical memberships are ambiguous", async () => {
  const { t, owner, first, membershipId } = await setup();
  await t.run(ctx => ctx.db.patch(first.userId, { isDefaultMembership: undefined }));
  await expect(owner.query(api.session.currentBusiness, {})).rejects.toThrow(/Select a business/);
  await t.run(ctx => ctx.db.delete(membershipId));
  expect(await owner.query(api.session.currentBusiness, {})).toMatchObject({ businessId: first.businessId });
});
it("does not bind arbitrary organizations or grant an organization member ownership", async () => {
  const t = convexTest(schema, modules);
  const unsigned = t.withIdentity({ subject: "new" });
  await expect(unsigned.mutation(api.onboarding.createBusinessOnboarding, { businessName: "Denied", clerkOrgId: "org-foreign" })).rejects.toThrow(/FORBIDDEN/);
  await expect(t.withIdentity({ subject: "new", o: { id: "org-new", rol: "member" } }).mutation(api.onboarding.createBusinessOnboarding, { businessName: "Denied" })).rejects.toThrow(/FORBIDDEN/);
  expect(await t.run(ctx => ctx.db.query("businesses").collect())).toEqual([]);
  expect(await unsigned.query(api.session.currentBusinessProfile, {})).toBeNull();
  await expect(t.query(api.session.currentBusinessProfile, {})).rejects.toThrow(/UNAUTHENTICATED/);
});
it("adds an authorized organization without changing the original native default and replays safely", async () => {
  const t = convexTest(schema, modules);
  const native = t.withIdentity({ subject: "operator" });
  const original = await native.mutation(api.onboarding.createBusinessOnboarding, { businessName: "Original" });
  await t.run(ctx => ctx.db.patch(original.userId, { isDefaultMembership: undefined }));
  const org = t.withIdentity({ subject: "operator", o: { id: "org-new", rol: "admin" } });
  const created = await org.mutation(api.onboarding.createBusinessOnboarding, { businessName: "New", clerkOrgId: "org-new" });
  expect(await org.mutation(api.onboarding.createBusinessOnboarding, { businessName: "New", clerkOrgId: "org-new" })).toMatchObject({ status: "ALREADY_ONBOARDED", businessId: created.businessId });
  expect(await native.query(api.session.currentBusiness, {})).toMatchObject({ businessId: original.businessId });
  expect(await org.query(api.onboarding.getCurrentOnboardingStatus, {})).toMatchObject({ status: "READY", session: { businessId: created.businessId } });
  await t.run(ctx => ctx.db.patch(created.businessId, { isActive: false }));
  expect(await org.query(api.onboarding.getCurrentOnboardingStatus, {})).toEqual({ status: "INACTIVE" });
  await expect(org.mutation(api.onboarding.createBusinessOnboarding, { businessName: "New" })).rejects.toThrow(/FORBIDDEN/);
});
it("resolves a repeated manager email only within the selected tenant", async () => {
  const { t, owner, first } = await setup();
  const merchant = { ...getDefaultCommerceSettings().merchant, managerNotificationTargets: ["operator@example.invalid"] };
  await owner.mutation(api.commerceSettings.saveSettings, { businessId: first.businessId, patchJson: JSON.stringify({ merchant }) });
  const saved = await t.run(ctx => ctx.db.query("businessSettings").withIndex("by_businessId", q => q.eq("businessId", first.businessId)).unique());
  expect(saved?.deliveryManagerNotificationUserIds).toEqual(["operator"]);
});
