import { expect, it, vi } from "vitest";
import { aggregateCreditAging, fetchCreditAccountsPage, refreshCreditAllocation, CREDIT_AGING_BUCKETS } from "../../lib/credit/dashboard-client";
const scope = { businessId: "tenant /+&", customerId: "customer ?&", asOfDate: Date.UTC(2026, 8, 6) };
const json = (value: unknown, status = 200) => new Response(JSON.stringify(value), { status, headers: { "Content-Type": "application/json" } });
const row = (entryId = "entry", remainingCents = 100, bucket: string = "current") => ({ entryId, remainingCents, bucket });
const page = (patch: Record<string, unknown> = {}) => ({ status: "ready", balanceCents: 100, revision: "revision", lastPaymentAt: 123, page: [row()], isDone: true, continueCursor: "", ...patch });
const account = { customerId: "customer", displayName: "Synthetic", isActive: true, creditEnabled: true, limitCents: 500, unlimited: false, balanceCents: 100, allocationStatus: "ready" };
it("fetches typed account pages with exact encoded scope, cursor and no caching", async () => {
  const send = vi.fn().mockResolvedValue(json({ page: [account], isDone: false, continueCursor: "next" }));
  const result = await fetchCreditAccountsPage({ businessId: scope.businessId, cursor: "opaque /+=&?", limit: 50 }, send);
  expect(result.page[0]).toEqual(account);
  expect(send.mock.calls[0][0]).toBe("/api/credit/dashboard?business_id=tenant+%2F%2B%26&limit=50&cursor=opaque+%2F%2B%3D%26%3F");
  expect(send.mock.calls[0][1]).toMatchObject({ method: "GET", cache: "no-store", credentials: "same-origin" });
});
it("aggregates every integer-cent bucket across fixed-date revision pages", async () => {
  const rows = CREDIT_AGING_BUCKETS.map((bucket, index) => row(String(index), index + 1, bucket));
  const send = vi.fn().mockResolvedValueOnce(json(page({ balanceCents: 28, page: rows.slice(0, 3), isDone: false, continueCursor: "next /+" }))).mockResolvedValueOnce(json(page({ balanceCents: 28, page: rows.slice(3) })));
  const result = await aggregateCreditAging(scope, send);
  expect(result).toEqual({ status: "ready", balanceCents: 28, asOfDate: scope.asOfDate, revision: "revision", lastPaymentAt: 123, bucketsCents: { current: 1, "1_7": 2, "8_14": 3, "15_30": 4, "31_plus": 5, undated: 6, unreconciled: 7 }, entryCount: 7, pagesRead: 2 });
  for (const [url, init] of send.mock.calls) {
    const params = new URL(url, "http://localhost").searchParams;
    expect(params.get("business_id")).toBe(scope.businessId); expect(params.get("customer_id")).toBe(scope.customerId);
    expect(params.get("as_of_date")).toBe(String(scope.asOfDate)); expect(init.method).toBe("GET");
  }
  expect(send.mock.calls[1][0]).toContain("cursor=next+%2F%2B");
});
it("distinguishes empty ready zero from pending without scheduling writes", async () => {
  const send = vi.fn().mockResolvedValueOnce(json(page({ balanceCents: 0, page: [], revision: undefined, lastPaymentAt: undefined }))).mockResolvedValueOnce(json({ status: "pending", balanceCents: 0, page: [], isDone: false, continueCursor: "" }));
  const ready = await aggregateCreditAging(scope, send);
  expect(ready.status).toBe("ready");
  if (ready.status === "ready") expect(Object.values(ready.bucketsCents)).toEqual([0, 0, 0, 0, 0, 0, 0]);
  expect(await aggregateCreditAging(scope, send)).toEqual({ status: "pending", balanceCents: 0, asOfDate: scope.asOfDate });
  expect(send.mock.calls.every(([, init]) => init.method === "GET")).toBe(true);
});
it("refreshes allocation only on an explicit call and observes later pending-to-ready transitions", async () => {
  let refreshed = false;
  const send = vi.fn(async (_url, init) => {
    if (init.method === "POST") { refreshed = true; return json({ success: true, status: "pending" }); }
    return json(refreshed ? page() : { status: "pending", balanceCents: 100, page: [], isDone: false, continueCursor: "" });
  });
  expect((await aggregateCreditAging(scope, send)).status).toBe("pending");
  expect(refreshed).toBe(false);
  expect(await refreshCreditAllocation(scope, send)).toEqual({ success: true, status: "pending" });
  expect(JSON.parse(send.mock.calls[1][1].body)).toEqual({ business_id: scope.businessId, customer_id: scope.customerId });
  expect((await aggregateCreditAging(scope, send)).status).toBe("ready");
});
it.each([{ revision: "changed" }, { balanceCents: 101 }, { lastPaymentAt: 124 }, { status: "pending", page: [], isDone: false, continueCursor: "" }])("rejects stale pagination state %j", async patch => {
  const send = vi.fn().mockResolvedValueOnce(json(page({ page: [row("one", 50)], isDone: false, continueCursor: "next" }))).mockResolvedValueOnce(json(page({ page: [row("two", 50)], ...patch })));
  await expect(aggregateCreditAging(scope, send)).rejects.toMatchObject({ code: "STALE" });
});
it("rejects repeated cursors, duplicate entries and explicit capacity exhaustion", async () => {
  const first = page({ page: [], isDone: false, continueCursor: "same" });
  await expect(aggregateCreditAging(scope, vi.fn().mockImplementation(async () => json(first)))).rejects.toMatchObject({ code: "STALE" });
  const duplicate = vi.fn().mockResolvedValueOnce(json(page({ page: [row("one", 50)], isDone: false, continueCursor: "next" }))).mockResolvedValueOnce(json(page({ page: [row("one", 50)] })));
  await expect(aggregateCreditAging(scope, duplicate)).rejects.toMatchObject({ code: "STALE" });
  const limited = vi.fn().mockImplementation(async () => json(first));
  await expect(aggregateCreditAging({ ...scope, maxPages: 1 }, limited)).rejects.toMatchObject({ code: "CAPACITY_EXCEEDED" });
  expect(limited).toHaveBeenCalledTimes(1);
});
it.each([
  { balanceCents: -1 }, { balanceCents: 1.5 }, { balanceCents: Number.MAX_SAFE_INTEGER + 1 },
  { page: [row("one", 1.5)] }, { page: [row("one", 0)] }, { page: [row("one", -1)] }, { page: [row("one", 100, "unknown")] },
  { page: [] }, { page: [row("one", 101)] }, { status: "pending", isDone: false },
])("rejects invalid amounts, shapes or aggregate mismatch %j", async patch => {
  await expect(aggregateCreditAging(scope, vi.fn().mockResolvedValue(json(page(patch))))).rejects.toMatchObject({ code: "INVALID_RESPONSE" });
});
it("rejects aggregate overflow without losing integer cents", async () => {
  const send = vi.fn().mockResolvedValue(json(page({ balanceCents: Number.MAX_SAFE_INTEGER, page: [row("one", Number.MAX_SAFE_INTEGER), row("two", 1)] })));
  await expect(aggregateCreditAging(scope, send)).rejects.toMatchObject({ code: "INVALID_RESPONSE" });
});
it("sanitizes HTTP, network and JSON errors", async () => {
  const send = vi.fn().mockResolvedValueOnce(json({ error: "private customer" }, 403)).mockRejectedValueOnce(new Error("private network details")).mockResolvedValueOnce(new Response("private invalid JSON"));
  await expect(aggregateCreditAging(scope, send)).rejects.toMatchObject({ code: "ACCESS_DENIED" });
  await expect(aggregateCreditAging(scope, send)).rejects.toMatchObject({ code: "UNAVAILABLE", message: "Credit dashboard is temporarily unavailable." });
  await expect(aggregateCreditAging(scope, send)).rejects.toMatchObject({ code: "INVALID_RESPONSE", message: "Credit dashboard data requires reconciliation." });
});
it("stops immediately or between pages when aborted", async () => {
  const controller = new AbortController(); controller.abort("private reason");
  const send = vi.fn();
  await expect(aggregateCreditAging({ ...scope, signal: controller.signal }, send)).rejects.toMatchObject({ code: "ABORTED" });
  expect(send).not.toHaveBeenCalled();
  const active = new AbortController();
  send.mockImplementation(async () => { active.abort(); return json(page()); });
  await expect(aggregateCreditAging({ ...scope, signal: active.signal }, send)).rejects.toMatchObject({ code: "ABORTED" });
  expect(send.mock.calls[0][1].signal).toBe(active.signal);
});
it("validates arguments before issuing any request", async () => {
  const send = vi.fn();
  await expect(aggregateCreditAging({ ...scope, asOfDate: scope.asOfDate + 1 }, send)).rejects.toMatchObject({ code: "INVALID_ARGUMENT" });
  await expect(aggregateCreditAging({ ...scope, maxPages: 1001 }, send)).rejects.toMatchObject({ code: "INVALID_ARGUMENT" });
  await expect(fetchCreditAccountsPage({ businessId: "", limit: 100 }, send)).rejects.toMatchObject({ code: "INVALID_ARGUMENT" });
  expect(send).not.toHaveBeenCalled();
});
it("rejects invalid account metadata and nonadvancing account pages", async () => {
  const send = vi.fn().mockResolvedValueOnce(json({ page: [{ ...account, limitCents: 0.5 }], isDone: true, continueCursor: "" })).mockResolvedValueOnce(json({ page: [account], isDone: false, continueCursor: "same" }));
  await expect(fetchCreditAccountsPage({ businessId: "tenant" }, send)).rejects.toMatchObject({ code: "INVALID_RESPONSE" });
  await expect(fetchCreditAccountsPage({ businessId: "tenant", cursor: "same" }, send)).rejects.toMatchObject({ code: "STALE" });
});

it("distinguishes reconciliation conflicts from temporary service failure", async () => {
  const send = vi.fn().mockResolvedValueOnce(json({ error: "private" }, 409)).mockResolvedValueOnce(json({ error: "private" }, 503));
  await expect(aggregateCreditAging(scope, send)).rejects.toMatchObject({ code: "INVALID_RESPONSE" });
  await expect(aggregateCreditAging(scope, send)).rejects.toMatchObject({ code: "UNAVAILABLE" });
});
it.each([{ limitCents: 0, unlimited: false }, { unlimited: true }, { creditEnabled: false, limitCents: 0, unlimited: true }])("rejects contradictory unlimited account metadata %j", async patch => {
  const send = vi.fn().mockResolvedValue(json({ page: [{ ...account, ...patch }], isDone: true, continueCursor: "" }));
  await expect(fetchCreditAccountsPage({ businessId: "tenant" }, send)).rejects.toMatchObject({ code: "INVALID_RESPONSE" });
});
it("accepts explicit unlimited enabled credit and disabled zero-limit accounts", async () => {
  const send = vi.fn().mockResolvedValue(json({ page: [{ ...account, limitCents: 0, unlimited: true }, { ...account, customerId: "disabled", creditEnabled: false, limitCents: 0, unlimited: false }], isDone: true, continueCursor: "" }));
  expect((await fetchCreditAccountsPage({ businessId: "tenant" }, send)).page).toHaveLength(2);
});
