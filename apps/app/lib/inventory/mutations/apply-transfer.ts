import type { InventoryMutationInput } from "@/lib/inventory/core/mutation-engine";

export function buildTransferOutMutation(input: {
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
      eventType: "transfer.out",
      idempotencyKey: input.idempotencyKey,
      actorUserId: input.actorUserId,
      source: "inventory.transfer",
      sourceRef: input.sourceRef,
      quantityDeltaUnits: -Math.abs(input.quantityUnits),
    },
    stateDelta: {
      businessId: input.businessId,
      inventoryId: input.inventoryId,
      quantityDeltaUnits: -Math.abs(input.quantityUnits),
    },
  };
}

export function buildTransferInMutation(input: {
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
      eventType: "transfer.in",
      idempotencyKey: input.idempotencyKey,
      actorUserId: input.actorUserId,
      source: "inventory.transfer",
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
