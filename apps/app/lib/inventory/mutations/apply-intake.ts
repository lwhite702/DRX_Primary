import type { InventoryMutationInput } from "@/lib/inventory/core/mutation-engine";

export function buildIntakeMutation(input: {
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
      eventType: "intake.approved",
      idempotencyKey: input.idempotencyKey,
      actorUserId: input.actorUserId,
      source: "inventory.intake",
      sourceRef: input.sourceRef,
      quantityDeltaUnits: input.quantityGrams,
      quantityDeltaGrams: input.quantityGrams,
    },
    stateDelta: {
      businessId: input.businessId,
      inventoryId: input.inventoryId,
      quantityDeltaUnits: input.quantityGrams,
      quantityDeltaGrams: input.quantityGrams,
    },
  };
}
