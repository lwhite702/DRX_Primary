import { expect, it } from "vitest";
import { convexTest } from "convex-test";
import { makeFunctionReference } from "convex/server";
import schema from "../../convex/schema";
import { api } from "../../convex/_generated/api";
import * as settings from "../../convex/creditRecommendationSettings";
import * as onboarding from "../../convex/onboarding";
import * as generated from "../../convex/_generated/api";
type Scope = { businessId: string; expectedUserId: string };
type Config = { enabled: boolean; maxCustomerCents: number; inventoryCapBps: number; newCustomerCents: number; autoRefreshDays: number };
type Receipt = Config & { businessId: string; revision: number };
const read = makeFunctionReference<"query", Scope, Receipt | null>("creditRecommendationSettings:read");
const save = makeFunctionReference<"mutation", Scope & Config & { expectedRevision: number | null; requestKey: string }, Receipt>("creditRecommendationSettings:save");
const config = { enabled: false, maxCustomerCents: 100000, inventoryCapBps: 5000, newCustomerCents: 10000, autoRefreshDays: 7 };
async function setup() {
  const t = convexTest(schema, { "creditRecommendationSettings.ts": async () => settings, "onboarding.ts": async () => onboarding, "_generated/api.js": async () => generated });
  const owner = t.withIdentity({ subject: "owner" });
  const { businessId } = await owner.mutation(api.onboarding.createBusinessOnboarding, { businessName: "Synthetic" });
  const scope = { businessId, expectedUserId: "owner" };
  return { t, owner, businessId, scope, args: { ...scope, ...config, expectedRevision: null, requestKey: "settings-first" } };
}
it("returns no defaults for missing settings and preserves explicit zero settings", async () => {
  const { owner, businessId, scope, args } = await setup();
  expect(await owner.query(read, scope)).toBeNull();
  const result = await owner.mutation(save, { ...args, maxCustomerCents: 0, inventoryCapBps: 0, newCustomerCents: 0 });
  expect(result).toEqual({ ...config, businessId, revision: 1, maxCustomerCents: 0, inventoryCapBps: 0, newCustomerCents: 0 });
  expect(await owner.query(read, scope)).toEqual(result);
});
it("requires an exact revision for create/update and returns immutable original retries", async () => {
  const { t, owner, scope, args } = await setup();
  await expect(owner.mutation(save, { ...args, expectedRevision: 1 })).rejects.toThrow(/STALE_SETTINGS/);
  const original = await owner.mutation(save, args);
  const latest = await owner.mutation(save, { ...args, enabled: true, maxCustomerCents: 200000, expectedRevision: 1, requestKey: "settings-second" });
  expect(latest.revision).toBe(2);
  expect(await owner.mutation(save, args)).toEqual(original);
  expect(await owner.query(read, scope)).toEqual(latest);
  await expect(owner.mutation(save, { ...args, requestKey: "settings-stale" })).rejects.toThrow(/STALE_SETTINGS/);
  await expect(owner.mutation(save, { ...args, enabled: true })).rejects.toThrow(/IDEMPOTENCY_CONFLICT/);
  await expect(owner.mutation(save, { ...args, expectedRevision: 2 })).rejects.toThrow(/IDEMPOTENCY_CONFLICT/);
  expect(await t.run(ctx => ctx.db.query("idempotencyKeys").collect())).toHaveLength(2);
  const audits = (await t.run(ctx => ctx.db.query("auditEvents").collect())).filter(row => row.action === "CREDIT_RECOMMENDATION_SETTINGS_CHANGED");
  expect(audits).toHaveLength(2); expect(JSON.parse(audits[0].metadata!)).toEqual({ previousRevision: null, revision: 1, ...config });
  expect(await t.run(ctx => ctx.db.query("creditEntries").collect())).toHaveLength(0);
  expect(await t.run(ctx => ctx.db.query("creditAccounts").collect())).toHaveLength(0);
});
it.each([{ maxCustomerCents: -1 }, { maxCustomerCents: 1.5 }, { newCustomerCents: Infinity }, { newCustomerCents: NaN }, { inventoryCapBps: -1 }, { inventoryCapBps: 10001 }, { inventoryCapBps: 0.5 }, { autoRefreshDays: 0 }, { autoRefreshDays: 1.5 }, { autoRefreshDays: Math.floor(Number.MAX_SAFE_INTEGER / 86400000) + 1 }, { expectedRevision: 0 }, { expectedRevision: 1.5 }, { requestKey: "short" }])("rejects invalid configuration %j without writing", async patch => {
  const { t, owner, args } = await setup();
  await expect(owner.mutation(save, { ...args, ...patch })).rejects.toThrow(/INVALID_ARGUMENT/);
  expect(await t.run(ctx => ctx.db.query("creditRecommendationSettings").collect())).toHaveLength(0);
});
it("accepts the inclusive bps cap and largest safe refresh interval", async () => {
  const { owner, args } = await setup();
  const days = Math.floor(Number.MAX_SAFE_INTEGER / 86400000);
  expect(await owner.mutation(save, { ...args, inventoryCapBps: 10000, autoRefreshDays: days })).toMatchObject({ inventoryCapBps: 10000, autoRefreshDays: days });
});
it("enforces tenant, operator and commerce-settings permission", async () => {
  const { t, owner, businessId, scope, args } = await setup();
  await expect(t.query(read, scope)).rejects.toThrow(/UNAUTHENTICATED/);
  await expect(owner.mutation(save, { ...args, expectedUserId: "other" })).rejects.toThrow(/FORBIDDEN/);
  const foreign = t.withIdentity({ subject: "foreign" });
  const other = await foreign.mutation(api.onboarding.createBusinessOnboarding, { businessName: "Other" });
  await expect(owner.query(read, { ...scope, businessId: other.businessId })).rejects.toThrow(/FORBIDDEN/);
  await expect(owner.mutation(save, { ...args, businessId: other.businessId })).rejects.toThrow(/FORBIDDEN/);
  await t.run(ctx => ctx.db.insert("users", { businessId, clerkUserId: "staff", email: "synthetic@example.invalid", role: "MEMBER", status: "ACTIVE", createdAt: 1, updatedAt: 1 }));
  const staff = t.withIdentity({ subject: "staff" });
  await expect(staff.query(read, { ...scope, expectedUserId: "staff" })).rejects.toThrow(/FORBIDDEN/);
  await expect(staff.mutation(save, { ...args, expectedUserId: "staff" })).rejects.toThrow(/FORBIDDEN/);
});
it("scopes retry keys to each authorized actor and canonical business identity", async () => {
  const { t, owner, businessId, scope, args } = await setup();
  await owner.mutation(save, args);
  await t.run(async ctx => {
    await ctx.db.patch(businessId, { legacyPrismaBusinessId: "mapped-business" });
    await ctx.db.insert("users", { businessId, clerkUserId: "admin", email: "synthetic@example.invalid", role: "ADMIN", status: "ACTIVE", createdAt: 1, updatedAt: 1 });
  });
  expect((await owner.query(read, { ...scope, businessId: "mapped-business" }))?.revision).toBe(1);
  expect((await t.withIdentity({ subject: "admin" }).mutation(save, { ...args, businessId: "mapped-business", expectedUserId: "admin", expectedRevision: 1 })).revision).toBe(2);
  expect(await t.run(ctx => ctx.db.query("idempotencyKeys").collect())).toHaveLength(2);
});
it("rejects a corrupted immutable receipt and action collision", async () => {
  const { t, owner, args } = await setup();
  await owner.mutation(save, args);
  const saved = await t.run(ctx => ctx.db.query("idempotencyKeys").unique());
  await t.run(ctx => ctx.db.patch(saved!._id, { resultJson: JSON.stringify({ fingerprint: JSON.parse(saved!.resultJson).fingerprint, result: { ...JSON.parse(saved!.resultJson).result, maxCustomerCents: -1 } }) }));
  await expect(owner.mutation(save, args)).rejects.toThrow(/INVALID_STATE/);
  await t.run(ctx => ctx.db.patch(saved!._id, { action: "another_action" }));
  await expect(owner.mutation(save, args)).rejects.toThrow(/IDEMPOTENCY_CONFLICT/);
});
it("rejects invalid stored settings rather than substituting defaults", async () => {
  const { t, owner, scope, args } = await setup();
  await owner.mutation(save, args);
  const saved = await t.run(ctx => ctx.db.query("creditRecommendationSettings").unique());
  await t.run(ctx => ctx.db.patch(saved!._id, { inventoryCapBps: 20000 }));
  await expect(owner.query(read, scope)).rejects.toThrow(/INVALID_STATE/);
});
