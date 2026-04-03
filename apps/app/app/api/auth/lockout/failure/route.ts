import { NextRequest, NextResponse } from "next/server";
import { recordLockoutFailure } from "@/lib/security/lockout";

function extractIpAddress(request: NextRequest): string | null {
  const forwarded = request.headers.get("x-forwarded-for");
  if (forwarded) {
    return forwarded.split(",")[0]?.trim() || null;
  }
  return request.headers.get("x-real-ip") || null;
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const state = await recordLockoutFailure(
      body?.identifier,
      extractIpAddress(request),
    );
    return NextResponse.json(state);
  } catch (error) {
    console.error("[lockout/failure]", error);
    return NextResponse.json({ error: "Failed to record failure" }, { status: 500 });
  }
}
