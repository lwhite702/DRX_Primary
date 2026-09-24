import { NextRequest, NextResponse } from "next/server";
import { clerkClient } from "@/lib/adapters/auth/server";
import { getPlatformAdmin } from "@/lib/auth/platform-admin";
import { ConvexHttpClient } from "convex/browser";
import { api } from "@/convex/_generated/api";
import { getConvexAuthToken } from "@/lib/auth/convex-token";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { businessName, businessType, ownerEmail } = body;

    // 1. Verify Authentication & Admin Permissions
    const admin = await getPlatformAdmin();
    if (!admin) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

    // 2. Client init
    const client = await clerkClient();

    // 3. Find Owner by Email
    const userList = await client.users.getUserList({
      emailAddress: [ownerEmail],
      limit: 1,
    });

    const owner = userList.data.length > 0 ? userList.data[0] : null;

    if (!owner) {
      return NextResponse.json(
        {
          error:
            "User with this email not found. Please ensure they have signed up first.",
        },
        { status: 404 },
      );
    }
    const ownerId = owner.id;

    const token = await getConvexAuthToken();
    const url = process.env.NEXT_PUBLIC_CONVEX_URL?.trim();
    if (!token || !url) return NextResponse.json({ error: "Convex unavailable" }, { status: 503 });
    const convex = new ConvexHttpClient(url); convex.setAuth(token);
    const business = await convex.mutation(api.platformAdmin.createBusiness, { businessName, businessType: businessType || undefined, ownerId, ownerEmail: owner.emailAddresses[0]?.emailAddress ?? ownerEmail, ownerName: owner.username ?? undefined });

    return NextResponse.json({ success: true, business });
  } catch (error) {
    console.error("Create business API error:", error);
    return NextResponse.json(
      { error: "Internal Server Error" },
      { status: 500 },
    );
  }
}
