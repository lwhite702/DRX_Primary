export type PosMode = "quick" | "full";

export type PosPaymentMethod = "cash" | "card" | "credit" | "mixed" | "zelle";

export type PosReceiptOption = "print" | "sms" | "none";

export type PosCartItemSource = "inventory" | "manual";

export interface PosCartItem {
  id: string;
  inventoryId: string | null;
  name: string;
  unitPrice: number;
  qty: number;
  source: PosCartItemSource;
}

export interface PosPayment {
  method: PosPaymentMethod;
  receipt: PosReceiptOption;
  creditConfirmed: boolean;
}

export interface PosFee {
  type: string;
  amount?: number;
  value?: string;
}

export interface PosCart {
  businessId: string;
  userId: string;
  mode: PosMode;
  customerId: string | null;
  payment: PosPayment;
  items: PosCartItem[];
  taxAmount: number;
  fees: PosFee[];
}

export interface PosQuote {
  subtotal: number;
  taxAmount: number;
  feesTotal: number;
  total: number;
}

export interface PosCheckoutResult {
  saleId: string;
  total: number;
}
