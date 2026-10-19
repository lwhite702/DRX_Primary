import { NextRequest, NextResponse } from "next/server";
import { resolveAuthContext } from "@/app/api/pos/_lib/server";
import { posCheckoutSchema } from "@/lib/pos/schemas";
import { buildCheckoutSuccess } from "@/lib/pos/response";
import { checkoutCanonicalCommerce } from "@/app/api/pos/_lib/convex-commerce";
import { performFullCheckout, checkoutFailure } from "@/app/api/pos/_lib/full-checkout";

function checkedCents(value: number) {
  const cents = Math.round(value * 100);
  if (!Number.isFinite(value) || value < 0 || !Number.isSafeInteger(cents) || Math.abs(cents - value * 100) > 1e-6) {
    throw new Error("INVALID_ARGUMENT: Money must use up to two decimal places");
  }
  return cents;
}

export async function POST(request: NextRequest) {
  try {
    const { userId, businessId } = await resolveAuthContext(request);
    if (!userId || !businessId) return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
    const parsed = posCheckoutSchema.safeParse(await request.json());
    if (!parsed.success) return NextResponse.json({ success: false, error: "Invalid checkout payload" }, { status: 400 });
    const payload = parsed.data;
    const nonCardFees = (payload.fees ?? []).filter((f) => f.type !== "card_processor_fee");
    const existingCardFee = (payload.fees ?? []).find((f) => f.type === "card_processor_fee");
    const canonicalCardFeeCents =
      payload.payment.cardFeeCents && payload.payment.cardFeeCents > 0
        ? payload.payment.cardFeeCents
        : existingCardFee?.amount !== undefined
          ? checkedCents(existingCardFee.amount)
          : 0;
    const fees = [
      ...nonCardFees,
      ...(canonicalCardFeeCents > 0
        ? [
            {
              type: "card_processor_fee",
              amount: canonicalCardFeeCents / 100,
              ...(existingCardFee?.value !== undefined ? { value: existingCardFee.value } : {}),
            },
          ]
        : []),
    ];
    const result = payload.mode === "full"
      ? await performFullCheckout(payload, businessId)
      : await checkoutCanonicalCommerce({
          businessId,
          customerId: payload.customerId,
          items: payload.items,
          delivery: payload.delivery,
          idempotencyKey: payload.idempotencyKey,
          paymentMethod: payload.payment.method,
          paymentRef: payload.paymentRef ?? payload.payment.paymentRef,
          paymentTenders: payload.paymentTenders ?? payload.payment.tenders,
          fees,
          amountPaid: payload.amountPaid,
          discountAmountCents: payload.discountAmountCents,
          discountReason: payload.discountReason,
        });
    return NextResponse.json({ ...buildCheckoutSuccess(result), total: result.total, changeAmount: result.changeAmount, receipt: { saleId: result.saleId, total: result.total, receipt: payload.payment.receipt, channels: payload.payment.receipt === "none" ? [] : [{ type: "receipt", value: payload.payment.receipt }] } }, { status: 201 });
  } catch (error) { return checkoutFailure(error); }
}
