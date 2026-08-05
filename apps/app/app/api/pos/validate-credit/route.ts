import { NextRequest } from "next/server";
import { db } from "@/lib/db";
import { resolveAuthContext } from "@/app/api/pos/_lib/server";
import { validateCreditBalance } from "@/lib/pos/core";
import { errorResponse, successResponse } from "@/lib/api/response";

export async function GET(request: NextRequest) {
  try {
    const { businessId } = await resolveAuthContext(request);
    if (!businessId) {
      return errorResponse("UNAUTHORIZED", "Unauthorized", 401);
    }

    const searchParams = request.nextUrl.searchParams;
    const customerId = searchParams.get("customerId");
    const rawAmount = searchParams.get("amount") || "0";
    const amount = Number(rawAmount);
    if (!Number.isFinite(amount) || amount < 0) {
      return errorResponse(
        "VALIDATION_ERROR",
        "Invalid amount query parameter",
        400,
      );
    }

    if (!customerId) {
      return successResponse({ valid: true });
    }
    const result = await validateCreditBalance(db, businessId, customerId, amount);

    return successResponse({
      valid: result.valid,
      currentBalance: result.currentBalance,
      maxLimit: result.maxLimit,
      remaining: result.remaining,
      warning: result.warning,
    });
  } catch (error: unknown) {
    console.error("Credit Validation Error:", error);
    return errorResponse(
      "INTERNAL_ERROR",
      "Internal Server Error",
      500,
      error instanceof Error ? error.message : "Unknown error",
    );
  }
}
