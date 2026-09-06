import { afterEach, beforeEach, expect, it, vi } from "vitest";
import { convexTest } from "convex-test";
import { makeFunctionReference, type FunctionReturnType } from "convex/server";
import schema from "../../convex/schema";
import { api } from "../../convex/_generated/api";
import * as generated from "../../convex/_generated/api";
import * as credit from "../../convex/credit";
import * as creditAllocation from "../../convex/creditAllocation";
import * as customers from "../../convex/customers";
import * as onboarding from "../../convex/onboarding";
import type { Id } from "../../convex/_generated/dataModel";
const modules = { "creditAllocation.ts": async () => creditAllocation, "credit.ts": async () => credit, "customers.ts": async () => customers, "onboarding.ts": async () => onboarding, "_generated/api.js": async () => generated };
const refresh = makeFunctionReference<"mutation", { customerId: Id<"customers"> }, null>("creditAllocation:refresh");
const advance = makeFunctionReference<"mutation", { customerId: Id<"customers"> }, null>("creditAllocation:advance");
const aging = makeFunctionReference<"query", { customerId: Id<"customers">; asOfDate: number; paginationOpts: { cursor: string | null; numItems: number } }, { status: string; balanceCents: number; revision?: string; page: Array<{ bucket: string; remainingCents: number }>; isDone: boolean; continueCursor: string }>("creditAllocation:agingPage");
beforeEach(() => { vi.useFakeTimers(); });
afterEach(() => { vi.useRealTimers(); });
async function fixture() {
  const t = convexTest(schema, modules);
  const owner = t.withIdentity({ subject: "allocation-owner" });
  await owner.mutation(api.onboarding.createBusinessOnboarding, { businessName: "Synthetic allocation" });
  const customerId = await owner.mutation(api.customers.createCustomer, { firstName: "Synthetic", creditLimitCents: 0 });
  const drain = () => t.finishAllScheduledFunctions(vi.runAllTimers);
  const read = () => owner.query(aging, { customerId, asOfDate: Date.parse("2028-03-10T00:00:00Z"), paginationOpts: { cursor: null, numItems: 100 } });
  return { t, owner, customerId, drain, read };
}
it("allocates partial repayments in debt creation order and refreshes aging after later writes", async () => {
  const { t, owner, customerId, drain, read } = await fixture();
  await owner.mutation(api.credit.issueCustomerCredit, { customerId, amountCents: 1000, dueAt: Date.parse("2028-03-01T00:00:00Z") });
  await owner.mutation(api.credit.issueCustomerCredit, { customerId, amountCents: 500, dueAt: Date.parse("2028-02-01T00:00:00Z") });
  await owner.mutation(api.credit.recordCreditPayment, { customerId, paymentAmountCents: 1200, requestKey: "allocation-pay-1" });
  await owner.mutation(refresh, { customerId });
  expect((await read()).status).toBe("pending");
  await drain();
  expect(await read()).toMatchObject({ status: "ready", balanceCents: 300, page: [{ bucket: "31_plus", remainingCents: 300 }] });
  const rows = await t.run(ctx => ctx.db.query("creditPaymentAllocations").collect());
  expect(rows.map(row => row.amountCents)).toEqual([1000, 200]);
  await owner.mutation(api.credit.recordCreditPayment, { customerId, paymentAmountCents: 300, requestKey: "allocation-pay-2" });
  expect((await read()).status).toBe("pending");
  await drain();
  expect(await read()).toMatchObject({ status: "ready", balanceCents: 0, page: [] });
  await owner.mutation(api.credit.recordCreditPayment, { customerId, paymentAmountCents: 300, requestKey: "allocation-pay-2" });
  await owner.mutation(refresh, { customerId }); await drain();
  expect(await t.run(ctx => ctx.db.query("creditPaymentAllocations").collect())).toHaveLength(3);
});
it("keeps unreconciled opening and undated debt separate from overdue buckets", async () => {
  const { t, owner, customerId, drain, read } = await fixture();
  await t.run(ctx => ctx.db.patch(customerId, { totalCreditUsedCents: 500 }));
  await owner.mutation(api.credit.issueCustomerCredit, { customerId, amountCents: 200 });
  await owner.mutation(refresh, { customerId }); await drain();
  expect((await read()).page).toEqual(expect.arrayContaining([{ bucket: "unreconciled", remainingCents: 500, entryId: expect.any(String) }, { bucket: "undated", remainingCents: 200, entryId: expect.any(String) }]));
});
it("resumes a payment spanning more than 64 debts without dropping or duplicating allocations", async () => {
  const { t, owner, customerId, drain, read } = await fixture();
  await owner.mutation(api.credit.issueCustomerCredit, { customerId, amountCents: 1 });
  await t.run(async ctx => {
    const customer = (await ctx.db.get(customerId))!;
    for (let i = 2; i <= 140; i++) await ctx.db.insert("creditEntries", { businessId: customer.businessId, customerId, kind: "issue", deltaCents: 1, balanceAfterCents: i, createdBy: "allocation-owner", createdAt: Date.now() });
    const account = (await ctx.db.query("creditAccounts").first())!;
    await ctx.db.patch(account._id, { balanceCents: 140 });
    await ctx.db.patch(customerId, { totalCreditUsedCents: 140 });
  });
  await owner.mutation(api.credit.recordCreditPayment, { customerId, paymentAmountCents: 139 });
  await owner.mutation(refresh, { customerId });
  // The fixture has 141 debt/opening entries plus a payment spanning 3 steps.
  // convex-test's generic drain stops at 100; explicitly bound this replay.
  let completed = false;
  for (let step = 0; step < 200; step++) {
    vi.runAllTimers();
    await t.finishInProgressScheduledFunctions();
    if ((await read()).status === "ready") { completed = true; break; }
  }
  expect(completed).toBe(true);
  expect(await read()).toMatchObject({ status: "ready", balanceCents: 1 });
  const rows = await t.run(ctx => ctx.db.query("creditPaymentAllocations").collect());
  expect(rows).toHaveLength(139);
  expect(new Set(rows.map(row => row.debtEntryId)).size).toBe(139);
  expect((await read()).page.reduce((sum, row) => sum + row.remainingCents, 0)).toBe(1);
});
it("denies foreign access and refuses to present an inconsistent balance as ready", async () => {
  const { t, owner, customerId, drain, read } = await fixture();
  await owner.mutation(api.credit.issueCustomerCredit, { customerId, amountCents: 100 });
  await owner.mutation(refresh, { customerId }); await drain();
  const other = t.withIdentity({ subject: "allocation-other" });
  await other.mutation(api.onboarding.createBusinessOnboarding, { businessName: "Other" });
  await expect(other.mutation(refresh, { customerId })).rejects.toThrow("NOT_FOUND");
  await expect(other.query(aging, { customerId, asOfDate: 0, paginationOpts: { cursor: null, numItems: 100 } })).rejects.toThrow("NOT_FOUND");
  await t.run(async ctx => {
    await ctx.db.patch(customerId, { totalCreditUsedCents: 90 });
    const state = (await ctx.db.query("creditAllocationState").first())!;
    await ctx.db.patch(state._id, { status: "pending" });
  });
  expect((await read()).status).toBe("pending");
  await expect(t.mutation(advance, { customerId })).rejects.toThrow("reconciliation");
});

it("places due dates on exact aging boundaries and pages a consistent revision", async () => {
  const { owner, customerId, drain } = await fixture();
  const asOfDate = Date.parse("2028-03-10T00:00:00Z");
  for (const days of [-1, 0, 1, 7, 8, 14, 15, 30, 31]) await owner.mutation(api.credit.issueCustomerCredit, { customerId, amountCents: 100, dueAt: asOfDate - days * 86_400_000 });
  await owner.mutation(refresh, { customerId }); await drain();
  let cursor: string | null = null;
  let revision: string | undefined;
  const buckets: string[] = [];
  do {
    const page: FunctionReturnType<typeof aging> = await owner.query(aging, { customerId, asOfDate, paginationOpts: { cursor, numItems: 2 } });
    expect(page.status).toBe("ready");
    expect(page.balanceCents).toBe(900);
    if (revision) expect(page.revision).toBe(revision);
    revision = page.revision;
    buckets.push(...page.page.map(row => row.bucket));
    cursor = page.isDone ? null : page.continueCursor;
  } while (cursor);
  expect(buckets).toEqual(["current", "current", "1_7", "1_7", "8_14", "8_14", "15_30", "15_30", "31_plus"]);
});

it("tails an initially empty account and successive single-entry additions", async () => {
  const { t, owner, customerId, drain, read } = await fixture();
  await owner.mutation(refresh, { customerId }); await drain();
  expect(await read()).toMatchObject({ status: "ready", balanceCents: 0, page: [] });
  for (let i = 1; i <= 3; i++) {
    await owner.mutation(api.credit.issueCustomerCredit, { customerId, amountCents: 100 });
    await drain();
    expect(await read()).toMatchObject({ status: "ready", balanceCents: i * 100 });
  }
  expect(await t.run(ctx => ctx.db.query("creditDebts").collect())).toHaveLength(3);
});
