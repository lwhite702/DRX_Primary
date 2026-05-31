import type { InventoryEventInput, InventoryEventRecord } from "./inventory-events";

export interface InventoryLedger {
  appendEvent(input: InventoryEventInput): Promise<InventoryEventRecord>;
}

/**
 * Transitional in-memory adapter. Replace with DB-backed ledger table writes.
 */
export class PlaceholderInventoryLedger implements InventoryLedger {
  async appendEvent(input: InventoryEventInput): Promise<InventoryEventRecord> {
    return {
      id: crypto.randomUUID(),
      recordedAt: new Date(),
      occurredAt: input.occurredAt ?? new Date(),
      ...input,
    };
  }
}
