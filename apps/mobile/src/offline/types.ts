export type OfflinePaymentMethod = "cash" | "credit";

export interface OfflineAuthorizationSnapshot {
  authorizationId: string;
  businessId: string;
  userId: string;
  deviceId: string;
  issuedAt: number;
  expiresAt: number;
  policyVersion: number;
  perSaleLimitCents: number;
  sessionLimitCents: number;
  offlineCreditLimitCents: number;
  maxQueuedSales: number;
  collectTax: boolean;
  taxRateBps: number;
}

export interface OfflineSaleItem {
  productId: string;
  quantityGrams: number;
  unitPriceCents: number;
}

export interface OfflineSaleEnvelope {
  authorizationId: string;
  businessId: string;
  userId: string;
  deviceId: string;
  idempotencyKey: string;
  sequence: number;
  occurredAt: number;
  customerId?: string;
  customerCreditAvailableCents?: number;
  items: OfflineSaleItem[];
  paymentMethod: OfflinePaymentMethod;
  amountPaidCents: number;
  totalAmountCents: number;
}

export interface PendingOfflineSale {
  idempotencyKey: string;
  envelope: OfflineSaleEnvelope;
  attempts: number;
  status: "pending" | "syncing" | "quarantined";
}

export interface OfflineQueueSummary {
  pending: number;
  quarantined: number;
  totalCents: number;
}
