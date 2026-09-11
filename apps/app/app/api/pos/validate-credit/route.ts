import { NextRequest, NextResponse } from "next/server";
import { resolveAuthContext } from "@/app/api/pos/_lib/server";
import { checkAmount, checkCanonicalCart, checkFailure } from "@/app/api/pos/_lib/convex-preflight";

export async function GET(request: NextRequest) {
  try {
    const { businessId } = await resolveAuthContext(request);
    if (!businessId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    const customerId = request.nextUrl.searchParams.get("customerId") || undefined;
    const amountCents = checkAmount(request.nextUrl.searchParams.get("amount"));
    const { credit } = await checkCanonicalCart({ businessId, items: [], customerId, amountCents });
    return NextResponse.json(customerId ? credit : { valid: true }, { headers: { "Cache-Control": "private, no-store" } });
  } catch (error) { return checkFailure(error); }
}
