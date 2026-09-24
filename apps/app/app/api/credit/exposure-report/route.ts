import { resolveAuthContext } from "@/app/api/pos/_lib/server";
import { errorResponse, successResponse } from "@/lib/api/response";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  try {
    const { businessId } = await resolveAuthContext(request);
    if (!businessId) {
      return errorResponse("UNAUTHORIZED", "Unauthorized", 401);
    }

    const { getCreditExposureReport } = await import(
      "@/lib/credit/creditDecisionService"
    );
    const report = await getCreditExposureReport(businessId);

    return successResponse(report, 200);
  } catch (error) {
    console.error("Error fetching exposure report:", error);

    return errorResponse(
      "INTERNAL_ERROR",
      "Failed to fetch report",
      500,
    );
  }
}
