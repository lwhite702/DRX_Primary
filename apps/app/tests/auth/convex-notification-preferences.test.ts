import { expect, it } from "vitest";
import { convexTest } from "convex-test";
import schema from "../../convex/schema";
import { api, internal } from "../../convex/_generated/api";
import * as notificationPreferences from "../../convex/notificationPreferences";
import * as onboarding from "../../convex/onboarding";
import * as generatedApi from "../../convex/_generated/api";
const create = () => convexTest(schema, { "notificationPreferences.ts": async () => notificationPreferences, "onboarding.ts": async () => onboarding, "_generated/api.js": async () => generatedApi });
it("stores only the authenticated user's preferences with revision conflict protection", async () => {
  const t = create(), user = t.withIdentity({ subject: "operator" });
  const args = { expectedUserId: "operator", preferencesJson: '{"email":false}' };
  expect(await user.mutation(internal.notificationPreferences.save, args)).toMatchObject({ revision: 1 });
  expect(await user.mutation(internal.notificationPreferences.save, args)).toMatchObject({ revision: 1 });
  await expect(user.mutation(internal.notificationPreferences.save, { ...args, expectedRevision: 0, preferencesJson: '{"email":true}' })).rejects.toThrow(/CONFLICT/);
  expect(await user.query(api.notificationPreferences.get, { expectedUserId: "operator", targetUserId: "operator" })).toEqual({ userId: "operator", preferencesJson: args.preferencesJson, revision: 1 });
  await expect(user.mutation(internal.notificationPreferences.save, { ...args, expectedUserId: "foreign" })).rejects.toThrow(/FORBIDDEN/);
});
it.each(['[]', '{"value":1e400}', 'null', '{"value":"' + 'a'.repeat(16384) + '"}'])("rejects malformed or oversized preference JSON without saving", async preferencesJson => {
  const t = create(), user = t.withIdentity({ subject: "operator" });
  await expect(user.mutation(internal.notificationPreferences.save, { expectedUserId: "operator", preferencesJson })).rejects.toThrow(/INVALID_ARGUMENT/);
  expect(await t.run(ctx => ctx.db.query("notificationPreferences").collect())).toHaveLength(0);
});
it("allows a business owner to read an active recipient but rejects outside-business targets", async () => {
  const t = create(), owner = t.withIdentity({ subject: "owner" });
  const { businessId } = await owner.mutation(api.onboarding.createBusinessOnboarding, { businessName: "Synthetic" });
  await t.run(ctx => ctx.db.insert("users", { businessId, clerkUserId: "recipient", email: "recipient@example.invalid", role: "MEMBER", status: "ACTIVE", createdAt: 1, updatedAt: 1 }));
  await t.withIdentity({ subject: "recipient" }).mutation(internal.notificationPreferences.save, { expectedUserId: "recipient", preferencesJson: '{}' });
  expect(await owner.query(api.notificationPreferences.get, { expectedUserId: "owner", targetUserId: "recipient" })).toMatchObject({ userId: "recipient" });
  const foreign = t.withIdentity({ subject: "foreign" });
  await foreign.mutation(api.onboarding.createBusinessOnboarding, { businessName: "Other synthetic business" });
  await foreign.mutation(internal.notificationPreferences.save, { expectedUserId: "foreign", preferencesJson: '{"email":true}' });
  await expect(owner.query(api.notificationPreferences.get, { expectedUserId: "owner", targetUserId: "foreign" })).rejects.toThrow(/FORBIDDEN/);
  await t.run(async ctx => {
    const recipient = await ctx.db.query("users").withIndex("by_clerkUserId_and_businessId", q => q.eq("clerkUserId", "recipient").eq("businessId", businessId)).unique();
    if (!recipient) throw new Error("Missing fixture recipient");
    await ctx.db.patch(recipient._id, { status: "SUSPENDED" });
  });
  await expect(owner.query(api.notificationPreferences.get, { expectedUserId: "owner", targetUserId: "recipient" })).rejects.toThrow(/FORBIDDEN/);
});
it("requires a separate active platform grant, and observes revocation immediately", async () => {
  const t = create(), admin = t.withIdentity({ subject: "platform" });
  const id = await t.run(ctx => ctx.db.insert("platformAdminGrants", { userId: "platform", role: "super_admin", isActive: true, createdAt: 1, updatedAt: 1 }));
  expect(await admin.query(api.notificationPreferences.get, { expectedUserId: "platform", targetUserId: "recipient" })).toBeNull();
  await t.run(ctx => ctx.db.patch(id, { isActive: false }));
  await expect(admin.query(api.notificationPreferences.get, { expectedUserId: "platform", targetUserId: "recipient" })).rejects.toThrow();
});
