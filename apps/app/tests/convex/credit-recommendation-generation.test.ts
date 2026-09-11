import { afterEach, expect, it, vi } from "vitest";
import { convexTest } from "convex-test";
import { makeFunctionReference, type FunctionReturnType } from "convex/server";
import schema from "../../convex/schema";
import { api, internal } from "../../convex/_generated/api";
import * as generation from "../../convex/creditRecommendationGeneration";
import * as recommendations from "../../convex/creditRecommendations";
import * as inputs from "../../convex/creditRecommendationInputs";
import * as onboarding from "../../convex/onboarding";
import * as generated from "../../convex/_generated/api";
type Args = { businessId: string; expectedUserId: string; customerId: string; requestKey: string };
type Saved = FunctionReturnType<typeof internal.creditRecommendations.recordGenerated>;
const generate = makeFunctionReference<"action", Args, Saved>("creditRecommendationGeneration:generate");
const output = { recommendedLimitCents: 500, rangeMinCents: 400, rangeMaxCents: 600, riskScore: 0, justification: "Synthetic aggregate assessment" };
const response = (value: unknown = output) => new Response(JSON.stringify({ choices: [{ finish_reason: "stop", message: { content: JSON.stringify(value) } }] }));
async function setup() {
  vi.spyOn(Date, "now").mockReturnValue(Date.UTC(2026, 8, 6, 12));
  vi.stubEnv("OPENAI_API_KEY", "synthetic-test-key"); vi.stubEnv("OPENAI_MODEL", "synthetic-model");
  const fetchMock = vi.fn().mockImplementation(async () => response()); vi.stubGlobal("fetch", fetchMock);
  const t = convexTest(schema, { "creditRecommendationGeneration.ts": async () => generation, "creditRecommendations.ts": async () => recommendations, "creditRecommendationInputs.ts": async () => inputs, "onboarding.ts": async () => onboarding, "_generated/api.js": async () => generated });
  const owner = t.withIdentity({ subject: "owner" });
  const { businessId } = await owner.mutation(api.onboarding.createBusinessOnboarding, { businessName: "Synthetic" });
  const customerId = await t.run(ctx => ctx.db.insert("customers", { businessId, firstName: "Private name", email: "private@example.invalid", totalPurchasesCents: 0, totalCreditUsedCents: 0, creditLimitCents: 1000, purchaseCount: 0, loyaltyTier: "standard", discountRateBps: 0, isActive: true, createdAt: 1, updatedAt: 1 }));
  const stateId = await t.run(ctx => ctx.db.insert("creditAllocationState", { businessId, customerId, status: "ready", cursor: null, outstandingCents: 0, updatedAt: 1 }));
  const settingsId = await t.run(ctx => ctx.db.insert("creditRecommendationSettings", { businessId, enabled: true, revision: 1, maxCustomerCents: 5000, inventoryCapBps: 10000, newCustomerCents: 500, autoRefreshDays: 7, createdAt: 1, updatedAt: 1, updatedBy: "owner" }));
  const productId = await t.run(ctx => ctx.db.insert("products", { businessId, sku: "private-sku", productName: "Private product", unitCostCents: 100, sellingPriceCents: 200, quantityOnHandGrams: 100, reorderLevelGrams: 2, allowFractionalWeight: true, isActive: true, createdAt: 1, updatedAt: 1 }));
  const args = { businessId, expectedUserId: "owner", customerId, requestKey: "generation-request" };
  return { t, owner, fetchMock, args, settingsId, stateId, productId };
}
afterEach(() => { vi.useRealTimers(); vi.restoreAllMocks(); vi.unstubAllGlobals(); vi.unstubAllEnvs(); });
it("sends only aggregate whitelisted facts and saves validated provider output", async () => {
  const { t, owner, fetchMock, args, productId } = await setup();
  const result = await owner.action(generate, args);
  expect(result).toMatchObject({ ...output, provenance: "provider", engineVersion: "canonical_provider_v1", proposedCreditEnabled: true, proposedLimitCents: 500 });
  expect(fetchMock).toHaveBeenCalledTimes(1);
  const sent = fetchMock.mock.calls[0] as unknown as [string, RequestInit];
  expect(sent[0]).toBe("https://api.openai.com/v1/chat/completions");
  const body = JSON.parse(sent[1].body as string);
  expect(body.model).toBe("synthetic-model");
  for (const forbidden of [args.businessId, args.customerId, args.expectedUserId, args.requestKey, productId, "Private", "private@example", "private-sku", "ledgerRevision", "requestedBy", "firstSaleAt", "latestSaleAt", "observedAt"]) expect(sent[1].body).not.toContain(forbidden);
  expect(JSON.parse(body.messages[1].content)).toMatchObject({ repaymentTiming: "not_evaluated", inventory: { valuation: "catalog_cost" }, sales: { firstSaleAgeDays: null, latestSaleAgeDays: null } });
  expect(await t.run(ctx => ctx.db.query("creditRecommendations").collect())).toHaveLength(1);
});
it("replays saved first results before settings, archive, provider and rate checks", async () => {
  const { t, owner, fetchMock, args, settingsId } = await setup();
  const result = await owner.action(generate, args);
  await t.run(async ctx => { await ctx.db.patch(args.customerId, { isActive: false }); await ctx.db.patch(settingsId, { enabled: false }); });
  vi.stubEnv("OPENAI_API_KEY", ""); vi.mocked(Date.now).mockReturnValue(Date.now() + 86400000);
  expect(await owner.action(generate, args)).toEqual(result);
  expect(fetchMock).toHaveBeenCalledTimes(1);
  const limiter = await t.run(ctx => ctx.db.query("idempotencyKeys").first());
  expect(JSON.parse(limiter!.resultJson).attemptedAt).toHaveLength(1);
});
it.each(["missing-key", "missing-settings", "disabled-settings", "invalid-settings", "pending", "historical"] as const)("makes no provider call or default recommendation for %s", async kind => {
  const { t, owner, fetchMock, args, settingsId, stateId } = await setup();
  if (kind === "missing-key") vi.stubEnv("OPENAI_API_KEY", "");
  if (kind === "missing-settings") await t.run(ctx => ctx.db.delete(settingsId));
  if (kind === "disabled-settings") await t.run(ctx => ctx.db.patch(settingsId, { enabled: false }));
  if (kind === "invalid-settings") await t.run(ctx => ctx.db.patch(settingsId, { maxCustomerCents: -1 }));
  if (kind === "pending") await t.run(ctx => ctx.db.patch(stateId, { status: "pending" }));
  if (kind === "historical") await t.run(ctx => ctx.db.patch(args.customerId, { legacyPrismaId: "synthetic-legacy" }));
  await expect(owner.action(generate, args)).rejects.toThrow();
  expect(fetchMock).not.toHaveBeenCalled();
  expect(await t.run(ctx => ctx.db.query("creditRecommendations").collect())).toHaveLength(0);
  expect(await t.run(ctx => ctx.db.query("idempotencyKeys").collect())).toHaveLength(0);
});
it.each([{ recommendedLimitCents: 1.5 }, { riskScore: null }, { riskScore: 101 }, { rangeMaxCents: 5001 }, { rangeMinCents: 501 }, { justification: "" }, { recommendedLimitCents: "500" }])("rejects malformed or uncapped provider output %j without fake success", async patch => {
  const { t, owner, fetchMock, args } = await setup();
  fetchMock.mockResolvedValue(response({ ...output, ...patch }));
  await expect(owner.action(generate, args)).rejects.toThrow(/UNAVAILABLE/);
  expect(await t.run(ctx => ctx.db.query("creditRecommendations").collect())).toHaveLength(0);
});
it.each(["body-limit", "declared-limit", "invalid-json", "http", "truncated"] as const)("sanitizes bounded provider failure: %s", async kind => {
  const { t, owner, fetchMock, args } = await setup();
  const value = kind === "body-limit" ? new Response("x".repeat(65537)) : kind === "declared-limit" ? new Response("", { headers: { "content-length": "65537" } }) : kind === "http" ? new Response("sensitive provider failure", { status: 500 }) : kind === "truncated" ? new Response(JSON.stringify({ choices: [{ finish_reason: "length", message: { content: JSON.stringify(output) } }] })) : new Response("sensitive invalid JSON");
  fetchMock.mockResolvedValue(value);
  await expect(owner.action(generate, args)).rejects.toThrow("UNAVAILABLE: Credit recommendation generation is temporarily unavailable");
  expect(await t.run(ctx => ctx.db.query("creditRecommendations").collect())).toHaveLength(0);
});
it.each(["fetch", "body"] as const)("bounds timeout across stalled %s even when transport ignores abort", async kind => {
  const { t, owner, fetchMock, args } = await setup();
  vi.useFakeTimers();
  let cancelled = false;
  if (kind === "fetch") fetchMock.mockImplementation(() => new Promise(() => {}));
  else fetchMock.mockResolvedValue(new Response(new ReadableStream({ pull() { return new Promise(() => {}); }, cancel() { cancelled = true; } })));
  const pending = owner.action(generate, args);
  const assertion = expect(pending).rejects.toThrow(/UNAVAILABLE/);
  await vi.waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(1));
  await vi.advanceTimersByTimeAsync(20001);
  await assertion;
  if (kind === "body") expect(cancelled).toBe(true);
  expect(await t.run(ctx => ctx.db.query("creditRecommendations").collect())).toHaveLength(0);
});
it.each(["membership", "settings", "policy", "inventory"] as const)("rechecks %s after provider I/O", async kind => {
  const { t, owner, fetchMock, args, settingsId, productId } = await setup();
  fetchMock.mockImplementation(async () => {
    await t.run(async ctx => {
      if (kind === "membership") { const user = await ctx.db.query("users").withIndex("by_clerkUserId", q => q.eq("clerkUserId", "owner")).unique(); await ctx.db.patch(user!._id, { status: "SUSPENDED" }); }
      if (kind === "settings") await ctx.db.patch(settingsId, { revision: 2 });
      if (kind === "policy") await ctx.db.patch(args.customerId, { creditPolicyRevision: 2 });
      if (kind === "inventory") await ctx.db.patch(productId, { quantityOnHandGrams: 99 });
    }); return response();
  });
  await expect(owner.action(generate, args)).rejects.toThrow();
  expect(await t.run(ctx => ctx.db.query("creditRecommendations").collect())).toHaveLength(0);
});
it("allows financial/customer permissions without settings administration and rejects operator/tenant changes", async () => {
  const { t, owner, fetchMock, args } = await setup();
  const member = await t.run(ctx => ctx.db.query("users").withIndex("by_clerkUserId", q => q.eq("clerkUserId", "owner")).unique());
  await t.run(ctx => ctx.db.patch(member!._id, { role: "MEMBER", permissions: { "customers.manage": true, "reports.view_all": true, "settings.configure_pos": false } }));
  await owner.action(generate, args);
  await expect(owner.action(generate, { ...args, expectedUserId: "other" })).rejects.toThrow(/FORBIDDEN/);
  const foreign = t.withIdentity({ subject: "foreign" });
  await foreign.mutation(api.onboarding.createBusinessOnboarding, { businessName: "Other synthetic" });
  await expect(foreign.action(generate, { ...args, expectedUserId: "foreign" })).rejects.toThrow();
  await t.run(ctx => ctx.db.patch(member!._id, { permissions: { "customers.manage": true, "reports.view_all": false } }));
  await expect(owner.action(generate, args)).rejects.toThrow();
  expect(fetchMock).toHaveBeenCalledTimes(1);
});
it("preserves explicit zero caps and zero risk without permitting unlimited credit", async () => {
  const { t, owner, fetchMock, args, settingsId } = await setup();
  await t.run(ctx => ctx.db.patch(settingsId, { inventoryCapBps: 0 }));
  fetchMock.mockResolvedValue(response({ ...output, recommendedLimitCents: 0, rangeMinCents: 0, rangeMaxCents: 0 }));
  expect(await owner.action(generate, args)).toMatchObject({ recommendedLimitCents: 0, riskScore: 0, proposedCreditEnabled: false, proposedLimitCents: 1000 });
});
it("durably shares ten attempts per rolling hour across operators and counts provider failures", async () => {
  const { t, owner, fetchMock, args } = await setup();
  await t.run(ctx => ctx.db.insert("users", { clerkUserId: "second", email: "second@example.invalid", role: "OWNER", status: "ACTIVE", businessId: args.businessId, isDefaultMembership: true, createdAt: 1, updatedAt: 1 }));
  const second = t.withIdentity({ subject: "second" });
  fetchMock.mockRejectedValue(new Error("private transport error"));
  for (let index = 0; index < 10; index++) await expect((index % 2 ? owner : second).action(generate, { ...args, expectedUserId: index % 2 ? "owner" : "second", requestKey: `request-${index}` })).rejects.toThrow(/UNAVAILABLE/);
  await expect(owner.action(generate, args)).rejects.toThrow(/RATE_LIMITED/);
  expect(fetchMock).toHaveBeenCalledTimes(10);
  const states = await t.run(ctx => ctx.db.query("idempotencyKeys").collect());
  expect(states).toHaveLength(1); expect(JSON.parse(states[0].resultJson).attemptedAt).toHaveLength(10);
  expect(states[0].resultJson).not.toContain(args.customerId);
  vi.mocked(Date.now).mockReturnValue(Date.now() + 3600000);
  fetchMock.mockResolvedValue(response());
  await owner.action(generate, args);
  expect(fetchMock).toHaveBeenCalledTimes(11);
});
it.each(["broken", JSON.stringify({ attemptedAt: [null] }), JSON.stringify({ attemptedAt: Array(11).fill(1) }), JSON.stringify({ attemptedAt: [Number.MAX_SAFE_INTEGER] })])("fails closed on corrupted operational rate state", async resultJson => {
  const { t, owner, fetchMock, args } = await setup();
  await t.run(ctx => ctx.db.insert("idempotencyKeys", { businessId: args.businessId, key: "__credit_recommendation_provider_rate_v1", action: "credit_recommendation_provider_rate", resultJson, createdAt: 1 }));
  await expect(owner.action(generate, args)).rejects.toThrow(/INVALID_STATE/);
  expect(fetchMock).not.toHaveBeenCalled();
});

it("preserves the default model and sends sale ages instead of exact timestamps", async () => {
  const { t, owner, fetchMock, args } = await setup();
  vi.stubEnv("OPENAI_MODEL", "");
  const occurredAt = Date.now() - 3 * 86400000 - 12345;
  await t.run(ctx => ctx.db.insert("sales", { businessId: args.businessId, customerId: args.customerId, orderNumber: "synthetic-sale", orderStatus: "completed", subtotalCents: 100, taxAmountCents: 0, totalAmountCents: 100, amountPaidCents: 100, changeAmountCents: 0, paymentMethod: "cash", createdBy: "owner", createdAt: occurredAt, occurredAt, updatedAt: occurredAt }));
  await owner.action(generate, args);
  const sent = fetchMock.mock.calls[0] as unknown as [string, RequestInit];
  const body = JSON.parse(sent[1].body as string), facts = JSON.parse(body.messages[1].content);
  expect(body.model).toBe("gpt-5.5");
  expect(facts.sales).toEqual({ salesCents: 100, sales30dCents: 100, sales90dCents: 100, completedSaleCount: 1, firstSaleAgeDays: 3, latestSaleAgeDays: 3 });
  expect(body.messages[1].content).not.toContain(String(occurredAt));
  expect(body.messages[1].content).not.toMatch(/firstSaleAt|latestSaleAt|observedAt/);
  expect(body.messages[0].content).toContain("completed sales only");
  expect(body.messages[0].content).toContain("not customer tenure");
});
