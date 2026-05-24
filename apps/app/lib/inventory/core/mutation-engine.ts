import type { InventoryEventInput, InventoryEventRecord } from "./inventory-events";
import type { InventoryLedger } from "./inventory-ledger";
import type { InventoryStateDelta, InventoryStateStore } from "./inventory-state";
import type { FifoAllocationRequest, FifoAllocationResult, FifoEngine } from "./fifo-engine";

export type InventoryMutationInput = {
  event: InventoryEventInput;
  stateDelta?: InventoryStateDelta;
  fifoRequest?: FifoAllocationRequest;
};

export type InventoryMutationResult = {
  event: InventoryEventRecord;
  fifo?: FifoAllocationResult;
};

export class InventoryMutationEngine {
  constructor(
    private readonly ledger: InventoryLedger,
    private readonly state: InventoryStateStore,
    private readonly fifo: FifoEngine,
  ) {}

  async apply(input: InventoryMutationInput): Promise<InventoryMutationResult> {
    // Order is intentionally deterministic for eventual DB transaction mapping.
    const event = await this.ledger.appendEvent(input.event);

    if (input.stateDelta) {
      const stateResult = await this.state.applyDelta(input.stateDelta);
      if (!stateResult.applied) {
        throw new Error("Inventory state conflict");
      }
    }

    const fifo = input.fifoRequest
      ? await this.fifo.allocate(input.fifoRequest)
      : undefined;

    return { event, fifo };
  }
}
