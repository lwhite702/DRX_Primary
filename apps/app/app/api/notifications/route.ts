import { NextRequest } from "next/server";
import { auth } from "@/lib/adapters/auth/server";
import { db } from "@/lib/db";
import { errorResponse, successResponse } from "@/lib/api/response";

export async function GET(_request: NextRequest) {
  try {
    const { userId } = await auth();

    if (!userId) {
      return errorResponse("UNAUTHORIZED", "Unauthorized", 401);
    }

    const notifications = await db.notification.findMany({
      where: {
        userId: userId,
        isRead: false,
      },
      orderBy: {
        createdAt: "desc",
      },
      take: 100,
    });

    return successResponse({
      notifications,
      data: notifications,
      count: notifications.length,
    });
  } catch (error) {
    console.error("Fetch notifications error:", error);
    return errorResponse("INTERNAL_ERROR", "Internal Server Error", 500);
  }
}

export async function PUT(request: NextRequest) {
  try {
    const { userId } = await auth();

    if (!userId) {
      return errorResponse("UNAUTHORIZED", "Unauthorized", 401);
    }

    const body = await request.json();
    const { id, mark_all_read } = body;

    if (mark_all_read) {
      await db.notification.updateMany({
        where: { userId: userId, isRead: false },
        data: { isRead: true },
      });
    } else if (id) {
      await db.notification.updateMany({
        where: { id: id, userId: userId }, // Security check: ensure user owns notification
        data: { isRead: true },
      });
    } else {
      return errorResponse(
        "BAD_REQUEST",
        "Missing id or mark_all_read",
        400,
      );
    }

    return successResponse({ success: true });
  } catch (error) {
    console.error("Update notification error:", error);
    return errorResponse("INTERNAL_ERROR", "Failed to update notification", 500);
  }
}
