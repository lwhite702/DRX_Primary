import { applyAICreditRecommendation, overrideCreditLimit } from "@/lib/credit/creditDecisionService";
import { NextResponse } from "next/server";

export async function POST(request: Request) {
  try {
    const { customer_id, business_id, user_id, action, new_limit, reason } =
      await request.json();

    if (!customer_id || !business_id || !user_id) {
      return NextResponse.json(
        { error: "Missing required fields: customer_id, business_id, user_id" },
        { status: 400 }
      );
    }

    let result;

    if (action === "apply_ai_recommendation") {
      result = await applyAICreditRecommendation(
        customer_id,
        business_id,
        user_id
      );
    } else if (action === "override" && new_limit !== undefined) {
      result = await overrideCreditLimit(
        customer_id,
        business_id,
        new_limit,
        reason || "Manual override",
        user_id
      );
    } else {
      return NextResponse.json(
        { error: "Invalid action or missing parameters" },
        { status: 400 }
      );
    }

    if (!result.success) {
      return NextResponse.json(
        { error: result.error || "Failed to process request" },
        { status: 400 }
      );
    }

    return NextResponse.json(
      { success: true, new_limit: result.new_limit },
      { status: 200 }
    );
  } catch (error) {
    console.error("Error in apply recommendation:", error);

    return NextResponse.json(
      {
        error: "Failed to process request",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}
