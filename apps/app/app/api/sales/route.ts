import { randomUUID } from "crypto";
import { NextRequest, NextResponse } from "next/server";
import { api } from "@/convex/_generated/api";
import { businessClient } from "@/lib/business/convex-server";
import { checkoutCanonicalCommerce } from "@/app/api/pos/_lib/convex-commerce";
import { buildCheckoutFailure, buildCheckoutSuccess } from "@/lib/pos/response";
import { safeDisplayOrderNumber } from "@/lib/utils/number-formatting";
import { mapConvexCustomer } from "@/lib/customers/convex-operational";
import { formatMaskedCustomerIdentifier } from "@/lib/customers/core/customer-normalizer";

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
      paymentMethod: body.payment_method ?? "cash",
      paymentRef: body.payment_ref ?? undefined,
      paymentTenders: Array.isArray(body.payment_tenders) ? body.payment_tenders : undefined,
      amountPaid: body.amount_paid === undefined ? undefined : Number(body.amount_paid),
      discountAmountCents: body.discount_amount_cents, discountReason: body.discount_reason,
      fees: Array.isArray(body.fees) ? body.fees : undefined,
      delivery: body.delivery?.enabled ? body.delivery : body.delivery_address ? { enabled: true, address: String(body.delivery_address), vendorFeeCents: Math.round(Number(body.delivery_price ?? 0) * 100), feeAllocation: "charge_customer" as const, feeTaxable: false } : undefined,
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
    let summaries: any[] = [];
    try {
      summaries = await client.query((api.checkout as any).getSalesHistorySummary, { limit: 50 });
    } catch {
      const fallbackSales = await client.query(api.checkout.getSalesHistory, {});
      summaries = await Promise.all(
        fallbackSales.map(async (sale: any) => {
          try {
            const detail: any = await client.query(api.checkout.getSaleDetail, { saleId: sale._id });
            const items = detail.items ?? [];
            const itemNames = items
              .map((i: any) => i.productName || i.manualName || "Inventory Item")
              .filter(Boolean);
            const itemSummary =
              itemNames.length > 0
                ? itemNames.slice(0, 3).join(", ") +
                  (items.length > 3 ? ` +${items.length - 3} more` : "")
                : null;
            return {
              sale: detail.sale ?? sale,
              itemCount: items.length,
              itemSummary,
              customer: detail.customer ?? null,
              delivery: detail.delivery ?? null,
              items,
            };
          } catch {
            return {
              sale,
              itemCount: 0,
              itemSummary: null,
              customer: null,
              delivery: null,
              items: [],
            };
          }
        }),
      );
    }

    const data = await Promise.all(
      summaries.map(async (entry: any) => {
        const sale = entry.sale ?? entry;
        const customerSource = entry.customer ?? sale.customer ?? null;
        let customerMasked: string | null = null;
        let customerLoyaltyTier: string | null = null;
        if (customerSource) {
          try {
            const decoded = await mapConvexCustomer(customerSource);
            customerMasked = formatMaskedCustomerIdentifier({
              alias: String(decoded.alias || ""),
              firstName: String(decoded.first_name || ""),
              lastName: String(decoded.last_name || ""),
              phone: String(decoded.phone || ""),
              fallbackId: sale.customerId ?? customerSource._id,
            });
            customerLoyaltyTier = String(decoded.loyalty_tier || "none");
          } catch {
            customerMasked = formatMaskedCustomerIdentifier({
              lastName: customerSource.lastName ?? null,
              fallbackId: sale.customerId ?? customerSource._id,
            });
          }
        } else if (sale.customerId) {
          customerMasked = formatMaskedCustomerIdentifier({ fallbackId: sale.customerId });
        }
        const items = entry.items ?? [];
        const itemCount = entry.itemCount ?? items.length;
        const itemSummary = entry.itemSummary ?? null;
        const deliverySource = entry.delivery ?? sale.delivery ?? null;
        return {
          id: sale._id,
          order_number: safeDisplayOrderNumber(sale.orderNumber || sale._id),
          order_status: sale.orderStatus,
          subtotal: sale.subtotalCents / 100,
          discount_amount: (sale.discountCents ?? 0) / 100,
          tax_amount: sale.taxAmountCents / 100,
          total_amount: sale.totalAmountCents / 100,
          payment_method: sale.paymentMethod,
          payment_ref: sale.paymentReference ?? null,
          payment_tenders: sale.paymentTenders ?? null,
          created_at: new Date(sale.createdAt).toISOString(),
          updated_at: new Date(sale.updatedAt).toISOString(),
          customer_id: sale.customerId ?? null,
          customer_masked: customerMasked,
          customer_loyalty_tier: customerLoyaltyTier,
          item_count: itemCount,
          item_summary: itemSummary,
          delivery: deliverySource
            ? {
                id: deliverySource._id,
                status: deliverySource.status,
                dispatchType: deliverySource.dispatchType ?? "merchant_dispatch",
                feeSplitMode: deliverySource.feeSplitMode ?? (deliverySource.chargeCustomer ? "pass_full" : "absorb_full"),
                vendorFee: (deliverySource.vendorFeeCents ?? 0) / 100,
                customerFee: ((deliverySource.customerFeeCents ?? (deliverySource.chargeCustomer ? deliverySource.vendorFeeCents : 0)) ?? 0) / 100,
                estimatedArrivalMinutes: deliverySource.estimatedArrivalMinutes ?? null,
                uberTrackingUrl: deliverySource.uberTrackingUrl ?? null,
              }
            : null,
          items: items.map((item: any, idx: number) => ({
            id: item.id ?? item._id ?? `${sale._id}-line-${idx}`,
            productName: item.productName ?? item.manualName ?? "Inventory Item",
            unitPrice: typeof item.unitPrice === "number" ? item.unitPrice : (item.unitPriceCents ?? 0) / 100,
            lineTotal: typeof item.lineTotal === "number" ? item.lineTotal : (item.lineTotalCents ?? 0) / 100,
            quantity: item.quantity ?? item.quantityGrams ?? 1,
          })),
        };
      }),
    );
    return NextResponse.json({ data }, { headers: { "Cache-Control": "private, no-store" } });
  } catch (error) {
    const message = error instanceof Error ? error.message : "";
    return NextResponse.json({ error: message.includes("FORBIDDEN:") ? "Access denied" : "Failed to fetch sales" }, { status: message.includes("FORBIDDEN:") ? 403 : 503 });
  }
}
