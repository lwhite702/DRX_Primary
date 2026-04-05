import { auth } from "@/lib/adapters/auth/server";
import { hasPermission } from "@/lib/auth/server-guards";
import { errorResponse, successResponse } from "@/lib/api/response";

export async function GET() {
  const { userId } = await auth();
  if (!userId) {
    return errorResponse("UNAUTHORIZED", "Unauthorized", 401);
  }

  const canViewAudit = await hasPermission("audit.view");
  if (!canViewAudit) {
    return errorResponse("FORBIDDEN", "Forbidden", 403);
  }

  return successResponse({
    NEXT_PUBLIC_SUPABASE_URL: process.env.NEXT_PUBLIC_SUPABASE_URL,
    NEXT_PUBLIC_SUPABASE_ANON_KEY_PREFIX:
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY?.substring(0, 10),
  });
}
