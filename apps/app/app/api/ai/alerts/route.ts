import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { db } from "@/lib/db";
import {
  requestedBusinessMatches,
  resolveAiBusinessContext,
} from "../_lib/server";

const acknowledgeSchema = z.object({
  action: z.literal("acknowledge"),
  alert_id: z.string().min(1),
});

const severitySchema = z.enum(["low", "medium", "high", "critical"]);

export async function POST(request: NextRequest) {
  const context = await resolveAiBusinessContext(request, "inventory.manage");
  if (!context.ok) {
    return NextResponse.json(
      { error: context.error },
      { status: context.status },
    );
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid request body" }, { status: 400 });
  }

  const parsed = acknowledgeSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "A valid acknowledge action and alert_id are required" },
      { status: 400 },
    );
  }

  try {
    const alert = await db.inventoryAlert.findFirst({
      where: {
        id: parsed.data.alert_id,
        businessId: context.businessId,
      },
      select: { id: true, isRead: true },
    });
    if (!alert) {
      return NextResponse.json({ error: "Alert not found" }, { status: 404 });
    }
    if (alert.isRead) {
      return NextResponse.json({ success: true, status: "acknowledged" });
    }

    const acknowledged = await db.$transaction(async (tx: typeof db) => {
      const updated = await tx.inventoryAlert.updateMany({
        where: {
          id: alert.id,
          businessId: context.businessId,
          isRead: false,
        },
        data: { isRead: true },
      });
      if (updated.count !== 1) return false;

      await tx.systemAuditLog.create({
        data: {
          action: "acknowledge_inventory_alert",
          entityType: "inventory_alert",
          entityId: alert.id,
          userId: context.userId,
          businessId: context.businessId,
          oldValues: { isRead: false },
          newValues: { isRead: true },
        },
      });
      return true;
    });

    return NextResponse.json({
      success: true,
      status: acknowledged ? "acknowledged" : "already_acknowledged",
    });
  } catch (error) {
    console.error("AI alert acknowledgement failed", {
      errorType: error instanceof Error ? error.name : "UnknownError",
    });
    return NextResponse.json(
      { success: false, error: "Internal Server Error" },
      { status: 500 },
    );
  }
}

export async function GET(request: NextRequest) {
  const context = await resolveAiBusinessContext(request, "inventory.manage");
  if (!context.ok) {
    return NextResponse.json(
      { error: context.error },
      { status: context.status },
    );
  }

  const requestedBusinessId = request.nextUrl.searchParams.get("business_id");
  if (
    requestedBusinessId &&
    !requestedBusinessMatches(requestedBusinessId, context.businessId)
  ) {
    return NextResponse.json({ error: "Business access denied" }, { status: 403 });
  }

  const severityParam = request.nextUrl.searchParams.get("severity");
  const severity = severityParam
    ? severitySchema.safeParse(severityParam)
    : null;
  if (severity && !severity.success) {
    return NextResponse.json({ error: "Invalid severity" }, { status: 400 });
  }

  try {
    const alerts = await db.inventoryAlert.findMany({
      where: {
        businessId: context.businessId,
        isRead: false,
        ...(severity?.success ? { severity: severity.data } : {}),
      },
      orderBy: { createdAt: "desc" },
      take: 100,
      select: {
        id: true,
        inventoryId: true,
        alertType: true,
        severity: true,
        message: true,
        createdAt: true,
      },
    });

    return NextResponse.json({
      success: true,
      data: alerts.map(
        (alert: {
          id: string;
          inventoryId: string;
          alertType: string;
          severity: string;
          message: string;
          createdAt: Date;
        }) => ({
          id: alert.id,
          inventory_id: alert.inventoryId,
          alert_type: alert.alertType,
          severity: alert.severity,
          message: alert.message,
          created_at: alert.createdAt.toISOString(),
        }),
      ),
    });
  } catch (error) {
    console.error("AI alert query failed", {
      errorType: error instanceof Error ? error.name : "UnknownError",
    });
    return NextResponse.json(
      { success: false, error: "Internal Server Error" },
      { status: 500 },
    );
  }
}
