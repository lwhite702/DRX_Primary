import { NextResponse } from "next/server";
import { z } from "zod";
import { fullCheckoutPayloadSchema } from "@/lib/pos/contract";
import { checkoutFullCanonicalCommerce } from "./convex-commerce";
import { buildCheckoutFailure } from "@/lib/pos/response";

type FullPayload = z.infer<typeof fullCheckoutPayloadSchema>;
export function fullCommerceInput(payload: Omit<FullPayload, "idempotencyKey">, businessId: string) {
  const isPickupCar = payload.delivery?.dispatchType === "customer_pickup_car";
  const hasDelivery = Boolean(payload.delivery?.enabled || payload.deliveryManagementId || payload.deliveryAddress || payload.deliveryPrice);
  const resolvedAddress = payload.delivery?.address || payload.deliveryAddress || "";
  if (hasDelivery && !isPickupCar && resolvedAddress.trim().length < 5) throw new Error("INVALID_ARGUMENT: Enter a delivery address");
  const fee = payload.delivery?.customerFeeCents ?? Math.round((payload.deliveryPrice ?? 0) * 100);
  if (!Number.isSafeInteger(fee) || fee < 0) throw new Error("INVALID_ARGUMENT: Invalid delivery charge");
  return {
    businessId, customerId: payload.customerId, fees: payload.fees, usePriceOverrides: true,
    discountAmountCents: payload.discountAmountCents,
    discountReason: payload.discountReason,
    items: payload.items.map(item => ({ ...item, unitPrice: item.overrideReason && item.weightGrams ? Math.round(item.unitPrice * 100 / item.weightGrams) / 100 : item.unitPrice })),
    delivery: payload.delivery?.enabled ? payload.delivery : undefined,
    fullDelivery: hasDelivery && !payload.delivery?.enabled ? { profileId: payload.deliveryManagementId ?? undefined, address: resolvedAddress, customerFeeCents: fee } : undefined,
  };
}
export async function performFullCheckout(payload: FullPayload, businessId: string) {
  if (payload.payment.method === "credit" && (!payload.customerId || !payload.payment.creditConfirmed)) throw new Error("INVALID_ARGUMENT: Confirm the credit customer");
  const displayedTotal = payload.expectedTotal ?? Math.round((payload.items.reduce((sum, item) => sum + item.unitPrice * item.qty, 0) + payload.taxAmount + payload.fees.reduce((sum, fee) => sum + (fee.amount ?? 0), 0) + (payload.deliveryPrice ?? 0)) * 100) / 100;
  if (payload.payment.method === "mixed" && payload.amountPaid !== undefined && payload.amountPaid < displayedTotal && (!payload.customerId || !payload.payment.creditConfirmed)) throw new Error("INVALID_ARGUMENT: Confirm the customer credit remainder");
  const tenders = payload.paymentTenders ?? payload.payment.tenders;
  return checkoutFullCanonicalCommerce({
    ...fullCommerceInput(payload, businessId),
    idempotencyKey: payload.idempotencyKey,
    paymentMethod: payload.payment.method as any,
    paymentRef: payload.paymentRef,
    paymentTenders: tenders,
    amountPaid: payload.amountPaid,
    expectedTotal: displayedTotal,
  });
}
export function checkoutFailure(error: unknown) {
  const raw = error instanceof Error ? error.message : "";
  const conflict = raw.includes("CONFLICT") || raw.includes("QUOTE_CHANGED:");
  const status = conflict ? 409 : raw.includes("FORBIDDEN:") ? 403 : raw.includes("UNAUTHENTICATED:") ? 401 : error instanceof z.ZodError || error instanceof SyntaxError || /INVALID_ARGUMENT:|PAYMENT_ERROR:|CREDIT_LIMIT_EXCEEDED:|INSUFFICIENT_STOCK:|NOT_FOUND:|ArgumentValidationError/.test(raw) ? 400 : 503;
  const message = raw.includes("QUOTE_CHANGED:") ? "Prices changed. Review the updated quote before paying." : conflict ? "This checkout changed. Refresh the quote or retry the original submission." : status === 503 ? "Checkout is temporarily unavailable. Retry the same submission." : "Checkout could not be completed. Check the cart and payment details.";
  return NextResponse.json({ ...buildCheckoutFailure(message), error: message }, { status });
}
