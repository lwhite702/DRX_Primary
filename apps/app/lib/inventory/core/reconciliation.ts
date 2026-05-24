export type ReconciliationIssueCode =
  | "STATE_EVENT_DRIFT"
  | "ALLOCATION_GAP"
  | "MISSING_AUDIT_LOG"
  | "NEGATIVE_STOCK";

export type ReconciliationIssue = {
  code: ReconciliationIssueCode;
  message: string;
  businessId: string;
  inventoryId?: string;
};

export interface InventoryReconciliationService {
  runBusinessCheck(businessId: string): Promise<ReconciliationIssue[]>;
}

export class PlaceholderInventoryReconciliationService implements InventoryReconciliationService {
  async runBusinessCheck(_businessId: string): Promise<ReconciliationIssue[]> {
    return [];
  }
}
