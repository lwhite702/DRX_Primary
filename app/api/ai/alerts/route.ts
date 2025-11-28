import { NextRequest, NextResponse } from "next/server";
import { aiEngine } from "@/lib/utils/ai-engine";

export async function POST(request: NextRequest) {
  try {
    const {
      action,
      business_id,
      alert_id,
      user_id,
    } = await request.json();

    if (action === "acknowledge") {
      if (!alert_id) {
        return NextResponse.json({ error: "alert_id is required" }, { status: 400 });
      }

      const success = await aiEngine.acknowledgeAlert(alert_id, user_id);

      return NextResponse.json({
        success,
        message: success ? "Alert acknowledged" : "Failed to acknowledge alert",
      });
    }

    return NextResponse.json(
      { error: "Invalid action" },
      { status: 400 }
    );
  } catch (error) {
    console.error("Alert Action Error:", error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const business_id = searchParams.get("business_id");
    const severity = searchParams.get("severity");

    if (!business_id) {
      return NextResponse.json({ error: "business_id is required" }, { status: 400 });
    }

    // This would require a Supabase client for the server
    // For now, return empty response
    return NextResponse.json({
      success: true,
      data: [],
    });
  } catch (error) {
    console.error("Get Alerts Error:", error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}
