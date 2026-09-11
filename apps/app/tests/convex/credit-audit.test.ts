import { expect, it } from "vitest";
import { convexTest } from "convex-test";
import { makeFunctionReference } from "convex/server";
import schema from "../../convex/schema";
import { api } from "../../convex/_generated/api";
import * as audit from "../../convex/creditAudit";
import * as credit from "../../convex/credit";
import * as customers from "../../convex/customers";
import * as onboarding from "../../convex/onboarding";
import * as generated from "../../convex/_generated/api";
type Result = { items: Array<{ id: string; action: string; entity_type: string; transaction_id: null; performed_by: string; timestamp: string }>; data: Result["items"]; count: number; isDone: boolean; continueCursor: string; coverage: string; legacyHistoryIncluded: false };
const page = makeFunctionReference<"query", { businessId: string; expectedUserId: string; customerId?: string; accountId?: string; paginationOpts: { cursor: string | null; numItems: number } }, Result>("creditAudit:page");
async function setup() {
  const t = convexTest(schema, { "creditAudit.ts": async () => audit, "credit.ts": async () => credit, "customers.ts": async () => customers, "onboarding.ts": async () => onboarding, "_generated/api.js": async () => generated });
  const owner = t.withIdentity({ subject: "private-owner" });
  const { businessId } = await owner.mutation(api.onboarding.createBusinessOnboarding, { businessName: "Synthetic" });
  const customerId = await owner.mutation(api.customers.createCustomer, { firstName: "Private synthetic name", creditLimitCents: 10000 });
  return { t, owner, businessId, customerId, args: { businessId, customerId, expectedUserId: "private-owner", paginationOpts: { cursor: null as string | null, numItems: 100 } } };
}
it("reads actual canonical credit writes without metadata, notes or amounts and retains opaque actor provenance", async () => {
  const { t, owner, customerId, args } = await setup();
  await owner.mutation(api.credit.issueCustomerCredit, { customerId, amountCents: 500, description: "Private credit note" });
  await owner.mutation(api.credit.recordCreditPayment, { customerId, paymentAmountCents: 100, description: "Private payment note" });
  await owner.mutation(api.credit.configureCustomerCredit, { customerId, creditEnabled: true, creditLimitCents: 9000 });
  await owner.mutation(api.credit.resolvePendingRequest, { customerId, requestKey: "cancel-private", businessId: args.businessId, expectedUserId: args.expectedUserId });
  const result = await owner.query(page, args);
  expect(result.items.map(item => item.action).sort()).toEqual(["CUSTOMER_CREDIT_ISSUED", "CUSTOMER_CREDIT_PAYMENT", "CUSTOMER_CREDIT_POLICY_CHANGED", "CUSTOMER_CREDIT_REQUEST_CANCELLED"].sort());
  expect(result.items.every(item => item.performed_by === "private-owner")).toBe(true);
  expect(result.data).toEqual(result.items); expect(result.count).toBe(4);
  expect(result).toMatchObject({ coverage: "canonical_customer_credit_events", legacyHistoryIncluded: false });
  for (const item of result.items) expect(Object.keys(item).sort()).toEqual(["action", "entity_type", "id", "performed_by", "timestamp", "transaction_id"]);
  expect(JSON.stringify(result)).not.toMatch(/Private|deltaCents|balanceAfterCents|metadata|description/);
  expect(await t.run(ctx => ctx.db.query("creditEntries").collect())).toHaveLength(3);
});
it("paginates the indexed customer stream, retaining cursor even on sparse pages", async () => {
  const { t, owner, businessId, customerId, args } = await setup();
  await t.run(async ctx => {
    for (let i = 0; i < 5; i++) await ctx.db.insert("auditEvents", { businessId, userId: "private-owner", action: i % 2 ? "CUSTOMER_CREDIT_ISSUED" : "CUSTOMER_PRIVATE_EDIT", entityType: "customer", entityId: customerId, metadata: "Private metadata", timestamp: 100 + i });
  });
  const seen: string[] = []; let cursor: string | null = null; let sparse = false;
  for (let i = 0; i < 10; i++) {
    const result: Result = await owner.query(page, { ...args, paginationOpts: { cursor, numItems: 1 } });
    expect(result.count).toBe(result.items.length); expect(result.count).toBeLessThanOrEqual(1);
    if (!result.count && !result.isDone) sparse = true;
    seen.push(...result.items.map(item => item.id));
    if (result.isDone) break;
    expect(result.continueCursor).not.toBe(cursor); cursor = result.continueCursor;
  }
  expect(sparse).toBe(true); expect(seen).toHaveLength(2); expect(new Set(seen).size).toBe(2);
});
it("requires audit permission, selected tenant, expected actor and active membership", async () => {
  const { t, owner, businessId, args } = await setup();
  const foreign = t.withIdentity({ subject: "foreign" });
  const other = await foreign.mutation(api.onboarding.createBusinessOnboarding, { businessName: "Other" });
  await expect(foreign.query(page, { ...args, expectedUserId: "foreign" })).rejects.toThrow(/FORBIDDEN/);
  await expect(foreign.query(page, { ...args, businessId: other.businessId, expectedUserId: "foreign" })).rejects.toThrow(/NOT_FOUND/);
  await expect(owner.query(page, { ...args, expectedUserId: "changed" })).rejects.toThrow(/FORBIDDEN/);
  await expect(t.query(page, args)).rejects.toThrow(/UNAUTHENTICATED/);
  const userId = await t.run(ctx => ctx.db.insert("users", { businessId, clerkUserId: "auditor", email: "private@example.invalid", role: "MEMBER", status: "ACTIVE", createdAt: 1, updatedAt: 1 }));
  const auditor = t.withIdentity({ subject: "auditor" });
  await expect(auditor.query(page, { ...args, expectedUserId: "auditor" })).rejects.toThrow(/FORBIDDEN/);
  await t.run(ctx => ctx.db.patch(userId, { permissions: { "audit.view": true } }));
  expect((await auditor.query(page, { ...args, expectedUserId: "auditor" })).count).toBe(0);
  await t.run(ctx => ctx.db.patch(userId, { status: "SUSPENDED" }));
  await expect(auditor.query(page, { ...args, expectedUserId: "auditor" })).rejects.toThrow(/FORBIDDEN/);
});
it("resolves explicitly mapped customers and canonical accounts without interpreting legacy limit IDs as customers", async () => {
  const { t, owner, customerId, args } = await setup();
  await t.run(ctx => ctx.db.patch(customerId, { legacyPrismaId: "mapped-customer" }));
  await owner.mutation(api.credit.issueCustomerCredit, { customerId, amountCents: 100 });
  const account = await t.run(ctx => ctx.db.query("creditAccounts").withIndex("by_customerId", q => q.eq("customerId", customerId)).unique());
  const canonical = await owner.query(page, args);
  expect(await owner.query(page, { ...args, customerId: "mapped-customer" })).toEqual(canonical);
  expect(await owner.query(page, { ...args, customerId: undefined, accountId: account!._id })).toEqual(canonical);
  await expect(owner.query(page, { ...args, customerId: undefined, accountId: customerId })).rejects.toThrow(/NOT_FOUND/);
  await expect(owner.query(page, { ...args, customerId: undefined, accountId: "legacy-limit" })).rejects.toThrow(/NOT_FOUND/);
  const second = await owner.mutation(api.customers.createCustomer, { firstName: "Other synthetic" });
  await expect(owner.query(page, { ...args, customerId: second, accountId: account!._id })).rejects.toThrow(/NOT_FOUND/);
});
it.each([{ customerId: undefined }, { customerId: " " }, { paginationOpts: { cursor: null, numItems: 0 } }, { paginationOpts: { cursor: "", numItems: 10 } }, { paginationOpts: { cursor: null, numItems: 101 } }])("rejects malformed audit scope/pagination %j", async patch => {
  const { owner, args } = await setup();
  await expect(owner.query(page, { ...args, ...patch })).rejects.toThrow(/INVALID_ARGUMENT/);
});
