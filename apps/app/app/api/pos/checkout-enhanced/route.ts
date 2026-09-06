import { NextRequest, NextResponse } from "next/server";
import { resolveAuthContext } from "@/app/api/pos/_lib/server";
import { fullCheckoutPayloadSchema } from "@/lib/pos/contract";
import { buildCheckoutSuccess } from "@/lib/pos/response";
import { performFullCheckout, checkoutFailure } from "@/app/api/pos/_lib/full-checkout";
export async function POST(request: NextRequest) {
  try {
    const { userId, businessId } = await resolveAuthContext(request);
    if (!userId || !businessId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    const body = await request.json();
    const payload = fullCheckoutPayloadSchema.parse({ ...body, mode: "full", source: "checkout-enhanced", payment: { method: body.paymentMethod ?? "cash", receipt: "none", creditConfirmed: body.paymentMethod === "credit" }, items: Array.isArray(body.lineItems) ? body.lineItems.map((item: Record<string, unknown>) => ({ id: item.id ?? item.inventory_id, inventoryId: item.inventory_id, source: "inventory", name: item.product_name ?? item.name ?? "Inventory item", qty: Number(item.quantity ?? 1), unitPrice: Number(item.overridden_price ?? item.unit_price ?? 0), weightGrams: item.weight_grams === undefined ? undefined : Number(item.weight_grams), originalPrice: item.original_price === undefined ? undefined : Number(item.original_price), overrideReason: item.override_reason })) : [] });
    return NextResponse.json(buildCheckoutSuccess(await performFullCheckout(payload, businessId)));
  } catch (error) { return checkoutFailure(error); }
}
