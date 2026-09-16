import { expect, it } from "vitest";
import { convexTest } from "convex-test";
import { makeFunctionReference } from "convex/server";
import schema from "../../convex/schema";
import { api } from "../../convex/_generated/api";
import type { Id } from "../../convex/_generated/dataModel";
import * as policy from "../../convex/creditPolicy";
import * as credit from "../../convex/credit";
import * as onboarding from "../../convex/onboarding";
import * as generatedApi from "../../convex/_generated/api";
type Scope = { businessId: string; expectedUserId: string; customerId: string };
type Change = Scope & { creditEnabled: boolean; limitCents: number; expectedCreditEnabled: boolean; expectedLimitCents: number; requestKey: string };
type Result = { customerId: Id<"customers">; creditEnabled: boolean; limitCents: number; unlimited: boolean; balanceCents: number };
const read = makeFunctionReference<"query", Scope, Result>("creditPolicy:read");
const change = makeFunctionReference<"mutation", Change, Result>("creditPolicy:change");
const fields = { totalPurchasesCents: 0, totalCreditUsedCents: 500, creditLimitCents: 1000, purchaseCount: 0, loyaltyTier: "standard", discountRateBps: 0, isActive: true, createdAt: 1, updatedAt: 1 };
async function setup() {
  const t = convexTest(schema, { "creditPolicy.ts": async () => policy, "credit.ts": async () => credit, "onboarding.ts": async () => onboarding, "_generated/api.js": async () => generatedApi });
  const owner = t.withIdentity({ subject: "owner" });
  const { businessId } = await owner.mutation(api.onboarding.createBusinessOnboarding, { businessName: "Synthetic" });
  const customerId = await t.run(ctx => ctx.db.insert("customers", { ...fields, businessId, firstName: "Private synthetic", phoneNumber: "Private phone" }));
  const scope = { businessId, expectedUserId: "owner", customerId };
  const args = { ...scope, creditEnabled: false, limitCents: 1000, expectedCreditEnabled: true, expectedLimitCents: 1000, requestKey: "policy-request-one" };
  return { t, owner, businessId, customerId, scope, args };
}
it("reads minimal canonical or explicitly mapped identity with normalized enabled flag", async () => {
  const { t, owner, businessId, customerId, scope } = await setup();
  await t.run(async ctx => { await ctx.db.patch(customerId, { legacyPrismaId: "legacy-customer" }); await ctx.db.patch(businessId, { legacyPrismaBusinessId: "legacy-business" }); });
  const result = await owner.query(read, { ...scope, businessId: "legacy-business", customerId: "legacy-customer" });
  expect(result).toEqual({ customerId, creditEnabled: true, limitCents: 1000, unlimited: false, balanceCents: 500 });
  expect(JSON.stringify(result)).not.toContain("Private");
});
it("freezes while retaining limit and allowing repayment; unfreeze restores availability without changing balance", async () => {
  const { t, owner, customerId, scope, args } = await setup();
  expect(await owner.mutation(change, args)).toMatchObject({ creditEnabled: false, limitCents: 1000, balanceCents: 500 });
  await expect(owner.mutation(api.credit.issueCustomerCredit, { customerId, amountCents: 100, requestKey: "issue-frozen" })).rejects.toThrow(/disabled/);
  await owner.mutation(api.credit.recordCreditPayment, { customerId, paymentAmountCents: 200, requestKey: "payment-frozen" });
  expect(await owner.mutation(change, { ...args, creditEnabled: true, expectedCreditEnabled: false, requestKey: "unfreeze-request" })).toMatchObject({ creditEnabled: true, limitCents: 1000, balanceCents: 300 });
  expect((await owner.query(read, scope)).balanceCents).toBe(300);
  const entries = await t.run(ctx => ctx.db.query("creditEntries").collect());
  expect(entries.map(entry => entry.kind)).toEqual(["opening", "payment"]);
});
it("distinguishes enabled zero unlimited from disabled zero", async () => {
  const { owner, args } = await setup();
  expect(await owner.mutation(change, { ...args, creditEnabled: true, limitCents: 0 })).toMatchObject({ unlimited: true, balanceCents: 500 });
  expect(await owner.mutation(change, { ...args, limitCents: 0, expectedLimitCents: 0, requestKey: "freeze-zero" })).toMatchObject({ unlimited: false, creditEnabled: false, balanceCents: 500 });
});
it("replays an immutable receipt without overwriting later changes or duplicating its audit", async () => {
  const { t, owner, customerId, args } = await setup();
  const first = await owner.mutation(change, args);
  await owner.mutation(change, { ...args, creditEnabled: true, limitCents: 2000, expectedCreditEnabled: false, requestKey: "later-policy" });
  await t.run(ctx => ctx.db.patch(customerId, { totalCreditUsedCents: 700 }));
  expect(await owner.mutation(change, args)).toEqual(first);
  expect(await t.run(ctx => ctx.db.get(customerId))).toMatchObject({ creditEnabled: true, creditLimitCents: 2000, totalCreditUsedCents: 700 });
  const audits = await t.run(ctx => ctx.db.query("auditEvents").collect());
  expect(audits.filter(row => row.action === "CUSTOMER_CREDIT_POLICY_CHANGED")).toHaveLength(2);
  expect(await t.run(ctx => ctx.db.query("idempotencyKeys").collect())).toHaveLength(2);
  await expect(owner.mutation(change, { ...args, limitCents: 2000 })).rejects.toThrow(/IDEMPOTENCY_CONFLICT/);
});
it("rejects stale compare-and-set without writes", async () => {
  const { t, owner, args } = await setup();
  await expect(owner.mutation(change, { ...args, expectedCreditEnabled: false })).rejects.toThrow(/STALE_POLICY/);
  await expect(owner.mutation(change, { ...args, expectedLimitCents: 999 })).rejects.toThrow(/STALE_POLICY/);
  expect(await t.run(ctx => ctx.db.query("idempotencyKeys").collect())).toHaveLength(0);
  expect((await t.run(ctx => ctx.db.query("auditEvents").collect())).filter(row => row.action === "CUSTOMER_CREDIT_POLICY_CHANGED")).toHaveLength(0);
});
it.each([-1, 1.5, Infinity, NaN, Number.MAX_SAFE_INTEGER + 1])("rejects invalid limit and expected limit %s", async value => {
  const { owner, args } = await setup();
  await expect(owner.mutation(change, { ...args, limitCents: value })).rejects.toThrow(/INVALID_ARGUMENT/);
  await expect(owner.mutation(change, { ...args, expectedLimitCents: value })).rejects.toThrow(/INVALID_ARGUMENT/);
});
it("rejects malformed existing amounts and inactive new changes", async () => {
  const { t, owner, customerId, scope, args } = await setup();
  await t.run(ctx => ctx.db.patch(customerId, { totalCreditUsedCents: -1 }));
  await expect(owner.query(read, scope)).rejects.toThrow(/INVALID_STATE/);
  await expect(owner.mutation(change, args)).rejects.toThrow(/INVALID_STATE/);
  await t.run(ctx => ctx.db.patch(customerId, { totalCreditUsedCents: 500, isActive: false }));
  await expect(owner.query(read, scope)).rejects.toThrow(/NOT_FOUND/);
  await expect(owner.mutation(change, args)).rejects.toThrow(/NOT_FOUND/);
});
it("enforces actor, tenant, customer ownership and customer-management permission", async () => {
  const { t, owner, businessId, scope, args } = await setup();
  await expect(t.query(read, scope)).rejects.toThrow(/UNAUTHENTICATED/);
  await expect(owner.mutation(change, { ...args, expectedUserId: "different" })).rejects.toThrow(/FORBIDDEN/);
  const foreign = t.withIdentity({ subject: "foreign" });
  const other = await foreign.mutation(api.onboarding.createBusinessOnboarding, { businessName: "Other" });
  const otherCustomer = await t.run(ctx => ctx.db.insert("customers", { ...fields, businessId: other.businessId }));
  await expect(owner.query(read, { ...scope, customerId: otherCustomer })).rejects.toThrow(/NOT_FOUND/);
  await expect(owner.mutation(change, { ...args, customerId: otherCustomer })).rejects.toThrow(/NOT_FOUND/);
  await expect(owner.query(read, { ...scope, businessId: other.businessId })).rejects.toThrow(/FORBIDDEN/);
  await expect(owner.query(read, { ...scope, customerId: "missing" })).rejects.toThrow(/NOT_FOUND/);
  const member = t.withIdentity({ subject: "viewer" });
  await t.run(ctx => ctx.db.insert("users", { businessId, clerkUserId: "viewer", email: "viewer@example.invalid", role: "VIEWER", status: "ACTIVE", createdAt: 1, updatedAt: 1 }));
  await expect(member.query(read, { ...scope, expectedUserId: "viewer" })).rejects.toThrow(/FORBIDDEN/);
  await expect(member.mutation(change, { ...args, expectedUserId: "viewer" })).rejects.toThrow(/FORBIDDEN/);
});
it("keeps receipt keys actor-scoped and metadata minimal", async () => {
  const { t, owner, businessId, args } = await setup();
  await owner.mutation(change, args);
  await t.run(ctx => ctx.db.insert("users", { businessId, clerkUserId: "admin", email: "admin@example.invalid", role: "ADMIN", status: "ACTIVE", createdAt: 1, updatedAt: 1 }));
  await t.withIdentity({ subject: "admin" }).mutation(change, { ...args, expectedUserId: "admin", expectedCreditEnabled: false, creditEnabled: true });
  const audits = (await t.run(ctx => ctx.db.query("auditEvents").collect())).filter(row => row.action === "CUSTOMER_CREDIT_POLICY_CHANGED");
  expect(audits).toHaveLength(2);
  expect(JSON.parse(audits[0].metadata!)).toEqual({ previousEnabled: true, previousLimitCents: 1000, enabled: false, limitCents: 1000 });
});

it("authorizes inactive scope without PII and permits only saved archived retries", async () => {
  const { t, owner, businessId, customerId, scope, args } = await setup();
  const resolve = makeFunctionReference<"query", Scope, { businessId: Id<"businesses">; customerId: Id<"customers"> }>("creditPolicy:resolveScope");
  const original = await owner.mutation(change, args);
  await t.run(ctx => ctx.db.patch(customerId, { isActive: false }));
  expect(await owner.query(resolve, scope)).toEqual({ businessId, customerId });
  expect(await owner.mutation(change, args)).toEqual(original);
  await expect(owner.mutation(change, { ...args, requestKey: "new-archived" })).rejects.toThrow(/NOT_FOUND/);
  await expect(owner.query(resolve, { ...scope, expectedUserId: "foreign" })).rejects.toThrow(/FORBIDDEN/);
  await expect(owner.query(resolve, { ...scope, customerId: "missing" })).rejects.toThrow(/NOT_FOUND/);
});
