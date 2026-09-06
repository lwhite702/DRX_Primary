import { describe, expect, it, vi } from "vitest";
import { webcrypto } from "node:crypto";
import { CreditPendingQueue, syncCreditRequests, type CreditQueueScope, type CreditQueueStorage, type SealedCreditRequest } from "../../lib/credit/pending-queue";
const cryptoProvider = webcrypto as unknown as Crypto;
class MemoryStorage implements CreditQueueStorage {
  keys = new Map<string, CryptoKey>(); records = new Map<string, SealedCreditRequest>(); sequence = 0;
  async key(scope: string, candidate?: CryptoKey) { if (!this.keys.has(scope) && candidate) this.keys.set(scope, candidate); return this.keys.get(scope); }
  async list(scope: string, limit: number) { return [...this.records.values()].filter(row => row.scope === scope).sort((a, b) => a.sequence! - b.sequence!).slice(0, limit); }
  async add(row: SealedCreditRequest) { if (this.records.has(row.id)) throw new Error("duplicate"); this.records.set(row.id, { ...structuredClone(row), sequence: ++this.sequence }); }
  async remove(scope: string, id: string) { if (this.records.has(id) && this.records.get(id)?.scope !== scope) throw new Error("scope"); this.records.delete(id); }
}
const scope: CreditQueueScope = { deployment: "https://synthetic.convex.cloud", operatorId: "synthetic-owner", businessId: "synthetic-business" };
const request = { customerId: "synthetic-customer", kind: "issue" as const, amountCents: 1234, description: "Synthetic private note", dueDate: "2028-02-29" };
function fixture() { const storage = new MemoryStorage(); return { storage, queue: new CreditPendingQueue(storage, cryptoProvider) }; }
function ok(key: string) { return new Response(JSON.stringify({ id: "synthetic-ledger-entry" }), { status: 201, headers: { "Idempotency-Key": key } }); }
describe("owned encrypted Convex credit queue", () => {
  it("persists encrypted requests and restores exact payloads across queue instances", async () => {
    const { storage, queue } = fixture(); const entry = await queue.create(scope, request);
    const row = storage.records.get(entry.requestKey)!;
    expect(new TextDecoder().decode(row.ciphertext)).not.toContain(request.description);
    expect(JSON.stringify(row)).not.toContain(request.customerId);
    expect([...storage.keys.values()][0].extractable).toBe(false);
    const reopened = new CreditPendingQueue(storage, cryptoProvider);
    expect((await reopened.pending(scope)).entries).toEqual([entry]);
    for (const other of [{ ...scope, operatorId: "other" }, { ...scope, businessId: "other" }, { ...scope, deployment: "https://other.convex.cloud" }]) expect((await reopened.pending(other)).entries).toEqual([]);
  });
  it("retains requests after uncertain responses and replays the identical request key and terms", async () => {
    const { queue, storage } = fixture(); const entry = await queue.create(scope, request);
    const send = vi.fn().mockRejectedValueOnce(new Error("network unavailable")).mockResolvedValueOnce(ok(entry.requestKey));
    await expect(syncCreditRequests(queue, scope, () => true, send)).rejects.toThrow("network unavailable");
    expect(storage.records.size).toBe(1);
    expect(await syncCreditRequests(new CreditPendingQueue(storage, cryptoProvider), scope, () => true, send)).toEqual({ confirmed: 1, hasMore: false });
    expect(send.mock.calls[0]).toEqual(send.mock.calls[1]);
    const options = send.mock.calls[1][1];
    expect(JSON.parse(options.body)).toMatchObject({ amountCents: 1234, expectedUserId: scope.operatorId, business_id: scope.businessId, due_date: "2028-02-29", description: request.description });
    expect(options.headers["Idempotency-Key"]).toBe(entry.requestKey);
    expect(storage.records.size).toBe(0);
  });
  it("keeps the request when identity changes or confirmation is missing", async () => {
    const { queue, storage } = fixture(); const entry = await queue.create(scope, { customerId: "synthetic", kind: "payment", amountCents: 100, paymentMethod: "check" });
    const blocked = vi.fn();
    await expect(syncCreditRequests(queue, scope, () => false, blocked)).rejects.toThrow("Sign in");
    expect(blocked).not.toHaveBeenCalled();
    let current = true;
    const send = vi.fn(async () => { current = false; return ok(entry.requestKey); });
    await expect(syncCreditRequests(queue, scope, () => current, send)).rejects.toThrow("Sign in");
    expect(storage.records.size).toBe(1);
    await expect(syncCreditRequests(queue, scope, () => true, vi.fn().mockResolvedValue(new Response("{}", { status: 201 })))).rejects.toThrow("pending");
    expect(storage.records.size).toBe(1);
  });
  it("rejects damaged ciphertext without discarding it or submitting anything", async () => {
    const { queue, storage } = fixture(); const entry = await queue.create(scope, request);
    const row = storage.records.get(entry.requestKey)!; new Uint8Array(row.ciphertext)[0] ^= 1;
    const send = vi.fn();
    await expect(syncCreditRequests(queue, scope, () => true, send)).rejects.toThrow("Unable to unlock");
    expect(send).not.toHaveBeenCalled(); expect(storage.records.size).toBe(1);
  });
  it("pages in durable commit order rather than random request-key order", async () => {
    const { queue } = fixture(); const created = [];
    for (let i = 0; i < 102; i++) created.push(await queue.create(scope, { ...request, amountCents: i + 1 }));
    const first = await queue.pending(scope);
    expect(first.hasMore).toBe(true);
    expect(first.entries.map(row => row.requestKey)).toEqual(created.slice(0, 100).map(row => row.requestKey));
    for (const entry of first.entries) await queue.confirm(scope, entry.requestKey);
    const next = await queue.pending(scope);
    expect(next.entries).toEqual(created.slice(100)); expect(next.hasMore).toBe(false);
  });
  it("does not acknowledge a request when durable storage fails", async () => {
    const { queue, storage } = fixture(); storage.add = vi.fn().mockRejectedValue(new Error("storage unavailable"));
    await expect(queue.create(scope, request)).rejects.toThrow("storage unavailable");
    expect(storage.records.size).toBe(0);
    await expect(queue.create(scope, { ...request, amountCents: 1.5 })).rejects.toThrow("Invalid");
    await expect(queue.create(scope, { ...request, dueDate: "2027-02-29" })).rejects.toThrow("Invalid");
  });
});

it("captures ownership and form values before asynchronous encryption", async () => {
  const { queue, storage } = fixture();
  const binding = { ...scope }; const input = { ...request };
  const original = storage.key.bind(storage);
  storage.key = async (...args) => {
    binding.operatorId = "changed-operator"; input.amountCents = 1;
    return original(...args);
  };
  const entry = await queue.create(binding, input);
  expect(entry.operatorId).toBe(scope.operatorId); expect(entry.amountCents).toBe(request.amountCents);
  expect((await queue.pending(scope)).entries).toEqual([entry]);
});
