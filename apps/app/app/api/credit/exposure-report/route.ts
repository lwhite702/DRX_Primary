import { getCreditExposureReport } from "@/lib/credit/creditDecisionService";
import { resolveAuthContext } from "@/app/api/pos/_lib/server";
import { errorResponse, successResponse } from "@/lib/api/response";

export async function GET(request: Request) {
  try {
    const { businessId } = await resolveAuthContext(request);
    if (!businessId) {
      return errorResponse("UNAUTHORIZED", "Unauthorized", 401);
    }

    const report = await getCreditExposureReport(businessId);

    return successResponse({ data: report }, 200);
  } catch (error) {
    console.error("Error fetching exposure report:", error);

    return errorResponse(
      "INTERNAL_ERROR",
      "Failed to fetch report",
      500,
      error instanceof Error ? error.message : "Unknown error",
    );
  }
}
