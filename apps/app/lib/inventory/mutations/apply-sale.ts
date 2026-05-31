import type { InventoryMutationInput } from "@/lib/inventory/core/mutation-engine";

export function buildSaleMutation(input: {
  businessId: string;
  inventoryId: string;
  actorUserId?: string | null;
  idempotencyKey: string;
  quantityUnits: number;
  quantityGrams: number;
  sourceRef: string;
}) : InventoryMutationInput {
  return {
    event: {
      businessId: input.businessId,
      inventoryId: input.inventoryId,
      eventType: "sale.completed",
      idempotencyKey: input.idempotencyKey,
      actorUserId: input.actorUserId,
      source: "pos.checkout",
      sourceRef: input.sourceRef,
      quantityDeltaUnits: -Math.abs(input.quantityUnits),
      quantityDeltaGrams: -Math.abs(input.quantityGrams),
    },
    stateDelta: {
      businessId: input.businessId,
      inventoryId: input.inventoryId,
      quantityDeltaUnits: -Math.abs(input.quantityUnits),
      quantityDeltaGrams: -Math.abs(input.quantityGrams),
    },
    fifoRequest: {
      businessId: input.businessId,
      inventoryId: input.inventoryId,
      quantityGrams: Math.abs(input.quantityGrams),
      saleId: input.sourceRef,
    },
  };
}
