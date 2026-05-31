export type InventoryEventType =
  | "intake.created"
  | "intake.approved"
  | "intake.rejected"
  | "sale.completed"
  | "adjustment.applied"
  | "shrinkage.recorded"
  | "transfer.out"
  | "transfer.in"
  | "return.received"
  | "fifo.batch.created"
  | "fifo.batch.depleted"
  | "health.warning";

export type InventoryEventInput = {
  businessId: string;
  inventoryId: string;
  eventType: InventoryEventType;
  idempotencyKey: string;
  actorUserId?: string | null;
  source: string;
  sourceRef?: string | null;
  occurredAt?: Date;
  quantityDeltaUnits?: number;
  quantityDeltaGrams?: number;
  metadata?: Record<string, unknown>;
};

export type InventoryEventRecord = InventoryEventInput & {
  id: string;
  recordedAt: Date;
};
