import {
  applyAICreditRecommendation,
  overrideCreditLimit,
} from "@/lib/credit/creditDecisionService";
import { resolveAuthContext } from "@/app/api/pos/_lib/server";
import { NextResponse } from "next/server";
import { z } from "zod";

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
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const payload = ApplyRecommendationSchema.safeParse(await request.json());
    if (!payload.success) {
      return NextResponse.json(
        { error: "Invalid payload", details: payload.error.flatten() },
        { status: 400 },
      );
    }

    let result;
    const { customer_id, action, new_limit, reason } = payload.data;

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
      return NextResponse.json(
        { error: "Invalid action or missing parameters" },
        { status: 400 },
      );
    }

    if (!result.success) {
      return NextResponse.json(
        { error: result.error || "Failed to process request" },
        { status: 400 }
      );
    }

    return NextResponse.json(
      {
        success: true,
        new_limit: "new_limit" in result ? result.new_limit : undefined,
      },
      { status: 200 }
    );
  } catch (error) {
    console.error("Error in apply recommendation:", error);

    return NextResponse.json(
      {
        error: "Failed to process request",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}
