import { z } from "zod";
import { IndexedDBCreditQueueStorage, type CreditQueueStorage, type CreditQueueScope } from "./pending-queue";
const integer = z.number().int().min(0).max(Number.MAX_SAFE_INTEGER);
const id = z.string().min(1).max(200);
export const policySchema = z.object({ customerId: id, creditEnabled: z.boolean(), limitCents: integer, unlimited: z.boolean(), balanceCents: integer }).refine(p => p.unlimited === (p.creditEnabled && p.limitCents === 0));
export const recommendationSchema = z.object({ recommendationId: id, customerId: id, businessId: id, asOfDate: integer, snapshotAt: integer, settingsRevision: integer.min(1), createdAt: integer, expiresAt: integer, proposedCreditEnabled: z.boolean(), proposedLimitCents: integer, policyRevision: integer, recommendedLimitCents: integer, rangeMinCents: integer, rangeMaxCents: integer, riskScore: z.number().finite().min(0).max(100), justification: z.string().min(1).max(2000), provenance: z.enum(["provider", "rules"]), engineVersion: z.string().regex(/^[a-zA-Z0-9_.-]{1,80}$/) }).refine(r => [r.snapshotAt, r.createdAt, r.expiresAt].every(value => Number.isFinite(new Date(value).getTime())) && r.rangeMinCents <= r.recommendedLimitCents && r.recommendedLimitCents <= r.rangeMaxCents && r.asOfDate % 86400000 === 0 && Math.floor(r.snapshotAt / 86400000) * 86400000 === r.asOfDate && r.createdAt >= r.snapshotAt && r.expiresAt === r.asOfDate + 86400000 && (r.recommendedLimitCents !== 0 || !r.proposedCreditEnabled) && (r.recommendedLimitCents === 0 || r.proposedLimitCents === r.recommendedLimitCents));
export type CreditRecommendation = z.infer<typeof recommendationSchema>;
export type RecommendationPolicy = z.infer<typeof policySchema>;
export type RecommendationScope = CreditQueueScope & { customerId: string; sourceCustomerId?: string };
const requestSchema = z.discriminatedUnion("kind", [
  z.object({ kind: z.literal("generate") }),
  z.object({ kind: z.literal("apply"), proposal: recommendationSchema, balanceCents: integer }),
  z.object({ kind: z.literal("policy"), creditEnabled: z.boolean(), limitCents: integer, expectedCreditEnabled: z.boolean(), expectedLimitCents: integer }),
]);
type Request = z.infer<typeof requestSchema>;
const attemptSchema = z.object({ requestKey: z.string().uuid(), customerId: id, businessId: id, operatorId: id, createdAt: integer, request: requestSchema });
export type RecommendationAttempt = z.infer<typeof attemptSchema>;
export class RecommendationClientError extends Error {
  constructor(public code: string) {
    super(code === "FORBIDDEN" ? "You do not have permission to manage credit recommendations." : code === "UNAUTHENTICATED" ? "Sign in again to manage credit recommendations." : code === "INSUFFICIENT_HISTORY" ? "Credit history needs reconciliation before a recommendation can be generated." : code.startsWith("STALE_") ? "The saved facts changed. Reload current settings before continuing." : code === "STORAGE" ? "Pending credit requests could not be securely loaded or saved." : code === "INVALID_RESPONSE" ? "The credit response could not be verified. Retry the original request." : "Credit recommendations are temporarily unavailable. Pending requests are retained.");
  }
}
/** Reuses committed encrypted-storage primitives, with a separate hashed namespace. */
export class RecommendationAttempts {
  constructor(private storage: CreditQueueStorage = new IndexedDBCreditQueueStorage(), private cryptoProvider: Crypto = globalThis.crypto) {}
  private async key(scope: RecommendationScope) {
    if (!scope.operatorId || !scope.businessId || !scope.customerId) throw new Error("scope");
    const value = JSON.stringify(["credit-recommendations-v1", new URL(scope.deployment).origin, scope.operatorId, scope.businessId, scope.sourceCustomerId ?? scope.customerId]);
    return Array.from(new Uint8Array(await this.cryptoProvider.subtle.digest("SHA-256", new TextEncoder().encode(value))), b => b.toString(16).padStart(2, "0")).join("");
  }
  async pending(scope: RecommendationScope): Promise<RecommendationAttempt[]> { return this.readPending(scope, false); }
  /** Recover authenticated ciphertext before a live customer lookup, including archived accounts. */
  async restore(scope: RecommendationScope): Promise<RecommendationAttempt[]> { return this.readPending(scope, true); }
  private async readPending(scope: RecommendationScope, restoring: boolean): Promise<RecommendationAttempt[]> {
    try {
      const keyId = await this.key(scope), rows = await this.storage.list(keyId, 101);
      if (rows.length > 100) throw new Error("capacity");
      if (!rows.length) return [];
      const key = await this.storage.key(keyId); if (!key) throw new Error("key");
      const results: RecommendationAttempt[] = [];
      for (const row of rows) {
        if (row.scope !== keyId) throw new Error("scope");
        const raw = await this.cryptoProvider.subtle.decrypt({ name: "AES-GCM", iv: row.iv, additionalData: new TextEncoder().encode(keyId + ":" + row.id) }, key, row.ciphertext);
        const value = attemptSchema.parse(JSON.parse(new TextDecoder().decode(raw)));
        if (value.requestKey !== row.id || value.operatorId !== scope.operatorId || value.businessId !== scope.businessId || (!restoring && value.customerId !== scope.customerId) || (results.length > 0 && results[0].customerId !== value.customerId) || (value.request.kind === "apply" && (value.request.proposal.customerId !== value.customerId || value.request.proposal.businessId !== value.businessId))) throw new Error("scope");
        results.push(value);
      }
      return results;
    } catch { throw new RecommendationClientError("STORAGE"); }
  }
  async create(scope: RecommendationScope, request: Request): Promise<RecommendationAttempt> {
    try {
      if ((await this.pending(scope)).length) throw new Error("pending");
      const entry = attemptSchema.parse({ customerId: scope.customerId, businessId: scope.businessId, operatorId: scope.operatorId, requestKey: this.cryptoProvider.randomUUID(), createdAt: Date.now(), request });
      const keyId = await this.key(scope);
      const key = await this.storage.key(keyId, await this.cryptoProvider.subtle.generateKey({ name: "AES-GCM", length: 256 }, false, ["encrypt", "decrypt"]));
      if (!key) throw new Error("key");
      const iv = this.cryptoProvider.getRandomValues(new Uint8Array(12));
      const ciphertext = await this.cryptoProvider.subtle.encrypt({ name: "AES-GCM", iv, additionalData: new TextEncoder().encode(keyId + ":" + entry.requestKey) }, key, new TextEncoder().encode(JSON.stringify(entry)));
      await this.storage.add({ id: entry.requestKey, scope: keyId, iv, ciphertext }); return entry;
    } catch { throw new RecommendationClientError("STORAGE"); }
  }
  async confirm(scope: RecommendationScope, requestKey: string) {
    try { await this.storage.remove(await this.key(scope), requestKey); } catch { throw new RecommendationClientError("STORAGE"); }
  }
}
async function responseJson(response: Response) {
  const body: unknown = await response.json().catch(() => null);
  if (!response.ok) {
    const code = body && typeof body === "object" && "code" in body && typeof body.code === "string" ? body.code : response.status === 403 ? "FORBIDDEN" : response.status === 401 ? "UNAUTHENTICATED" : "UNAVAILABLE";
    throw new RecommendationClientError(code);
  }
  return body;
}
export async function loadRecommendation(scope: RecommendationScope, signal: AbortSignal, send: typeof fetch = fetch) {
  const query = new URLSearchParams({ business_id: scope.businessId, customer_id: scope.customerId, expectedUserId: scope.operatorId });
  const raw = await responseJson(await send(`/api/credit/refresh-customer?${query}`, { signal, cache: "no-store", credentials: "same-origin" }));
  const parsed = z.object({ recommendation: recommendationSchema.nullable(), policy: policySchema }).safeParse(raw);
  if (!parsed.success || (parsed.data.recommendation && (parsed.data.recommendation.businessId !== scope.businessId || parsed.data.recommendation.customerId !== parsed.data.policy.customerId))) throw new RecommendationClientError("INVALID_RESPONSE");
  return parsed.data;
}
/** An immutable receipt confirms recording, never the currently effective policy. */
export async function sendRecommendationAttempt(scope: RecommendationScope, entry: RecommendationAttempt, signal: AbortSignal, send: typeof fetch = fetch) {
  if (entry.operatorId !== scope.operatorId || entry.businessId !== scope.businessId || entry.customerId !== scope.customerId) throw new RecommendationClientError("FORBIDDEN");
  const common = { business_id: scope.businessId, expectedUserId: scope.operatorId, requestKey: entry.requestKey };
  const request = entry.request;
  const body = request.kind === "apply" ? { ...common, recommendationId: request.proposal.recommendationId } : request.kind === "generate" ? { ...common, customer_id: scope.customerId } : { ...common, customer_id: scope.customerId, creditEnabled: request.creditEnabled, limitCents: request.limitCents, expectedCreditEnabled: request.expectedCreditEnabled, expectedLimitCents: request.expectedLimitCents };
  const route = request.kind === "apply" ? "apply-recommendation" : request.kind === "generate" ? "refresh-customer" : "policy";
  const raw = await responseJson(await send(`/api/credit/${route}`, { method: "POST", body: JSON.stringify(body), headers: { "Content-Type": "application/json" }, signal, cache: "no-store", credentials: "same-origin" }));
  return validateReceipt(scope, entry, raw);
}
function validateReceipt(scope: RecommendationScope, entry: RecommendationAttempt, raw: unknown) {
  const request = entry.request;
  if (request.kind === "generate") {
    const result = z.object({ requestKey: z.literal(entry.requestKey), recommendation: recommendationSchema }).safeParse(raw);
    if (!result.success || result.data.recommendation.businessId !== scope.businessId || result.data.recommendation.customerId !== scope.customerId) throw new RecommendationClientError("INVALID_RESPONSE");
    return result.data.recommendation;
  }
  if (request.kind === "apply") {
    const result = z.object({ requestKey: z.literal(entry.requestKey), result: policySchema.and(z.object({ recommendationId: id, policyRevision: integer.min(1) })) }).safeParse(raw);
    const saved = result.success ? result.data.result : null;
    if (!saved || saved.customerId !== scope.customerId || saved.recommendationId !== request.proposal.recommendationId || saved.creditEnabled !== request.proposal.proposedCreditEnabled || saved.limitCents !== request.proposal.proposedLimitCents || saved.balanceCents !== request.balanceCents || saved.policyRevision !== request.proposal.policyRevision + 1) throw new RecommendationClientError("INVALID_RESPONSE");
    return saved;
  }
  const result = policySchema.and(z.object({ requestKey: z.literal(entry.requestKey) })).safeParse(raw);
  if (!result.success || result.data.customerId !== scope.customerId || result.data.creditEnabled !== request.creditEnabled || result.data.limitCents !== request.limitCents) throw new RecommendationClientError("INVALID_RESPONSE");
  return result.data;
}

/** Explicitly resolves uncertain writes; cancellation cannot reverse a recorded policy. */
export async function resolveRecommendationAttempt(scope: RecommendationScope, entry: RecommendationAttempt, signal: AbortSignal, send: typeof fetch = fetch) {
  if (entry.operatorId !== scope.operatorId || entry.businessId !== scope.businessId || entry.customerId !== scope.customerId || entry.request.kind === "generate") throw new RecommendationClientError("FORBIDDEN");
  const request = entry.request;
  const common = { business_id: scope.businessId, expectedUserId: scope.operatorId, requestKey: entry.requestKey };
  const body = request.kind === "apply" ? { ...common, recommendationId: request.proposal.recommendationId } : { ...common, customer_id: scope.customerId, creditEnabled: request.creditEnabled, limitCents: request.limitCents, expectedCreditEnabled: request.expectedCreditEnabled, expectedLimitCents: request.expectedLimitCents };
  const raw = await responseJson(await send(`/api/credit/${request.kind === "apply" ? "apply-recommendation" : "policy"}`, { method: "DELETE", body: JSON.stringify(body), headers: { "Content-Type": "application/json" }, signal, cache: "no-store", credentials: "same-origin" }));
  const envelope = z.object({ requestKey: z.literal(entry.requestKey), status: z.enum(["recorded", "cancelled"]), customerId: id.optional(), recommendationId: id.optional(), result: z.unknown().optional() }).safeParse(raw);
  if (!envelope.success) throw new RecommendationClientError("INVALID_RESPONSE");
  if (envelope.data.status === "recorded") {
    validateReceipt(scope, entry, request.kind === "policy" ? { ...(envelope.data.result as object), requestKey: entry.requestKey } : raw);
  } else if (request.kind === "apply" ? envelope.data.recommendationId !== request.proposal.recommendationId : envelope.data.customerId !== scope.customerId) throw new RecommendationClientError("INVALID_RESPONSE");
  return envelope.data.status;
}
