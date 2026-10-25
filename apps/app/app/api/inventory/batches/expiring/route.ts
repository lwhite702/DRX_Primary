import { NextRequest, NextResponse } from "next/server";
import { api } from "@/convex/_generated/api";
import { intakeClient, intakeFailure } from "@/lib/inventory/convex-intake";

export async function GET(request: NextRequest) {
  try {
    const { client } = await intakeClient(request);
    const days = Number(request.nextUrl.searchParams.get("days") ?? 30);
    const maxExpirationDate = Date.now() + days * 86_400_000;
    const limit = Number(request.nextUrl.searchParams.get("limit") ?? 50);
    const batches = await client.query(api.intake.listExpiringBatches, {
      maxExpirationDate,
      limit,
    });
    return NextResponse.json(
      { batches },
      { headers: { "Cache-Control": "private, no-store" } },
    );
  } catch (error) {
    return intakeFailure(error);
  }
}
