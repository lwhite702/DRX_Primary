import { afterEach, expect, it, vi } from "vitest";
import { convexTest } from "convex-test";
import { makeFunctionReference } from "convex/server";
import schema from "../../convex/schema";
import { api } from "../../convex/_generated/api";
import type { Id } from "../../convex/_generated/dataModel";
import * as health from "../../convex/inventoryHealth";
import * as actions from "../../convex/inventoryHealthActions";
import * as onboarding from "../../convex/onboarding";
import * as generatedApi from "../../convex/_generated/api";
const generate = makeFunctionReference<"action", { businessId: Id<"businesses">; expectedUserId: string; requestId: string }, string>("inventoryHealthActions:generate");
const insight = { insight_title: "Review stock", insight_content: "Review reorder levels.", priority: "medium", action_recommended: "Check supplier lead times." };
async function setup() {
  vi.stubEnv("OPENAI_API_KEY", "");
  const fetchMock = vi.fn(); vi.stubGlobal("fetch", fetchMock);
  const t = convexTest(schema, { "inventoryHealth.ts": async () => health, "inventoryHealthActions.ts": async () => actions, "onboarding.ts": async () => onboarding, "_generated/api.js": async () => generatedApi });
  const owner = t.withIdentity({ subject: "owner" });
  const { businessId } = await owner.mutation(api.onboarding.createBusinessOnboarding, { businessName: "Synthetic" });
  return { t, owner, fetchMock, args: { businessId, expectedUserId: "owner", requestId: "report-one" } };
}
afterEach(() => { vi.unstubAllEnvs(); vi.unstubAllGlobals(); });
it("explicitly records unconfigured optional AI and freezes each request receipt", async () => {
  const { t, owner, fetchMock, args } = await setup();
  const first = await owner.action(generate, args);
  expect(JSON.parse(first)).toMatchObject({ success: true, ai_status: "unconfigured", ai_insight: null, request_id: args.requestId });
  vi.stubEnv("OPENAI_API_KEY", "synthetic-test-key");
  expect(await owner.action(generate, args)).toBe(first);
  expect(fetchMock).not.toHaveBeenCalled();
  expect(await t.run(ctx => ctx.db.query("inventoryHealthReports").collect())).toHaveLength(1);
});
it("validates provider JSON, strips extra fields and saves one content-free audit", async () => {
  const { t, owner, fetchMock, args } = await setup();
  vi.stubEnv("OPENAI_API_KEY", "synthetic-test-key");
  const productId = await t.run(ctx => ctx.db.insert("products", { businessId: args.businessId, sku: "private-sku", productName: "Synthetic", unitCostCents: 100, sellingPriceCents: 150, quantityOnHandGrams: 1, reorderLevelGrams: 2, allowFractionalWeight: true, isActive: true, createdAt: 1, updatedAt: 1 }));
  fetchMock.mockResolvedValue(new Response(JSON.stringify({ choices: [{ message: { content: JSON.stringify({ ...insight, extra: "discard" }) } }] })));
  const first = await owner.action(generate, args);
  expect(JSON.parse(first)).toMatchObject({ ai_status: "generated", ai_insight: insight });
  expect(first).not.toContain("discard");
  expect(await owner.action(generate, args)).toBe(first);
  expect(fetchMock).toHaveBeenCalledTimes(1);
  const providerBody = fetchMock.mock.calls[0][1].body;
  expect(providerBody).not.toContain(productId);
  expect(providerBody).not.toContain(args.businessId);
  expect(providerBody).not.toContain("private-sku");
  const audits = await t.run(ctx => ctx.db.query("auditEvents").filter(q => q.eq(q.field("action"), "inventory_health_report")).collect());
  expect(audits).toHaveLength(1); expect(JSON.stringify(audits)).not.toContain(insight.insight_content);
});
it.each(["invalid-json", JSON.stringify({ choices: [{ message: { content: JSON.stringify({ ...insight, priority: "invalid" }) } }] }), "a".repeat(65537)])("records a sanitized explicit provider failure", async payload => {
  const { t, owner, fetchMock, args } = await setup();
  vi.stubEnv("OPENAI_API_KEY", "synthetic-test-key");
  fetchMock.mockResolvedValue(new Response(payload));
  const result = JSON.parse(await owner.action(generate, args));
  expect(result).toMatchObject({ success: true, ai_status: "failed", ai_insight: null });
  expect(result.ai_error).toContain("temporarily unavailable");
  expect(JSON.stringify(await t.run(ctx => ctx.db.query("inventoryHealthReports").collect()))).not.toContain("invalid-json");
});
it("rechecks membership after provider I/O and persists nothing after revocation", async () => {
  const { t, owner, fetchMock, args } = await setup();
  vi.stubEnv("OPENAI_API_KEY", "synthetic-test-key");
  fetchMock.mockImplementation(async () => {
    await t.run(async ctx => {
      const member = await ctx.db.query("users").withIndex("by_clerkUserId", q => q.eq("clerkUserId", "owner")).unique();
      await ctx.db.patch(member!._id, { status: "SUSPENDED" });
    });
    return new Response(JSON.stringify({ choices: [{ message: { content: JSON.stringify(insight) } }] }));
  });
  await expect(owner.action(generate, args)).rejects.toThrow(/FORBIDDEN/);
  expect(await t.run(ctx => ctx.db.query("inventoryHealthReports").collect())).toEqual([]);
});
it("enforces tenant and operator on new and saved reports", async () => {
  const { t, owner, fetchMock, args } = await setup();
  await owner.action(generate, args);
  await expect(owner.action(generate, { ...args, expectedUserId: "other" })).rejects.toThrow(/FORBIDDEN/);
  const foreign = t.withIdentity({ subject: "other" });
  await foreign.mutation(api.onboarding.createBusinessOnboarding, { businessName: "Other" });
  await expect(foreign.action(generate, { ...args, expectedUserId: "other" })).rejects.toThrow(/FORBIDDEN/);
  await expect(t.action(generate, args)).rejects.toThrow(/UNAUTHORIZED/);
  await t.run(async ctx => {
    const member = await ctx.db.query("users").withIndex("by_clerkUserId", q => q.eq("clerkUserId", "owner")).unique();
    await ctx.db.patch(member!._id, { status: "SUSPENDED" });
  });
  await expect(owner.action(generate, args)).rejects.toThrow(/FORBIDDEN/);
  expect(fetchMock).not.toHaveBeenCalled();
});
it("rejects invalid retry identifiers before provider access", async () => {
  const { owner, fetchMock, args } = await setup();
  await expect(owner.action(generate, { ...args, requestId: "x".repeat(201) })).rejects.toThrow(/INVALID_ARGUMENT/);
  expect(fetchMock).not.toHaveBeenCalled();
});
