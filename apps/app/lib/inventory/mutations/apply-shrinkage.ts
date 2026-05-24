import type { InventoryMutationInput } from "@/lib/inventory/core/mutation-engine";

export function buildShrinkageMutation(input: {
  businessId: string;
  inventoryId: string;
  actorUserId?: string | null;
  idempotencyKey: string;
  quantityGrams: number;
  sourceRef: string;
}) : InventoryMutationInput {
  return {
    event: {
      businessId: input.businessId,
      inventoryId: input.inventoryId,
      eventType: "shrinkage.recorded",
      idempotencyKey: input.idempotencyKey,
      actorUserId: input.actorUserId,
      source: "inventory.shrinkage",
      sourceRef: input.sourceRef,
      quantityDeltaGrams: -Math.abs(input.quantityGrams),
    },
    stateDelta: {
      businessId: input.businessId,
      inventoryId: input.inventoryId,
      quantityDeltaGrams: -Math.abs(input.quantityGrams),
    },
  };
}
