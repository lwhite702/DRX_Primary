import type { InventoryMutationInput } from "@/lib/inventory/core/mutation-engine";

export function buildReturnMutation(input: {
  businessId: string;
  inventoryId: string;
  actorUserId?: string | null;
  idempotencyKey: string;
  quantityUnits: number;
  sourceRef: string;
}) : InventoryMutationInput {
  return {
    event: {
      businessId: input.businessId,
      inventoryId: input.inventoryId,
      eventType: "return.received",
      idempotencyKey: input.idempotencyKey,
      actorUserId: input.actorUserId,
      source: "inventory.return",
      sourceRef: input.sourceRef,
      quantityDeltaUnits: Math.abs(input.quantityUnits),
    },
    stateDelta: {
      businessId: input.businessId,
      inventoryId: input.inventoryId,
      quantityDeltaUnits: Math.abs(input.quantityUnits),
    },
  };
}
