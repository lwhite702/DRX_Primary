import type {
  CartLineItem,
  PosPaymentMethod as PosQuickPaymentMethod,
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

export type DeliveryFeeAllocation = "charge_customer" | "absorb";

export interface QuickPosDeliveryState {
  enabled: boolean;
  address: string;
  vendorFeeCents: number;
  feeAllocation: DeliveryFeeAllocation;
  feeTaxable: boolean;
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
  lastChange?: number | null;
  lastIsDelivery?: boolean;
}

export interface QuickPosDiscountState {
  amountCents: number;
  reason?: string;
}

export interface QuickPosState {
  cartItems: QuickPosCartItem[];
  customer: QuickPosCustomer;
  payment: QuickPosPaymentState;
  delivery: QuickPosDeliveryState;
  discount: QuickPosDiscountState;
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
  amountPaid?: number;
  delivery?: QuickPosDeliveryState;
  discountAmountCents?: number;
  discountReason?: string;
  items: QuickPosCartItem[];
}

export interface QuickPosCheckoutResponse {
  success: boolean;
  saleId?: string;
  total?: number;
  changeAmount?: number;
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
  hasPinConfigured?: boolean;
}

export type DeliveryDispatchType = "merchant_dispatch" | "customer_pickup_car";
export type DeliveryFeeSplitMode = "pass_full" | "absorb_full" | "split_half" | "custom";

export interface QuickPosPaymentTender {
  method: Exclude<QuickPosPaymentMethod, "mixed" | "split">;
  amountCents: number;
  reference?: string;
  processorFeeCents?: number;
}

export interface QuickPosCardFeePolicy {
  enabled: boolean;
  feeType: "percent" | "flat";
  feeBps: number;
  feeFlatCents: number;
}

export interface QuickPosCustomerFavoriteItem {
  productId: string;
  name: string;
  sku: string | null;
  unitPrice: number;
  lastQuantityGrams: number;
  orderCount: number;
}

interface QuickPosCustomer {
  firstName?: string | null;
  lastName?: string | null;
  loyaltyTier?: string | null;
  discountRateBps?: number | null;
  fixedPricePerGram?: number | null;
  purchaseCount?: number;
  totalPurchases?: number;
  recentFavorites?: QuickPosCustomerFavoriteItem[];
}

interface QuickPosPaymentState {
  cardFeeCents?: number;
  cardFeeWaived?: boolean;
  cardFeeCustomCents?: number | null;
  paymentRef?: string;
  tenders?: QuickPosPaymentTender[];
}

interface QuickPosDeliveryState {
  dispatchType?: DeliveryDispatchType;
  feeSplitMode?: DeliveryFeeSplitMode;
  customerFeeCents?: number;
  estimatedArrivalMinutes?: number;
  uberTrackingUrl?: string;
}

interface QuickPosState {
  previousCustomer?: QuickPosCustomer | null;
  cardFeePolicy?: QuickPosCardFeePolicy;
}

interface QuickPosCheckoutRequest {
  paymentRef?: string;
  paymentTenders?: QuickPosPaymentTender[];
  fees?: Array<{ type: string; amount?: number; value?: string }>;
}

