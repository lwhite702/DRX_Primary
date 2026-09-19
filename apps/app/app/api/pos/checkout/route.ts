import { NextRequest, NextResponse } from "next/server";
import { resolveAuthContext } from "@/app/api/pos/_lib/server";
import { posCheckoutSchema } from "@/lib/pos/schemas";
import { buildCheckoutSuccess } from "@/lib/pos/response";
import { checkoutCanonicalCommerce } from "@/app/api/pos/_lib/convex-commerce";
import { performFullCheckout, checkoutFailure } from "@/app/api/pos/_lib/full-checkout";

export async function POST(request: NextRequest) {
  try {
    const { userId, businessId } = await resolveAuthContext(request);
    if (!userId || !businessId) return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
    const parsed = posCheckoutSchema.safeParse(await request.json());
    if (!parsed.success) return NextResponse.json({ success: false, error: "Invalid checkout payload" }, { status: 400 });
    const payload = parsed.data;
    const result = payload.mode === "full"
      ? await performFullCheckout(payload, businessId)
      : await checkoutCanonicalCommerce({
          businessId,
          customerId: payload.customerId,
          items: payload.items,
          delivery: payload.delivery,
          idempotencyKey: payload.idempotencyKey,
          paymentMethod: payload.payment.method,
          discountAmountCents: payload.discountAmountCents,
          discountReason: payload.discountReason,
        });
    return NextResponse.json({ ...buildCheckoutSuccess(result), total: result.total, changeAmount: result.changeAmount, receipt: { saleId: result.saleId, total: result.total, receipt: payload.payment.receipt, channels: payload.payment.receipt === "none" ? [] : [{ type: "receipt", value: payload.payment.receipt }] } }, { status: 201 });
  } catch (error) { return checkoutFailure(error); }
}
