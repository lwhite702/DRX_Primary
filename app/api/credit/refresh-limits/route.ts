import { scheduleNightlyRefresh } from "@/lib/credit/creditScheduler";
import { NextResponse } from "next/server";

// This endpoint is called by a cron job to refresh AI credit limits
// Protected by environment variable auth (configure CRON_SECRET in your environment)

export async function POST(request: Request) {
  // Verify cron secret
  const cronSecret = request.headers.get("authorization");
  const expectedSecret = `Bearer ${process.env.CRON_SECRET || "default-secret"}`;

  if (cronSecret !== expectedSecret) {
    return NextResponse.json(
      { error: "Unauthorized" },
      { status: 401 }
    );
  }

  try {
    console.log("Starting scheduled credit limit refresh");
    await scheduleNightlyRefresh();

    return NextResponse.json(
      { message: "Credit limit refresh completed successfully" },
      { status: 200 }
    );
  } catch (error) {
    console.error("Error in credit limit refresh:", error);

    return NextResponse.json(
      {
        error: "Failed to refresh credit limits",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}

// Allow GET for health checks
export async function GET(request: Request) {
  return NextResponse.json(
    { status: "Credit limit refresh endpoint is running" },
    { status: 200 }
  );
}
