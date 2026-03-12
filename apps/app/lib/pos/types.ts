export type {
  CartLineItem as PosCartItem,
  CheckoutPayload as PosCheckoutRequest,
  PosFee,
  PosCheckoutSource,
  PosMode,
  PosPaymentMethod,
  PosReceiptOption,
  PosCartItemSource,
} from "@/lib/pos/contract";

import type {
  CartLineItem,
  PosCheckoutSource,
  PosFee,
  PosMode,
  PosPaymentMethod,
  PosReceiptOption,
} from "@/lib/pos/contract";

export interface PosPayment {
  method: PosPaymentMethod;
  receipt: PosReceiptOption;
  creditConfirmed: boolean;
}

export interface PosCart {
  businessId: string;
  userId: string;
  mode: PosMode;
  source: PosCheckoutSource;
  customerId: string | null;
  payment: PosPayment;
  items: CartLineItem[];
  taxAmount: number;
  fees: PosFee[];
  paymentRef?: string | null;
  amountPaid?: number | null;
  deliveryManagementId?: string | null;
  deliveryAddress?: string | null;
  deliveryPrice?: number;
}

export interface PosQuote {
  subtotal: number;
  taxAmount: number;
  feesTotal: number;
  total: number;
}

export interface PosCheckoutResult {
  saleId: string;
  orderNumber: string;
  total: number;
  changeAmount: number;
}
