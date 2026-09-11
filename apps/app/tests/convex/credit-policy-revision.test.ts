import { afterEach, expect, it, vi } from "vitest";
import { convexTest } from "convex-test";
import { makeFunctionReference } from "convex/server";
import schema from "../../convex/schema";
import { api } from "../../convex/_generated/api";
import * as policy from "../../convex/creditPolicy";
import * as credit from "../../convex/credit";
import * as customers from "../../convex/customers";
import * as onboarding from "../../convex/onboarding";
import * as generated from "../../convex/_generated/api";
import { readCreditPolicyRevision, nextCreditPolicyRevision } from "../../convex/helpers/creditPolicyRevision";
type Args = { businessId: string; expectedUserId: string; customerId: string; creditEnabled: boolean; limitCents: number; expectedCreditEnabled: boolean; expectedLimitCents: number; requestKey: string };
const change = makeFunctionReference<"mutation", Args, { customerId: string; creditEnabled: boolean; limitCents: number; unlimited: boolean; balanceCents: number }>("creditPolicy:change");
async function setup() {
  const t = convexTest(schema, { "creditPolicy.ts": async () => policy, "credit.ts": async () => credit, "customers.ts": async () => customers, "onboarding.ts": async () => onboarding, "_generated/api.js": async () => generated });
  const owner = t.withIdentity({ subject: "owner" });
  const { businessId } = await owner.mutation(api.onboarding.createBusinessOnboarding, { businessName: "Synthetic" });
  const customerId = await owner.mutation(api.customers.createCustomer, { creditLimitCents: 1000 });
  await t.run(ctx => ctx.db.patch(customerId, { totalCreditUsedCents: 250 }));
  const args = { businessId, expectedUserId: "owner", customerId, creditEnabled: false, limitCents: 1000, expectedCreditEnabled: true, expectedLimitCents: 1000, requestKey: "first-policy" };
  return { t, owner, businessId, customerId, args, customer: () => t.run(ctx => ctx.db.get(customerId)) };
}
afterEach(() => { vi.restoreAllMocks(); });
it("creates revision zero and distinguishes same-timestamp A-to-B-to-A policy updates", async () => {
  vi.spyOn(Date, "now").mockReturnValue(1800000000000);
  const { owner, customerId, customer, args } = await setup();
  expect((await customer())?.creditPolicyRevision).toBe(0);
  await owner.mutation(api.credit.configureCustomerCredit, { customerId, creditEnabled: false, creditLimitCents: 1000 });
  expect((await customer())?.creditPolicyRevision).toBe(1);
  await owner.mutation(change, { ...args, expectedCreditEnabled: false, creditEnabled: true });
  expect(await customer()).toMatchObject({ creditPolicyRevision: 2, creditEnabled: true, creditLimitCents: 1000, totalCreditUsedCents: 250, updatedAt: 1800000000000 });
});
it("increments once for each new request including same values, while retries remain immutable", async () => {
  const { owner, customerId, customer, args } = await setup();
  const firstArgs = { ...args, creditEnabled: true };
  const original = await owner.mutation(change, firstArgs);
  expect((await customer())?.creditPolicyRevision).toBe(1);
  await owner.mutation(change, { ...firstArgs, requestKey: "same-values-new" });
  expect((await customer())?.creditPolicyRevision).toBe(2);
  await owner.mutation(api.credit.configureCustomerCredit, { customerId, creditEnabled: true, creditLimitCents: 1000 });
  expect((await customer())?.creditPolicyRevision).toBe(3);
  expect(await owner.mutation(change, firstArgs)).toEqual(original);
  expect((await customer())?.creditPolicyRevision).toBe(3);
  expect(original).not.toHaveProperty("creditPolicyRevision");
});
it.each(["configure", "change"] as const)("upgrades a missing legacy revision through %s", async writer => {
  const { t, owner, customerId, customer, args } = await setup();
  await t.run(ctx => ctx.db.patch(customerId, { creditPolicyRevision: undefined }));
  if (writer === "configure") await owner.mutation(api.credit.configureCustomerCredit, { customerId, creditEnabled: false, creditLimitCents: 1000 });
  else await owner.mutation(change, args);
  expect(await customer()).toMatchObject({ creditPolicyRevision: 1, totalCreditUsedCents: 250 });
});
it.each([-1, 1.5, NaN, Infinity, Number.MAX_SAFE_INTEGER])("rejects invalid or exhausted revisions atomically: %s", async revision => {
  const { t, owner, customerId, customer, args } = await setup();
  await t.run(ctx => ctx.db.patch(customerId, { creditPolicyRevision: revision }));
  const before = await customer();
  const auditsBefore = await t.run(ctx => ctx.db.query("auditEvents").collect());
  await expect(owner.mutation(api.credit.configureCustomerCredit, { customerId, creditEnabled: false, creditLimitCents: 500 })).rejects.toThrow(/INVALID_STATE/);
  await expect(owner.mutation(change, args)).rejects.toThrow(/INVALID_STATE/);
  expect(await customer()).toEqual(before);
  expect(await t.run(ctx => ctx.db.query("auditEvents").collect())).toEqual(auditsBefore);
  expect(await t.run(ctx => ctx.db.query("idempotencyKeys").collect())).toHaveLength(0);
});
it("normalizes only missing values and validates safe revision overflow", () => {
  expect(readCreditPolicyRevision(undefined)).toBe(0); expect(nextCreditPolicyRevision(undefined)).toBe(1);
  expect(nextCreditPolicyRevision(Number.MAX_SAFE_INTEGER - 1)).toBe(Number.MAX_SAFE_INTEGER);
  expect(() => nextCreditPolicyRevision(Number.MAX_SAFE_INTEGER)).toThrow(/INVALID_STATE/);
  expect(() => readCreditPolicyRevision(null as unknown as number)).toThrow(/INVALID_STATE/);
});
