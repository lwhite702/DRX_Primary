import { type NextRequest } from "next/server";
import { createClient as createServerClient } from "@/lib/supabase/server";
import { hasPermission } from "@/lib/auth/server-guards";
import { errorResponse, successResponse } from "@/lib/api/response";

export async function GET(
  _request: NextRequest,
  { params }: { params: { userId: string } },
) {
  const { userId } = params;
  const supabase = await createServerClient();
  // Auth check
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();
  if (!user || authError) return errorResponse("UNAUTHORIZED", "Unauthorized", 401);

  const canManageUsers =
    (await hasPermission("users.manage_all")) ||
    (await hasPermission("staff.manage"));
  if (!canManageUsers && user.id !== userId) {
    return errorResponse("FORBIDDEN", "Forbidden", 403);
  }

  const { data, error } = await supabase
    .from("notification_preferences")
    .select("*")
    .eq("user_id", userId)
    .single();

  if (error) {
    return errorResponse("NOT_FOUND", "Not found", 404);
  }

  return successResponse({
    userId: data.user_id,
    preferences: data.preferences,
  });
}
