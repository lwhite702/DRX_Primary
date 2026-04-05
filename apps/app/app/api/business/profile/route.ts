import { NextRequest } from "next/server";
import { db } from "@/lib/db";
import { resolveAuthContext } from "../../pos/_lib/server";
import { z } from "zod";
import { errorResponse, successResponse } from "@/lib/api/response";

const BusinessProfilePatchSchema = z
  .object({
    businessName: z.string().min(1).optional(),
    business_name: z.string().min(1).optional(),
    businessType: z.string().optional(),
    business_type: z.string().optional(),
    phoneNumber: z.string().optional(),
    phone_number: z.string().optional(),
    email: z.string().email().optional(),
    address: z.string().optional(),
    city: z.string().optional(),
    state: z.string().optional(),
    zipCode: z.string().optional(),
    zip_code: z.string().optional(),
  })
  .strict();

export async function GET(_request: NextRequest) {
  try {
    const { businessId } = await resolveAuthContext();
    if (!businessId) {
      return errorResponse("UNAUTHORIZED", "Unauthorized", 401);
    }

    const profile = await db.businessProfile.findUnique({
      where: { id: businessId },
    });

    return successResponse({ data: profile });
  } catch (error) {
    console.error("GET Business Profile Error:", error);
    return errorResponse("INTERNAL_ERROR", "Internal Server Error", 500);
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const { businessId } = await resolveAuthContext();
    if (!businessId) {
      return errorResponse("UNAUTHORIZED", "Unauthorized", 401);
    }

    const parsed = BusinessProfilePatchSchema.safeParse(await request.json());
    if (!parsed.success) {
      return errorResponse(
        "VALIDATION_ERROR",
        "Invalid profile payload",
        400,
        parsed.error.flatten(),
      );
    }
    const body = parsed.data;

    const updated = await db.businessProfile.update({
      where: { id: businessId },
      data: {
        businessName: body.businessName || body.business_name,
        businessType: body.businessType || body.business_type,
        phoneNumber: body.phoneNumber || body.phone_number,
        email: body.email,
        address: body.address,
        city: body.city,
        state: body.state,
        zipCode: body.zipCode || body.zip_code,
      },
    });

    return successResponse({ data: updated });
  } catch (error) {
    console.error("PATCH Business Profile Error:", error);
    return errorResponse("INTERNAL_ERROR", "Internal Server Error", 500);
  }
}
