export type FifoAllocationRequest = {
  businessId: string;
  inventoryId: string;
  quantityGrams: number;
  saleId?: string;
  saleLineItemId?: string;
};

export type FifoAllocationResult = {
  allocations: Array<{
    batchId: string;
    quantityGrams: number;
    unitCostPerGram: number;
  }>;
};

export interface FifoEngine {
  allocate(request: FifoAllocationRequest): Promise<FifoAllocationResult>;
}

/**
 * Transitional adapter. Replace with deterministic DB FIFO allocator.
 */
export class PlaceholderFifoEngine implements FifoEngine {
  async allocate(_request: FifoAllocationRequest): Promise<FifoAllocationResult> {
    return { allocations: [] };
  }
}
