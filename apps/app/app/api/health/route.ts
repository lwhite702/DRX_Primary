import { NextResponse } from "next/server";
import { db } from "@/lib/db";

export async function GET() {
  const checks = {
    database: false,
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
  };

  try {
    await db.$queryRaw`SELECT 1`;
    checks.database = true;

    return NextResponse.json({
      status: "healthy",
      checks,
    });
  } catch (error: unknown) {
    console.error("Health check failed:", error);
    return NextResponse.json(
      {
        status: "unhealthy",
        checks,
      },
      { status: 503 },
    );
  }
}
