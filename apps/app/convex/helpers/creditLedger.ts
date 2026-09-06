import type { Doc, Id } from "../_generated/dataModel";
import type { MutationCtx } from "../_generated/server";

export function positiveCreditCents(value: number) {
  if (!Number.isSafeInteger(value) || value <= 0) throw new Error("INVALID_ARGUMENT: Amount must be positive integer cents");
  return value;
}

export function creditRequestKey(value: string | undefined) {
  if (value === undefined) return undefined; // Installed clients predate retry keys.
  if (!/^[A-Za-z0-9_-]{8,128}$/.test(value)) throw new Error("INVALID_ARGUMENT: Invalid credit request key");
  return value;
}

/** Called inside the same mutation as the originating operation. */
export async function appendCreditEntry(ctx: MutationCtx, input: {
  customer: Doc<"customers">; userId: string; deltaCents: number;
  kind: "issue" | "payment" | "sale"; requestKey?: string;
  saleId?: Id<"sales">; description?: string;
  offlineConflictRecorded?: boolean;
}) {
  const { customer, deltaCents } = input;
  positiveCreditCents(Math.abs(deltaCents));
  if ((input.kind === "payment") !== (deltaCents < 0)) throw new Error("INVALID_ARGUMENT: Invalid credit direction");
  const requestKey = creditRequestKey(input.requestKey);
  if ((input.description?.length ?? 0) > 500) throw new Error("INVALID_ARGUMENT: Description is too long");
  if (requestKey) {
    const prior = await ctx.db.query("creditEntries").withIndex("by_businessId_and_requestKey", q => q.eq("businessId", customer.businessId).eq("requestKey", requestKey)).unique();
    if (prior) {
      if (prior.customerId !== customer._id || prior.kind !== input.kind || prior.deltaCents !== deltaCents || prior.description !== input.description || prior.saleId !== input.saleId) throw new Error("IDEMPOTENCY_CONFLICT: Credit request key already used");
      return prior.balanceAfterCents;
    }
    const cancelled = await ctx.db.query("creditRequestCancellations").withIndex("by_businessId_and_requestKey", q => q.eq("businessId", customer.businessId).eq("requestKey", requestKey)).unique();
    if (cancelled) throw new Error("REQUEST_CANCELLED: Credit request has been cancelled");
  }
  const current = customer.totalCreditUsedCents;
  const balance = current + deltaCents;
  if (!Number.isSafeInteger(current) || current < 0 || !Number.isSafeInteger(balance)) throw new Error("INVALID_STATE: Invalid credit balance");
  if (balance < 0) throw new Error("PAYMENT_ERROR: Payment exceeds outstanding credit");
  if (!input.offlineConflictRecorded && deltaCents > 0 && customer.creditEnabled === false) throw new Error("CREDIT_LIMIT_EXCEEDED: Credit is disabled for this customer");
  if (!input.offlineConflictRecorded && deltaCents > 0 && customer.creditLimitCents > 0 && balance > customer.creditLimitCents) throw new Error("CREDIT_LIMIT_EXCEEDED: Requested credit exceeds limit");
  const now = Date.now();
  let account = await ctx.db.query("creditAccounts").withIndex("by_customerId", q => q.eq("customerId", customer._id)).unique();
  if (account && (account.businessId !== customer.businessId || account.balanceCents !== current)) throw new Error("INVALID_STATE: Credit ledger requires reconciliation");
  if (!account) {
    const id = await ctx.db.insert("creditAccounts", { businessId: customer.businessId, customerId: customer._id, balanceCents: current, createdAt: now, updatedAt: now });
    await ctx.db.insert("creditEntries", { businessId: customer.businessId, customerId: customer._id, kind: "opening", deltaCents: current, balanceAfterCents: current, openingSource: "existing_customer_balance_unreconciled", createdBy: input.userId, createdAt: now });
    account = (await ctx.db.get(id))!;
  }
  await ctx.db.insert("creditEntries", { businessId: customer.businessId, customerId: customer._id, kind: input.kind, deltaCents, balanceAfterCents: balance, saleId: input.saleId, requestKey, description: input.description, createdBy: input.userId, createdAt: now });
  await ctx.db.patch(account._id, { balanceCents: balance, updatedAt: now });
  await ctx.db.patch(customer._id, { totalCreditUsedCents: balance, updatedAt: now });
  await ctx.db.insert("auditEvents", { businessId: customer.businessId, userId: input.userId, action: input.kind === "payment" ? "CUSTOMER_CREDIT_PAYMENT" : input.kind === "sale" ? "CUSTOMER_CREDIT_SALE" : "CUSTOMER_CREDIT_ISSUED", entityType: "customer", entityId: customer._id, metadata: JSON.stringify({ deltaCents, balanceAfterCents: balance, saleId: input.saleId }), timestamp: now });
  return balance;
}
