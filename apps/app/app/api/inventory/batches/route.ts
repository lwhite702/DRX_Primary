import { NextRequest, NextResponse } from "next/server";
import { api } from "@/convex/_generated/api";
import { intakeClient, intakeFailure } from "@/lib/inventory/convex-intake";
import type { Id } from "@/convex/_generated/dataModel";

export async function GET(request: NextRequest) {
  try {
    const { client } = await intakeClient(request);
    const productId = request.nextUrl.searchParams.get("productId");
    if (!productId) {
      throw new Error("INVALID_ARGUMENT: productId is required");
    }
    const batches = await client.query(api.intake.getProductBatches, {
      productId: productId as Id<"products">,
    });
    return NextResponse.json(
      { batches },
      { headers: { "Cache-Control": "private, no-store" } },
    );
  } catch (error) {
    return intakeFailure(error);
  }
}
