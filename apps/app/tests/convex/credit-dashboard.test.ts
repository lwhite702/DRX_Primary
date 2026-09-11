import { expect, it } from "vitest";
import { convexTest } from "convex-test";
import { makeFunctionReference } from "convex/server";
import schema from "../../convex/schema";
import { api } from "../../convex/_generated/api";
import type { Id } from "../../convex/_generated/dataModel";
import * as dashboard from "../../convex/creditDashboard";
import * as onboarding from "../../convex/onboarding";
import * as generatedApi from "../../convex/_generated/api";
const accounts = makeFunctionReference<"query", { businessId: string; expectedUserId: string; paginationOpts: { cursor: string | null; numItems: number } }, { page: Array<{ customerId: Id<"customers">; displayName: string; isActive: boolean; creditEnabled: boolean; limitCents: number; unlimited: boolean; balanceCents: number; allocationStatus: string }>; isDone: boolean; continueCursor: string }>("creditDashboard:accountsPage");
const scope = makeFunctionReference<"query", { businessId: string; expectedUserId: string; customerId?: string }, { businessId: Id<"businesses">; customerId?: Id<"customers"> }>("creditDashboard:resolveScope");
const fields = { firstName: "Private synthetic name", lastName: "Private", phoneNumber: "synthetic-phone", email: "private@example.invalid", totalPurchasesCents: 0, totalCreditUsedCents: 0, creditLimitCents: 0, purchaseCount: 0, loyaltyTier: "standard", discountRateBps: 0, isActive: true, createdAt: 1, updatedAt: 1 };
async function setup() {
  const t = convexTest(schema, { "creditDashboard.ts": async () => dashboard, "onboarding.ts": async () => onboarding, "_generated/api.js": async () => generatedApi });
  const owner = t.withIdentity({ subject: "owner" });
  const { businessId } = await owner.mutation(api.onboarding.createBusinessOnboarding, { businessName: "Synthetic" });
  const customerId = await t.run(ctx => ctx.db.insert("customers", { ...fields, businessId }));
  return { t, owner, businessId, customerId, args: { businessId, expectedUserId: "owner", paginationOpts: { cursor: null, numItems: 100 } } };
}
it("returns neutral minimal projections including inactive accounts and explicit unlimited/disabled meaning", async () => {
  const { t, owner, businessId, customerId, args } = await setup();
  await t.run(ctx => ctx.db.insert("customers", { ...fields, businessId, isActive: false, creditEnabled: false, totalCreditUsedCents: 123 }));
  const result = await owner.query(accounts, args);
  expect(result.page[0]).toEqual({ customerId, displayName: `Account ${customerId.slice(-8)}`, isActive: true, creditEnabled: true, limitCents: 0, unlimited: true, balanceCents: 0, allocationStatus: "missing" });
  expect(result.page[1]).toMatchObject({ isActive: false, creditEnabled: false, unlimited: false, balanceCents: 123, allocationStatus: "unreconciled" });
  expect(JSON.stringify(result)).not.toMatch(/Private|synthetic-phone|example.invalid|firstName|email|phoneNumber/);
});
it("pages all accounts without omitting inactive or foreign mixing", async () => {
  const { t, owner, businessId, args } = await setup();
  await t.run(ctx => ctx.db.insert("customers", { ...fields, businessId, isActive: false }));
  const first = await owner.query(accounts, { ...args, paginationOpts: { cursor: null, numItems: 1 } });
  const second = await owner.query(accounts, { ...args, paginationOpts: { cursor: first.continueCursor, numItems: 1 } });
  expect(first.isDone).toBe(false); expect(second.isDone).toBe(true);
  expect(first.page[0].customerId).not.toBe(second.page[0].customerId);
  await expect(owner.query(accounts, { ...args, paginationOpts: { cursor: null, numItems: 101 } })).rejects.toThrow(/INVALID_ARGUMENT/);
});
it("requires authenticated financial membership and matching tenant/operator", async () => {
  const { t, owner, businessId, args } = await setup();
  await expect(t.query(accounts, args)).rejects.toThrow(/UNAUTHENTICATED/);
  await expect(owner.query(accounts, { ...args, expectedUserId: "other" })).rejects.toThrow(/FORBIDDEN/);
  const foreign = t.withIdentity({ subject: "foreign" });
  const other = await foreign.mutation(api.onboarding.createBusinessOnboarding, { businessName: "Other" });
  await expect(owner.query(accounts, { ...args, businessId: other.businessId })).rejects.toThrow(/FORBIDDEN/);
  const userId = await t.run(async ctx => (await ctx.db.query("users").withIndex("by_clerkUserId", q => q.eq("clerkUserId", "owner")).unique())!._id);
  await t.run(ctx => ctx.db.patch(userId, { role: "MEMBER" }));
  await expect(owner.query(accounts, args)).rejects.toThrow(/FORBIDDEN/);
  await expect(owner.query(scope, { businessId, expectedUserId: "owner" })).rejects.toThrow(/FORBIDDEN/);
});
it.each([{ totalCreditUsedCents: -1 }, { totalCreditUsedCents: 1.5 }, { totalCreditUsedCents: Infinity }, { creditLimitCents: Number.MAX_SAFE_INTEGER + 1 }, { creditLimitCents: -1 }])("rejects malformed customer cents %j", async patch => {
  const { t, owner, customerId, args } = await setup();
  await t.run(ctx => ctx.db.patch(customerId, patch));
  await expect(owner.query(accounts, args)).rejects.toThrow(/INVALID_STATE/);
});
it("distinguishes pending, ready and mismatched balances", async () => {
  const { t, owner, businessId, customerId, args } = await setup();
  const { stateId, accountId } = await t.run(async ctx => ({
    stateId: await ctx.db.insert("creditAllocationState", { businessId, customerId, cursor: null, status: "pending", outstandingCents: 0, updatedAt: 1 }),
    accountId: await ctx.db.insert("creditAccounts", { businessId, customerId, balanceCents: 0, createdAt: 1, updatedAt: 1 }),
  }));
  expect((await owner.query(accounts, args)).page[0].allocationStatus).toBe("pending");
  await t.run(ctx => ctx.db.patch(stateId, { status: "ready" }));
  expect((await owner.query(accounts, args)).page[0].allocationStatus).toBe("ready");
  await t.run(ctx => ctx.db.patch(stateId, { outstandingCents: 1 }));
  expect((await owner.query(accounts, args)).page[0].allocationStatus).toBe("unreconciled");
  await t.run(async ctx => { await ctx.db.patch(stateId, { outstandingCents: 0 }); await ctx.db.patch(accountId, { balanceCents: 1 }); });
  expect((await owner.query(accounts, args)).page[0].allocationStatus).toBe("unreconciled");
  await t.run(ctx => ctx.db.patch(accountId, { balanceCents: -1 }));
  await expect(owner.query(accounts, args)).rejects.toThrow(/INVALID_STATE/);
});
it.each(["creditAccounts", "creditAllocationState"] as const)("rejects cross-tenant %s ownership", async table => {
  const { t, owner, customerId, args } = await setup();
  const { businessId } = await t.withIdentity({ subject: "foreign" }).mutation(api.onboarding.createBusinessOnboarding, { businessName: "Other" });
  await t.run(async ctx => {
    if (table === "creditAccounts") await ctx.db.insert(table, { businessId, customerId, balanceCents: 0, createdAt: 1, updatedAt: 1 });
    else await ctx.db.insert(table, { businessId, customerId, status: "pending", cursor: null, outstandingCents: 0, updatedAt: 1 });
  });
  await expect(owner.query(accounts, args)).rejects.toThrow(/ownership/);
});
it("keeps remaining opening debt unreconciled and recognizes fully allocated repayment", async () => {
  const { t, owner, businessId, customerId, args } = await setup();
  const ids = await t.run(async ctx => {
    await ctx.db.patch(customerId, { totalCreditUsedCents: 100 });
    const accountId = await ctx.db.insert("creditAccounts", { businessId, customerId, balanceCents: 100, createdAt: 1, updatedAt: 1 });
    const entryId = await ctx.db.insert("creditEntries", { businessId, customerId, kind: "opening", deltaCents: 100, balanceAfterCents: 100, openingSource: "existing_customer_balance_unreconciled", createdBy: "owner", createdAt: 1 });
    const stateId = await ctx.db.insert("creditAllocationState", { businessId, customerId, status: "ready", cursor: null, outstandingCents: 100, lastEntryId: entryId, updatedAt: 1 });
    const debtId = await ctx.db.insert("creditDebts", { businessId, customerId, entryId, principalCents: 100, remainingCents: 100, unreconciled: true, status: "open", createdAt: 1 });
    return { accountId, stateId, debtId };
  });
  expect((await owner.query(accounts, args)).page[0].allocationStatus).toBe("unreconciled");
  await t.run(async ctx => {
    await ctx.db.patch(customerId, { totalCreditUsedCents: 0 });
    await ctx.db.patch(ids.accountId, { balanceCents: 0 }); await ctx.db.patch(ids.stateId, { outstandingCents: 0 }); await ctx.db.patch(ids.debtId, { remainingCents: 0, status: "paid" });
  });
  expect((await owner.query(accounts, args)).page[0].allocationStatus).toBe("ready");
});
it("resolves canonical or explicitly linked legacy IDs, allowing inactive reporting and rejecting foreign/missing", async () => {
  const { t, owner, businessId, customerId } = await setup();
  await t.run(ctx => ctx.db.patch(customerId, { isActive: false, legacyPrismaId: "legacy-customer" }));
  const args = { businessId, expectedUserId: "owner" };
  expect(await owner.query(scope, args)).toEqual({ businessId });
  for (const id of [customerId, "legacy-customer"]) expect(await owner.query(scope, { ...args, customerId: id })).toEqual({ businessId, customerId });
  await expect(owner.query(scope, { ...args, customerId: "missing" })).rejects.toThrow(/NOT_FOUND/);
  const foreign = await t.withIdentity({ subject: "foreign" }).mutation(api.onboarding.createBusinessOnboarding, { businessName: "Other" });
  const foreignId = await t.run(ctx => ctx.db.insert("customers", { ...fields, businessId: foreign.businessId }));
  await expect(owner.query(scope, { ...args, customerId: foreignId })).rejects.toThrow(/NOT_FOUND/);
  await expect(owner.query(scope, { ...args, expectedUserId: "foreign" })).rejects.toThrow(/FORBIDDEN/);
});
