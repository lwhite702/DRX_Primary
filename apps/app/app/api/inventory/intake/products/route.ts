import { NextRequest, NextResponse } from "next/server";
import { api } from "@/convex/_generated/api";
import { intakeClient, intakeFailure } from "@/lib/inventory/convex-intake";
export async function GET(request: NextRequest) {
  try {
    const { client, businessId } = await intakeClient(request);
    const result = await client.query(api.intake.listIntakeProducts, { businessId,
      paginationOpts: { numItems: 100, cursor: request.nextUrl.searchParams.get("cursor") } });
    return NextResponse.json({ data: result.page, continueCursor: result.continueCursor, isDone: result.isDone }, { headers: { "Cache-Control": "private, no-store" } });
  } catch (error) { return intakeFailure(error); }
}
