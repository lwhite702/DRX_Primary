import { randomUUID } from "crypto";
import { NextRequest, NextResponse } from "next/server";
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
      source: "checkout-enhanced",
      customerId: body.customerId || null,
    });

    const items = Array.isArray(body.lineItems) ? body.lineItems : [];
    for (const item of items) {
      const cartItem: PosCartItem = {
        id: item.id || item.inventory_id,
        inventoryId: item.inventory_id,
        name: item.product_name || item.name || "Inventory Item",
        unitPrice: Number(item.overridden_price ?? item.unit_price ?? 0),
        qty: Number(item.quantity ?? 1),
        source: "inventory",
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
      method: body.paymentMethod || "cash",
      receipt: "none",
      creditConfirmed: body.paymentMethod === "credit",
    };

    cart = setPayment(cart, payment);
    cart = setTaxAmount(cart, Number(body.taxAmount || 0));
    cart = setFees(cart, (body.fees || []) as PosFee[]);
    cart = setPaymentRef(cart, body.paymentRef || null);
    cart = setAmountPaid(
      cart,
      body.amountPaid !== undefined ? Number(body.amountPaid) : null,
    );
    cart = setDelivery(cart, {
      deliveryManagementId: body.deliveryManagementId || null,
      deliveryAddress: body.deliveryAddress || null,
      deliveryPrice:
        body.deliveryPrice !== undefined ? Number(body.deliveryPrice) : 0,
    });

    const result = await checkout(cart, body.idempotencyKey || randomUUID());

    return NextResponse.json({
      success: true,
      sale_id: result.saleId,
      order_number: result.orderNumber,
      total_amount: result.total,
      change_amount: result.changeAmount,
    });
  } catch (error) {
    const status = error instanceof PosCheckoutError ? error.status : 400;
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : "Checkout failed",
      },
      { status },
    );
  }
}
