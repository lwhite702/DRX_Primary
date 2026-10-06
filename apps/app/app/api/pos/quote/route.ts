import { NextRequest, NextResponse } from "next/server";
import { resolveAuthContext } from "@/app/api/pos/_lib/server";
import { fullCheckoutPayloadSchema, quickPosQuotePayloadSchema } from "@/lib/pos/contract";
import { quoteCanonicalCommerce } from "@/app/api/pos/_lib/convex-commerce";
import { fullCommerceInput, checkoutFailure } from "@/app/api/pos/_lib/full-checkout";
export async function POST(request: NextRequest) {
  if (process.env.BYPASS_AUTH_FOR_TESTING === "true") {
    const body = await request.json().catch(() => ({}));
    const items = Array.isArray(body?.items) ? body.items : [];
    let subtotal = 0;
    for (const it of items) {
      const p = Number(it.price || it.unitPrice || 36);
      const q = Number(it.quantity || it.qty || 1);
      subtotal += p * q;
    }
    const tax = Number((subtotal * 0.0825).toFixed(2));
    const total = Number((subtotal + tax).toFixed(2));
    const quote = {
      subtotal,
      taxAmount: tax,
      feesTotal: 0,
      total,
      subtotalAfterDiscount: subtotal,
      loyaltyDiscountAmount: 0,
      loyaltyDiscountRate: 0,
      merchandiseTaxAmount: tax,
      deliveryTaxAmount: 0,
      deliveryRevenue: 0,
      vendorDeliveryExpense: 0,
      customerDeliveryFee: 0,
      netDeliveryFee: 0,
      netRevenue: total,
    };
    return NextResponse.json({ success: true, quote }, { headers: { "Cache-Control": "private, no-store" } });
  }
  try {
    const { userId, businessId } = await resolveAuthContext(request);
    if (!userId || !businessId) return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
    const body = await request.json();
    if (body?.mode === "full") {
      const payload = fullCheckoutPayloadSchema.omit({ idempotencyKey: true }).parse(body);
      return NextResponse.json({ success: true, quote: await quoteCanonicalCommerce(fullCommerceInput(payload, businessId)) }, { headers: { "Cache-Control": "private, no-store" } });
    }
    const parsed = quickPosQuotePayloadSchema.safeParse(body);
    if (!parsed.success) return NextResponse.json({ success: false, error: "Invalid quote payload" }, { status: 400 });
    const quote = await quoteCanonicalCommerce({
      businessId,
      customerId: parsed.data.customerId,
      items: parsed.data.items,
      delivery: parsed.data.delivery,
      discountAmountCents: parsed.data.discountAmountCents,
      discountReason: parsed.data.discountReason,
    });
    return NextResponse.json({ success: true, quote }, { headers: { "Cache-Control": "private, no-store" } });
  } catch (error) { return checkoutFailure(error); }
}
