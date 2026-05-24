export type CustomerIntelligenceEvent = {
  businessId: string;
  customerId: string;
  type:
    | "sale_completed"
    | "credit_extension"
    | "credit_payment"
    | "customer_updated";
  payload: Record<string, unknown>;
  at?: string;
};

export function buildCustomerIntelligenceEvent(
  event: CustomerIntelligenceEvent,
): CustomerIntelligenceEvent {
  return {
    ...event,
    at: event.at || new Date().toISOString(),
  };
}
