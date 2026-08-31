import { type NextRequest } from "next/server";
import { createLegacyServerDbClient as createServerDbClient } from "@/lib/data-access/server";
import { getCurrentUser } from "@/lib/adapters/auth";
import { canManageNotificationRecipient } from "@/lib/auth/notification-access";
import { errorResponse, successResponse } from "@/lib/api/response";

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ userId: string }> | { userId: string } },
) {
  const { userId } = await Promise.resolve(params);
  const supabase = await createServerDbClient();
  // Auth check
  const user = await getCurrentUser();
  if (!user) return errorResponse("UNAUTHORIZED", "Unauthorized", 401);

  if (!(await canManageNotificationRecipient(_request, user.id, userId))) {
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
