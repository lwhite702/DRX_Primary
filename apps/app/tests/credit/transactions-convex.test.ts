import { beforeEach, afterEach, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";
import { convexTest } from "convex-test";
import schema from "../../convex/schema";
import { api } from "../../convex/_generated/api";
import * as generated from "../../convex/_generated/api";
import * as onboarding from "../../convex/onboarding";
import * as customers from "../../convex/customers";
import * as creditTransactions from "../../convex/creditTransactions";
import type { Id } from "../../convex/_generated/dataModel";
const mocks = vi.hoisted(() => ({ auth: vi.fn(), token: vi.fn(), query: vi.fn(), mutation: vi.fn() }));
vi.mock("@/lib/db", () => { throw new Error("Credit transactions must not load Prisma"); });
vi.mock("@/app/api/pos/_lib/server", () => ({ resolveAuthContext: mocks.auth }));
vi.mock("@/lib/auth/convex-token", () => ({ getConvexAuthToken: mocks.token }));
vi.mock("convex/browser", () => ({ ConvexHttpClient: class { setAuth() {} query = mocks.query; mutation = mocks.mutation; } }));
import { GET, POST } from "@/app/api/credit/transactions/route";
const modules = { "_generated/api.js": async () => generated, "onboarding.ts": async () => onboarding, "customers.ts": async () => customers, "creditTransactions.ts": async () => creditTransactions };
const createTest = () => convexTest(schema, modules);
let t: ReturnType<typeof createTest>, businessId: string, customerId: Id<"customers">;
const post = (body: object) => POST(new NextRequest("http://localhost/api/credit/transactions", { method: "POST", body: JSON.stringify(body) }));
beforeEach(async () => {
  vi.clearAllMocks(); vi.stubEnv("NEXT_PUBLIC_CONVEX_URL", "https://synthetic.convex.cloud");
  t = createTest(); const owner = t.withIdentity({ subject: "credit-api-owner" });
  ({ businessId } = await owner.mutation(api.onboarding.createBusinessOnboarding, { businessName: "Synthetic credit" }));
  customerId = await owner.mutation(api.customers.createCustomer, { firstName: "Synthetic", creditLimitCents: 100000 });
  mocks.auth.mockResolvedValue({ userId: "credit-api-owner", businessId }); mocks.token.mockResolvedValue("synthetic");
  mocks.query.mockImplementation((name, args) => owner.query(name, args)); mocks.mutation.mockImplementation((name, args) => owner.mutation(name, args));
});
afterEach(() => { vi.unstubAllEnvs(); });
it("records and replays extension/payment with canonical history and dollar amounts", async () => {
  const payload = { customer_id: customerId, business_id: businessId, amount: "12.34", transaction_type: "extension", requestKey: "extension-0001" };
  const first = await post(payload); expect(first.status).toBe(201);
  const entry = await first.json(); expect(entry).toMatchObject({ amount: 12.34, transactionType: "extension", balanceAfter: 12.34 });
  expect((await (await post(payload)).json()).id).toBe(entry.id);
  const payment = await post({ customer_id: customerId, amount: 2.34, transaction_type: "payment", requestKey: "payment-0001" });
  expect((await payment.json()).balanceAfter).toBe(10);
  const history = await GET(new NextRequest(`http://localhost/api/credit/transactions?customerId=${customerId}`));
  const rows = await history.json(); expect(rows).toHaveLength(3); expect(rows[2]).toMatchObject({ transactionType: "opening", status: "unreconciled" });
  expect(history.headers.get("cache-control")).toContain("no-store");
});
it("rejects cross-tenant customer and business without any ledger write", async () => {
  const other = t.withIdentity({ subject: "other-credit-api" });
  const otherBusiness = await other.mutation(api.onboarding.createBusinessOnboarding, { businessName: "Other" });
  const foreign = await other.mutation(api.customers.createCustomer, { firstName: "Other", creditLimitCents: 1000 });
  expect((await post({ customer_id: foreign, amount: 1, transaction_type: "credit" })).status).toBe(404);
  expect((await post({ customer_id: customerId, business_id: otherBusiness.businessId, amount: 1, transaction_type: "credit" })).status).toBe(403);
  expect((await GET(new NextRequest(`http://localhost/api/credit/transactions?customerId=${foreign}`))).status).toBe(404);
  expect(await t.run(ctx => ctx.db.query("creditEntries").collect())).toEqual([]);
});
it("maps explicit legacy customer IDs only inside the authenticated business", async () => {
  await t.run(ctx => ctx.db.patch(customerId, { legacyPrismaId: "legacy-credit-customer" }));
  const response = await post({ customer_id: "legacy-credit-customer", amount: 1, transaction_type: "purchase" });
  expect((await response.json()).customerId).toBe(customerId);
  expect(response.headers.get("idempotency-key")).toBeTruthy();
});
it("rejects malformed amounts, unknown types, and overpayment", async () => {
  for (const amount of [0, -1, 0.001, true, null, ""]) expect((await post({ customer_id: customerId, amount, transaction_type: "credit" })).status).toBe(400);
  expect((await post({ customer_id: customerId, amount: 1, transaction_type: "unknown" })).status).toBe(400);
  expect((await post({ customer_id: customerId, amount: 1, transaction_type: "payment" })).status).toBe(409);
});
it("returns full legacy customer history while exposing bounded cursor pages", async () => {
  const owner = t.withIdentity({ subject: "credit-api-owner" });
  for (let i = 0; i < 55; i++) await owner.mutation(api.creditTransactions.create, { businessId, customerId, kind: "issue", amountCents: 1, requestKey: `history-${i}` });
  const all = await GET(new NextRequest(`http://localhost/api/credit/transactions?customerId=${customerId}`));
  expect(await all.json()).toHaveLength(56);
  const first = await GET(new NextRequest(`http://localhost/api/credit/transactions?limit=10`));
  expect(await first.json()).toHaveLength(10); expect(first.headers.get("x-has-more")).toBe("true");
  const next = await GET(new NextRequest(`http://localhost/api/credit/transactions?limit=10&cursor=${encodeURIComponent(first.headers.get("x-next-cursor")!)}`));
  expect(await next.json()).toHaveLength(10);
});
it("fails closed for unauthenticated and provider failures", async () => {
  mocks.token.mockResolvedValueOnce(null);
  expect((await GET(new NextRequest("http://localhost/api/credit/transactions"))).status).toBe(401);
  mocks.query.mockRejectedValueOnce(new Error("private payload"));
  const response = await GET(new NextRequest("http://localhost/api/credit/transactions"));
  expect(response.status).toBe(503); expect(JSON.stringify(await response.json())).not.toContain("private payload");
});

it("preserves calendar due dates through storage, history and exact-key recovery", async () => {
  const payload = { customer_id: customerId, amount: 12, transaction_type: "extension", requestKey: "dated-credit-001", due_date: "2028-02-29" };
  const first = await post(payload);
  expect(first.status).toBe(201);
  const entry = await first.json();
  expect(entry.dueDate).toBe("2028-02-29T00:00:00.000Z");
  expect((await (await post({ ...payload, due_date: "2028-02-29T13:30:00.000Z" })).json()).id).toBe(entry.id);
  expect((await post({ ...payload, due_date: "2028-03-01" })).status).toBe(409);
  const stored = await t.run(ctx => ctx.db.get(entry.id));
  expect(stored).toMatchObject({ dueAt: Date.parse("2028-02-29T00:00:00.000Z"), deltaCents: 1200 });
  const history = await GET(new NextRequest(`http://localhost/api/credit/transactions?customerId=${customerId}`));
  expect((await history.json())[0].dueDate).toBe(entry.dueDate);
});

it("rejects invalid calendar terms, conflicting aliases and payment due dates atomically", async () => {
  const payload = { customer_id: customerId, amount: 1, transaction_type: "extension" };
  for (const due_date of ["2027-02-29", "2028-02-30", "0000-01-01", "2028-13-01", "2028-01-01T99:00:00Z", 1234, true, "tomorrow"]) {
    expect((await post({ ...payload, due_date })).status).toBe(400);
  }
  expect((await post({ ...payload, due_date: "2028-01-01", dueDate: "2028-01-02" })).status).toBe(400);
  expect((await post({ ...payload, transaction_type: "payment", due_date: "2028-01-01" })).status).toBe(400);
  const owner = t.withIdentity({ subject: "credit-api-owner" });
  for (const dueAt of [1, 253402300800000, -62135683200000]) {
    await expect(owner.mutation(api.creditTransactions.create, { businessId, customerId, kind: "issue", amountCents: 100, requestKey: "invalid-date-001", dueAt })).rejects.toThrow("INVALID_ARGUMENT");
  }
  expect(await t.run(ctx => ctx.db.query("creditEntries").collect())).toEqual([]);
  expect((await t.run(ctx => ctx.db.get(customerId)))?.totalCreditUsedCents).toBe(0);
});
