import { refreshAICreditRecommendation } from "@/lib/credit/creditDecisionService";
import { resolveAuthContext } from "@/app/api/pos/_lib/server";
import { NextResponse } from "next/server";
import { z } from "zod";

const RefreshCustomerSchema = z.object({
  customer_id: z.string().min(1),
});

export async function POST(request: Request) {
  try {
    const { businessId } = await resolveAuthContext();
    if (!businessId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const payload = RefreshCustomerSchema.safeParse(await request.json());
    if (!payload.success) {
      return NextResponse.json(
        { error: "Invalid payload", details: payload.error.flatten() },
        { status: 400 },
      );
    }

    const result = await refreshAICreditRecommendation(
      payload.data.customer_id,
      businessId,
    );

    if (!result.success) {
      return NextResponse.json(
        { error: result.error || "Failed to refresh recommendation" },
        { status: 400 }
      );
    }

    return NextResponse.json(
      {
        success: true,
        recommendation: result.recommendation,
      },
      { status: 200 }
    );
  } catch (error) {
    console.error("Error in customer credit refresh:", error);

    return NextResponse.json(
      {
        error: "Failed to process request",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}
