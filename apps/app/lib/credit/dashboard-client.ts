import { z } from "zod";

export const CREDIT_AGING_BUCKETS = ["current", "1_7", "8_14", "15_30", "31_plus", "undated", "unreconciled"] as const;
export type CreditAgingBucket = typeof CREDIT_AGING_BUCKETS[number];
export type CreditAgingBuckets = Record<CreditAgingBucket, number>;
const cents = z.number().int().nonnegative().max(Number.MAX_SAFE_INTEGER);
const identifier = z.string().min(1).max(200);
const cursorValue = z.string().max(8192);
const timestamp = z.number().int().nonnegative().max(Number.MAX_SAFE_INTEGER);
const accountSchema = z.object({
  customerId: identifier, displayName: z.string().max(1000), isActive: z.boolean(), creditEnabled: z.boolean(),
  limitCents: cents, unlimited: z.boolean(), balanceCents: cents,
  allocationStatus: z.enum(["missing", "pending", "ready", "unreconciled"]),
});
const accountsPageSchema = z.object({ page: z.array(accountSchema).max(100), isDone: z.boolean(), continueCursor: cursorValue });
const agingPageSchema = z.object({
  status: z.enum(["pending", "ready"]), balanceCents: cents, revision: identifier.optional(), lastPaymentAt: timestamp.optional(),
  page: z.array(z.object({ entryId: identifier, remainingCents: cents.positive(), dueAt: timestamp.optional(), bucket: z.enum(CREDIT_AGING_BUCKETS) })).max(100),
  isDone: z.boolean(), continueCursor: cursorValue,
});
export type CreditAccount = z.infer<typeof accountSchema>;
export type CreditAccountsPage = z.infer<typeof accountsPageSchema>;
export type CreditAgingResult =
  | { status: "pending"; balanceCents: number; asOfDate: number }
  | { status: "ready"; balanceCents: number; asOfDate: number; revision?: string; lastPaymentAt?: number; bucketsCents: CreditAgingBuckets; entryCount: number; pagesRead: number };

type FailureCode = "INVALID_ARGUMENT" | "INVALID_RESPONSE" | "UNAVAILABLE" | "ACCESS_DENIED" | "STALE" | "CAPACITY_EXCEEDED" | "ABORTED";
const messages: Record<FailureCode, string> = {
  INVALID_ARGUMENT: "Invalid credit dashboard request.", INVALID_RESPONSE: "Credit dashboard data requires reconciliation.",
  UNAVAILABLE: "Credit dashboard is temporarily unavailable.", ACCESS_DENIED: "Credit dashboard access is unavailable.",
  STALE: "Credit balances changed. Refresh the dashboard.", CAPACITY_EXCEEDED: "Credit aging exceeds the current processing limit.", ABORTED: "Credit dashboard request was cancelled.",
};
export class CreditDashboardError extends Error {
  constructor(public readonly code: FailureCode) { super(messages[code]); this.name = "CreditDashboardError"; }
}
export interface CreditDashboardScope { businessId: string; signal?: AbortSignal }
export interface CreditAccountsPageRequest extends CreditDashboardScope { cursor?: string; limit?: number }
export interface CreditAgingRequest extends CreditDashboardScope { customerId: string; asOfDate: number; limit?: number; maxPages?: number }
type Fetcher = typeof fetch;
const endpoint = "/api/credit/dashboard";
function aborted(signal?: AbortSignal) { if (signal?.aborted) throw new CreditDashboardError("ABORTED"); }
function validId(value: string) { if (!identifier.safeParse(value).success || !value.trim()) throw new CreditDashboardError("INVALID_ARGUMENT"); }
function pageLimit(limit = 100) {
  if (!Number.isSafeInteger(limit) || limit < 1 || limit > 100) throw new CreditDashboardError("INVALID_ARGUMENT");
  return limit;
}
async function readJson(url: string, init: RequestInit, fetcher: Fetcher): Promise<unknown> {
  const signal = init.signal ?? undefined;
  aborted(signal);
  let response: Response;
  try { response = await fetcher(url, { ...init, cache: "no-store", credentials: "same-origin" }); }
  catch { aborted(signal); throw new CreditDashboardError("UNAVAILABLE"); }
  aborted(signal);
  if (!response.ok) throw new CreditDashboardError(response.status === 401 || response.status === 403 ? "ACCESS_DENIED" : response.status === 409 ? "INVALID_RESPONSE" : "UNAVAILABLE");
  try { const json: unknown = await response.json(); aborted(signal); return json; }
  catch (error) { if (error instanceof CreditDashboardError) throw error; aborted(signal); throw new CreditDashboardError("INVALID_RESPONSE"); }
}

export async function fetchCreditAccountsPage(request: CreditAccountsPageRequest, fetcher: Fetcher = fetch): Promise<CreditAccountsPage> {
  const { businessId, signal, cursor } = request;
  validId(businessId);
  const limit = pageLimit(request.limit);
  if (cursor !== undefined && (!cursorValue.safeParse(cursor).success || !cursor)) throw new CreditDashboardError("INVALID_ARGUMENT");
  const params = new URLSearchParams({ business_id: businessId, limit: String(limit) });
  if (cursor !== undefined) params.set("cursor", cursor);
  const raw = await readJson(`${endpoint}?${params}`, { method: "GET", signal }, fetcher);
  const parsed = accountsPageSchema.safeParse(raw);
  if (!parsed.success) throw new CreditDashboardError("INVALID_RESPONSE");
  const page = parsed.data;
  if (page.page.length > limit || new Set(page.page.map(row => row.customerId)).size !== page.page.length) throw new CreditDashboardError("INVALID_RESPONSE");
  if (page.page.some(account => account.unlimited !== (account.creditEnabled && account.limitCents === 0))) throw new CreditDashboardError("INVALID_RESPONSE");
  if (!page.isDone && (!page.continueCursor || page.continueCursor === cursor)) throw new CreditDashboardError("STALE");
  return page;
}

/** Reads all aging pages without scheduling allocation or substituting partial/zero totals. */
export async function aggregateCreditAging(request: CreditAgingRequest, fetcher: Fetcher = fetch): Promise<CreditAgingResult> {
  const { businessId, customerId, asOfDate, signal } = request;
  validId(businessId); validId(customerId);
  const limit = pageLimit(request.limit), maxPages = request.maxPages ?? 1000;
  if (!Number.isSafeInteger(asOfDate) || asOfDate < 0 || asOfDate % 86400000 !== 0 || !Number.isSafeInteger(maxPages) || maxPages < 1 || maxPages > 1000) throw new CreditDashboardError("INVALID_ARGUMENT");
  const params = new URLSearchParams({ business_id: businessId, customer_id: customerId, as_of_date: String(asOfDate), limit: String(limit) });
  const bucketsCents: CreditAgingBuckets = { current: 0, "1_7": 0, "8_14": 0, "15_30": 0, "31_plus": 0, undated: 0, unreconciled: 0 };
  let baseline: z.infer<typeof agingPageSchema> | undefined;
  let total = 0;
  const entryIds = new Set<string>(), cursors = new Set<string>();
  for (let pagesRead = 1; pagesRead <= maxPages; pagesRead++) {
    const raw = await readJson(`${endpoint}?${params}`, { method: "GET", signal }, fetcher);
    const parsed = agingPageSchema.safeParse(raw);
    if (!parsed.success || parsed.data.page.length > limit) throw new CreditDashboardError("INVALID_RESPONSE");
    const page = parsed.data;
    if (page.status === "pending") {
      if (baseline) throw new CreditDashboardError("STALE");
      if (page.page.length || page.isDone || page.continueCursor) throw new CreditDashboardError("INVALID_RESPONSE");
      return { status: "pending", balanceCents: page.balanceCents, asOfDate };
    }
    if (baseline && (page.balanceCents !== baseline.balanceCents || page.revision !== baseline.revision || page.lastPaymentAt !== baseline.lastPaymentAt)) throw new CreditDashboardError("STALE");
    baseline ??= page;
    for (const row of page.page) {
      if (entryIds.has(row.entryId)) throw new CreditDashboardError("STALE");
      entryIds.add(row.entryId);
      if (row.remainingCents > Number.MAX_SAFE_INTEGER - total) throw new CreditDashboardError("INVALID_RESPONSE");
      total += row.remainingCents;
      bucketsCents[row.bucket] += row.remainingCents;
    }
    if (total > page.balanceCents) throw new CreditDashboardError("INVALID_RESPONSE");
    if (page.isDone) {
      if (total !== page.balanceCents) throw new CreditDashboardError("INVALID_RESPONSE");
      aborted(signal);
      return { status: "ready", balanceCents: page.balanceCents, asOfDate, revision: page.revision, lastPaymentAt: page.lastPaymentAt, bucketsCents, entryCount: entryIds.size, pagesRead };
    }
    if (!page.continueCursor || cursors.has(page.continueCursor)) throw new CreditDashboardError("STALE");
    cursors.add(page.continueCursor);
    params.set("cursor", page.continueCursor);
  }
  throw new CreditDashboardError("CAPACITY_EXCEEDED");
}

/** Explicit operator-triggered allocation refresh; never called by read helpers. */
export async function refreshCreditAllocation(request: CreditDashboardScope & { customerId: string }, fetcher: Fetcher = fetch): Promise<{ success: true; status: "pending" }> {
  const { businessId, customerId, signal } = request;
  validId(businessId); validId(customerId);
  const raw = await readJson(endpoint, { method: "POST", signal, headers: { "Content-Type": "application/json" }, body: JSON.stringify({ business_id: businessId, customer_id: customerId }) }, fetcher);
  const parsed = z.object({ success: z.literal(true), status: z.literal("pending") }).safeParse(raw);
  if (!parsed.success) throw new CreditDashboardError("INVALID_RESPONSE");
  return parsed.data;
}
