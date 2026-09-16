import { NextRequest, NextResponse } from "next/server";
import { api } from "@/convex/_generated/api";
import { intakeClient, intakeFailure } from "@/lib/inventory/convex-intake";
export async function GET(request: NextRequest) {
  try {
    const { client, businessId } = await intakeClient(request);
    const data = await client.query(api.inventory.recentAudit, { businessId });
    return NextResponse.json({ data }, { headers: { "Cache-Control": "private, no-store" } });
  } catch (error) { return intakeFailure(error); }
}
