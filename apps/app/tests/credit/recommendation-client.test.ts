import { expect, it, vi } from "vitest";
import { webcrypto } from "node:crypto";
import { RecommendationAttempts, loadRecommendation, sendRecommendationAttempt, resolveRecommendationAttempt, type RecommendationScope } from "../../lib/credit/recommendation-client";
import type { CreditQueueStorage, SealedCreditRequest } from "../../lib/credit/pending-queue";
class MemoryStorage implements CreditQueueStorage {
  keys = new Map<string, CryptoKey>(); records = new Map<string, SealedCreditRequest>();
  async key(scope: string, candidate?: CryptoKey) { if (!this.keys.has(scope) && candidate) this.keys.set(scope, candidate); return this.keys.get(scope); }
  async list(scope: string, limit: number) { return [...this.records.values()].filter(r => r.scope === scope).slice(0, limit); }
  async add(row: SealedCreditRequest) { this.records.set(row.id, row); }
  async remove(scope: string, id: string) { if (this.records.get(id)?.scope === scope) this.records.delete(id); }
}
const scope: RecommendationScope = { deployment: "https://example.convex.cloud", operatorId: "operator", businessId: "business", customerId: "customer" };
const day = Date.UTC(2026, 8, 6);
const proposal = { recommendationId: "rec", customerId: "customer", businessId: "business", asOfDate: day, snapshotAt: day + 1, settingsRevision: 1, createdAt: day + 2, expiresAt: day + 86400000, proposedCreditEnabled: true, proposedLimitCents: 500, policyRevision: 2, recommendedLimitCents: 500, rangeMinCents: 400, rangeMaxCents: 600, riskScore: 0, justification: "Synthetic suggestion", provenance: "rules" as const, engineVersion: "canonical_v1" };
const policy = { customerId: "customer", creditEnabled: true, limitCents: 1000, unlimited: false, balanceCents: 100 };
function fixture() { const storage = new MemoryStorage(); return { storage, queue: new RecommendationAttempts(storage, webcrypto as unknown as Crypto) }; }
const json = (value: unknown, status = 200) => new Response(JSON.stringify(value), { status });
const signal = () => new AbortController().signal;
it("persists encrypted proposal and original key across instances without exposing financial/customer content", async () => {
  const { storage, queue } = fixture(); const entry = await queue.create(scope, { kind: "apply", proposal, balanceCents: 100 });
  const serialized = JSON.stringify([...storage.records.values()]);
  expect(serialized).not.toContain("customer"); expect(serialized).not.toContain("Synthetic");
  expect([...storage.keys.values()][0].extractable).toBe(false);
  expect(await new RecommendationAttempts(storage, webcrypto as unknown as Crypto).pending(scope)).toEqual([entry]);
  for (const other of [{ ...scope, operatorId: "other" }, { ...scope, businessId: "other" }, { ...scope, deployment: "https://other.convex.cloud" }, { ...scope, customerId: "other" }]) expect(await queue.pending(other)).toEqual([]);
  await expect(queue.create(scope, { kind: "generate" })).rejects.toThrow("securely");
});
it("retries identical generation terms after a lost response then confirms only matching key", async () => {
  const { queue } = fixture(); const entry = await queue.create(scope, { kind: "generate" });
  const send = vi.fn().mockRejectedValueOnce(new Error("private failure")).mockResolvedValueOnce(json({ requestKey: entry.requestKey, recommendation: proposal }));
  await expect(sendRecommendationAttempt(scope, entry, signal(), send)).rejects.toThrow();
  expect(await queue.pending(scope)).toEqual([entry]);
  expect(await sendRecommendationAttempt(scope, entry, signal(), send)).toEqual(proposal);
  expect(send.mock.calls[0][1].body).toBe(send.mock.calls[1][1].body);
  await queue.confirm(scope, entry.requestKey); expect(await queue.pending(scope)).toEqual([]);
});
it.each([{ requestKey: "wrong" }, { recommendation: { ...proposal, businessId: "foreign" } }, { recommendation: { ...proposal, riskScore: NaN } }, { recommendation: { ...proposal, rangeMinCents: 700 } }])("rejects mismatched generated receipt %j", async patch => {
  const { queue } = fixture(); const entry = await queue.create(scope, { kind: "generate" });
  await expect(sendRecommendationAttempt(scope, entry, signal(), vi.fn().mockResolvedValue(json({ requestKey: entry.requestKey, recommendation: proposal, ...patch })))).rejects.toThrow("verified");
  expect(await queue.pending(scope)).toEqual([entry]);
});
it("validates applied proposal fields and never replaces current policy from an old receipt", async () => {
  const { queue } = fixture(); const entry = await queue.create(scope, { kind: "apply", proposal, balanceCents: 100 });
  const result = { ...policy, limitCents: 500, recommendationId: "rec", policyRevision: 3 };
  const send = vi.fn().mockResolvedValue(json({ requestKey: entry.requestKey, result }));
  expect(await sendRecommendationAttempt(scope, entry, signal(), send)).toEqual(result);
  expect(JSON.parse(send.mock.calls[0][1].body)).toEqual({ business_id: "business", expectedUserId: "operator", requestKey: entry.requestKey, recommendationId: "rec" });
  for (const patch of [{ limitCents: 600 }, { policyRevision: 4 }, { balanceCents: 101 }, { creditEnabled: false }, { customerId: "other" }]) await expect(sendRecommendationAttempt(scope, entry, signal(), vi.fn().mockResolvedValue(json({ requestKey: entry.requestKey, result: { ...result, ...patch } })))).rejects.toThrow("verified");
});
it("supports explicit mapped customer GET and encodes source scope exactly", async () => {
  const send = vi.fn().mockResolvedValue(json({ policy, recommendation: proposal }));
  expect(await loadRecommendation({ ...scope, customerId: "legacy&customer", operatorId: "operator?&" }, signal(), send)).toEqual({ policy, recommendation: proposal });
  expect(send.mock.calls[0][0]).toContain("customer_id=legacy%26customer&expectedUserId=operator%3F%26");
  await expect(loadRecommendation(scope, signal(), vi.fn().mockResolvedValue(json({ policy, recommendation: { ...proposal, customerId: "other" } })))).rejects.toThrow("verified");
});
it.each([403, 409, 503])("retains encrypted attempt after HTTP %s without leaking raw errors", async status => {
  const { queue } = fixture(); const entry = await queue.create(scope, { kind: "generate" });
  await expect(sendRecommendationAttempt(scope, entry, signal(), vi.fn().mockResolvedValue(json({ code: status === 403 ? "FORBIDDEN" : "STALE_SETTINGS", error: "private raw details" }, status)))).rejects.not.toThrow("private raw");
  expect(await queue.pending(scope)).toEqual([entry]);
});
it("rejects damaged storage and scope changes without sending or deleting", async () => {
  const { queue, storage } = fixture(); const entry = await queue.create(scope, { kind: "generate" });
  const send = vi.fn(); await expect(sendRecommendationAttempt({ ...scope, operatorId: "other" }, entry, signal(), send)).rejects.toThrow("permission"); expect(send).not.toHaveBeenCalled();
  new Uint8Array(storage.records.get(entry.requestKey)!.ciphertext)[0] ^= 1;
  await expect(queue.pending(scope)).rejects.toThrow("securely"); expect(storage.records.size).toBe(1);
});
it("requires matching manual policy receipt key and preserves explicit zero unlimited semantics", async () => {
  const { queue } = fixture(); const entry = await queue.create(scope, { kind: "policy", creditEnabled: true, limitCents: 0, expectedCreditEnabled: true, expectedLimitCents: 1000 });
  const result = { ...policy, limitCents: 0, unlimited: true, requestKey: entry.requestKey };
  expect(await sendRecommendationAttempt(scope, entry, signal(), vi.fn().mockResolvedValue(json(result)))).toEqual(result);
  await expect(sendRecommendationAttempt(scope, entry, signal(), vi.fn().mockResolvedValue(json({ ...result, requestKey: "wrong" })))).rejects.toThrow("verified");
});

it("resolves cancelled and recorded application requests while rejecting wrong cancellation identity", async () => {
  const { queue } = fixture(); const entry = await queue.create(scope, { kind: "apply", proposal, balanceCents: 100 });
  const send = vi.fn().mockResolvedValue(json({ status: "cancelled", recommendationId: "rec", requestKey: entry.requestKey }));
  expect(await resolveRecommendationAttempt(scope, entry, signal(), send)).toBe("cancelled"); expect(send.mock.calls[0][1].method).toBe("DELETE");
  const result = { ...policy, limitCents: 500, recommendationId: "rec", policyRevision: 3 };
  expect(await resolveRecommendationAttempt(scope, entry, signal(), vi.fn().mockResolvedValue(json({ status: "recorded", requestKey: entry.requestKey, result })))).toBe("recorded");
  await expect(resolveRecommendationAttempt(scope, entry, signal(), vi.fn().mockResolvedValue(json({ status: "cancelled", recommendationId: "other", requestKey: entry.requestKey })))).rejects.toThrow("verified");
  expect(await queue.pending(scope)).toEqual([entry]);
});
it("validates manual cancellation and never resolves generation through the policy endpoint", async () => {
  const { queue } = fixture(); const entry = await queue.create(scope, { kind: "policy", creditEnabled: false, limitCents: 1000, expectedCreditEnabled: true, expectedLimitCents: 1000 });
  expect(await resolveRecommendationAttempt(scope, entry, signal(), vi.fn().mockResolvedValue(json({ status: "recorded", requestKey: entry.requestKey, result: { ...policy, creditEnabled: false } })))).toBe("recorded");
  expect(await resolveRecommendationAttempt(scope, entry, signal(), vi.fn().mockResolvedValue(json({ status: "cancelled", requestKey: entry.requestKey, customerId: "customer" })))).toBe("cancelled");
  const send = vi.fn(); await expect(resolveRecommendationAttempt(scope, { ...entry, request: { kind: "generate" } }, signal(), send)).rejects.toThrow("permission"); expect(send).not.toHaveBeenCalled();
});
