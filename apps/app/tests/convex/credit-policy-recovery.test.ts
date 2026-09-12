import { afterEach, expect, it, vi } from "vitest";
import { convexTest } from "convex-test";
import { makeFunctionReference } from "convex/server";
import schema from "../../convex/schema";
import { api, internal } from "../../convex/_generated/api";
import * as policy from "../../convex/creditPolicy";
import * as recommendations from "../../convex/creditRecommendations";
import * as inputs from "../../convex/creditRecommendationInputs";
import * as onboarding from "../../convex/onboarding";
import * as generated from "../../convex/_generated/api";
type Kind = "policy" | "recommendation";
const reference = (name: string) => makeFunctionReference<"mutation", Record<string, unknown>, unknown>(name);
afterEach(() => { vi.restoreAllMocks(); });
async function setup(kind: Kind) {
  vi.spyOn(Date, "now").mockReturnValue(Date.UTC(2026, 8, 6, 12));
  const t = convexTest(schema, { "creditPolicy.ts": async () => policy, "creditRecommendations.ts": async () => recommendations, "creditRecommendationInputs.ts": async () => inputs, "onboarding.ts": async () => onboarding, "_generated/api.js": async () => generated });
  const owner = t.withIdentity({ subject: "owner" });
  const { businessId } = await owner.mutation(api.onboarding.createBusinessOnboarding, { businessName: "Synthetic" });
  const customerFields = { businessId, firstName: "Private name", email: "private@example.invalid", totalPurchasesCents: 0, totalCreditUsedCents: 0, creditLimitCents: 1000, purchaseCount: 0, loyaltyTier: "standard", discountRateBps: 0, isActive: true, createdAt: 1, updatedAt: 1 };
  const customerId = await t.run(ctx => ctx.db.insert("customers", customerFields));
  await t.run(ctx => ctx.db.insert("creditAllocationState", { businessId, customerId, status: "ready", cursor: null, outstandingCents: 0, updatedAt: 1 }));
  await t.run(ctx => ctx.db.insert("creditRecommendationSettings", { businessId, enabled: true, revision: 1, maxCustomerCents: 5000, inventoryCapBps: 10000, newCustomerCents: 500, autoRefreshDays: 7, createdAt: 1, updatedAt: 1, updatedBy: "owner" }));
  await t.run(ctx => ctx.db.insert("products", { businessId, sku: "synthetic", productName: "Synthetic", unitCostCents: 100, sellingPriceCents: 200, quantityOnHandGrams: 100, reorderLevelGrams: 2, allowFractionalWeight: true, isActive: true, createdAt: 1, updatedAt: 1 }));
  const scope = { businessId, expectedUserId: "owner" };
  const snapshot = await owner.query(api.creditRecommendationInputs.read, { ...scope, customerId, asOfDate: Math.floor(Date.now() / 86400000) * 86400000 });
  const saved = await owner.mutation(internal.creditRecommendations.recordGenerated, { ...scope, customerId, requestKey: "generation-request", inputs: snapshot, settingsRevision: 1, recommendedLimitCents: 500, rangeMinCents: 400, rangeMaxCents: 600, riskScore: 0, justification: "Synthetic aggregate recommendation", provenance: "rules", engineVersion: "canonical_v1" });
  const another = await owner.mutation(internal.creditRecommendations.recordGenerated, { ...scope, customerId, requestKey: "another-generation", inputs: snapshot, settingsRevision: 1, recommendedLimitCents: 500, rangeMinCents: 400, rangeMaxCents: 600, riskScore: 0, justification: "Synthetic aggregate recommendation", provenance: "rules", engineVersion: "canonical_v1" });
  const args = kind === "policy" ? { ...scope, customerId, creditEnabled: false, limitCents: 750, expectedCreditEnabled: true, expectedLimitCents: 1000, requestKey: "policy-request" } : { ...scope, recommendationId: saved.recommendationId, requestKey: "apply-request" };
  const changed = kind === "policy" ? { ...args, limitCents: 751 } : { ...args, recommendationId: another.recommendationId };
  const executeRef = reference(kind === "policy" ? "creditPolicy:change" : "creditRecommendations:apply");
  const cancelRef = reference(kind === "policy" ? "creditPolicy:cancel" : "creditRecommendations:cancelApply");
  const execute = () => owner.mutation(executeRef, args), cancel = () => owner.mutation(cancelRef, args);
  const customer = () => t.run(ctx => ctx.db.get(customerId));
  return { t, owner, businessId, customerId, args, changed, executeRef, cancelRef, execute, cancel, customer };
}
it.each(["policy", "recommendation"] as const)("%s cancellation preserves a recorded operation and its lost-response receipt after archive", async kind => {
  const { t, customerId, args, execute, cancel, customer } = await setup(kind);
  const result = await execute();
  await t.run(ctx => ctx.db.patch(customerId, { isActive: false, creditLimitCents: 900, creditPolicyRevision: 7 }));
  vi.mocked(Date.now).mockReturnValue(Date.now() + 86400000);
  const before = await customer();
  expect(await cancel()).toEqual({ status: "recorded", result, requestKey: args.requestKey });
  expect(await cancel()).toEqual({ status: "recorded", result, requestKey: args.requestKey });
  expect(await execute()).toEqual(result);
  expect(await customer()).toEqual(before);
  expect(await t.run(ctx => ctx.db.query("auditEvents").filter(q => q.eq(q.field("action"), "CUSTOMER_CREDIT_REQUEST_CANCELLED")).collect())).toHaveLength(0);
});
it.each(["policy", "recommendation"] as const)("%s cancellation is immutable, repeatable and blocks delayed execution before stale checks", async kind => {
  const { t, customerId, args, execute, cancel, customer } = await setup(kind);
  const original = await customer();
  const cancelled = await cancel();
  expect(cancelled).toMatchObject({ status: "cancelled", requestKey: args.requestKey, ...(kind === "policy" ? { customerId } : { recommendationId: "recommendationId" in args ? args.recommendationId : undefined }) });
  expect(await customer()).toEqual(original);
  await t.run(ctx => ctx.db.patch(customerId, { isActive: false, creditLimitCents: 900, creditPolicyRevision: 7 }));
  vi.mocked(Date.now).mockReturnValue(Date.now() + 86400000);
  const before = await customer();
  expect(await cancel()).toEqual(cancelled);
  await expect(execute()).rejects.toThrow(/REQUEST_CANCELLED/);
  expect(await customer()).toEqual(before);
  expect(await t.run(ctx => ctx.db.query("creditEntries").collect())).toHaveLength(0);
  expect(await t.run(ctx => ctx.db.query("idempotencyKeys").collect())).toHaveLength(1);
  const audits = await t.run(ctx => ctx.db.query("auditEvents").filter(q => q.eq(q.field("action"), "CUSTOMER_CREDIT_REQUEST_CANCELLED")).collect());
  expect(audits).toHaveLength(1); expect(audits[0].metadata).not.toMatch(/Private|private@example|justification|inputsJson/);
});
it.each(["policy", "recommendation"] as const)("%s unrecorded stale/archive attempts can still be cancelled", async kind => {
  const { t, customerId, execute, cancel } = await setup(kind);
  await t.run(ctx => ctx.db.patch(customerId, { isActive: false, creditPolicyRevision: 5 }));
  vi.mocked(Date.now).mockReturnValue(Date.now() + 86400000);
  expect(await cancel()).toMatchObject({ status: "cancelled" });
  await expect(execute()).rejects.toThrow(/REQUEST_CANCELLED/);
});
it.each(["policy", "recommendation"] as const)("%s rejects changed intent for both recorded and cancelled requests", async kind => {
  for (const completed of [false, true]) {
    const { owner, changed, executeRef, cancelRef, execute, cancel } = await setup(kind);
    if (completed) await execute(); else await cancel();
    await expect(owner.mutation(cancelRef, changed)).rejects.toThrow(/IDEMPOTENCY_CONFLICT/);
    await expect(owner.mutation(executeRef, changed)).rejects.toThrow(/IDEMPOTENCY_CONFLICT/);
  }
});
it.each(["policy", "recommendation"] as const)("%s scopes recovery to current operator and business", async kind => {
  const { t, owner, businessId, args, cancelRef, execute, cancel } = await setup(kind);
  await t.run(ctx => ctx.db.insert("users", { clerkUserId: "second", email: "second@example.invalid", role: "OWNER", status: "ACTIVE", businessId, isDefaultMembership: true, createdAt: 1, updatedAt: 1 }));
  const second = t.withIdentity({ subject: "second" });
  expect(await second.mutation(cancelRef, { ...args, expectedUserId: "second" })).toMatchObject({ status: "cancelled" });
  // Another operator's same key does not cancel this operator's attempt.
  const original = await execute();
  expect(await cancel()).toMatchObject({ status: "recorded", result: original });
  await expect(owner.mutation(cancelRef, { ...args, expectedUserId: "second" })).rejects.toThrow(/FORBIDDEN/);
  const foreign = t.withIdentity({ subject: "foreign" });
  const foreignBusiness = await foreign.mutation(api.onboarding.createBusinessOnboarding, { businessName: "Foreign synthetic" });
  await expect(foreign.mutation(cancelRef, { ...args, businessId: foreignBusiness.businessId, expectedUserId: "foreign" })).rejects.toThrow(/NOT_FOUND/);
  const member = await t.run(ctx => ctx.db.query("users").withIndex("by_clerkUserId", q => q.eq("clerkUserId", "owner")).unique());
  await t.run(ctx => ctx.db.patch(member!._id, { status: "SUSPENDED" }));
  await expect(cancel()).rejects.toThrow(/FORBIDDEN/);
});
it.each(["policy", "recommendation"] as const)("%s rejects malformed recorded and cancelled receipts without changing them", async kind => {
  for (const completed of [false, true]) {
    const { t, execute, cancel, customer } = await setup(kind);
    if (completed) await execute(); else await cancel();
    await t.run(async ctx => { const receipt = await ctx.db.query("idempotencyKeys").first(); const parsed = JSON.parse(receipt!.resultJson); if (completed) parsed.result.balanceCents = -1; else parsed.status = "unknown"; await ctx.db.patch(receipt!._id, { resultJson: JSON.stringify(parsed) }); });
    const before = await customer(), registry = await t.run(ctx => ctx.db.query("idempotencyKeys").collect());
    await expect(cancel()).rejects.toThrow(/INVALID_STATE/);
    await expect(execute()).rejects.toThrow(/INVALID_STATE/);
    expect(await customer()).toEqual(before); expect(await t.run(ctx => ctx.db.query("idempotencyKeys").collect())).toEqual(registry);
  }
});
it.each(["policy", "recommendation"] as const)("%s serializes execution against cancellation without a second policy write", async kind => {
  const { t, execute, cancel, customer } = await setup(kind);
  const [application, recovery] = await Promise.allSettled([execute(), cancel()]);
  expect(recovery.status).toBe("fulfilled");
  if (application.status === "fulfilled") {
    expect(recovery).toMatchObject({ value: { status: "recorded", result: application.value } });
    expect((await customer())?.creditPolicyRevision).toBe(1);
  } else {
    expect(String(application.reason)).toContain("REQUEST_CANCELLED");
    expect(recovery).toMatchObject({ value: { status: "cancelled" } });
    expect((await customer())?.creditPolicyRevision ?? 0).toBe(0);
  }
  expect(await t.run(ctx => ctx.db.query("idempotencyKeys").collect())).toHaveLength(1);
});
