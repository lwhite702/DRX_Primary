import { scheduleNightlyRefresh } from "@/lib/credit/creditScheduler";
import { auth } from "@/lib/adapters/auth/server";
import { hasPermission } from "@/lib/auth/server-guards";
import { errorResponse, successResponse } from "@/lib/api/response";
import { ensureServerFlag } from "@/lib/posthog/server-flags";
import { OPS_AVAILABILITY_FLAGS } from "@/lib/posthog/flags-manifest";

// This endpoint is called by a cron job to refresh AI credit limits
// Protected by environment variable auth (configure CRON_SECRET in your environment)

export async function POST(request: Request) {
  // Verify cron secret
  const cronSecret = request.headers.get("authorization");
  const configuredSecret = process.env.CRON_SECRET;
  if (!configuredSecret) {
    return errorResponse(
      "INTERNAL_ERROR",
      "CRON_SECRET is not configured",
      500,
    );
  }
  const expectedSecret = `Bearer ${configuredSecret}`;

  if (cronSecret !== expectedSecret) {
    return errorResponse("UNAUTHORIZED", "Unauthorized", 401);
  }

  const availabilityEnabled = await ensureServerFlag(
    OPS_AVAILABILITY_FLAGS.creditRefreshLimitsCron,
    { distinctId: "cron-refresh-limits", defaultValue: true },
  );
  if (!availabilityEnabled) {
    return errorResponse(
      "FEATURE_DISABLED",
      "Credit limit refresh is temporarily disabled",
      503,
    );
  }

  try {
    console.log("Starting scheduled credit limit refresh");
    await scheduleNightlyRefresh();

    return successResponse(
      { message: "Credit limit refresh completed successfully" },
      200,
    );
  } catch (error) {
    console.error("Error in credit limit refresh:", error);

    return errorResponse(
      "INTERNAL_ERROR",
      "Failed to refresh credit limits",
      500,
      error instanceof Error ? error.message : "Unknown error",
    );
  }
}

// Allow GET for health checks
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
    status: "healthy",
    endpoint: "credit-refresh-limits",
  });
}
