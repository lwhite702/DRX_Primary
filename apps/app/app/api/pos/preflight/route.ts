import { NextRequest, NextResponse } from "next/server";
import { resolveAuthContext } from "@/app/api/pos/_lib/server";
import { checkAmount, checkCanonicalCart, checkFailure, normalizeCheckItems } from "@/app/api/pos/_lib/convex-preflight";
import { z } from "zod";

export async function POST(request: NextRequest) {
  try {
    const { businessId } = await resolveAuthContext(request);
    if (!businessId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    const body = z.object({ items: z.array(z.record(z.string(), z.unknown())).max(200), customerId: z.string().min(1).max(128).nullish(), customer_id: z.string().min(1).max(128).nullish(), amount: z.unknown().optional(), total: z.unknown().optional() }).parse(await request.json());
    const items = normalizeCheckItems(body.items);
    const { stock, credit } = await checkCanonicalCart({ businessId, items, customerId: body.customerId ?? body.customer_id ?? undefined, amountCents: checkAmount(body.amount ?? body.total) });
    const pricingErrors: string[] = [];
    for (const item of body.items) {
      const price = Number(item.unitPrice ?? item.unit_price ?? 0);
      const quantity = Number(item.qty ?? item.quantity ?? 1);
      if (!Number.isFinite(price) || price < 0) pricingErrors.push("Invalid unit price");
      if (!Number.isFinite(quantity) || quantity <= 0) pricingErrors.push("Invalid quantity");
    }
    // Client prices are checked for shape only; the canonical quote/checkout computes prices.
    return NextResponse.json({ valid: stock.valid && credit.valid && pricingErrors.length === 0, stock, credit, pricing: { valid: pricingErrors.length === 0, errors: pricingErrors }, errors: [...stock.errors.map(entry => entry.message), ...(credit.warning ? [credit.warning] : []), ...pricingErrors] }, { headers: { "Cache-Control": "private, no-store" } });
  } catch (error) { return checkFailure(error); }
}
