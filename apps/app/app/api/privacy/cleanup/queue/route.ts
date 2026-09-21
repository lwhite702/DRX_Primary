import { NextRequest } from "next/server";
import { errorResponse, successResponse } from "@/lib/api/response";
import { resolveAuthContext } from "@/app/api/pos/_lib/server";
import { businessClient } from "@/lib/business/convex-server";
import { api } from "@/convex/_generated/api";

export async function POST(request: NextRequest) {
  const { userId, businessId } = await resolveAuthContext();
  if (!userId || !businessId) return errorResponse("UNAUTHORIZED", "Unauthorized", 401);
  const body = await request.json().catch(() => ({}));
  if (body?.businessId && body.businessId !== businessId) return errorResponse("FORBIDDEN", "Forbidden", 403);
  try {
    const { client, expectedUserId } = await businessClient();
    const summary = await client.mutation(api.privacyCleanup.run, { businessId, expectedUserId });
    return successResponse({ ok: true, processed: summary[0]?.deleted ?? 0, summary });
  } catch (error) {
    console.error("[privacy/cleanup/queue]", error);
    return errorResponse("INTERNAL_ERROR", "Privacy cleanup queue unavailable", 503);
  }
}
