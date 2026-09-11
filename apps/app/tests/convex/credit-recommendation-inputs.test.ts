import { afterEach, beforeEach, expect, it, vi } from "vitest";
import { convexTest } from "convex-test";
import { makeFunctionReference } from "convex/server";
import schema from "../../convex/schema";
import { api } from "../../convex/_generated/api";
import type { Id } from "../../convex/_generated/dataModel";
import * as inputs from "../../convex/creditRecommendationInputs";
import * as onboarding from "../../convex/onboarding";
import * as generated from "../../convex/_generated/api";
const DAY = 86400000, now = Date.UTC(2026, 8, 6, 12), asOfDate = Date.UTC(2026, 8, 6);
const read = makeFunctionReference<"query", { businessId: string; expectedUserId: string; customerId: string; asOfDate: number }, {
  customerId: Id<"customers">; businessId: Id<"businesses">; asOfDate: number; observedAt: number; metricVersion: string; coverage: string; ledgerRevision: Id<"creditEntries"> | null;
  policy: { revision: number; creditEnabled: boolean; limitCents: number; balanceCents: number };
  credit: { issuedCents: number; issued30dCents: number; issued90dCents: number; repaidCents: number; issueCount: number; creditSaleCount: number };
  sales: { salesCents: number; sales30dCents: number; sales90dCents: number; completedSaleCount: number; firstSaleAt: number | null; latestSaleAt: number | null };
  inventory: { valuation: string; catalogCostCents: number; catalogSellingCents: number; productCount: number; lowStockProductCount: number }; repaymentTiming: string;
}>("creditRecommendationInputs:read");
const customerFields = { firstName: "Private name", email: "private@example.invalid", totalPurchasesCents: 0, totalCreditUsedCents: 0, creditLimitCents: 1000, purchaseCount: 0, loyaltyTier: "standard", discountRateBps: 0, isActive: true, createdAt: 1, updatedAt: 1 };
const productFields = { sku: "private-sku", productName: "Private product", unitCostCents: 101, sellingPriceCents: 151, quantityOnHandGrams: 1.25, reorderLevelGrams: 2, allowFractionalWeight: true, isActive: true, createdAt: 1, updatedAt: 1 };
const saleFields = { orderNumber: "fixture", orderStatus: "completed", subtotalCents: 100, taxAmountCents: 0, totalAmountCents: 100, amountPaidCents: 100, changeAmountCents: 0, paymentMethod: "cash", createdBy: "owner", createdAt: now, updatedAt: now };
beforeEach(() => { vi.useFakeTimers(); vi.setSystemTime(now); });
afterEach(() => { vi.useRealTimers(); });
async function setup() {
  const t = convexTest(schema, { "creditRecommendationInputs.ts": async () => inputs, "onboarding.ts": async () => onboarding, "_generated/api.js": async () => generated });
  const owner = t.withIdentity({ subject: "owner" });
  const { businessId } = await owner.mutation(api.onboarding.createBusinessOnboarding, { businessName: "Synthetic" });
  const customerId = await t.run(ctx => ctx.db.insert("customers", { ...customerFields, businessId }));
  return { t, owner, businessId, customerId, args: { businessId, customerId, expectedUserId: "owner", asOfDate } };
}
it("reads completed occurrence-time sales and precise active catalog valuation without private content", async () => {
  const { t, owner, businessId, customerId, args } = await setup();
  await t.run(async ctx => {
    await ctx.db.insert("products", { ...productFields, businessId });
    await ctx.db.insert("products", { ...productFields, businessId, quantityOnHandGrams: 100, isActive: false });
    for (const [orderStatus, days, totalAmountCents] of [["completed", 1, 125], ["completed", 40, 275], ["completed", 100, 300], ["pending", 1, 999], ["cancelled", 1, 999], ["refunded", 1, 999]] as const) await ctx.db.insert("sales", { ...saleFields, businessId, customerId, orderStatus, totalAmountCents, occurredAt: now - days * DAY });
  });
  const result = await owner.query(read, args);
  expect(result.sales).toEqual({ salesCents: 700, sales30dCents: 125, sales90dCents: 400, completedSaleCount: 3, firstSaleAt: now - 100 * DAY, latestSaleAt: now - DAY });
  expect(result.inventory).toEqual({ valuation: "catalog_cost", catalogCostCents: 126.25, catalogSellingCents: 188.75, productCount: 1, lowStockProductCount: 1 });
  expect(result.metricVersion).toBe("canonical_facts_v1");
  expect(result.repaymentTiming).toBe("not_evaluated"); expect(result.coverage).toBe("allocation_pending");
  expect(JSON.stringify(result)).not.toMatch(/Private|private-sku|private@example|risk_score|on_time/);
});
it("returns explicit pending coverage and empty dates, and detects a same-balance new ledger revision", async () => {
  const { t, owner, businessId, customerId, args } = await setup();
  const initial = await owner.query(read, args);
  expect(initial.coverage).toBe("allocation_pending"); expect(initial.sales.firstSaleAt).toBeNull(); expect(initial.ledgerRevision).toBeNull();
  const stateId = await t.run(ctx => ctx.db.insert("creditAllocationState", { businessId, customerId, status: "ready", cursor: null, outstandingCents: 0, updatedAt: now }));
  expect((await owner.query(read, args)).coverage).toBe("canonical");
  const lastEntry = await t.run(async ctx => {
    await ctx.db.insert("creditAccounts", { businessId, customerId, balanceCents: 0, createdAt: now, updatedAt: now });
    await ctx.db.insert("creditEntries", { businessId, customerId, kind: "issue", deltaCents: 100, balanceAfterCents: 100, createdBy: "owner", createdAt: now });
    return ctx.db.insert("creditEntries", { businessId, customerId, kind: "payment", deltaCents: -100, balanceAfterCents: 0, createdBy: "owner", createdAt: now });
  });
  const stale = await owner.query(read, args);
  expect(stale.policy.balanceCents).toBe(0); expect(stale.ledgerRevision).toBe(lastEntry); expect(stale.coverage).toBe("allocation_pending");
  await t.run(ctx => ctx.db.patch(stateId, { lastEntryId: lastEntry }));
  expect((await owner.query(read, args)).coverage).toBe("canonical");
});
it("retains opening and legacy history coverage and distinguishes issue versus sale counts", async () => {
  const { t, owner, businessId, customerId, args } = await setup();
  await t.run(async ctx => {
    await ctx.db.patch(customerId, { totalCreditUsedCents: 450 });
    await ctx.db.insert("creditAccounts", { businessId, customerId, balanceCents: 450, createdAt: now, updatedAt: now });
    for (const [kind, deltaCents, balanceAfterCents, days] of [["opening", 100, 100, 100], ["issue", 200, 300, 40], ["sale", 200, 500, 1], ["payment", -50, 450, 0]] as const) await ctx.db.insert("creditEntries", { businessId, customerId, kind, deltaCents, balanceAfterCents, createdBy: "owner", createdAt: now - days * DAY, ...(kind === "opening" ? { openingSource: "existing_customer_balance_unreconciled" as const } : {}) });
  });
  const result = await owner.query(read, args);
  expect(result.coverage).toBe("historical_reconciliation_required");
  expect(result.credit).toEqual({ issuedCents: 400, issued30dCents: 200, issued90dCents: 400, repaidCents: 50, issueCount: 1, creditSaleCount: 1 });
  const other = await setup();
  await other.t.run(ctx => ctx.db.patch(other.customerId, { legacyPrismaId: "mapped" }));
  expect((await other.owner.query(read, { ...other.args, customerId: "mapped" })).coverage).toBe("historical_reconciliation_required");
});
it("enforces both permissions, selected tenant and expected operator", async () => {
  const { t, owner, businessId, args } = await setup();
  const foreign = t.withIdentity({ subject: "foreign" });
  const other = await foreign.mutation(api.onboarding.createBusinessOnboarding, { businessName: "Other" });
  await expect(foreign.query(read, { ...args, expectedUserId: "foreign" })).rejects.toThrow(/FORBIDDEN/);
  await expect(foreign.query(read, { ...args, expectedUserId: "foreign", businessId: other.businessId })).rejects.toThrow(/NOT_FOUND/);
  await expect(owner.query(read, { ...args, expectedUserId: "changed" })).rejects.toThrow(/FORBIDDEN/);
  await expect(t.query(read, args)).rejects.toThrow(/UNAUTHENTICATED/);
  const staffId = await t.run(ctx => ctx.db.insert("users", { businessId, clerkUserId: "staff", email: "staff@example.invalid", role: "MEMBER", status: "ACTIVE", createdAt: now, updatedAt: now }));
  const staff = t.withIdentity({ subject: "staff" });
  await expect(staff.query(read, { ...args, expectedUserId: "staff" })).rejects.toThrow(/FORBIDDEN/);
  await t.run(ctx => ctx.db.patch(staffId, { role: "__fixture_no_defaults__", permissions: { "reports.view_all": true } }));
  await expect(staff.query(read, { ...args, expectedUserId: "staff" })).rejects.toThrow(/FORBIDDEN/);
  await t.run(ctx => ctx.db.patch(staffId, { permissions: { "reports.view_all": true, "customers.manage": true } }));
  expect((await staff.query(read, { ...args, expectedUserId: "staff" })).customerId).toBe(args.customerId);
  await t.run(ctx => ctx.db.patch(staffId, { status: "SUSPENDED" }));
  await expect(staff.query(read, { ...args, expectedUserId: "staff" })).rejects.toThrow(/FORBIDDEN/);
});
it.each([{ kind: "payment" as const, deltaCents: 1, balanceAfterCents: 1 }, { kind: "issue" as const, deltaCents: 1.5, balanceAfterCents: 1 }, { kind: "issue" as const, deltaCents: 100, balanceAfterCents: 99 }])("rejects invalid ledger direction and conservation %j", async entry => {
  const { t, owner, businessId, customerId, args } = await setup();
  await t.run(ctx => ctx.db.insert("creditEntries", { ...entry, businessId, customerId, createdBy: "owner", createdAt: now }));
  await expect(owner.query(read, args)).rejects.toThrow(/INVALID_STATE/);
});
it("rejects mismatched account balance and stale calendar dates", async () => {
  const { t, owner, businessId, customerId, args } = await setup();
  await expect(owner.query(read, { ...args, asOfDate: asOfDate - DAY })).rejects.toThrow(/INVALID_ARGUMENT/);
  await t.run(ctx => ctx.db.insert("creditAccounts", { businessId, customerId, balanceCents: 1, createdAt: now, updatedAt: now }));
  await expect(owner.query(read, args)).rejects.toThrow(/INVALID_STATE/);
});
it("rejects unknown sale status, foreign ownership and invalid pending amounts", async () => {
  const { t, owner, businessId, customerId, args } = await setup();
  const saleId = await t.run(ctx => ctx.db.insert("sales", { ...saleFields, businessId, customerId, orderStatus: "unknown" }));
  await expect(owner.query(read, args)).rejects.toThrow(/INVALID_STATE/);
  await t.run(ctx => ctx.db.delete(saleId));
  const other = await t.withIdentity({ subject: "other" }).mutation(api.onboarding.createBusinessOnboarding, { businessName: "Other" });
  const foreignSale = await t.run(ctx => ctx.db.insert("sales", { ...saleFields, businessId: other.businessId, customerId }));
  await expect(owner.query(read, args)).rejects.toThrow(/INVALID_STATE/);
  await t.run(ctx => ctx.db.delete(foreignSale));
  await t.run(ctx => ctx.db.insert("creditAllocationState", { businessId, customerId, status: "pending", cursor: null, outstandingCents: 0, pendingPaymentCents: -1, updatedAt: now }));
  await expect(owner.query(read, args)).rejects.toThrow(/INVALID_STATE/);
});
it("rejects fractional overflow past the safe valuation boundary", async () => {
  const { t, owner, businessId, args } = await setup();
  await t.run(async ctx => {
    await ctx.db.insert("products", { ...productFields, businessId, quantityOnHandGrams: 1, unitCostCents: Number.MAX_SAFE_INTEGER, sellingPriceCents: Number.MAX_SAFE_INTEGER });
    await ctx.db.insert("products", { ...productFields, businessId, quantityOnHandGrams: 0.25, unitCostCents: 1, sellingPriceCents: 1 });
  });
  await expect(owner.query(read, args)).rejects.toThrow(/INVALID_STATE/);
});
it.each(["products", "sales", "creditEntries"] as const)("rejects incomplete %s history above the 2048-row cap", async table => {
  const { t, owner, businessId, customerId, args } = await setup();
  await t.run(async ctx => {
    for (let i = 0; i < 2049; i++) {
      if (table === "products") await ctx.db.insert("products", { ...productFields, businessId });
      else if (table === "sales") await ctx.db.insert("sales", { ...saleFields, businessId, customerId });
      else await ctx.db.insert("creditEntries", { businessId, customerId, kind: "issue", deltaCents: 1, balanceAfterCents: i + 1, createdBy: "owner", createdAt: now });
    }
  });
  await expect(owner.query(read, args)).rejects.toThrow(/CAPACITY_EXCEEDED/);
});

it("accepts exactly 2048 products without rounding fractional catalog values", async () => {
  const { t, owner, businessId, args } = await setup();
  await t.run(async ctx => { for (let i = 0; i < 2048; i++) await ctx.db.insert("products", { ...productFields, businessId }); });
  const result = await owner.query(read, args);
  expect(result.inventory.productCount).toBe(2048);
  expect(result.inventory.catalogCostCents).toBe(2048 * 126.25);
});

it("freezes rolling boundaries while retaining live facts for comparison", async () => {
  const { t, owner, businessId, customerId, args } = await setup();
  const productId = await t.run(async ctx => {
    await ctx.db.patch(customerId, { totalCreditUsedCents: 100 });
    await ctx.db.insert("creditAccounts", { businessId, customerId, balanceCents: 100, createdAt: now, updatedAt: now });
    await ctx.db.insert("creditEntries", { businessId, customerId, kind: "issue", deltaCents: 100, balanceAfterCents: 100, createdBy: "owner", createdAt: now - 30 * DAY });
    await ctx.db.insert("sales", { ...saleFields, businessId, customerId, occurredAt: now - 90 * DAY });
    return ctx.db.insert("products", { ...productFields, businessId });
  });
  const first = await owner.query(read, args);
  vi.setSystemTime(now + 1);
  const live = await owner.query(read, args);
  expect(first.credit.issued30dCents).toBe(100); expect(live.credit.issued30dCents).toBe(0);
  expect(first.sales.sales90dCents).toBe(100); expect(live.sales.sales90dCents).toBe(0);
  const frozen = () => owner.query(ctx => inputs.readCreditRecommendationInputs(ctx, args, { snapshotAt: now }));
  expect(await frozen()).toEqual(first);
  await t.run(ctx => ctx.db.patch(productId, { quantityOnHandGrams: 2.25 }));
  expect((await frozen()).inventory.catalogCostCents).toBe(227.25);
  await t.run(ctx => ctx.db.insert("sales", { ...saleFields, businessId, customerId, occurredAt: now + 1 }));
  await expect(frozen()).rejects.toThrow(/INVALID_STATE: Invalid sale date/);
});
it.each([now + 1, now + 0.5, -1, NaN, Infinity, Number.MAX_SAFE_INTEGER, asOfDate - 1])("rejects invalid or mismatched internal snapshot %s", async snapshotAt => {
  const { owner, args } = await setup();
  await expect(owner.query(ctx => inputs.readCreditRecommendationInputs(ctx, args, { snapshotAt }))).rejects.toThrow(/INVALID_ARGUMENT/);
});
it("rechecks current permission and operator for a frozen snapshot", async () => {
  const { t, owner, args } = await setup();
  expect(await owner.query(ctx => inputs.readCreditRecommendationInputs(ctx, args, { snapshotAt: now }))).toEqual(await owner.query(read, args));
  await expect(owner.query(ctx => inputs.readCreditRecommendationInputs(ctx, { ...args, expectedUserId: "changed" }, { snapshotAt: now }))).rejects.toThrow(/FORBIDDEN/);
  await t.run(async ctx => {
    const user = await ctx.db.query("users").withIndex("by_clerkUserId", q => q.eq("clerkUserId", "owner")).unique();
    await ctx.db.patch(user!._id, { status: "SUSPENDED" });
  });
  vi.setSystemTime(now + 1000);
  await expect(owner.query(ctx => inputs.readCreditRecommendationInputs(ctx, args, { snapshotAt: now }))).rejects.toThrow(/FORBIDDEN/);
});
it("does not expose the internal snapshot option on the public query", async () => {
  const { owner, args } = await setup();
  await expect(owner.query(read, { ...args, snapshotAt: now } as typeof args)).rejects.toThrow();
});

it("expires frozen snapshots at the UTC date boundary", async () => {
  const { owner, args } = await setup();
  vi.setSystemTime(asOfDate + DAY);
  await expect(owner.query(ctx => inputs.readCreditRecommendationInputs(ctx, args, { snapshotAt: now }))).rejects.toThrow(/INVALID_ARGUMENT/);
});
it("returns the observed cutoff and detects policy revisions even with unchanged limits", async () => {
  const { t, owner, args, customerId } = await setup();
  const first = await owner.query(read, args);
  expect(first.observedAt).toBe(now); expect(first.policy.revision).toBe(0);
  await t.run(ctx => ctx.db.patch(customerId, { creditPolicyRevision: 2 }));
  const next = await owner.query(ctx => inputs.readCreditRecommendationInputs(ctx, args, { snapshotAt: now }));
  expect(next.policy).toEqual({ ...first.policy, revision: 2 });
  await t.run(ctx => ctx.db.patch(customerId, { creditPolicyRevision: -1 }));
  await expect(owner.query(read, args)).rejects.toThrow(/INVALID_STATE/);
});
