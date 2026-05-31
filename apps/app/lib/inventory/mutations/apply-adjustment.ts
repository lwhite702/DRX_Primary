import type { InventoryMutationInput } from "@/lib/inventory/core/mutation-engine";

export function buildAdjustmentMutation(input: {
  businessId: string;
  inventoryId: string;
  actorUserId?: string | null;
  idempotencyKey: string;
  quantityDeltaUnits: number;
  sourceRef: string;
}) : InventoryMutationInput {
  return {
    event: {
      businessId: input.businessId,
      inventoryId: input.inventoryId,
      eventType: "adjustment.applied",
      idempotencyKey: input.idempotencyKey,
      actorUserId: input.actorUserId,
      source: "inventory.adjust",
      sourceRef: input.sourceRef,
      quantityDeltaUnits: input.quantityDeltaUnits,
    },
    stateDelta: {
      businessId: input.businessId,
      inventoryId: input.inventoryId,
      quantityDeltaUnits: input.quantityDeltaUnits,
    },
  };
}
