import { type NextRequest } from "next/server";
import { createLegacyServerDbClient as createServerDbClient } from "@/lib/data-access/server";
import { z } from "zod";
import { errorResponse, successResponse } from "@/lib/api/response";
import { ensureServerFlag } from "@/lib/posthog/server-flags";
import { OPS_AVAILABILITY_FLAGS } from "@/lib/posthog/flags-manifest";
import { getCurrentUser } from "@/lib/adapters/auth";

const NotificationPreferencesSchema = z.object({
  preferences: z.record(z.string(), z.unknown()),
});

export async function POST(request: NextRequest) {
  try {
    const supabase = await createServerDbClient();
    const user = await getCurrentUser();
    if (!user) {
      return errorResponse("UNAUTHORIZED", "Unauthorized", 401);
    }

    const availabilityEnabled = await ensureServerFlag(
      OPS_AVAILABILITY_FLAGS.notificationsPreferencesWrite,
      { distinctId: user.id, defaultValue: true },
    );
    if (!availabilityEnabled) {
      return errorResponse(
        "FEATURE_DISABLED",
        "Notification preferences writes are temporarily disabled",
        503,
      );
    }

    const featureEnabled = await ensureServerFlag("feat_notifications_preferences_write", {
      distinctId: user.id,
      defaultValue: true,
    });
    if (!featureEnabled) {
      return errorResponse(
        "FEATURE_DISABLED",
        "Notification preferences feature is temporarily disabled",
        503,
      );
    }

    const payload = NotificationPreferencesSchema.safeParse(await request.json());
    if (!payload.success) {
      return errorResponse(
        "VALIDATION_ERROR",
        "Invalid preferences payload",
        400,
        payload.error.flatten(),
      );
    }

    const { error } = await supabase
      .from("notification_preferences")
      .upsert({ user_id: user.id, preferences: payload.data.preferences });

    if (error) {
      return errorResponse("INTERNAL_ERROR", error.message, 500);
    }

    return successResponse(
      { userId: user.id, preferences: payload.data.preferences },
      201,
    );
  } catch (error: unknown) {
    console.error("Notification preferences error:", error);
    return errorResponse(
      "INTERNAL_ERROR",
      error instanceof Error ? error.message : "Failed to process request",
      500,
    );
  }
}
