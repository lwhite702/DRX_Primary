import { NextRequest } from "next/server";
import { randomBytes } from "crypto";
import { clerkClient } from "@/lib/adapters/auth/server";
import { db } from "@/lib/db";
import { getPlatformAdmin } from "@/lib/auth/platform-admin";
import { MANAGEABLE_TEAM_ROLES } from "@/lib/team/roles";
import { z } from "zod";
import { errorResponse, successResponse } from "@/lib/api/response";
import { ensureServerFlag } from "@/lib/posthog/server-flags";

const AdminUserCreateSchema = z.object({
  username: z.string().min(1),
  email: z.string().email(),
  role: z.enum(MANAGEABLE_TEAM_ROLES).optional(),
  businessId: z.string().min(1),
});

export async function POST(request: NextRequest) {
  try {
    const admin = await getPlatformAdmin();
    if (!admin) return errorResponse("FORBIDDEN", "Forbidden", 403);
    const actorId = admin.userId;

    const featureEnabled = await ensureServerFlag("feat_admin_user_management", {
      distinctId: actorId,
      defaultValue: true,
    });
    if (!featureEnabled) {
      return errorResponse(
        "FEATURE_DISABLED",
        "Admin user management is temporarily disabled",
        503,
      );
    }

    const payload = AdminUserCreateSchema.safeParse(await request.json());
    if (!payload.success) {
      return errorResponse(
        "VALIDATION_ERROR",
        "Invalid payload",
        400,
        payload.error.flatten(),
      );
    }
    const { username, email, role, businessId } = payload.data;
    const business = await db.businessProfile.findUnique({ where: { id: businessId }, select: { id: true } });
    if (!business) return errorResponse("NOT_FOUND", "Business not found", 404);

    // 1. Create User in Clerk
    const client = await clerkClient();
    const generatedTemporaryPassword = randomBytes(24).toString("base64url");
    const newUser = await client.users.createUser({
      emailAddress: [email],
      password: generatedTemporaryPassword,
      username: username,
      firstName: username, // approximate
    });

    if (!newUser) {
      return errorResponse(
        "INTERNAL_ERROR",
        "Creation failed (no user returned)",
        500,
      );
    }

    if (businessId) {
      await db.userRole.create({
        data: {
          userId: newUser.id,
          businessId: businessId,
          role: role || "staff",
          permissions: { all: false },
        },
      });
    }

    // Log to system_audit_log
    await db.systemAuditLog.create({
      data: {
        entityId: newUser.id,
        entityType: "user",
        action: "create_user",
        userId: actorId,
        newValues: { role },
        businessId,
        // businessId: businessId
      },
    });

    return successResponse({ id: newUser.id }, 201);
  } catch (error) {
    console.error("Create admin user error:", error);
    return errorResponse(
      "INTERNAL_ERROR",
      "Internal Server Error",
      500,
    );
  }
}
