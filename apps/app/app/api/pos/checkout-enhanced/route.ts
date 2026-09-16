import { NextRequest, NextResponse } from "next/server";
import { resolveAuthContext } from "@/app/api/pos/_lib/server";
import { fullCheckoutPayloadSchema } from "@/lib/pos/contract";
import { buildCheckoutSuccess } from "@/lib/pos/response";
import { performFullCheckout, checkoutFailure } from "@/app/api/pos/_lib/full-checkout";
export async function POST(request: NextRequest) {
  try {
    const { userId, businessId } = await resolveAuthContext(request);
    if (!userId || !businessId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    const body = await request.json().catch(() => null);
    if (!body || typeof body !== "object") {
      return NextResponse.json({ error: "Invalid request payload" }, { status: 400 });
    }

    const rawItems = Array.isArray(body.lineItems) ? body.lineItems : [];
    const mappedItems = [];
    for (let i = 0; i < rawItems.length; i++) {
      const item = rawItems[i];
      if (!item || typeof item !== "object") {
        return NextResponse.json({ error: `Invalid line item at index ${i}` }, { status: 400 });
      }

      const rawQty = item.quantity ?? 1;
      const qty = typeof rawQty === "number" ? rawQty : Number(rawQty);
      if (!Number.isFinite(qty) || qty <= 0) {
        return NextResponse.json({ error: `Invalid quantity at line item ${i + 1}` }, { status: 400 });
      }

      const rawPrice = item.overridden_price ?? item.unit_price ?? 0;
      const unitPrice = typeof rawPrice === "number" ? rawPrice : Number(rawPrice);
      if (!Number.isFinite(unitPrice) || unitPrice < 0) {
        return NextResponse.json({ error: `Invalid unit price at line item ${i + 1}` }, { status: 400 });
      }

      let weightGrams: number | undefined;
      if (item.weight_grams !== undefined) {
        const parsedWeight = typeof item.weight_grams === "number" ? item.weight_grams : Number(item.weight_grams);
        if (!Number.isFinite(parsedWeight) || parsedWeight <= 0) {
          return NextResponse.json({ error: `Invalid weight grams at line item ${i + 1}` }, { status: 400 });
        }
        weightGrams = parsedWeight;
      }

      let originalPrice: number | undefined;
      if (item.original_price !== undefined) {
        const parsedOrig = typeof item.original_price === "number" ? item.original_price : Number(item.original_price);
        if (!Number.isFinite(parsedOrig) || parsedOrig < 0) {
          return NextResponse.json({ error: `Invalid original price at line item ${i + 1}` }, { status: 400 });
        }
        originalPrice = parsedOrig;
      }

      mappedItems.push({
        id: item.id ?? item.inventory_id,
        inventoryId: item.inventory_id,
        source: "inventory" as const,
        name: item.product_name ?? item.name ?? "Inventory item",
        qty,
        unitPrice,
        weightGrams,
        originalPrice,
        overrideReason: typeof item.override_reason === "string" ? item.override_reason : undefined,
      });
    }

    const payload = fullCheckoutPayloadSchema.parse({
      ...body,
      mode: "full",
      source: "checkout-enhanced",
      payment: {
        method: body.paymentMethod ?? "cash",
        receipt: "none",
        creditConfirmed: body.paymentMethod === "credit",
      },
      items: mappedItems,
    });
    return NextResponse.json(buildCheckoutSuccess(await performFullCheckout(payload, businessId)));
  } catch (error) { return checkoutFailure(error); }
}
