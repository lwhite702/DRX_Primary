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
  if (!Number.isFinite(requestedGrams) || requestedGrams <= 0) {
    throw new Error("INVALID_ARGUMENT: Requested allocation quantity must be positive");
  }

  // Retrieve active batches sorted by receivedAt ascending (FIFO order)
  const activeBatches = await ctx.db
    .query("inventoryBatches")
    .withIndex("by_productId_and_receivedAt", (q) =>
      q.eq("productId", productId)
    )
    .filter((q) => q.gt(q.field("remainingQuantityGrams"), 0))
    .take(4097);

  // A bounded read must not silently skip corrupt ownership or malformed stock.
  // Depleted history is excluded by the query; the cap applies to active batches.
  const tenantBatches = activeBatches.slice(0, 4096);
  for (const batch of tenantBatches) {
    if (batch.businessId !== businessId || !Number.isFinite(batch.remainingQuantityGrams) || batch.remainingQuantityGrams <= 0 || !Number.isFinite(batch.unitCostPerGramCents) || batch.unitCostPerGramCents < 0) throw new Error("INVALID_STATE: Inventory batches require reconciliation");
  }

  let remainingToAllocate = requestedGrams;
  const tolerance = Math.min(1e-9, requestedGrams * 1e-9);
  let totalCostCents = 0;
  const allocations: BatchAllocationResult[] = [];

  for (const batch of tenantBatches) {
    if (remainingToAllocate <= tolerance) break;

    const allocatable = Math.min(batch.remainingQuantityGrams, remainingToAllocate);
    const extendedCostCents = Math.round(allocatable * batch.unitCostPerGramCents);
    totalCostCents += extendedCostCents;
    if (!Number.isSafeInteger(extendedCostCents) || !Number.isSafeInteger(totalCostCents)) throw new Error("INVALID_STATE: Inventory cost exceeds supported precision");

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

  if (remainingToAllocate > tolerance) {
    if (activeBatches.length > 4096) throw new Error("INVALID_STATE: Active FIFO history exceeds the supported transaction bound");
    throw new Error(
      `INSUFFICIENT_STOCK: Required ${requestedGrams}g, but only ${requestedGrams - remainingToAllocate}g available in active batches`
    );
  }

  return allocations;
}
