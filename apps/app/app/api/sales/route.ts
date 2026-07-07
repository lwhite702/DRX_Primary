import { randomUUID } from "crypto";
import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { resolveAuthContext } from "@/app/api/pos/_lib/server";
import {
  PosCheckoutError,
  addItem,
  checkout,
  createCart,
  setAmountPaid,
  setDelivery,
  setFees,
  setPayment,
  setPaymentRef,
  setTaxAmount,
} from "@/lib/pos/core";
import type { PosCartItem, PosFee, PosPayment } from "@/lib/pos/types";
import { buildCheckoutFailure, buildCheckoutSuccess } from "@/lib/pos/response";

export async function POST(request: NextRequest) {
  try {
    const { userId, businessId } = await resolveAuthContext();
    if (!userId || !businessId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    let cart = createCart({
      businessId,
      userId,
      mode: "full",
      source: "sales-api",
      customerId: body.customer_id || null,
    });

    const items = Array.isArray(body.items) ? body.items : [];
    for (const item of items) {
      const cartItem: PosCartItem = {
        id: item.id || item.inventory_id,
        inventoryId: item.inventory_id ?? null,
        name: item.product_name || item.name || "Inventory Item",
        unitPrice: Number(item.overridden_price ?? item.unit_price ?? 0),
        qty: Number(item.quantity ?? 1),
        source: item.inventory_id ? "inventory" : "manual",
        sku: item.sku ?? null,
        barcode: item.barcode ?? null,
        weightGrams:
          item.weight_grams !== undefined ? Number(item.weight_grams) : undefined,
        pricePerGram:
          item.price_per_gram !== undefined ? Number(item.price_per_gram) : undefined,
        bulkTierApplied: item.bulk_tier_applied,
        loyaltyDiscountApplied:
          item.loyalty_discount_applied !== undefined
            ? Number(item.loyalty_discount_applied)
            : undefined,
        originalPrice:
          item.original_price !== undefined ? Number(item.original_price) : undefined,
        overrideReason: item.override_reason,
      };
      cart = addItem(cart, cartItem);
    }

    const payment: PosPayment = {
      method: body.payment_method || "cash",
      receipt: "none",
      creditConfirmed: body.payment_method === "credit",
    };

    cart = setPayment(cart, payment);
    cart = setTaxAmount(cart, Number(body.tax_amount || 0));
    cart = setFees(cart, ((body.fees || []) as PosFee[]).filter(Boolean));
    cart = setPaymentRef(cart, body.payment_ref || null);
    cart = setAmountPaid(
      cart,
      body.amount_paid !== undefined ? Number(body.amount_paid) : null,
    );
    cart = setDelivery(cart, {
      deliveryManagementId: body.delivery_management_id || null,
      deliveryAddress: body.delivery_address || null,
      deliveryPrice:
        body.delivery_price !== undefined ? Number(body.delivery_price) : 0,
    });

    const result = await checkout(cart, body.idempotencyKey || randomUUID());
    const sale = await db.sales.findFirst({
      where: {
        id: result.saleId,
        businessId,
      },
      include: {
        items: true,
      },
    });

    return NextResponse.json(
      buildCheckoutSuccess(result, {
        sale,
      }),
      { status: 201 },
    );
  } catch (error) {
    const status = error instanceof PosCheckoutError ? error.status : 500;
    return NextResponse.json(
      buildCheckoutFailure(
        error instanceof Error ? error.message : "Internal Server Error",
      ),
      { status },
    );
  }
}

export async function GET(request: NextRequest) {
  try {
    const { userId, businessId } = await resolveAuthContext();
    if (!userId || !businessId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const url = new URL(request.url);
    const limit = Math.min(Math.max(parseInt(url.searchParams.get("limit") || "50", 10), 1), 100);
    const offset = Math.max(parseInt(url.searchParams.get("offset") || "0", 10), 0);

    const sales = await db.sales.findMany({
      where: {
        businessId,
      },
      orderBy: {
        created_at: "desc",
      },
      take: limit,
      skip: offset,
      include: {
        items: true,
      },
    });

    return NextResponse.json({ data: sales });
  } catch (error) {
    console.error("Failed to fetch sales:", error);
    return NextResponse.json(
      { error: "Failed to fetch sales" },
      { status: 500 },
    );
  }
}
