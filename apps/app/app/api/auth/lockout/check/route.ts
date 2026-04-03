import { NextRequest, NextResponse } from "next/server";
import { checkLockout } from "@/lib/security/lockout";

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
    const state = await checkLockout(body?.identifier, extractIpAddress(request));
    return NextResponse.json(state);
  } catch (error) {
    console.error("[lockout/check]", error);
    return NextResponse.json({ error: "Failed to check lockout" }, { status: 500 });
  }
}
