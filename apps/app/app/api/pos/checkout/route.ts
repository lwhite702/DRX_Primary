import { NextRequest, NextResponse } from "next/server";
import { resolveAuthContext } from "@/app/api/pos/_lib/server";
import { posCheckoutSchema } from "@/lib/pos/schemas";
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
import type { ReceiptOutput } from "@/lib/pos/contract";
import type { PosCartItem, PosFee, PosPayment } from "@/lib/pos/types";
import {
  buildCheckoutFailure,
  buildCheckoutSuccess,
} from "@/lib/pos/response";
import {
  checkoutCanonicalCommerce,
  shouldUseCanonicalCommerce,
} from "@/app/api/pos/_lib/convex-commerce";
import { hasConfiguredCanonicalCommerce } from "@/app/api/pos/_lib/commerce-routing";

type PosCheckoutResponse = {
  success: boolean;
  saleId?: string | null;
  orderNumber?: string | null;
  totals?: {
    total: number;
    changeAmount: number;
  } | null;
  errors?: string[];
  total?: number;
  changeAmount?: number;
  receipt?: ReceiptOutput;
  error?: string;
};

export async function POST(request: NextRequest) {
  const { userId, businessId } = await resolveAuthContext();

  if (!userId || !businessId) {
    const response: PosCheckoutResponse = {
      success: false,
      error: "Unauthorized",
    };
    return NextResponse.json(response, { status: 401 });
  }

  const body = await request.json();
  const parsed = posCheckoutSchema.safeParse(body);

  if (!parsed.success) {
    const response: PosCheckoutResponse = {
      success: false,
      error: "Invalid checkout payload",
    };
    return NextResponse.json(
      response,
      { status: 400 },
    );
  }

  const payload = parsed.data;
  const requiresCanonicalCommerce =
    payload.mode === "quick" &&
    (shouldUseCanonicalCommerce(payload) ||
      (await hasConfiguredCanonicalCommerce(businessId, payload.items)));
  if (payload.mode === "quick" && requiresCanonicalCommerce) {
    try {
      const result = await checkoutCanonicalCommerce({
        businessId,
        customerId: payload.customerId,
        items: payload.items,
        delivery: payload.delivery,
        idempotencyKey: payload.idempotencyKey,
        paymentMethod: payload.payment.method,
      });
      const receipt: ReceiptOutput = {
        saleId: result.saleId,
        total: result.total,
        receipt: payload.payment.receipt,
        channels:
          payload.payment.receipt === "none"
            ? []
            : [{ type: "receipt", value: payload.payment.receipt }],
      };
      return NextResponse.json(
        {
          success: true,
          saleId: result.saleId,
          orderNumber: result.orderNumber,
          total: result.total,
          changeAmount: result.changeAmount,
          receipt,
        } satisfies PosCheckoutResponse,
        { status: 201 },
      );
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Delivery checkout failed";
      return NextResponse.json(
        { success: false, error: message } satisfies PosCheckoutResponse,
        { status: 400 },
      );
    }
  }
  const cart = createCart({
    businessId,
    userId,
    mode: payload.mode,
    source: payload.source,
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
      weightGrams: item.weightGrams,
      pricePerGram: item.pricePerGram,
      bulkTierApplied: item.bulkTierApplied,
      loyaltyDiscountApplied: item.loyaltyDiscountApplied,
      originalPrice: item.originalPrice,
      overrideReason: item.overrideReason,
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
    updatedCart = setPaymentRef(updatedCart, payload.paymentRef);
    updatedCart = setAmountPaid(updatedCart, payload.amountPaid);
    updatedCart = setDelivery(updatedCart, {
      deliveryManagementId: payload.deliveryManagementId ?? null,
      deliveryAddress: payload.deliveryAddress ?? null,
      deliveryPrice: payload.deliveryPrice ?? 0,
    });
  }

  try {
    const result = await checkout(updatedCart, payload.idempotencyKey);
    const envelope = buildCheckoutSuccess(result);
    const receipt: ReceiptOutput = {
      saleId: result.saleId,
      total: result.total,
      receipt: payload.payment.receipt,
      channels:
        payload.payment.receipt === "none"
          ? []
          : [{ type: "receipt", value: payload.payment.receipt }],
    };
    const response: PosCheckoutResponse = {
      ...envelope,
      total: result.total,
      changeAmount: result.changeAmount,
      receipt,
    };
    return NextResponse.json(response, { status: 201 });
  } catch (error) {
    const status =
      error instanceof PosCheckoutError ? error.status : 400;
    const response: PosCheckoutResponse = {
      ...buildCheckoutFailure(
        error instanceof Error ? error.message : "Checkout failed",
      ),
      error: error instanceof Error ? error.message : "Checkout failed",
    };
    return NextResponse.json(response, { status });
  }
}
