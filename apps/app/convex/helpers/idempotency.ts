import { MutationCtx } from "../_generated/server";
import { Id } from "../_generated/dataModel";

export async function checkIdempotencyKey<T>(
  ctx: MutationCtx,
  businessId: Id<"businesses">,
  key: string
): Promise<T | null> {
  const existing = await ctx.db
    .query("idempotencyKeys")
    .withIndex("by_businessId_and_key", (q: any) =>
      q.eq("businessId", businessId).eq("key", key)
    )
    .unique();

  if (existing) {
    return JSON.parse(existing.resultJson) as T;
  }
  return null;
}

export async function recordIdempotencyKey<T>(
  ctx: MutationCtx,
  businessId: Id<"businesses">,
  key: string,
  action: string,
  result: T
): Promise<void> {
  await ctx.db.insert("idempotencyKeys", {
    businessId,
    key,
    action,
    resultJson: JSON.stringify(result),
    createdAt: Date.now(),
  });
}
