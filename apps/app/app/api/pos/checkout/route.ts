import { NextRequest, NextResponse } from "next/server";
import { resolveAuthContext } from "@/app/api/pos/_lib/server";
import { posCheckoutSchema } from "@/lib/pos/schemas";
import {
  PosCheckoutError,
  addItem,
  checkout,
  createCart,
  setFees,
  setPayment,
  setTaxAmount,
} from "@/lib/pos/core";
import type { PosCartItem, PosFee, PosPayment } from "@/lib/pos/types";

type PosCheckoutResponse = {
  success: boolean;
  saleId?: string;
  error?: string;
};

export async function POST(request: NextRequest) {
  const { userId, businessId } = await resolveAuthContext();

  if (!userId || !businessId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await request.json();
  const parsed = posCheckoutSchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json(
      { error: "Invalid checkout payload" },
      { status: 400 },
    );
  }

  const payload = parsed.data;
  const cart = createCart({
    businessId,
    userId,
    mode: payload.mode,
    customerId: payload.customerId ?? null,
  });

  let updatedCart = cart;

  for (const item of payload.items) {
    const cartItem: PosCartItem = {
      id: item.id,
      inventoryId: item.inventoryId ?? null,
      name: item.name,
      unitPrice: item.unitPrice,
      qty: item.qty,
      source: item.source,
    };
    updatedCart = addItem(updatedCart, cartItem);
  }

  const payment: PosPayment = {
    method: payload.payment.method,
    receipt: payload.payment.receipt,
    creditConfirmed: payload.payment.creditConfirmed,
  };

  updatedCart = setPayment(updatedCart, payment);

  if (payload.mode === "quick") {
    const fees: PosFee[] =
      payload.payment.receipt === "none"
        ? []
        : [{ type: "receipt", value: payload.payment.receipt }];
    updatedCart = setFees(updatedCart, fees);
  } else {
    updatedCart = setTaxAmount(updatedCart, payload.taxAmount ?? 0);
    updatedCart = setFees(updatedCart, payload.fees ?? []);
  }

  try {
    const result = await checkout(updatedCart, payload.idempotencyKey);
    const response: PosCheckoutResponse = {
      success: true,
      saleId: result.saleId,
    };
    return NextResponse.json(response, { status: 201 });
  } catch (error) {
    const status =
      error instanceof PosCheckoutError ? error.status : 400;
    const response: PosCheckoutResponse = {
      success: false,
      error: error instanceof Error ? error.message : "Checkout failed",
    };
    return NextResponse.json(response, { status });
  }
}
