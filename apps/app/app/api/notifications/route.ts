import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/adapters/auth/server";
import { db } from "@/lib/db";

export async function GET(request: NextRequest) {
  try {
    const { userId } = await auth();

    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
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

    return NextResponse.json({ notifications });
  } catch (error) {
    console.error("Fetch notifications error:", error);
    return NextResponse.json(
      { error: "Internal Server Error" },
      { status: 500 },
    );
  }
}

export async function PUT(request: NextRequest) {
  try {
    const { userId } = await auth();

    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
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
      return NextResponse.json(
        { error: "Missing id or mark_all_read" },
        { status: 400 },
      );
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Update notification error:", error);
    return NextResponse.json(
      { error: "Failed to update notification" },
      { status: 500 },
    );
  }
}
