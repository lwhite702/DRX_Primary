import { MutationCtx } from "../_generated/server";
import { Id, Doc } from "../_generated/dataModel";

export interface BatchAllocationResult {
  batchId: Id<"inventoryBatches">;
  allocatedGrams: number;
  unitCostPerGramCents: number;
  extendedCostCents: number;
}

export async function allocateFifoInventoryBatches(
  ctx: MutationCtx,
  businessId: Id<"businesses">,
  productId: Id<"products">,
  requestedGrams: number
): Promise<BatchAllocationResult[]> {
  if (requestedGrams <= 0) {
    throw new Error("INVALID_ARGUMENT: Requested allocation quantity must be positive");
  }

  // Retrieve active batches sorted by receivedAt ascending (FIFO order)
  const activeBatches = await ctx.db
    .query("inventoryBatches")
    .withIndex("by_productId_and_receivedAt", (q) =>
      q.eq("productId", productId)
    )
    .filter((q) => q.gt(q.field("remainingQuantityGrams"), 0))
    .collect();

  // Filter for tenant businessId
  const tenantBatches = activeBatches.filter((b) => b.businessId === businessId);

  let remainingToAllocate = requestedGrams;
  const allocations: BatchAllocationResult[] = [];

  for (const batch of tenantBatches) {
    if (remainingToAllocate <= 0) break;

    const allocatable = Math.min(batch.remainingQuantityGrams, remainingToAllocate);
    const extendedCostCents = Math.round(allocatable * batch.unitCostPerGramCents);

    allocations.push({
      batchId: batch._id,
      allocatedGrams: allocatable,
      unitCostPerGramCents: batch.unitCostPerGramCents,
      extendedCostCents,
    });

    // Update remaining batch stock in DB
    const newRemaining = batch.remainingQuantityGrams - allocatable;
    await ctx.db.patch(batch._id, {
      remainingQuantityGrams: newRemaining,
      updatedAt: Date.now(),
    });

    remainingToAllocate -= allocatable;
  }

  if (remainingToAllocate > 0) {
    throw new Error(
      `INSUFFICIENT_STOCK: Required ${requestedGrams}g, but only ${requestedGrams - remainingToAllocate}g available in active batches`
    );
  }

  return allocations;
}
