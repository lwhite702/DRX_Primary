import { NextRequest, NextResponse } from "next/server";
import { resolveAuthContext } from "@/app/api/pos/_lib/server";
import { fullCheckoutPayloadSchema, quickPosQuotePayloadSchema } from "@/lib/pos/contract";
import { quoteCanonicalCommerce } from "@/app/api/pos/_lib/convex-commerce";
import { fullCommerceInput, checkoutFailure } from "@/app/api/pos/_lib/full-checkout";
export async function POST(request: NextRequest) {
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
    const quote = await quoteCanonicalCommerce({ businessId, customerId: parsed.data.customerId, items: parsed.data.items, delivery: parsed.data.delivery });
    return NextResponse.json({ success: true, quote }, { headers: { "Cache-Control": "private, no-store" } });
  } catch (error) { return checkoutFailure(error); }
}
