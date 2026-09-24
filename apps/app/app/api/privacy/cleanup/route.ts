import { NextRequest, NextResponse } from "next/server";
import { resolveAuthContext } from "@/app/api/pos/_lib/server";
import { businessClient } from "@/lib/business/convex-server";
import { api } from "@/convex/_generated/api";

export async function POST(request: NextRequest) {
  const { userId, businessId } = await resolveAuthContext();
  if (!userId || !businessId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const body = await request.json().catch(() => ({}));
  if (body?.businessId && body.businessId !== businessId) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  try {
    const { client, expectedUserId } = await businessClient();
    const summary = await client.mutation(api.privacyCleanup.run, { businessId, expectedUserId });
    return NextResponse.json({ ok: true, summary });
  } catch (error) {
    console.error("[privacy/cleanup]", error);
    return NextResponse.json({ error: "Privacy cleanup unavailable" }, { status: 503 });
  }
}
