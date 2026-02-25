export type {
  CartLineItem as PosCartItem,
  CheckoutPayload as PosCheckoutRequest,
  PosFee,
  PosMode,
  PosPaymentMethod,
  PosReceiptOption,
  PosCartItemSource,
} from "@/lib/pos/contract";

import type { CartLineItem, PosFee, PosMode, PosPaymentMethod, PosReceiptOption } from "@/lib/pos/contract";

export interface PosPayment {
  method: PosPaymentMethod;
  receipt: PosReceiptOption;
  creditConfirmed: boolean;
}

export interface PosCart {
  businessId: string;
  userId: string;
  mode: PosMode;
  customerId: string | null;
  payment: PosPayment;
  items: CartLineItem[];
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

