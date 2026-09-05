import { NextRequest, NextResponse } from "next/server";
import { getPlatformAdmin } from "@/lib/auth/platform-admin";
import { updateUserRole } from "@/app/actions/user-management";
import {
  platformIdentityRemovalStatus,
  removePlatformManagedIdentity,
} from "@/lib/privacy/platform-identity-removal";

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id: targetUserId } = await params;
    const admin = await getPlatformAdmin();
    const actorId = admin?.userId;

    if (!actorId) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const body = await request.json();
    const result = await updateUserRole(targetUserId, body.role, body.businessId);
    return NextResponse.json(result, { status: result.error ? 400 : 200 });
  } catch (error) {
    console.error("Admin Update Error:", error);
    return NextResponse.json(
      { error: "Internal Server Error" },
      { status: 500 },
    );
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id: targetUserId } = await params;
    const body = await request.json().catch(() => ({}));
    const result = await removePlatformManagedIdentity(targetUserId, body.businessId);
    return NextResponse.json(result, { status: platformIdentityRemovalStatus(result) });
  } catch (error) {
    console.error("Admin Delete Error:", error);
    return NextResponse.json(
      { error: "Internal Server Error" },
      { status: 500 },
    );
  }
}
