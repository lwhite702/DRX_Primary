import type { PosCheckoutResult } from "@/lib/pos/types";

export type CheckoutTotals = {
  total: number;
  changeAmount: number;
};

export type PosCheckoutApiResponse = {
  success: boolean;
  saleId: string | null;
  orderNumber: string | null;
  totals: CheckoutTotals | null;
  errors: string[];
  sale?: unknown;
};

export function buildCheckoutSuccess(
  result: PosCheckoutResult,
  extras?: { sale?: unknown },
): PosCheckoutApiResponse {
  return {
    success: true,
    saleId: result.saleId,
    orderNumber: result.orderNumber,
    totals: {
      total: result.total,
      changeAmount: result.changeAmount,
    },
    errors: [],
    ...(extras?.sale !== undefined ? { sale: extras.sale } : {}),
  };
}

export function buildCheckoutFailure(error: string): PosCheckoutApiResponse {
  return {
    success: false,
    saleId: null,
    orderNumber: null,
    totals: null,
    errors: [error],
  };
}
