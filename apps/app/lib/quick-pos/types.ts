export type QuickPosPaymentMethod = "cash" | "card" | "credit";

export type QuickPosReceiptOption = "print" | "sms" | "none";

export type QuickPosCartItemSource = "inventory" | "manual";

export interface QuickPosCartItem {
  id: string;
  inventoryId: string | null;
  name: string;
  unitPrice: number;
  qty: number;
  source: QuickPosCartItemSource;
}

export interface QuickPosCustomer {
  id: string | null;
  phone: string;
  alias: string | null;
  remainingCredit?: number;
}

export interface QuickPosPaymentState {
  method: QuickPosPaymentMethod | null;
  receipt: QuickPosReceiptOption;
  creditConfirmed: boolean;
}

export interface QuickPosUiState {
  search: string;
  exitDialogOpen: boolean;
  processing: boolean;
  hardError: string | null;
  successMessage: string | null;
}

export interface QuickPosSessionState {
  lastSaleId: string | null;
  lastCompletedAt: number | null;
}

export interface QuickPosState {
  cartItems: QuickPosCartItem[];
  customer: QuickPosCustomer;
  payment: QuickPosPaymentState;
  ui: QuickPosUiState;
  session: QuickPosSessionState;
  creditPolicyEnabled: boolean;
}

export interface QuickPosBootstrapItem {
  id: string;
  name: string;
  price: number;
}

export interface QuickPosBootstrapResponse {
  favorites: QuickPosBootstrapItem[];
  recentlySold: QuickPosBootstrapItem[];
  creditPolicy: {
    enabled: boolean;
  };
}

export interface QuickPosCheckoutRequest {
  customerId: string | null;
  payment: {
    method: QuickPosPaymentMethod;
    receipt: QuickPosReceiptOption;
    creditConfirmed: boolean;
  };
  items: QuickPosCartItem[];
}

export interface QuickPosCheckoutResponse {
  success: boolean;
  saleId?: string;
  error?: string;
}

export interface QuickPosExitVerifyRequest {
  pin: string;
}

export interface QuickPosExitVerifyResponse {
  allowed: boolean;
}
