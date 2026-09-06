import { NextRequest, NextResponse } from "next/server";
import { resolveAuthContext } from "@/app/api/pos/_lib/server";
import { quickPosQuotePayloadSchema } from "@/lib/pos/contract";
import { quoteCanonicalCommerce } from "@/app/api/pos/_lib/convex-commerce";
export async function POST(request: NextRequest) {
  try {
    const { userId, businessId } = await resolveAuthContext(request);
    if (!userId || !businessId) return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
    const parsed = quickPosQuotePayloadSchema.safeParse(await request.json());
    if (!parsed.success) return NextResponse.json({ success: false, error: "Invalid quote payload" }, { status: 400 });
    const quote = await quoteCanonicalCommerce({ businessId, customerId: parsed.data.customerId, items: parsed.data.items, delivery: parsed.data.delivery });
    return NextResponse.json({ success: true, quote });
  } catch {
    return NextResponse.json({ success: false, error: "Unable to quote this sale. Refresh the cart and retry." }, { status: 400 });
  }
}
