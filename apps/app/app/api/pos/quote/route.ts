import { NextRequest, NextResponse } from "next/server";
import { resolveAuthContext } from "@/app/api/pos/_lib/server";
import { fullCheckoutPayloadSchema, quickPosQuotePayloadSchema } from "@/lib/pos/contract";
import { quoteCanonicalCommerce } from "@/app/api/pos/_lib/convex-commerce";
import { fullCommerceInput, checkoutFailure } from "@/app/api/pos/_lib/full-checkout";
import { isAuthBypassEnabledServer } from "@/lib/auth/bypass";
export async function POST(request: NextRequest) {
  try {
    const { userId, businessId } = await resolveAuthContext(request);
    if (!userId || !businessId) return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
    const body = await request.json();
    if (body?.mode === "full") {
      const payload = fullCheckoutPayloadSchema.omit({ idempotencyKey: true }).parse(body);
      let quote;
      try {
        quote = await quoteCanonicalCommerce(fullCommerceInput(payload, businessId));
      } catch (err) {
        if (isAuthBypassEnabledServer()) {
          const subtotal = payload.items.reduce((sum, item) => sum + (item.unitPrice * (item.qty ?? 1)), 0);
          quote = { subtotal, taxAmount: 0, total: subtotal, discountAmount: payload.discountAmountCents ? payload.discountAmountCents / 100 : 0 };
        } else {
          throw err;
        }
      }
      return NextResponse.json({ success: true, quote }, { headers: { "Cache-Control": "private, no-store" } });
    }
    const parsed = quickPosQuotePayloadSchema.safeParse(body);
    if (!parsed.success) return NextResponse.json({ success: false, error: "Invalid quote payload" }, { status: 400 });
    let quote;
    try {
      quote = await quoteCanonicalCommerce({
        businessId,
        customerId: parsed.data.customerId,
        items: parsed.data.items,
        delivery: parsed.data.delivery,
        fees: parsed.data.fees,
        discountAmountCents: parsed.data.discountAmountCents,
        discountReason: parsed.data.discountReason,
      });
    } catch (err) {
      if (isAuthBypassEnabledServer()) {
        const subtotal = parsed.data.items.reduce((sum, item) => sum + (item.unitPrice * (item.qty ?? 1)), 0);
        quote = { subtotal, taxAmount: 0, total: subtotal, discountAmount: parsed.data.discountAmountCents ? parsed.data.discountAmountCents / 100 : 0 };
      } else {
        throw err;
      }
    }
    return NextResponse.json({ success: true, quote }, { headers: { "Cache-Control": "private, no-store" } });
  } catch (error) { return checkoutFailure(error); }
}
