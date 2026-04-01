import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { resolveAuthContext } from "@/app/api/pos/_lib/server";
import {
  validateCreditBalance,
  validateInventoryAvailability,
} from "@/lib/pos/core";
import type { PosCartItem } from "@/lib/pos/types";

function normalizeItems(rawItems: unknown[]): PosCartItem[] {
  return rawItems.map((item) => {
    const record =
      typeof item === "object" && item !== null
        ? (item as Record<string, unknown>)
        : {};

    return {
      id: String(
        record.id ??
          record.inventoryId ??
          record.inventory_id ??
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
      pricePerGram:
        record.pricePerGram !== undefined
          ? Number(record.pricePerGram)
          : record.price_per_gram !== undefined
            ? Number(record.price_per_gram)
            : undefined,
    };
  });
}

export async function POST(request: NextRequest) {
  try {
    const { businessId } = await resolveAuthContext();
    if (!businessId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const items = normalizeItems(Array.isArray(body?.items) ? body.items : []);
    const customerId =
      typeof body?.customerId === "string"
        ? body.customerId
        : typeof body?.customer_id === "string"
          ? body.customer_id
          : null;
    const requestedAmount = Number(body?.amount ?? body?.total ?? 0);

    const stock = await validateInventoryAvailability(db, businessId, items);

    const pricingErrors: string[] = [];
    for (const item of items) {
      if (!Number.isFinite(item.unitPrice) || item.unitPrice < 0) {
        pricingErrors.push(`Invalid unit price for ${item.name}`);
      }
      if (!Number.isFinite(item.qty) || item.qty <= 0) {
        pricingErrors.push(`Invalid quantity for ${item.name}`);
      }
    }

    const credit = await validateCreditBalance(
      db,
      businessId,
      customerId,
      Number.isFinite(requestedAmount) ? requestedAmount : 0,
    );

    const valid = stock.valid && credit.valid && pricingErrors.length === 0;

    return NextResponse.json({
      valid,
      stock: {
        valid: stock.valid,
        errors: stock.errors.map((entry) => ({
          inventoryId: entry.inventoryId,
          message: entry.message,
        })),
      },
      credit,
      pricing: {
        valid: pricingErrors.length === 0,
        errors: pricingErrors,
      },
      errors: [
        ...stock.errors.map((entry) => entry.message),
        ...(credit.warning ? [credit.warning] : []),
        ...pricingErrors,
      ],
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
