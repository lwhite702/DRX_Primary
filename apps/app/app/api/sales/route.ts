import { randomUUID } from "crypto";
import { NextRequest, NextResponse } from "next/server";
import { api } from "@/convex/_generated/api";
import { businessClient } from "@/lib/business/convex-server";
import { checkoutCanonicalCommerce } from "@/app/api/pos/_lib/convex-commerce";
import { buildCheckoutFailure, buildCheckoutSuccess } from "@/lib/pos/response";

export async function POST(request: NextRequest) {
  try {
    const { businessId } = await businessClient(request);
    const body: any = await request.json();
    const items = Array.isArray(body.items) ? body.items.map((item: any, index: number) => ({
      id: String(item.id ?? item.inventory_id ?? `manual-${index}`), inventoryId: item.inventory_id ?? null,
      name: item.product_name ?? item.name ?? "Inventory Item", unitPrice: Number(item.overridden_price ?? item.unit_price ?? 0),
      qty: Number(item.quantity ?? 1), source: item.inventory_id ? "inventory" as const : "manual" as const,
      weightGrams: item.weight_grams === undefined ? undefined : Number(item.weight_grams), pricePerGram: item.price_per_gram === undefined ? undefined : Number(item.price_per_gram),
      originalPrice: item.original_price === undefined ? undefined : Number(item.original_price), overrideReason: item.override_reason,
    })) : [];
    if (!items.length) throw new Error("INVALID_ARGUMENT: A sale requires at least one item");
    const result = await checkoutCanonicalCommerce({
      businessId, customerId: body.customer_id ?? null, items, idempotencyKey: body.idempotencyKey ?? randomUUID(),
      paymentMethod: body.payment_method ?? "cash", amountPaid: body.amount_paid === undefined ? undefined : Number(body.amount_paid),
      discountAmountCents: body.discount_amount_cents, discountReason: body.discount_reason,
      fees: Array.isArray(body.fees) ? body.fees : undefined,
      delivery: body.delivery_address ? { enabled: true, address: String(body.delivery_address), vendorFeeCents: Math.round(Number(body.delivery_price ?? 0) * 100), feeAllocation: "charge_customer" as const, feeTaxable: false } : undefined,
    });
    return NextResponse.json(buildCheckoutSuccess(result), { status: 201 });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Internal Server Error";
    const status = message.includes("UNAUTH") ? 401 : message.includes("FORBIDDEN:") ? 403 : /INVALID_ARGUMENT:|NOT_FOUND:|CREDIT_LIMIT_EXCEEDED:|INSUFFICIENT_STOCK:/.test(message) ? 400 : message.includes("CONFLICT") ? 409 : 503;
    return NextResponse.json(buildCheckoutFailure(status === 503 ? "Sales service is temporarily unavailable" : "Sale could not be completed"), { status });
  }
}

export async function GET(request: NextRequest) {
  try {
    const { client } = await businessClient(request);
    const result = await client.query(api.checkout.getSalesHistory, {});
    const data = result.map(sale => ({ id: sale._id, order_number: sale.orderNumber, order_status: sale.orderStatus, subtotal: sale.subtotalCents / 100, tax_amount: sale.taxAmountCents / 100, total_amount: sale.totalAmountCents / 100, payment_method: sale.paymentMethod, payment_ref: sale.paymentReference ?? null, created_at: new Date(sale.createdAt).toISOString(), updated_at: new Date(sale.updatedAt).toISOString(), customer_id: sale.customerId ?? null, items: [] }));
    return NextResponse.json({ data }, { headers: { "Cache-Control": "private, no-store" } });
  } catch (error) {
    const message = error instanceof Error ? error.message : "";
    return NextResponse.json({ error: message.includes("FORBIDDEN:") ? "Access denied" : "Failed to fetch sales" }, { status: message.includes("FORBIDDEN:") ? 403 : 503 });
  }
}
