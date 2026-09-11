import { afterEach, beforeEach, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";
import { convexTest } from "convex-test";
import schema from "../../convex/schema";
import { api } from "../../convex/_generated/api";
import * as generated from "../../convex/_generated/api";
import * as onboarding from "../../convex/onboarding";
import * as customers from "../../convex/customers";
import * as credit from "../../convex/credit";
import * as creditAllocation from "../../convex/creditAllocation";
import * as creditDashboard from "../../convex/creditDashboard";
const mocks = vi.hoisted(() => ({ user: vi.fn(), token: vi.fn(), query: vi.fn(), mutation: vi.fn() }));
vi.mock("@/lib/db", () => { throw new Error("Dashboard must not load Prisma"); });
vi.mock("@/lib/adapters/auth", () => ({ getCurrentUser: mocks.user }));
vi.mock("@/lib/auth/convex-token", () => ({ getConvexAuthToken: mocks.token }));
vi.mock("convex/browser", () => ({ ConvexHttpClient: class { setAuth() {} query = mocks.query; mutation = mocks.mutation; } }));
import { GET, POST } from "../../app/api/credit/dashboard/route";
const get = (params: Record<string, string>) => GET(new NextRequest(`https://example.invalid/api/credit/dashboard?${new URLSearchParams(params)}`));
const post = (body: unknown) => POST(new NextRequest("https://example.invalid/api/credit/dashboard", { method: "POST", body: JSON.stringify(body) }));
beforeEach(() => { vi.useFakeTimers(); vi.resetAllMocks(); vi.stubEnv("NEXT_PUBLIC_CONVEX_URL", "https://synthetic.convex.cloud"); mocks.user.mockResolvedValue({ id: "dashboard-owner" }); mocks.token.mockResolvedValue("synthetic"); });
afterEach(() => { vi.useRealTimers(); vi.unstubAllEnvs(); });
async function setup() {
  const t = convexTest(schema, { "_generated/api.js": async () => generated, "onboarding.ts": async () => onboarding, "customers.ts": async () => customers, "credit.ts": async () => credit, "creditAllocation.ts": async () => creditAllocation, "creditDashboard.ts": async () => creditDashboard });
  const owner = t.withIdentity({ subject: "dashboard-owner" });
  const { businessId } = await owner.mutation(api.onboarding.createBusinessOnboarding, { businessName: "Synthetic" });
  const customerId = await owner.mutation(api.customers.createCustomer, { firstName: "Private synthetic name", creditLimitCents: 0 });
  mocks.query.mockImplementation(owner.query.bind(owner)); mocks.mutation.mockImplementation(owner.mutation.bind(owner));
  return { t, owner, businessId, customerId };
}
it("returns private paged accounts and actual allocated remaining debt", async () => {
  const { t, owner, businessId, customerId } = await setup();
  await owner.mutation(api.credit.issueCustomerCredit, { customerId, amountCents: 1000, dueAt: Date.parse("2028-03-01T00:00:00Z") });
  await owner.mutation(api.credit.recordCreditPayment, { customerId, paymentAmountCents: 250 });
  const accounts = await get({ business_id: businessId });
  expect(accounts.status).toBe(200); expect(accounts.headers.get("cache-control")).toBe("private, no-store");
  const text = JSON.stringify(await accounts.json()); expect(text).not.toContain("Private synthetic name");
  const params = { business_id: businessId, customer_id: customerId, as_of_date: String(Date.parse("2028-03-10T00:00:00Z")) };
  expect(await (await get(params)).json()).toMatchObject({ status: "pending", balanceCents: 750 });
  expect(await (await post({ business_id: businessId, customer_id: customerId })).json()).toEqual({ success: true, status: "pending" });
  await t.finishAllScheduledFunctions(vi.runAllTimers);
  expect(await (await get(params)).json()).toMatchObject({ status: "ready", balanceCents: 750, page: [{ bucket: "8_14", remainingCents: 750 }] });
});
it("rejects foreign accounts, stale operators and malformed requests before refresh", async () => {
  const { t, owner, businessId, customerId } = await setup();
  const other = t.withIdentity({ subject: "other-dashboard" });
  const foreign = await other.mutation(api.onboarding.createBusinessOnboarding, { businessName: "Other" });
  expect((await post({ business_id: foreign.businessId, customer_id: customerId })).status).toBe(403);
  mocks.user.mockResolvedValue({ id: "different-operator" });
  expect((await post({ business_id: businessId, customer_id: customerId })).status).toBe(403);
  mocks.user.mockResolvedValue({ id: "dashboard-owner" });
  expect((await get({ business_id: businessId, expectedUserId: "forged" })).status).toBe(403);
  for (const query of ([{ limit: "0" }, { limit: "101" }, { cursor: "" }, { customer_id: customerId }, { customer_id: customerId, as_of_date: "1" }] as Array<Record<string, string>>)) expect((await get({ business_id: businessId, ...query })).status).toBe(400);
  expect((await post({ business_id: businessId, customer_id: customerId, expectedUserId: "forged" })).status).toBe(403);
  await expect(owner.mutation(api.creditAllocation.refresh, { customerId, businessId, expectedUserId: "forged" })).rejects.toThrow("FORBIDDEN");
  expect(await t.run(ctx => ctx.db.query("creditAllocationState").collect())).toHaveLength(0);
});
it("sanitizes unavailable services and requires authentication", async () => {
  const { businessId } = await setup();
  mocks.user.mockResolvedValue(null); expect((await get({ business_id: businessId })).status).toBe(401);
  mocks.user.mockResolvedValue({ id: "dashboard-owner" }); mocks.query.mockRejectedValueOnce(new Error("private backend payload"));
  const response = await get({ business_id: businessId }); expect(response.status).toBe(503); expect(JSON.stringify(await response.json())).not.toContain("private backend payload");
});

it("refuses invalid debt amounts and changed scope at the allocation query boundary", async () => {
  const { t, owner, businessId, customerId } = await setup();
  await owner.mutation(api.credit.issueCustomerCredit, { customerId, amountCents: 100 });
  await owner.mutation(api.creditAllocation.refresh, { customerId, businessId, expectedUserId: "dashboard-owner" });
  await t.finishAllScheduledFunctions(vi.runAllTimers);
  const args = { customerId, businessId, expectedUserId: "forged", asOfDate: Date.parse("2028-03-10T00:00:00Z"), paginationOpts: { cursor: null, numItems: 100 } };
  await expect(owner.query(api.creditAllocation.agingPage, args)).rejects.toThrow("FORBIDDEN");
  await t.run(async ctx => { const debt = await ctx.db.query("creditDebts").first(); if (!debt) throw new Error("fixture"); await ctx.db.patch(debt._id, { remainingCents: 0.5 }); });
  await expect(owner.query(api.creditAllocation.agingPage, { ...args, expectedUserId: "dashboard-owner" })).rejects.toThrow("INVALID_STATE");
});
