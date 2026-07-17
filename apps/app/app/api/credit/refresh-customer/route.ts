import { refreshAICreditRecommendation } from "@/lib/credit/creditDecisionService";
import { resolveAuthContext } from "@/app/api/pos/_lib/server";
import { z } from "zod";
import { errorResponse, successResponse } from "@/lib/api/response";
import { ensureServerFlag } from "@/lib/posthog/server-flags";
import { OPS_AVAILABILITY_FLAGS } from "@/lib/posthog/flags-manifest";

const RefreshCustomerSchema = z.object({
  customer_id: z.string().min(1),
});

export async function POST(request: Request) {
  try {
    const { businessId, userId } = await resolveAuthContext(request);
    if (!businessId || !userId) {
      return errorResponse("UNAUTHORIZED", "Unauthorized", 401);
    }

    const availabilityEnabled = await ensureServerFlag(
      OPS_AVAILABILITY_FLAGS.creditRefreshCustomer,
      {
        distinctId: userId,
        personProperties: { business_id: businessId },
        defaultValue: true,
      },
    );
    if (!availabilityEnabled) {
      return errorResponse(
        "FEATURE_DISABLED",
        "Credit refresh endpoint is temporarily disabled",
        503,
      );
    }

    const featureEnabled = await ensureServerFlag("feat_credit_refresh", {
      distinctId: userId,
      personProperties: { business_id: businessId },
      defaultValue: true,
    });
    if (!featureEnabled) {
      return errorResponse(
        "FEATURE_DISABLED",
        "Credit refresh feature is temporarily disabled",
        503,
      );
    }

    const payload = RefreshCustomerSchema.safeParse(await request.json());
    if (!payload.success) {
      return errorResponse(
        "VALIDATION_ERROR",
        "Invalid payload",
        400,
        payload.error.flatten(),
      );
    }

    const result = await refreshAICreditRecommendation(
      payload.data.customer_id,
      businessId,
    );

    if (!result.success) {
      return errorResponse(
        "BAD_REQUEST",
        result.error || "Failed to refresh recommendation",
        400,
      );
    }

    return successResponse(
      {
        success: true,
        recommendation: result.recommendation,
      },
      200,
    );
  } catch (error) {
    console.error("Error in customer credit refresh:", error);

    return errorResponse(
      "INTERNAL_ERROR",
      "Failed to process request",
      500,
      error instanceof Error ? error.message : "Unknown error",
    );
  }
}
