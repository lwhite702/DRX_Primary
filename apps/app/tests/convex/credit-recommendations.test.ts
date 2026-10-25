import { afterEach, beforeEach, expect, it, vi } from "vitest";
import { convexTest } from "convex-test";
import { makeFunctionReference, type FunctionReference } from "convex/server";
import schema from "../../convex/schema";
import { api } from "../../convex/_generated/api";
import type { Id } from "../../convex/_generated/dataModel";
import * as recommendations from "../../convex/creditRecommendations";
import * as inputsModule from "../../convex/creditRecommendationInputs";
import type { CreditRecommendationInputs } from "../../convex/creditRecommendationInputs";
import * as onboarding from "../../convex/onboarding";
import * as generated from "../../convex/_generated/api";
type Scope = { businessId: string; expectedUserId: string };
type Saved = { recommendationId: Id<"creditRecommendations">; customerId: Id<"customers">; recommendedLimitCents: number; riskScore: number };
type RecordArgs = Scope & { customerId: string; requestKey: string; inputs: CreditRecommendationInputs; settingsRevision: number; recommendedLimitCents: number; rangeMinCents: number; rangeMaxCents: number; riskScore: number; justification: string; provenance: "rules" | "provider"; engineVersion: string };
const record = makeFunctionReference<"mutation", RecordArgs, Saved>("creditRecommendations:recordGenerated") as unknown as FunctionReference<"mutation", "internal", RecordArgs, Saved>;
const requestResult = makeFunctionReference<"query", Scope & { customerId: string; requestKey: string }, Saved | null>("creditRecommendations:requestResult") as unknown as FunctionReference<"query", "internal", Scope & { customerId: string; requestKey: string }, Saved | null>;
const readInputs = makeFunctionReference<"query", Scope & { customerId: string; asOfDate: number }, CreditRecommendationInputs>("creditRecommendationInputs:read");
const get = makeFunctionReference<"query", Scope & { recommendationId: Id<"creditRecommendations"> }, Saved>("creditRecommendations:get");
const latest = makeFunctionReference<"query", Scope & { customerId: string }, Saved | null>("creditRecommendations:latest");
const apply = makeFunctionReference<"mutation", Scope & { recommendationId: Id<"creditRecommendations">; requestKey: string }, { creditEnabled: boolean; limitCents: number; balanceCents: number; policyRevision: number; unlimited: boolean }>("creditRecommendations:apply");
const now = Date.UTC(2026, 8, 6, 12), asOfDate = Date.UTC(2026, 8, 6);
const customerFields = { firstName: "Private name", email: "private@example.invalid", totalPurchasesCents: 0, totalCreditUsedCents: 0, creditLimitCents: 1000, purchaseCount: 0, loyaltyTier: "standard", discountRateBps: 0, isActive: true, createdAt: 1, updatedAt: 1 };
beforeEach(() => { vi.spyOn(Date, "now").mockReturnValue(now); });
afterEach(() => { vi.restoreAllMocks(); });
async function setup() {
  const t = convexTest(schema, { "creditRecommendations.ts": async () => recommendations, "creditRecommendationInputs.ts": async () => inputsModule, "onboarding.ts": async () => onboarding, "_generated/api.js": async () => generated });
  const owner = t.withIdentity({ subject: "owner" });
  const { businessId } = await owner.mutation(api.onboarding.createBusinessOnboarding, { businessName: "Synthetic" });
  const customerId = await t.run(ctx => ctx.db.insert("customers", { ...customerFields, businessId }));
  await t.run(ctx => ctx.db.insert("creditAllocationState", { businessId, customerId, status: "ready", cursor: null, outstandingCents: 0, updatedAt: now }));
  const settingsId = await t.run(ctx => ctx.db.insert("creditRecommendationSettings", { businessId, enabled: true, revision: 1, maxCustomerCents: 5000, inventoryCapBps: 10000, newCustomerCents: 500, autoRefreshDays: 7, createdAt: 1, updatedAt: 1, updatedBy: "owner" }));
  const productId = await t.run(ctx => ctx.db.insert("products", { businessId, sku: "private", productName: "Private", unitCostCents: 100, sellingPriceCents: 200, quantityOnHandGrams: 100, reorderLevelGrams: 2, allowFractionalWeight: true, isActive: true, createdAt: 1, updatedAt: 1 }));
  const scope = { businessId, expectedUserId: "owner" };
  const inputs = await owner.query(readInputs, { ...scope, customerId, asOfDate });
  const args: RecordArgs = { ...scope, customerId, requestKey: "generation-one", inputs, settingsRevision: 1, recommendedLimitCents: 500, rangeMinCents: 400, rangeMaxCents: 600, riskScore: 0, justification: "Synthetic aggregate recommendation", provenance: "rules", engineVersion: "canonical_v1" };
  return { t, owner, scope, customerId, settingsId, productId, args };
}
it("records trusted outputs, exposes minimal reads, and applies without balance writes", async () => {
  const { t, owner, scope, customerId, args } = await setup();
  expect(await owner.query(latest, { ...scope, customerId })).toBeNull();
  const saved = await owner.mutation(record, args);
  expect(saved.riskScore).toBe(0);
  expect(await owner.query(get, { ...scope, recommendationId: saved.recommendationId })).toEqual(saved);
  expect(await owner.query(latest, { ...scope, customerId })).toEqual(saved);
  expect(JSON.stringify(saved)).not.toMatch(/Private|private@example|inputsJson|requestedBy/);
  expect(await owner.mutation(apply, { ...scope, recommendationId: saved.recommendationId, requestKey: "apply-one" })).toMatchObject({ creditEnabled: true, limitCents: 500, balanceCents: 0, policyRevision: 1, unlimited: false });
  expect(await t.run(ctx => ctx.db.query("creditEntries").collect())).toHaveLength(0);
  expect(await t.run(ctx => ctx.db.query("creditAccounts").collect())).toHaveLength(0);
  const audits = await t.run(ctx => ctx.db.query("auditEvents").collect());
  expect(audits.filter(row => row.action === "CUSTOMER_CREDIT_POLICY_CHANGED")).toHaveLength(1);
});
it("replays first generation across output, snapshot, settings, day and archive changes", async () => {
  const { t, owner, scope, customerId, settingsId, args } = await setup();
  const saved = await owner.mutation(record, args);
  await t.run(async ctx => { await ctx.db.patch(customerId, { isActive: false }); await ctx.db.patch(settingsId, { enabled: false, revision: 2 }); });
  vi.mocked(Date.now).mockReturnValue(now + 86400000);
  expect(await owner.query(requestResult, { ...scope, customerId, requestKey: args.requestKey })).toEqual(saved);
  expect(await owner.mutation(record, { ...args, recommendedLimitCents: -1, settingsRevision: 99, inputs: { ...args.inputs, observedAt: now + 86400000 } })).toEqual(saved);
  const another = await t.run(ctx => ctx.db.insert("customers", { ...customerFields, businessId: scope.businessId }));
  await expect(owner.mutation(record, { ...args, customerId: another })).rejects.toThrow(/IDEMPOTENCY_CONFLICT/);
});
it("preserves immutable apply receipts after later policy, settings, archive and day changes", async () => {
  const { t, owner, scope, customerId, settingsId, args } = await setup();
  const saved = await owner.mutation(record, args), attempt = { ...scope, recommendationId: saved.recommendationId, requestKey: "apply-one" };
  const result = await owner.mutation(apply, attempt);
  await t.run(async ctx => { await ctx.db.patch(customerId, { creditLimitCents: 900, creditPolicyRevision: 5, isActive: false }); await ctx.db.patch(settingsId, { enabled: false }); });
  vi.mocked(Date.now).mockReturnValue(now + 86400000);
  expect(await owner.mutation(apply, attempt)).toEqual(result);
  expect((await t.run(ctx => ctx.db.get(customerId)))?.creditPolicyRevision).toBe(5);
  expect(await t.run(ctx => ctx.db.query("idempotencyKeys").collect())).toHaveLength(1);
});
it.each(["policy", "inventory", "settings", "day", "archive"] as const)("rejects stale %s atomically", async kind => {
  const { t, owner, scope, customerId, productId, settingsId, args } = await setup();
  const saved = await owner.mutation(record, args);
  if (kind === "policy") await t.run(ctx => ctx.db.patch(customerId, { creditPolicyRevision: 2 }));
  if (kind === "inventory") await t.run(ctx => ctx.db.patch(productId, { quantityOnHandGrams: 99 }));
  if (kind === "settings") await t.run(ctx => ctx.db.patch(settingsId, { revision: 2 }));
  if (kind === "archive") await t.run(ctx => ctx.db.patch(customerId, { isActive: false }));
  if (kind === "day") vi.mocked(Date.now).mockReturnValue(now + 86400000);
  const before = await t.run(ctx => ctx.db.get(customerId));
  await expect(owner.mutation(apply, { ...scope, recommendationId: saved.recommendationId, requestKey: "apply-request" })).rejects.toThrow();
  expect(await t.run(ctx => ctx.db.get(customerId))).toEqual(before);
  expect(await t.run(ctx => ctx.db.query("idempotencyKeys").collect())).toHaveLength(0);
});
it("zero freezes retaining the limit, and positive output enables credit following disable", async () => {
  const { t, owner, scope, customerId, args } = await setup();
  const zero = await owner.mutation(record, { ...args, recommendedLimitCents: 0, rangeMinCents: 0, rangeMaxCents: 0 });
  expect(await owner.mutation(apply, { ...scope, recommendationId: zero.recommendationId, requestKey: "freeze-request" })).toMatchObject({ creditEnabled: false, limitCents: 1000, unlimited: false });
  const inputs = await owner.query(readInputs, { ...scope, customerId, asOfDate });
  const positive = await owner.mutation(record, { ...args, requestKey: "positive-request", inputs });
  expect(await owner.mutation(apply, { ...scope, recommendationId: positive.recommendationId, requestKey: "positive-request" })).toMatchObject({ creditEnabled: true, limitCents: 500, unlimited: false });
  expect((await t.run(ctx => ctx.db.get(customerId)))?.totalCreditUsedCents).toBe(0);
});
it.each([{ recommendedLimitCents: NaN }, { rangeMinCents: -1 }, { rangeMaxCents: 5001 }, { riskScore: Infinity }, { riskScore: 101 }, { recommendedLimitCents: 1.5 }, { justification: "" }, { engineVersion: "private freeform" }])("rejects invalid or over-cap output %j", async patch => {
  const { t, owner, args } = await setup();
  await expect(owner.mutation(record, { ...args, ...patch })).rejects.toThrow();
  expect(await t.run(ctx => ctx.db.query("creditRecommendations").collect())).toHaveLength(0);
});
it("rejects forged snapshot and stale settings before saving", async () => {
  const { t, owner, args } = await setup();
  await expect(owner.mutation(record, { ...args, inputs: { ...args.inputs, policy: { ...args.inputs.policy, balanceCents: 123 } } })).rejects.toThrow(/STALE_RECOMMENDATION/);
  await expect(owner.mutation(record, { ...args, settingsRevision: 2 })).rejects.toThrow(/STALE_SETTINGS/);
  expect(await t.run(ctx => ctx.db.query("creditRecommendations").collect())).toHaveLength(0);
});
it("enforces current actor, tenant and financial permissions for record/read/apply", async () => {
  const { t, owner, scope, args } = await setup();
  const saved = await owner.mutation(record, args);
  await expect(owner.mutation(record, { ...args, expectedUserId: "other" })).rejects.toThrow();
  const other = t.withIdentity({ subject: "other" });
  const foreign = await other.mutation(api.onboarding.createBusinessOnboarding, { businessName: "Other synthetic" });
  await expect(other.query(get, { businessId: foreign.businessId, expectedUserId: "other", recommendationId: saved.recommendationId })).rejects.toThrow(/NOT_FOUND/);
  const user = await t.run(ctx => ctx.db.query("users").withIndex("by_clerkUserId", q => q.eq("clerkUserId", "owner")).unique());
  await t.run(ctx => ctx.db.patch(user!._id, { role: "MEMBER", permissions: { MANAGE_CUSTOMERS: true, VIEW_FINANCIALS: false } }));
  await expect(owner.query(get, { ...scope, recommendationId: saved.recommendationId })).rejects.toThrow();
  await expect(owner.mutation(record, args)).rejects.toThrow();
  await expect(owner.mutation(apply, { ...scope, recommendationId: saved.recommendationId, requestKey: "denied-request" })).rejects.toThrow();
});
it("uses actor-scoped generation keys and rejects changed apply identity", async () => {
  const { t, owner, scope, args } = await setup();
  const first = await owner.mutation(record, args);
  const second = await owner.mutation(record, { ...args, requestKey: "second-request" });
  await owner.mutation(apply, { ...scope, recommendationId: first.recommendationId, requestKey: "apply-request" });
  await expect(owner.mutation(apply, { ...scope, recommendationId: second.recommendationId, requestKey: "apply-request" })).rejects.toThrow(/IDEMPOTENCY_CONFLICT/);
  await t.run(ctx => ctx.db.insert("users", { clerkUserId: "second-owner", email: "synthetic@example.invalid", role: "OWNER", status: "ACTIVE", businessId: scope.businessId, isDefaultMembership: true, createdAt: 1, updatedAt: 1 }));
  const other = t.withIdentity({ subject: "second-owner" }), otherScope = { ...scope, expectedUserId: "second-owner" };
  expect(await other.query(requestResult, { ...otherScope, customerId: args.customerId, requestKey: args.requestKey })).toBeNull();
});
it.each(["pending", "historical"] as const)("requires canonical coverage for generation and application: %s", async kind => {
  const { t, owner, scope, customerId, args } = await setup();
  const saved = await owner.mutation(record, args);
  await t.run(async ctx => {
    if (kind === "historical") await ctx.db.patch(customerId, { legacyPrismaId: "legacy-synthetic" });
    else { const state = await ctx.db.query("creditAllocationState").withIndex("by_customerId", q => q.eq("customerId", customerId)).unique(); await ctx.db.patch(state!._id, { status: "pending" }); }
  });
  const inputs = await owner.query(readInputs, { ...scope, customerId, asOfDate });
  await expect(owner.mutation(record, { ...args, inputs, requestKey: "new-generation" })).rejects.toThrow(/INSUFFICIENT_HISTORY/);
  await expect(owner.mutation(apply, { ...scope, recommendationId: saved.recommendationId, requestKey: "apply-request" })).rejects.toThrow(/INSUFFICIENT_HISTORY/);
  expect(await owner.mutation(record, args)).toEqual(saved);
  expect((await t.run(ctx => ctx.db.get(customerId)))?.creditLimitCents).toBe(1000);
  expect(await t.run(ctx => ctx.db.query("creditRecommendations").collect())).toHaveLength(1);
});
it("projects exact proposal and expiry and rejects corrupted immutable receipts", async () => {
  const { t, owner, scope, args } = await setup();
  const saved = await owner.mutation(record, args);
  expect(saved).toMatchObject({ expiresAt: asOfDate + 86400000, proposedCreditEnabled: true, proposedLimitCents: 500, policyRevision: 0 });
  const attempt = { ...scope, recommendationId: saved.recommendationId, requestKey: "apply-request" };
  await owner.mutation(apply, attempt);
  await t.run(async ctx => { const receipt = await ctx.db.query("idempotencyKeys").first(); const content = JSON.parse(receipt!.resultJson); content.result.limitCents = 750; await ctx.db.patch(receipt!._id, { resultJson: JSON.stringify(content) }); });
  await expect(owner.mutation(apply, attempt)).rejects.toThrow(/INVALID_STATE/);
});
it("rejects corrupted snapshot policy and exhausted revision without mutation", async () => {
  const { t, owner, scope, customerId, args } = await setup();
  await t.run(ctx => ctx.db.patch(customerId, { creditPolicyRevision: Number.MAX_SAFE_INTEGER }));
  const inputs = await owner.query(readInputs, { ...scope, customerId, asOfDate });
  const saved = await owner.mutation(record, { ...args, inputs });
  await expect(owner.mutation(apply, { ...scope, recommendationId: saved.recommendationId, requestKey: "apply-request" })).rejects.toThrow(/INVALID_STATE/);
  await t.run(ctx => ctx.db.patch(saved.recommendationId, { inputsJson: JSON.stringify({ ...inputs, policy: { ...inputs.policy, limitCents: -1 } }) }));
  await expect(owner.query(get, { ...scope, recommendationId: saved.recommendationId })).rejects.toThrow(/INVALID_STATE/);
  expect((await t.run(ctx => ctx.db.get(customerId)))?.creditLimitCents).toBe(1000);
});
