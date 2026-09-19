import { NextResponse } from "next/server";
import { z } from "zod";
import { fullCheckoutPayloadSchema } from "@/lib/pos/contract";
import { checkoutFullCanonicalCommerce } from "./convex-commerce";
import { buildCheckoutFailure } from "@/lib/pos/response";

type FullPayload = z.infer<typeof fullCheckoutPayloadSchema>;
export function fullCommerceInput(payload: Omit<FullPayload, "idempotencyKey">, businessId: string) {
  const hasDelivery = Boolean(payload.deliveryManagementId || payload.deliveryAddress || payload.deliveryPrice);
  if (hasDelivery && (!payload.deliveryAddress || payload.deliveryAddress.trim().length < 5)) throw new Error("INVALID_ARGUMENT: Enter a delivery address");
  const fee = Math.round((payload.deliveryPrice ?? 0) * 100);
  if (!Number.isSafeInteger(fee) || Math.abs(fee - (payload.deliveryPrice ?? 0) * 100) > 1e-6) throw new Error("INVALID_ARGUMENT: Invalid delivery charge");
  return {
    businessId, customerId: payload.customerId, fees: payload.fees, usePriceOverrides: true,
    discountAmountCents: payload.discountAmountCents,
    discountReason: payload.discountReason,
    items: payload.items.map(item => ({ ...item, unitPrice: item.overrideReason && item.weightGrams ? Math.round(item.unitPrice * 100 / item.weightGrams) / 100 : item.unitPrice })),
    fullDelivery: hasDelivery ? { profileId: payload.deliveryManagementId ?? undefined, address: payload.deliveryAddress!, customerFeeCents: fee } : undefined,
  };
}
export async function performFullCheckout(payload: FullPayload, businessId: string) {
  if (payload.payment.method === "credit" && (!payload.customerId || !payload.payment.creditConfirmed)) throw new Error("INVALID_ARGUMENT: Confirm the credit customer");
  const displayedTotal = payload.expectedTotal ?? Math.round((payload.items.reduce((sum, item) => sum + item.unitPrice * item.qty, 0) + payload.taxAmount + payload.fees.reduce((sum, fee) => sum + (fee.amount ?? 0), 0) + (payload.deliveryPrice ?? 0)) * 100) / 100;
  if (payload.payment.method === "mixed" && payload.amountPaid !== undefined && payload.amountPaid < displayedTotal && (!payload.customerId || !payload.payment.creditConfirmed)) throw new Error("INVALID_ARGUMENT: Confirm the customer credit remainder");
  return checkoutFullCanonicalCommerce({ ...fullCommerceInput(payload, businessId), idempotencyKey: payload.idempotencyKey, paymentMethod: payload.payment.method, paymentRef: payload.paymentRef, amountPaid: payload.amountPaid, expectedTotal: displayedTotal });
}
export function checkoutFailure(error: unknown) {
  const raw = error instanceof Error ? error.message : "";
  const conflict = raw.includes("CONFLICT") || raw.includes("QUOTE_CHANGED:");
  const status = conflict ? 409 : raw.includes("FORBIDDEN:") ? 403 : raw.includes("UNAUTHENTICATED:") ? 401 : error instanceof z.ZodError || error instanceof SyntaxError || /INVALID_ARGUMENT:|PAYMENT_ERROR:|CREDIT_LIMIT_EXCEEDED:|INSUFFICIENT_STOCK:|NOT_FOUND:|ArgumentValidationError/.test(raw) ? 400 : 503;
  const message = raw.includes("QUOTE_CHANGED:") ? "Prices changed. Review the updated quote before paying." : conflict ? "This checkout changed. Refresh the quote or retry the original submission." : status === 503 ? "Checkout is temporarily unavailable. Retry the same submission." : "Checkout could not be completed. Check the cart and payment details.";
  return NextResponse.json({ ...buildCheckoutFailure(message), error: message }, { status });
}
