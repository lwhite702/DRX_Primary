import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { resolveAuthContext } from "@/app/api/pos/_lib/server";
import { errorResponse } from "@/lib/api/response";

export async function GET() {
  try {
    const { businessId } = await resolveAuthContext();
    if (!businessId) return errorResponse("UNAUTHORIZED", "Unauthorized", 401);

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
