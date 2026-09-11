import { act, cleanup, renderHook, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, expect, it, vi } from "vitest";
const mocks = vi.hoisted(() => ({ userId: "operator-a", accounts: vi.fn(), aging: vi.fn(), refresh: vi.fn(), pending: vi.fn(), create: vi.fn(), sync: vi.fn(), resolve: vi.fn(), success: vi.fn(), error: vi.fn(), info: vi.fn() }));
vi.mock("@/lib/adapters/auth/ui", () => ({ useAuth: () => ({ userId: mocks.userId }) }));
vi.mock("@/lib/credit/dashboard-client", () => ({ fetchCreditAccountsPage: mocks.accounts, aggregateCreditAging: mocks.aging, refreshCreditAllocation: mocks.refresh }));
vi.mock("@/lib/credit/pending-queue", () => ({ CreditPendingQueue: class { pending = mocks.pending; create = mocks.create; }, syncCreditRequests: mocks.sync, resolveCreditRequests: mocks.resolve }));
vi.mock("sonner", () => ({ toast: { success: mocks.success, error: mocks.error, info: mocks.info } }));
import { useCreditManager } from "../../app/(app)/credit/_hooks/useCreditManager";
const account = { customerId: "customer-a", displayName: "Account customer-a", isActive: true, creditEnabled: true, limitCents: 10000, unlimited: false, balanceCents: 125, allocationStatus: "pending" as const };
beforeEach(() => {
  vi.clearAllMocks(); vi.stubEnv("NEXT_PUBLIC_CONVEX_URL", "https://synthetic.convex.cloud"); mocks.userId = "operator-a";
  vi.spyOn(navigator, "onLine", "get").mockReturnValue(true);
  mocks.accounts.mockReset().mockResolvedValue({ page: [account], isDone: true, continueCursor: "" });
  mocks.aging.mockReset().mockResolvedValue({ status: "pending", balanceCents: 125, asOfDate: 0 });
  mocks.pending.mockReset().mockResolvedValue({ entries: [], hasMore: false });
  mocks.create.mockReset().mockResolvedValue({ requestKey: "saved-key" });
  mocks.sync.mockReset().mockResolvedValue({ confirmed: 1, hasMore: false });
  mocks.resolve.mockReset().mockResolvedValue({ confirmed: 1, cancelled: 1, hasMore: false });
  mocks.refresh.mockReset().mockResolvedValue({ success: true, status: "pending" });
  vi.stubGlobal("fetch", vi.fn().mockResolvedValue({ ok: true, json: async () => [] }));
});
afterEach(() => { cleanup(); vi.restoreAllMocks(); vi.unstubAllGlobals(); vi.unstubAllEnvs(); });
async function mounted() { const hook = renderHook(() => useCreditManager("business-a")); await waitFor(() => expect(hook.result.current.loading).toBe(false)); return hook; }
it("loads canonical accounts without substituting zero aging for pending projections", async () => {
  const { result } = await mounted();
  expect(result.current.accounts).toEqual([account]); expect(result.current.agingByCustomer[account.customerId].status).toBe("pending");
  expect(result.current.accountsComplete).toBe(true);
  expect(fetch).toHaveBeenCalledWith(expect.stringContaining("business_id=business-a"), expect.objectContaining({ headers: expect.any(Headers) }));
  expect(String(vi.mocked(fetch).mock.calls[0][0])).toContain("expectedUserId=operator-a");
});
it("persists before sending and retains cents, optional calendar date and payment method", async () => {
  const { result } = await mounted();
  await act(async () => { await result.current.handlePayment({ customer_id: "customer-a", amount: 1.25, payment_method: "transfer" }); });
  expect(mocks.create).toHaveBeenCalledWith({ deployment: "https://synthetic.convex.cloud", operatorId: "operator-a", businessId: "business-a" }, { customerId: "customer-a", kind: "payment", amountCents: 125, description: undefined, paymentMethod: "transfer" });
  expect(mocks.create.mock.invocationCallOrder[0]).toBeLessThan(mocks.sync.mock.invocationCallOrder[0]);
  await act(async () => { await result.current.handleExtension({ customer_id: "customer-a", amount: 2, due_date: "2026-09-30" }); });
  expect(mocks.create.mock.calls[1][1]).toMatchObject({ kind: "issue", amountCents: 200, dueDate: "2026-09-30" });
  await act(async () => { await result.current.handleExtension({ customer_id: "customer-a", amount: 2 }); });
  expect(mocks.create.mock.calls[2][1].dueDate).toBeUndefined();
});
it("rejects fractional cents and never sends when persistence fails", async () => {
  const { result } = await mounted();
  await act(async () => { await result.current.handleExtension({ customer_id: "customer-a", amount: 1.001 }); });
  expect(mocks.create).not.toHaveBeenCalled();
  mocks.create.mockRejectedValueOnce(new Error("storage unavailable"));
  await act(async () => { await result.current.handlePayment({ customer_id: "customer-a", amount: 1 }); });
  expect(mocks.sync).not.toHaveBeenCalled(); expect(mocks.success).not.toHaveBeenCalled();
});
it("blocks a changed request while pending and prevents simultaneous duplicate submission", async () => {
  const { result } = await mounted();
  mocks.pending.mockResolvedValueOnce({ entries: [{ requestKey: "pending-key" }], hasMore: false });
  await act(async () => { await result.current.handlePayment({ customer_id: "customer-a", amount: 1 }); });
  expect(mocks.create).not.toHaveBeenCalled();
  let resolve!: (value: object) => void;
  mocks.create.mockImplementationOnce(() => new Promise(done => { resolve = done; }));
  let first!: Promise<void>;
  await act(async () => { first = result.current.handlePayment({ customer_id: "customer-a", amount: 1 }); });
  await act(async () => { await result.current.handlePayment({ customer_id: "customer-a", amount: 2 }); });
  expect(mocks.create).toHaveBeenCalledTimes(1);
  await act(async () => { resolve({ requestKey: "key" }); await first; });
});
it("reports offline requests as queued and reconnects under the same owned scope", async () => {
  vi.spyOn(navigator, "onLine", "get").mockReturnValue(false);
  const { result } = await mounted();
  await act(async () => { await result.current.handlePayment({ customer_id: "customer-a", amount: 1 }); });
  expect(mocks.create).toHaveBeenCalledTimes(1); expect(mocks.sync).not.toHaveBeenCalled(); expect(mocks.success).not.toHaveBeenCalled();
  vi.spyOn(navigator, "onLine", "get").mockReturnValue(true);
  await act(async () => { window.dispatchEvent(new Event("online")); });
  expect(mocks.sync).toHaveBeenCalledWith(expect.anything(), expect.objectContaining({ operatorId: "operator-a", businessId: "business-a" }), expect.any(Function));
});
it("does not retry confirmed writes when subsequent refresh fails", async () => {
  const { result } = await mounted(); mocks.accounts.mockRejectedValueOnce(new Error("read failed"));
  await act(async () => { await result.current.handlePayment({ customer_id: "customer-a", amount: 1 }); });
  expect(mocks.sync).toHaveBeenCalledTimes(1); expect(mocks.create).toHaveBeenCalledTimes(1);
  expect(mocks.success).toHaveBeenCalledWith("Credit payment confirmed."); expect(result.current.error).toContain("could not be refreshed");
});
it("suppresses prior operator data and stops a pending write from sending after a switch", async () => {
  const { result, rerender } = await mounted();
  let resolve!: (value: object) => void;
  mocks.create.mockImplementationOnce(() => new Promise(done => { resolve = done; }));
  let first!: Promise<void>;
  await act(async () => { first = result.current.handlePayment({ customer_id: "customer-a", amount: 1 }); });
  mocks.userId = "operator-b"; mocks.accounts.mockResolvedValueOnce({ page: [], isDone: true, continueCursor: "" });
  rerender(); expect(result.current.accounts).toEqual([]);
  await act(async () => { resolve({ requestKey: "old" }); await first; });
  expect(mocks.sync).not.toHaveBeenCalled(); expect(mocks.success).not.toHaveBeenCalled();
});
it("loads another explicit page and leaves failed aging unavailable", async () => {
  mocks.accounts.mockResolvedValueOnce({ page: [account], isDone: false, continueCursor: "next" });
  const { result } = await mounted();
  expect(result.current.hasMoreAccounts).toBe(true); expect(result.current.accountsComplete).toBe(false);
  mocks.accounts.mockResolvedValueOnce({ page: [{ ...account, customerId: "customer-b" }], isDone: true, continueCursor: "" });
  mocks.aging.mockRejectedValueOnce(new Error("failed"));
  await act(async () => { await result.current.loadMoreAccounts(); });
  expect(result.current.accounts).toHaveLength(2); expect(result.current.agingByCustomer["customer-b"]).toBeUndefined(); expect(result.current.error).toContain("aging details");
});
it("retains confirmed status when pending storage reread fails after submission", async () => {
  const { result } = await mounted();
  mocks.pending.mockResolvedValueOnce({ entries: [], hasMore: false }).mockResolvedValueOnce({ entries: [{ requestKey: "saved" }], hasMore: false }).mockRejectedValueOnce(new Error("storage read failed"));
  await act(async () => { await result.current.handlePayment({ customer_id: "customer-a", amount: 1 }); });
  expect(mocks.success).toHaveBeenCalledWith("Credit payment confirmed.");
  expect(result.current.error).toContain("was confirmed"); expect(mocks.error).not.toHaveBeenCalled();
  expect(mocks.create).toHaveBeenCalledTimes(1); expect(mocks.sync).toHaveBeenCalledTimes(1);
});
it("retains confirmed sync status when pending storage reread fails", async () => {
  const { result } = await mounted(); mocks.pending.mockRejectedValueOnce(new Error("storage read failed"));
  await act(async () => { await result.current.syncPending(); });
  expect(mocks.success).toHaveBeenCalledWith("Pending credit requests confirmed.");
  expect(result.current.error).toContain("were confirmed"); expect(mocks.error).not.toHaveBeenCalled();
});
it("does not mutate on initial load and aborts reads while suppressing stale results", async () => {
  let resolve!: (value: object) => void;
  mocks.accounts.mockImplementationOnce(() => new Promise(done => { resolve = done; }));
  const { result, rerender } = renderHook(({ businessId }) => useCreditManager(businessId), { initialProps: { businessId: "business-a" } });
  await waitFor(() => expect(mocks.accounts).toHaveBeenCalledTimes(1));
  const oldSignal = mocks.accounts.mock.calls[0][0].signal as AbortSignal;
  mocks.accounts.mockResolvedValueOnce({ page: [], isDone: true, continueCursor: "" });
  rerender({ businessId: "business-b" });
  expect(oldSignal.aborted).toBe(true); expect(result.current.accounts).toEqual([]);
  await act(async () => { resolve({ page: [account], isDone: true, continueCursor: "" }); });
  await waitFor(() => expect(result.current.loading).toBe(false));
  expect(result.current.accounts).toEqual([]); expect(mocks.create).not.toHaveBeenCalled(); expect(mocks.sync).not.toHaveBeenCalled(); expect(mocks.refresh).not.toHaveBeenCalled();
});
it("accepts a bounded historical payment method without exposing names or descriptions", async () => {
  vi.mocked(fetch).mockResolvedValueOnce({ ok: true, json: async () => [{ id: "entry", customerId: "customer-a", amountCents: 100, transactionType: "payment", createdAt: "2026-09-06T00:00:00.000Z", status: "completed", paymentMethod: "legacy-method", description: "private note", firstName: "private name" }] } as Response);
  const { result } = await mounted();
  expect(result.current.transactions[0].paymentMethod).toBe("legacy-method");
  expect(JSON.stringify(result.current.transactions)).not.toContain("private");
});

it("resolves recorded and unrecorded requests only after explicit operator action", async () => {
  const { result } = await mounted();
  expect(mocks.resolve).not.toHaveBeenCalled();
  await act(async () => { await result.current.resolvePending(); });
  expect(mocks.resolve).toHaveBeenCalledWith(expect.anything(), expect.objectContaining({ operatorId: "operator-a", businessId: "business-a" }), expect.any(Function));
  expect(mocks.success).toHaveBeenCalledWith("1.0 recorded request(s) confirmed; 1.0 unrecorded request(s) cancelled.");
  expect(mocks.create).not.toHaveBeenCalled();
});
it("preserves unresolved requests after a failed status check", async () => {
  const { result } = await mounted();
  mocks.resolve.mockRejectedValueOnce(new Error("unavailable"));
  mocks.pending.mockResolvedValueOnce({ entries: [{ requestKey: "still-pending" }], hasMore: false });
  await act(async () => { await result.current.resolvePending(); });
  expect(result.current.pendingCount).toBe(1); expect(result.current.error).toContain("could not be resolved");
  expect(mocks.success).not.toHaveBeenCalled(); expect(mocks.create).not.toHaveBeenCalled();
});
it("keeps authoritative resolution success when pending storage reread fails", async () => {
  const { result } = await mounted();
  mocks.pending.mockRejectedValueOnce(new Error("storage read failed"));
  await act(async () => { await result.current.resolvePending(); });
  expect(mocks.success).toHaveBeenCalledWith("1.0 recorded request(s) confirmed; 1.0 unrecorded request(s) cancelled.");
  expect(result.current.error).toContain("statuses were resolved"); expect(mocks.error).not.toHaveBeenCalled();
});

it("retains a single aging date when loading more accounts after UTC midnight", async () => {
  const day = Date.UTC(2026, 8, 6);
  const now = vi.spyOn(Date, "now").mockReturnValue(day + 86399000);
  mocks.accounts.mockResolvedValueOnce({ page: [account], isDone: false, continueCursor: "next" });
  const { result } = await mounted();
  now.mockReturnValue(day + 86401000);
  mocks.accounts.mockResolvedValueOnce({ page: [{ ...account, customerId: "customer-b" }], isDone: true, continueCursor: "" });
  await act(async () => { await result.current.loadMoreAccounts(); });
  expect(mocks.aging.mock.calls.slice(0, 2).map(([request]) => request.asOfDate)).toEqual([day, day]);
  await act(async () => { await result.current.refreshData(); });
  expect(mocks.aging.mock.calls[2][0].asOfDate).toBe(day + 86400000);
});
