import { webcrypto } from "node:crypto";
import { CreditPendingQueue, syncCreditRequests, resolveCreditRequests, type CreditQueueStorage, type SealedCreditRequest } from "../../lib/credit/pending-queue";
import { beforeEach, afterEach, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";
import { convexTest } from "convex-test";
import schema from "../../convex/schema";
import { api } from "../../convex/_generated/api";
import * as generated from "../../convex/_generated/api";
import * as onboarding from "../../convex/onboarding";
import * as customers from "../../convex/customers";
import * as creditTransactions from "../../convex/creditTransactions";
import * as credit from "../../convex/credit";
import type { Id } from "../../convex/_generated/dataModel";
const mocks = vi.hoisted(() => ({ auth: vi.fn(), token: vi.fn(), query: vi.fn(), mutation: vi.fn() }));
vi.mock("@/lib/adapters/auth", () => ({ getCurrentUser: async () => { const context = await mocks.auth(); return context?.userId ? { id: context.userId } : null; } }));
vi.mock("@/lib/db", () => { throw new Error("Credit transactions must not load Prisma"); });
vi.mock("@/app/api/pos/_lib/server", () => ({ resolveAuthContext: mocks.auth }));
vi.mock("@/lib/auth/convex-token", () => ({ getConvexAuthToken: mocks.token }));
vi.mock("convex/browser", () => ({ ConvexHttpClient: class { setAuth() {} query = mocks.query; mutation = mocks.mutation; } }));
import { GET, POST } from "@/app/api/credit/transactions/route";
import { GET as detail, PUT as editEntry, DELETE as deleteEntry } from "../../app/api/credit/transactions/[id]/route";
import { POST as resolveRequest } from "../../app/api/credit/requests/resolve/route";
const modules = { "_generated/api.js": async () => generated, "onboarding.ts": async () => onboarding, "customers.ts": async () => customers, "creditTransactions.ts": async () => creditTransactions, "credit.ts": async () => credit };
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

it("preserves repayment method and notes and rejects changed-method retries", async () => {
  await post({ customer_id: customerId, amount: 10, transaction_type: "extension" });
  const payload = { customer_id: customerId, amount: 2, transaction_type: "payment", payment_method: "transfer", description: "Synthetic payment", requestKey: "method-payment-1", expectedUserId: "credit-api-owner" };
  const first = await post(payload);
  expect(first.status).toBe(201);
  const entry = await first.json();
  expect(entry).toMatchObject({ paymentMethod: "transfer", description: "Synthetic payment", balanceAfter: 8 });
  expect((await (await post(payload)).json()).id).toBe(entry.id);
  expect((await post({ ...payload, payment_method: "cash" })).status).toBe(409);
  expect((await post({ ...payload, payment_method: "invalid" })).status).toBe(400);
  expect((await post({ ...payload, paymentMethod: "cash" })).status).toBe(400);
  expect((await post({ ...payload, transaction_type: "extension" })).status).toBe(400);
});

it("rejects queued credit submitted under another operator without changing balances", async () => {
  const response = await post({ customer_id: customerId, amount: 1, transaction_type: "extension", expectedUserId: "another-operator", requestKey: "owned-queue-001" });
  expect(response.status).toBe(403);
  expect(await t.run(ctx => ctx.db.query("creditEntries").collect())).toEqual([]);
});

it("accepts exact integer cents for queued requests and rejects contradictory amount fields", async () => {
  await t.run(ctx => ctx.db.patch(customerId, { creditLimitCents: 0 }));
  const response = await post({ customer_id: customerId, amountCents: Number.MAX_SAFE_INTEGER, transaction_type: "extension", requestKey: "exact-cents-001" });
  expect(response.status).toBe(201);
  expect(await response.json()).toMatchObject({ amountCents: Number.MAX_SAFE_INTEGER, balanceAfterCents: Number.MAX_SAFE_INTEGER });
  expect((await post({ customer_id: customerId, amount: 1, amountCents: 101, transaction_type: "payment" })).status).toBe(400);
  expect((await post({ customer_id: customerId, amount: 0.001, amountCents: 1, transaction_type: "payment" })).status).toBe(400);
});

it("binds dashboard history reads to selected business and expected operator", async () => {
  const other = t.withIdentity({ subject: "other-history" });
  const foreign = await other.mutation(api.onboarding.createBusinessOnboarding, { businessName: "Other" });
  expect((await GET(new NextRequest(`http://localhost/api/credit/transactions?business_id=${foreign.businessId}`))).status).toBe(403);
  expect((await GET(new NextRequest(`http://localhost/api/credit/transactions?expectedUserId=other`))).status).toBe(403);
  const valid = await GET(new NextRequest(`http://localhost/api/credit/transactions?business_id=${businessId}&expectedUserId=credit-api-owner&limit=50`));
  expect(valid.status).toBe(200);
  const owner = t.withIdentity({ subject: "credit-api-owner" });
  await expect(owner.query(api.creditTransactions.listPage, { businessId, expectedUserId: "other", paginationOpts: { cursor: null, numItems: 50 } })).rejects.toThrow("FORBIDDEN");
});

it("replays an encrypted pending request after the server commits but its response is lost", async () => {
  const keys = new Map<string, CryptoKey>(), records = new Map<string, SealedCreditRequest>();
  const storage: CreditQueueStorage = {
    async key(scope, candidate) { if (!keys.has(scope) && candidate) keys.set(scope, candidate); return keys.get(scope); },
    async list(scope, limit) { return [...records.values()].filter(row => row.scope === scope).slice(0, limit); },
    async add(record) { records.set(record.id, record); },
    async remove(scope, id) { if (records.get(id)?.scope === scope) records.delete(id); },
  };
  const queue = new CreditPendingQueue(storage, webcrypto as unknown as Crypto);
  const scope = { deployment: "https://synthetic.convex.cloud", operatorId: "credit-api-owner", businessId };
  const pending = await queue.create(scope, { customerId, kind: "issue", amountCents: 1234, dueDate: "2028-02-29" });
  let loseResponse = true;
  const send = vi.fn(async (_url: RequestInfo | URL, init?: RequestInit) => {
    const response = await POST(new NextRequest("http://localhost/api/credit/transactions", { ...init, signal: init?.signal ?? undefined }));
    if (loseResponse) { loseResponse = false; expect(response.status).toBe(201); throw new Error("Lost acknowledgement"); }
    return response;
  });
  await expect(syncCreditRequests(queue, scope, () => true, send)).rejects.toThrow("still pending");
  expect(records.size).toBe(1);
  expect(await syncCreditRequests(new CreditPendingQueue(storage, webcrypto as unknown as Crypto), scope, () => true, send)).toEqual({ confirmed: 1, hasMore: false });
  expect(records.size).toBe(0);
  const entries = await t.run(ctx => ctx.db.query("creditEntries").collect());
  expect(entries.filter(entry => entry.kind === "issue")).toHaveLength(1);
  expect(entries.find(entry => entry.kind === "issue")).toMatchObject({ requestKey: pending.requestKey, deltaCents: 1234, balanceAfterCents: 1234 });
});

it("resolves recorded attempts and cancels unrecorded attempts before clearing the encrypted queue", async () => {
  const keys = new Map<string, CryptoKey>(), records = new Map<string, SealedCreditRequest>();
  const storage: CreditQueueStorage = {
    async key(scope, candidate) { if (!keys.has(scope) && candidate) keys.set(scope, candidate); return keys.get(scope); },
    async list(scope, limit) { return [...records.values()].filter(row => row.scope === scope).slice(0, limit); },
    async add(record) { records.set(record.id, record); },
    async remove(scope, id) { if (records.get(id)?.scope === scope) records.delete(id); },
  };
  const queue = new CreditPendingQueue(storage, webcrypto as unknown as Crypto);
  const scope = { deployment: "https://synthetic.convex.cloud", operatorId: "credit-api-owner", businessId };
  const recorded = await queue.create(scope, { customerId, kind: "issue", amountCents: 100 });
  const cancelled = await queue.create(scope, { customerId, kind: "issue", amountCents: 200 });
  expect((await post({ customer_id: customerId, amountCents: 100, transaction_type: "extension", requestKey: recorded.requestKey })).status).toBe(201);
  const send = vi.fn((_url: RequestInfo | URL, init?: RequestInit) => resolveRequest(new NextRequest("http://localhost/api/credit/requests/resolve", { ...init, signal: init?.signal ?? undefined })));
  expect(await resolveCreditRequests(queue, scope, () => true, send)).toEqual({ confirmed: 1, cancelled: 1, hasMore: false });
  expect(records.size).toBe(0);
  expect((await post({ customer_id: customerId, amountCents: 200, transaction_type: "extension", requestKey: cancelled.requestKey })).status).toBe(409);
  expect((await t.run(ctx => ctx.db.query("creditEntries").collect())).filter(entry => entry.kind === "issue")).toHaveLength(1);
  const forged = await resolveRequest(new NextRequest("http://localhost/api/credit/requests/resolve", { method: "POST", body: JSON.stringify({ business_id: businessId, customer_id: customerId, requestKey: cancelled.requestKey, expectedUserId: "other" }) }));
  expect(forged.status).toBe(403);
});

it("reads immutable canonical transaction details and refuses edit/delete without changing accounting", async () => {
  const response = await post({ customer_id: customerId, amountCents: 250, transaction_type: "extension", requestKey: "detail-entry-001" });
  const recorded = await response.json();
  const detailResponse = await detail(new NextRequest(`http://localhost/api/credit/transactions/${recorded.id}?business_id=${businessId}&expectedUserId=credit-api-owner`), { params: Promise.resolve({ id: recorded.id }) });
  expect(detailResponse.status).toBe(200); expect(detailResponse.headers.get("cache-control")).toBe("private, no-store");
  expect(await detailResponse.json()).toEqual(recorded);
  expect((await editEntry()).status).toBe(405);
  const denied = await deleteEntry(); expect(denied.status).toBe(405); expect(denied.headers.get("Allow")).toBe("GET");
  expect((await t.run(ctx => ctx.db.get(customerId)))?.totalCreditUsedCents).toBe(250);
  expect((await t.run(ctx => ctx.db.query("creditEntries").collect())).filter(entry => entry.kind === "issue")).toHaveLength(1);
});
it("isolates detail reads and refuses guessed legacy IDs or malformed ledger amounts", async () => {
  const response = await post({ customer_id: customerId, amountCents: 100, transaction_type: "extension", requestKey: "detail-entry-002" });
  const entry = await response.json();
  const other = t.withIdentity({ subject: "detail-other" });
  const foreign = await other.mutation(api.onboarding.createBusinessOnboarding, { businessName: "Other" });
  const read = (query = "", id = entry.id) => detail(new NextRequest(`http://localhost/api/credit/transactions/${id}${query}`), { params: Promise.resolve({ id }) });
  expect((await read(`?business_id=${foreign.businessId}`)).status).toBe(403);
  expect((await read("?expectedUserId=other")).status).toBe(403);
  expect((await read("", "legacy-unmapped-transaction")).status).toBe(404);
  mocks.query.mockImplementation((name, args) => other.query(name, args));
  mocks.auth.mockResolvedValue({ userId: "detail-other", businessId: foreign.businessId });
  expect((await read()).status).toBe(404);
  mocks.auth.mockResolvedValue({ userId: "credit-api-owner", businessId });
  const owner = t.withIdentity({ subject: "credit-api-owner" }); mocks.query.mockImplementation((name, args) => owner.query(name, args));
  await t.run(async ctx => { const id = ctx.db.normalizeId("creditEntries", entry.id); if (!id) throw new Error("fixture"); await ctx.db.patch(id, { deltaCents: 0.5 }); });
  expect((await read()).status).toBe(409);
  expect((await GET(new NextRequest("http://localhost/api/credit/transactions?limit=50"))).status).toBe(409);
  for (const patch of [{ deltaCents: 0 }, { deltaCents: 100, createdAt: Number.MAX_SAFE_INTEGER }]) {
    await t.run(async ctx => { const id = ctx.db.normalizeId("creditEntries", entry.id); if (!id) throw new Error("fixture"); await ctx.db.patch(id, patch); });
    expect((await read()).status).toBe(409);
  }
});

it("requires financial permission before returning transaction detail", async () => {
  const response = await post({ customer_id: customerId, amountCents: 100, transaction_type: "extension", requestKey: "detail-entry-003" });
  const entry = await response.json();
  await t.run(ctx => ctx.db.insert("users", { businessId: businessId as Id<"businesses">, clerkUserId: "no-financial-grant", email: "synthetic@example.invalid", role: "MEMBER", permissions: {}, status: "ACTIVE", createdAt: 1, updatedAt: 1 }));
  const staff = t.withIdentity({ subject: "no-financial-grant" });
  mocks.auth.mockResolvedValue({ userId: "no-financial-grant", businessId }); mocks.query.mockImplementation((name, args) => staff.query(name, args));
  const result = await detail(new NextRequest(`http://localhost/api/credit/transactions/${entry.id}`), { params: Promise.resolve({ id: entry.id }) });
  expect(result.status).toBe(403);
});
