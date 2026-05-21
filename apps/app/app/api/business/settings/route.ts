import { NextRequest } from "next/server";
import { db } from "@/lib/db";
import { resolveAuthContext } from "../../pos/_lib/server";
import { z } from "zod";
import { hasPermission } from "@/lib/auth/server-guards";
import { errorResponse, successResponse } from "@/lib/api/response";

const BusinessSettingsPatchSchema = z.object({
  collect_tax: z.boolean().optional(),
  pos_manager_pin: z.string().trim().min(4).max(50).optional().nullable(),
});

export async function GET() {
  try {
    const { businessId } = await resolveAuthContext();
    if (!businessId) {
      return errorResponse("UNAUTHORIZED", "Unauthorized", 401);
    }

    const settings = await db.businessSettings.findFirst({
      where: { businessId },
    });

    if (!settings) {
      return successResponse({
        collect_tax: true,
        pos_manager_pin: null,
      });
    }

    return successResponse({
      collect_tax: settings.collectTax,
      pos_manager_pin: settings.posManagerPin ?? null,
    });
  } catch (error) {
    console.error("GET Business Settings Error:", error);
    return errorResponse("INTERNAL_ERROR", "Internal Server Error", 500);
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const { businessId } = await resolveAuthContext();
    if (!businessId) {
      return errorResponse("UNAUTHORIZED", "Unauthorized", 401);
    }

    const canConfigure = await hasPermission("settings.configure_pos");
    if (!canConfigure) {
      return errorResponse("FORBIDDEN", "Forbidden", 403);
    }

    const parsed = BusinessSettingsPatchSchema.safeParse(await request.json());
    if (!parsed.success) {
      return errorResponse(
        "VALIDATION_ERROR",
        "Invalid settings payload",
        400,
        parsed.error.flatten(),
      );
    }
    const { collect_tax, pos_manager_pin } = parsed.data;

    const updated = await db.businessSettings.upsert({
      where: { businessId },
      update: {
        collectTax: collect_tax ?? undefined,
        posManagerPin: pos_manager_pin ?? undefined,
      },
      create: {
        businessId,
        collectTax: collect_tax ?? true,
        posManagerPin: pos_manager_pin ?? null,
      },
    });

    return successResponse({
      collect_tax: updated.collectTax,
      pos_manager_pin: updated.posManagerPin ?? null,
      data: updated,
    });
  } catch (error) {
    console.error("PATCH Business Settings Error:", error);
    return errorResponse("INTERNAL_ERROR", "Internal Server Error", 500);
  }
}
