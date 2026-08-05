import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { resolveAuthContext } from "@/app/api/pos/_lib/server";
import { errorResponse } from "@/lib/api/response";
import { hasBusinessPermission } from "@/lib/auth/server-guards";

export async function GET() {
  try {
    const { userId, businessId } = await resolveAuthContext();
    if (!userId || !businessId) return errorResponse("UNAUTHORIZED", "Unauthorized", 401);
    if (!(await hasBusinessPermission(userId, businessId, "audit.view"))) {
      return errorResponse("FORBIDDEN", "Forbidden", 403);
    }

    const logs = await db.inventoryLog.findMany({
      where: { inventory: { businessId } },
      orderBy: { createdAt: "desc" },
      take: 100,
      include: { inventory: { select: { productName: true, sku: true } } },
    });

    return NextResponse.json({
      data: logs.map((log: {
        id: string;
        createdAt: Date;
        transactionType: string | null;
        quantityChange: number | null;
        reason: string | null;
        createdBy: string | null;
        inventory: { productName: string; sku: string };
      }) => ({
        id: log.id,
        created_at: log.createdAt.toISOString(),
        transaction_type: log.transactionType ?? "unknown",
        quantity_change: log.quantityChange ?? 0,
        reason: log.reason ?? "",
        product_name: log.inventory.productName,
        sku: log.inventory.sku,
        created_by_email: log.createdBy ?? "System",
      })),
    });
  } catch (error) {
    console.error("Inventory audit API error", error);
    return errorResponse("INTERNAL_ERROR", "Failed to load inventory audit log", 500);
  }
}
