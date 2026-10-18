export interface PaymentTenderLabelInput {
  method: string;
  amountCents?: number;
  reference?: string;
}

const P2P_LABELS: Record<string, string> = {
  p2p_cashapp: "P2P • Cash App",
  p2p_paypal: "P2P • PayPal",
  p2p_zelle: "P2P • Zelle",
  zelle: "P2P • Zelle",
  p2p_onepay: "P2P • OnePay",
  p2p_chime: "P2P • Chime",
  p2p_venmo: "P2P • Venmo",
  p2p_other: "P2P • Other",
};

/** Human-readable payment label for Cash, Card, P2P providers, Store Credit, and split tenders. */
export function formatPaymentMethodBadge(
  method?: string | null,
  tenders?: PaymentTenderLabelInput[] | null,
): string {
  if (!method) return "Cash";
  const normalized = method.toLowerCase();
  if (normalized === "split" || normalized === "mixed" || (tenders && tenders.length > 1)) {
    return `Split (${tenders && tenders.length > 1 ? tenders.length : 2})`;
  }
  if (P2P_LABELS[normalized]) return P2P_LABELS[normalized];
  if (normalized === "credit") return "Store Credit";
  return normalized.charAt(0).toUpperCase() + normalized.slice(1);
}

export function isP2PPaymentMethod(method?: string | null): boolean {
  if (!method) return false;
  const normalized = method.toLowerCase();
  return normalized === "zelle" || normalized.startsWith("p2p_");
}
