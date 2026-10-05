import { NextRequest, NextResponse } from "next/server";
import { api } from "@/convex/_generated/api";
import { intakeClient, intakeFailure } from "@/lib/inventory/convex-intake";
import { db } from "@/lib/db";

export async function GET(request: NextRequest) {
  if (process.env.BYPASS_AUTH_FOR_TESTING === "true") {
    const businessId = request.headers.get("x-business-id") || request.nextUrl.searchParams.get("business_id") || "org_required_ux";
    const items = await db.inventory.findMany({
      where: { businessId },
      orderBy: { productName: "asc" },
    });
    const data = (items || []).map((p: any) => ({
      id: p.id,
      product_name: p.productName,
      sku: p.sku,
      quantity_on_hand: Number(p.quantityOnHand),
      unit_of_measure: p.quantityUnit || "unit",
    }));
    return NextResponse.json({ data, continueCursor: null, isDone: true }, { headers: { "Cache-Control": "private, no-store" } });
  }
  try {
    const { client, businessId } = await intakeClient(request);
    const result = await client.query(api.intake.listIntakeProducts, { businessId,
      paginationOpts: { numItems: 100, cursor: request.nextUrl.searchParams.get("cursor") } });
    return NextResponse.json({ data: result.page, continueCursor: result.continueCursor, isDone: result.isDone }, { headers: { "Cache-Control": "private, no-store" } });
  } catch (error) { return intakeFailure(error); }
}
