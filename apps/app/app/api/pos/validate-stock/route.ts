import { NextRequest, NextResponse } from "next/server";
import { resolveAuthContext } from "@/app/api/pos/_lib/server";
import { db } from "@/lib/db";
import { validateInventoryAvailability } from "@/lib/pos/core";
import type { PosCartItem } from "@/lib/pos/types";

export async function POST(request: NextRequest) {
  try {
    const { businessId } = await resolveAuthContext();
    if (!businessId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { items } = await request.json();
    const normalizedItems: PosCartItem[] = (Array.isArray(items) ? items : []).map((item) => {
      const record = typeof item === "object" && item !== null ? (item as Record<string, unknown>) : {};
      return {
        id:
          String(
            record.id ??
              record.inventoryId ??
              record.inventory_id ??
              record.sku ??
              crypto.randomUUID(),
          ),
        inventoryId:
          typeof record.inventoryId === "string"
            ? record.inventoryId
            : typeof record.inventory_id === "string"
              ? record.inventory_id
              : null,
        name:
          typeof record.name === "string"
            ? record.name
            : typeof record.product_name === "string"
              ? record.product_name
              : "Inventory Item",
        sku: typeof record.sku === "string" ? record.sku : null,
        barcode: typeof record.barcode === "string" ? record.barcode : null,
        unitPrice: Number(record.unitPrice ?? record.unit_price ?? 0),
        qty: Number(record.qty ?? record.quantity ?? 1),
        source: "inventory",
        weightGrams:
          record.weightGrams !== undefined
            ? Number(record.weightGrams)
            : record.weight_grams !== undefined
              ? Number(record.weight_grams)
              : undefined,
      };
    });

    const result = await validateInventoryAvailability(db, businessId, normalizedItems);

    return NextResponse.json({
      valid: result.valid,
      errors: result.errors.map((error) => ({
        inventory_id: error.inventoryId,
        message: error.message,
      })),
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Unknown error";
    console.error("Stock Validation Error:", error);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
