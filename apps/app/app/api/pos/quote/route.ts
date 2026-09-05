import { NextRequest, NextResponse } from "next/server";
import { resolveAuthContext } from "@/app/api/pos/_lib/server";
import {
  PosCheckoutError,
  addItem,
  createCart,
  getAuthoritativeQuote,
} from "@/lib/pos/core";
import { quickPosQuotePayloadSchema } from "@/lib/pos/contract";
import {
  quoteCanonicalCommerce,
  shouldUseCanonicalCommerce,
} from "@/app/api/pos/_lib/convex-commerce";
import { hasConfiguredCanonicalCommerce } from "@/app/api/pos/_lib/commerce-routing";

export async function POST(request: NextRequest) {
  const { userId, businessId } = await resolveAuthContext();

  if (!userId || !businessId) {
    return NextResponse.json(
      { success: false, error: "Unauthorized" },
      { status: 401 },
    );
  }

  const parsed = quickPosQuotePayloadSchema.safeParse(await request.json());
  if (!parsed.success) {
    return NextResponse.json(
      { success: false, error: "Invalid quote payload" },
      { status: 400 },
    );
  }

  const requiresCanonicalCommerce =
    shouldUseCanonicalCommerce(parsed.data) ||
    (await hasConfiguredCanonicalCommerce(businessId, parsed.data.items));

  if (requiresCanonicalCommerce) {
    try {
      const quote = await quoteCanonicalCommerce({
        businessId,
        customerId: parsed.data.customerId,
        items: parsed.data.items,
        delivery: parsed.data.delivery,
      });
      return NextResponse.json({ success: true, quote });
    } catch (error) {
      return NextResponse.json(
        {
          success: false,
          error:
            error instanceof Error
              ? error.message
              : "Unable to quote commerce sale",
        },
        { status: 400 },
      );
    }
  }

  let cart = createCart({
    businessId,
    userId,
    mode: "quick",
    customerId: parsed.data.customerId ?? null,
  });

  for (const item of parsed.data.items) {
    cart = addItem(cart, item);
  }

  try {
    const quote = await getAuthoritativeQuote(cart);
    return NextResponse.json({ success: true, quote });
  } catch (error) {
    const status = error instanceof PosCheckoutError ? error.status : 400;
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : "Unable to quote sale",
      },
      { status },
    );
  }
}
