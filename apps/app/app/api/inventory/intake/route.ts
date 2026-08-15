import { randomUUID } from "node:crypto";
import { NextRequest, NextResponse } from "next/server";
import { resolveAuthContext } from "@/app/api/pos/_lib/server";
import { hasBusinessPermission } from "@/lib/auth/server-guards";
import {
  createInventoryIntake,
  InventoryIntakeError,
} from "@/lib/inventory/intake-service";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { userId, businessId } = await resolveAuthContext(request);
    if (!userId || !businessId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    if (!(await hasBusinessPermission(userId, businessId, "inventory.manage"))) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const inventoryId = typeof body.inventory_id === "string" ? body.inventory_id : "";
    const totalCost = Number(body.total_cost);
    const totalWeightGrams = Number(body.total_weight_grams);
    const deliveryCost = Number(body.delivery_cost ?? 0);
    if (!inventoryId) {
      return NextResponse.json({ error: "inventory_id is required" }, { status: 400 });
    }
    if (!Number.isFinite(totalCost) || totalCost <= 0) {
      return NextResponse.json({ error: "total_cost must be greater than 0" }, { status: 400 });
    }
    if (!Number.isFinite(totalWeightGrams) || totalWeightGrams < 0.01) {
      return NextResponse.json({ error: "total_weight_grams must be at least 0.01" }, { status: 400 });
    }
    if (!Number.isFinite(deliveryCost) || deliveryCost < 0) {
      return NextResponse.json({ error: "delivery_cost cannot be negative" }, { status: 400 });
    }

    const result = await createInventoryIntake({
      businessId,
      inventoryId,
      actorUserId: userId,
      idempotencyKey:
        typeof body.idempotency_key === "string" && body.idempotency_key.length > 0
          ? body.idempotency_key
          : request.headers.get("idempotency-key") || randomUUID(),
      values: {
        totalCost,
        totalWeightGrams,
        deliveryCost,
        supplier: typeof body.supplier === "string" ? body.supplier.trim() || undefined : undefined,
      },
    });

    return NextResponse.json({
      success: true,
      intake: result.intake,
      requires_approval: result.requiresApproval,
      replayed: result.replayed,
      message: result.requiresApproval
        ? "Intake submitted for manager approval due to unusual cost"
        : "Inventory successfully updated and approved",
    });
  } catch (error) {
    console.error("Intake API Error:", error);
    if (error instanceof InventoryIntakeError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }
    return NextResponse.json({ error: "Failed to process inventory intake" }, { status: 500 });
  }
}
