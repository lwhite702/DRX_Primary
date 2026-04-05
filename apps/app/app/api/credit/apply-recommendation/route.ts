import {
  applyAICreditRecommendation,
  overrideCreditLimit,
} from "@/lib/credit/creditDecisionService";
import { resolveAuthContext } from "@/app/api/pos/_lib/server";
import { z } from "zod";
import { errorResponse, successResponse } from "@/lib/api/response";
import { ensureServerFlag } from "@/lib/posthog/server-flags";
import { OPS_KILL_SWITCH_FLAGS } from "@/lib/posthog/flags-manifest";

const ApplyRecommendationSchema = z
  .object({
    customer_id: z.string().min(1),
    action: z.enum(["apply_ai_recommendation", "override"]),
    new_limit: z.number().finite().optional(),
    reason: z.string().min(1).optional(),
  })
  .superRefine((data, ctx) => {
    if (data.action === "override" && data.new_limit === undefined) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["new_limit"],
        message: "new_limit is required when action is override",
      });
    }
  });

export async function POST(request: Request) {
  try {
    const { businessId, userId } = await resolveAuthContext();
    if (!businessId || !userId) {
      return errorResponse("UNAUTHORIZED", "Unauthorized", 401);
    }

    const killSwitchEnabled = await ensureServerFlag(
      OPS_KILL_SWITCH_FLAGS.creditApplyRecommendation,
      {
        distinctId: userId,
        personProperties: { business_id: businessId },
        defaultValue: true,
      },
    );
    if (!killSwitchEnabled) {
      return errorResponse(
        "FEATURE_DISABLED",
        "Credit apply recommendation endpoint is temporarily disabled",
        503,
      );
    }

    const payload = ApplyRecommendationSchema.safeParse(await request.json());
    if (!payload.success) {
      return errorResponse(
        "VALIDATION_ERROR",
        "Invalid payload",
        400,
        payload.error.flatten(),
      );
    }

    let result;
    const { customer_id, action, new_limit, reason } = payload.data;

    if (action === "apply_ai_recommendation") {
      const featureEnabled = await ensureServerFlag("feat_credit_refresh", {
        distinctId: userId,
        personProperties: { business_id: businessId },
        defaultValue: true,
      });
      if (!featureEnabled) {
        return errorResponse(
          "FEATURE_DISABLED",
          "Credit recommendation apply feature is temporarily disabled",
          503,
        );
      }
    }

    if (action === "override") {
      const featureEnabled = await ensureServerFlag("feat_credit_overrides", {
        distinctId: userId,
        personProperties: { business_id: businessId },
        defaultValue: true,
      });
      if (!featureEnabled) {
        return errorResponse(
          "FEATURE_DISABLED",
          "Credit override feature is temporarily disabled",
          503,
        );
      }
    }

    if (action === "apply_ai_recommendation") {
      result = await applyAICreditRecommendation(
        customer_id,
        businessId,
        userId,
      );
    } else if (action === "override" && new_limit !== undefined) {
      result = await overrideCreditLimit(
        customer_id,
        businessId,
        new_limit,
        reason || "Manual override",
        userId,
      );
    } else {
      return errorResponse(
        "BAD_REQUEST",
        "Invalid action or missing parameters",
        400,
      );
    }

    if (!result.success) {
      return errorResponse(
        "BAD_REQUEST",
        result.error || "Failed to process request",
        400,
      );
    }

    return successResponse(
      {
        success: true,
        new_limit: "new_limit" in result ? result.new_limit : undefined,
      },
      200,
    );
  } catch (error) {
    console.error("Error in apply recommendation:", error);

    return errorResponse(
      "INTERNAL_ERROR",
      "Failed to process request",
      500,
      error instanceof Error ? error.message : "Unknown error",
    );
  }
}
