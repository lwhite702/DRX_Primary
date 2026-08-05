import { NextRequest } from "next/server";
import { db } from "@/lib/db";
import { Prisma } from "@prisma/client";
import { resolveAuthContext } from "@/app/api/pos/_lib/server";
import { errorResponse, successResponse } from "@/lib/api/response";
import { getRequestId, logger } from "@/lib/logging";

export async function GET(request: NextRequest) {
  const requestId = getRequestId(request.headers);

  try {
    const { businessId } = await resolveAuthContext(request);
    if (!businessId) {
      return errorResponse("UNAUTHORIZED", "Unauthorized", 401);
    }

    const searchParams = request.nextUrl.searchParams;
    const rawLimit = searchParams.get("limit") || "10";
    const limit = Number(rawLimit);
    if (Number.isNaN(limit) || !Number.isInteger(limit) || limit <= 0 || limit > 100) {
      return errorResponse(
        "VALIDATION_ERROR",
        "Invalid limit query parameter",
        400,
      );
    }

    // Call the Postgres function securely using Prisma.sql and explicit type casts
    const recommendations = await db.$queryRaw(
      Prisma.sql`SELECT * FROM get_ai_pricing_recommendations(${businessId}::uuid, ${limit}::int)`
    );

    return successResponse({ items: recommendations, data: recommendations });
  } catch (error: any) {
    logger.error("AI pricing route failed", {
      requestId,
      error,
    });
    return errorResponse(
      "INTERNAL_ERROR",
      "Internal Server Error",
      500,
      error instanceof Error ? error.message : "Unexpected server error",
    );
  }
}
