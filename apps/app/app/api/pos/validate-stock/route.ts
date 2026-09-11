import { NextRequest, NextResponse } from "next/server";
import { resolveAuthContext } from "@/app/api/pos/_lib/server";
import { checkCanonicalCart, checkFailure, normalizeCheckItems } from "@/app/api/pos/_lib/convex-preflight";

export async function POST(request: NextRequest) {
  try {
    const { businessId } = await resolveAuthContext(request);
    if (!businessId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    const body = await request.json();
    const { stock } = await checkCanonicalCart({ businessId, items: normalizeCheckItems(body?.items), amountCents: 0 });
    return NextResponse.json({ valid: stock.valid, errors: stock.errors.map((entry: { inventoryId: string; message: string }) => ({ inventory_id: entry.inventoryId, message: entry.message })) }, { headers: { "Cache-Control": "private, no-store" } });
  } catch (error) { return checkFailure(error); }
}
