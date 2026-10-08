import { NextRequest, NextResponse } from "next/server";
import { getPlatformAdmin } from "@/lib/auth/platform-admin";
import {
  platformIdentityRemovalStatus,
  removePlatformManagedIdentity,
} from "@/lib/privacy/platform-identity-removal";

export async function POST(
  _request: NextRequest,
  { params }: { params: Promise<{ tenantId: string; userId: string }> },
) {
  try {
    const admin = await getPlatformAdmin();
    if (!admin) {
      return NextResponse.json({ error: "Forbidden: Platform administrator access required" }, { status: 403 });
    }

    const { tenantId, userId } = await params;
    const cleanTenantId = typeof tenantId === "string" ? tenantId.trim() : "";
    const cleanUserId = typeof userId === "string" ? userId.trim() : "";

    if (!cleanTenantId || !cleanUserId) {
      return NextResponse.json({ error: "Invalid target: Tenant and user identifiers required" }, { status: 400 });
    }

    if (cleanUserId === admin.userId) {
      return NextResponse.json({ error: "Invalid target: Cannot remove current administrator" }, { status: 400 });
    }

    const result = await removePlatformManagedIdentity(cleanUserId, cleanTenantId);
    return NextResponse.json(result, { status: platformIdentityRemovalStatus(result) });
  } catch (error) {
    console.error("RTBF API Error:", error);
    return NextResponse.json(
      { error: "Internal Server Error" },
      { status: 500 },
    );
  }
}
