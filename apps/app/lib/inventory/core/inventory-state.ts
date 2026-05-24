export type InventoryStateDelta = {
  businessId: string;
  inventoryId: string;
  quantityDeltaUnits?: number;
  quantityDeltaGrams?: number;
  expectedVersion?: number;
};

export type InventoryStateApplyResult = {
  applied: boolean;
  newVersion?: number;
  conflict?: {
    reason: "stale_version";
  };
};

export interface InventoryStateStore {
  applyDelta(delta: InventoryStateDelta): Promise<InventoryStateApplyResult>;
}

/**
 * Transitional no-op adapter so routes can adopt engine incrementally.
 */
export class PlaceholderInventoryStateStore implements InventoryStateStore {
  async applyDelta(_delta: InventoryStateDelta): Promise<InventoryStateApplyResult> {
    return { applied: true };
  }
}
