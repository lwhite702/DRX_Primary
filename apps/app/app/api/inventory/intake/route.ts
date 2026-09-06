import { randomUUID } from "node:crypto";
import { NextRequest, NextResponse } from "next/server";
import { resolveAuthContext } from "@/app/api/pos/_lib/server";
import { hasBusinessPermission } from "@/lib/auth/server-guards";
import { db } from "@/lib/db";
import type { PrismaClient } from "@prisma/client";
import {
  createInventoryIntake,
  InventoryIntakeError,
} from "@/lib/inventory/intake-service";

export async function GET(request: NextRequest) {
  try {
    const { userId, businessId } = await resolveAuthContext(request);
    if (!userId || !businessId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    if (!(await hasBusinessPermission(userId, businessId, "inventory.manage"))) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    // Outstanding work must never be displaced by newer completed history.
    const [pending, history] = await Promise.all([
      (db as PrismaClient).inventoryIntake.findMany({
        where: { businessId, status: "pending" },
        include: { inventory: { select: { productName: true, sku: true } } },
        orderBy: { createdAt: "desc" },
      }),
      (db as PrismaClient).inventoryIntake.findMany({
        where: { businessId, status: { not: "pending" } },
        include: { inventory: { select: { productName: true, sku: true } } },
        orderBy: { createdAt: "desc" }, take: 100,
      }),
    ]);
    const rows = [...pending, ...history];
    const items = rows.map(row => ({
      id: row.id, inventory_id: row.inventoryId, product_name: row.inventory.productName,
      sku: row.inventory.sku, unit_of_measure: "g",
      total_cost: Number(row.totalCost), total_weight_grams: Number(row.totalWeightGrams),
      calculated_cost_per_gram: Number(row.calculatedCostPerGram), delivery_cost: Number(row.deliveryCost ?? 0),
      supplier: row.supplier, created_at: row.createdAt.toISOString(), status: row.status,
      created_by_email: "Business staff", // Do not expose staff email in the approval queue.
    }));
    return NextResponse.json({ items }, { headers: { "Cache-Control": "private, no-store" } });
  } catch { return NextResponse.json({ error: "Approval queue unavailable" }, { status: 503 }); }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { userId, businessId } = await resolveAuthContext(request);
    if (!userId || !businessId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    if (
      !(await hasBusinessPermission(userId, businessId, "inventory.manage"))
    ) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const inventoryId =
      typeof body.inventory_id === "string" ? body.inventory_id : "";
    const totalCost = Number(body.total_cost);
    const totalWeightGrams = Number(body.total_weight_grams);
    const deliveryCost = Number(body.delivery_cost ?? 0);
    if (!inventoryId) {
      return NextResponse.json(
        { error: "inventory_id is required" },
        { status: 400 },
      );
    }
    if (!Number.isFinite(totalCost) || totalCost <= 0) {
      return NextResponse.json(
        { error: "total_cost must be greater than 0" },
        { status: 400 },
      );
    }
    if (!Number.isFinite(totalWeightGrams) || totalWeightGrams < 0.01) {
      return NextResponse.json(
        { error: "total_weight_grams must be at least 0.01" },
        { status: 400 },
      );
    }
    if (!Number.isFinite(deliveryCost) || deliveryCost < 0) {
      return NextResponse.json(
        { error: "delivery_cost cannot be negative" },
        { status: 400 },
      );
    }

    const result = await createInventoryIntake({
      businessId,
      inventoryId,
      actorUserId: userId,
      idempotencyKey:
        typeof body.idempotency_key === "string" &&
        body.idempotency_key.length > 0
          ? body.idempotency_key
          : request.headers.get("idempotency-key") || randomUUID(),
      values: {
        totalCost,
        totalWeightGrams,
        deliveryCost,
        supplier:
          typeof body.supplier === "string"
            ? body.supplier.trim() || undefined
            : undefined,
      },
    });

    return NextResponse.json({
      success: true,
      intake: result.intake,
      requires_approval: result.requiresApproval,
      replayed: result.replayed,
      message: result.requiresApproval
        ? "Intake submitted for manager approval due to unusual cost"
        : "Stock added and approved.",
    });
  } catch (error) {
    console.error("Intake API Error:", error);
    if (error instanceof InventoryIntakeError) {
      return NextResponse.json(
        { error: error.message },
        { status: error.status },
      );
    }
    return NextResponse.json(
      { error: "Failed to process inventory intake" },
      { status: 500 },
    );
  }
}
