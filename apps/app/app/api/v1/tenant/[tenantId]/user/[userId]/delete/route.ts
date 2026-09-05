import { NextRequest, NextResponse } from "next/server";
import {
  platformIdentityRemovalStatus,
  removePlatformManagedIdentity,
} from "@/lib/privacy/platform-identity-removal";

export async function POST(
  _request: NextRequest,
  { params }: { params: Promise<{ tenantId: string; userId: string }> },
) {
  try {
    const { tenantId, userId } = await params;
    const result = await removePlatformManagedIdentity(userId, tenantId);
    return NextResponse.json(result, { status: platformIdentityRemovalStatus(result) });
  } catch (error) {
    console.error("RTBF API Error:", error);
    return NextResponse.json(
      { error: "Internal Server Error" },
      { status: 500 },
    );
  }
}
