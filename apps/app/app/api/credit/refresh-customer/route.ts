import { refreshAICreditRecommendation } from "@/lib/credit/creditDecisionService";
import { getSupabaseClient } from "@/lib/supabase/client";
import { NextResponse } from "next/server";

export async function POST(request: Request) {
  try {
    const { customer_id, business_id } = await request.json();

    if (!customer_id || !business_id) {
      return NextResponse.json(
        { error: "Missing required fields: customer_id, business_id" },
        { status: 400 }
      );
    }

    // Verify user has access to this business
    // This would normally be done with auth middleware
    // For now, relying on row-level security in Supabase

    const result = await refreshAICreditRecommendation(
      customer_id,
      business_id
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
