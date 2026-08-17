import type {
  CartLineItem,
  PosQuickPaymentMethod,
  PosReceiptOption,
  QuickPosBootstrapResponseContract,
  ReceiptOutput,
} from "@/lib/pos/contract";
import type { PosAuthoritativeQuote } from "@/lib/pos/types";

export type QuickPosPaymentMethod = PosQuickPaymentMethod;
export type QuickPosReceiptOption = PosReceiptOption;
export type QuickPosCartItemSource = CartLineItem["source"];
export type QuickPosCartItem = CartLineItem;

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
  pendingIdempotencyKey: string | null;
  lastSaleTotal: number | null;
  lastReceipt: QuickPosReceiptOption | null;
}

export interface QuickPosState {
  cartItems: QuickPosCartItem[];
  customer: QuickPosCustomer;
  payment: QuickPosPaymentState;
  ui: QuickPosUiState;
  session: QuickPosSessionState;
  creditPolicyEnabled: boolean;
}

export type QuickPosBootstrapItem =
  QuickPosBootstrapResponseContract["favorites"][number];
export type QuickPosBootstrapResponse = QuickPosBootstrapResponseContract;

export interface QuickPosCheckoutRequest {
  mode: "quick";
  idempotencyKey: string;
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
  total?: number;
  receipt?: ReceiptOutput;
  error?: string;
}

export interface QuickPosQuoteResponse {
  success: boolean;
  quote?: PosAuthoritativeQuote;
  error?: string;
}

export interface QuickPosExitVerifyRequest {
  pin: string;
}

export interface QuickPosExitVerifyResponse {
  allowed: boolean;
}
