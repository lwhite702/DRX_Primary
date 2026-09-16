import { afterEach, beforeEach, expect, it, vi } from "vitest";
import { convexTest } from "convex-test";
import schema from "../../convex/schema";
import { api, internal } from "../../convex/_generated/api";
import * as intelligence from "../../convex/inventoryIntelligence";
import * as onboarding from "../../convex/onboarding";
import * as generatedApi from "../../convex/_generated/api";
beforeEach(() => { vi.useFakeTimers(); });
afterEach(() => { vi.useRealTimers(); });
async function setup(count = 1) {
  const t = convexTest(schema, { "inventoryIntelligence.ts": async () => intelligence, "onboarding.ts": async () => onboarding, "_generated/api.js": async () => generatedApi }), owner = t.withIdentity({ subject: "owner" });
  const { businessId } = await owner.mutation(api.onboarding.createBusinessOnboarding, { businessName: "Synthetic" });
  const ids = await t.run(async ctx => {
    const ids = [];
    for (let i = 0; i < count; i++) ids.push(await ctx.db.insert("products", { businessId, sku: `fixture-${i}`, productName: "Synthetic", unitCostCents: 100, sellingPriceCents: 150, quantityOnHandGrams: 20, reorderLevelGrams: 10, allowFractionalWeight: true, isActive: true, createdAt: 1, updatedAt: 1 }));
    return ids;
  });
  return { t, owner, businessId, ids, args: { businessId, expectedUserId: "owner", requestId: "queued-one" }, drain: () => t.finishAllScheduledFunctions(vi.runAllTimers) };
}
it("schedules canonical work without bearer tokens, deduplicates enqueue and completes each product once", async () => {
  const { t, owner, args, drain } = await setup(2);
  const first = await owner.mutation(api.inventoryIntelligence.enqueueAnalysis, args);
  expect(first.status).toBe("queued"); expect(await owner.mutation(api.inventoryIntelligence.enqueueAnalysis, args)).toEqual(first);
  await drain();
  const status = await owner.query(api.inventoryIntelligence.queuedStatus, { businessId: args.businessId, expectedUserId: "owner", runId: first.jobId });
  expect(status).toMatchObject({ status: "complete", processedCount: 2, totalCount: 2, pricingGenerated: 2, forecastsGenerated: 2, failureCode: null });
  expect(await owner.mutation(api.inventoryIntelligence.enqueueAnalysis, args)).toEqual({ jobId: first.jobId, status: "complete" });
  await t.mutation(internal.inventoryIntelligence.processQueuedStep, { runId: first.jobId, expectedIndex: 0 });
  expect(await t.run(ctx => ctx.db.query("inventoryAnalyses").collect())).toHaveLength(2);
  expect(await t.run(ctx => ctx.db.query("inventoryIntelligenceAlerts").collect())).toHaveLength(0);
});
it("records partial failure outside the rolled-back step and resumes from the saved cursor", async () => {
  const { t, owner, args, ids, drain } = await setup(2);
  await t.run(ctx => ctx.db.patch(ids[1], { unitCostCents: 1.5 }));
  const queued = await owner.mutation(api.inventoryIntelligence.enqueueAnalysis, args); await drain();
  const scope = { businessId: args.businessId, expectedUserId: "owner", runId: queued.jobId };
  expect(await owner.query(api.inventoryIntelligence.queuedStatus, scope)).toMatchObject({ status: "failed", processedCount: 1, failureCode: "INVALID_STATE" });
  expect(await t.run(ctx => ctx.db.query("inventoryAnalyses").collect())).toHaveLength(1);
  await t.run(ctx => ctx.db.patch(ids[1], { unitCostCents: 100 }));
  expect((await owner.mutation(api.inventoryIntelligence.enqueueAnalysis, args)).jobId).toBe(queued.jobId); await drain();
  expect(await owner.query(api.inventoryIntelligence.queuedStatus, scope)).toMatchObject({ status: "complete", processedCount: 2, pricingGenerated: 2 });
  expect(await t.run(ctx => ctx.db.query("inventoryAnalyses").collect())).toHaveLength(2);
  await t.mutation(internal.inventoryIntelligence.markQueuedFailure, { runId: queued.jobId, expectedIndex: 1, code: "FORBIDDEN" });
  expect((await owner.query(api.inventoryIntelligence.queuedStatus, scope)).status).toBe("complete");
});
it("rechecks revocation at execution, binds settings and hides another actor's job", async () => {
  const { t, owner, args, drain } = await setup();
  const queued = await owner.mutation(api.inventoryIntelligence.enqueueAnalysis, args);
  await expect(owner.mutation(api.inventoryIntelligence.enqueueAnalysis, { ...args, options: { marginRequirement: 0.5 } })).rejects.toThrow(/CONFLICT/);
  await t.run(async ctx => {
    const member = await ctx.db.query("users").withIndex("by_clerkUserId_and_businessId", q => q.eq("clerkUserId", "owner").eq("businessId", args.businessId)).unique(); if (!member) throw new Error("Missing fixture");
    await ctx.db.patch(member._id, { status: "SUSPENDED" });
  });
  await drain();
  expect(await t.run(ctx => ctx.db.get(queued.jobId))).toMatchObject({ status: "failed", nextIndex: 0, failureCode: "FORBIDDEN" });
  expect(await t.run(ctx => ctx.db.query("inventoryAnalyses").collect())).toHaveLength(0);
  const foreign = t.withIdentity({ subject: "foreign" }); const other = await foreign.mutation(api.onboarding.createBusinessOnboarding, { businessName: "Other" });
  await expect(foreign.query(api.inventoryIntelligence.queuedStatus, { businessId: other.businessId, expectedUserId: "foreign", runId: queued.jobId })).rejects.toThrow(/NOT_FOUND/);
});
it("reschedules a canceled pending step on the same authorized request", async () => {
  const { t, owner, args, drain } = await setup();
  const queued = await owner.mutation(api.inventoryIntelligence.enqueueAnalysis, args);
  await t.run(async ctx => { const run = await ctx.db.get(queued.jobId); if (!run?.scheduledId) throw new Error("Missing scheduled fixture"); await ctx.scheduler.cancel(run.scheduledId); });
  expect((await owner.mutation(api.inventoryIntelligence.enqueueAnalysis, args)).jobId).toBe(queued.jobId);
  await drain();
  expect(await t.run(ctx => ctx.db.get(queued.jobId))).toMatchObject({ status: "complete", nextIndex: 1 });
  expect(await t.run(ctx => ctx.db.query("inventoryAnalyses").collect())).toHaveLength(1);
});
