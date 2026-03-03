import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { resolveAuthContext } from "@/app/api/pos/_lib/server";

export async function POST(request: NextRequest) {
  try {
    const { businessId } = await resolveAuthContext();
    if (!businessId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { items } = await request.json();
    const errors: any[] = [];

    for (const item of items) {
      const inventory = await db.inventory.findUnique({
        where: { businessId_sku: { businessId: businessId, sku: item.sku } }, // Wait, mobile often uses inventory_id
      });

      // If SKU not found, try by ID
      const target =
        inventory ||
        (await db.inventory.findUnique({
          where: { id: item.inventory_id },
        }));

      if (!target) {
        errors.push({
          inventory_id: item.inventory_id,
          message: "Item not found",
        });
        continue;
      }

      if (target.quantityOnHand < item.quantity) {
        errors.push({
          inventory_id: item.inventory_id,
          message: `Insufficient stock for ${target.productName}. Available: ${target.quantityOnHand}`,
        });
      }
    }

    return NextResponse.json({
      valid: errors.length === 0,
      errors,
    });
  } catch (error: any) {
    console.error("Stock Validation Error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
