import { NextRequest, NextResponse } from "next/server";
import { api } from "@/convex/_generated/api";
import { businessClient } from "@/lib/business/convex-server";
import { safeDisplayOrderNumber } from "@/lib/utils/number-formatting";
import { mapConvexCustomer } from "@/lib/customers/convex-operational";
import { formatMaskedCustomerIdentifier } from "@/lib/customers/core/customer-normalizer";

async function mapDetail(result: any) {
  const sale = result.sale;
  let customer: any = null;
  let customerMasked: string | null = null;
  if (result.customer) {
    try {
      const decoded = await mapConvexCustomer(result.customer);
      const displayAlias = String(
        decoded.alias ||
          [decoded.first_name, decoded.last_name].filter(Boolean).join(" ") ||
          "Customer",
      );
      customer = {
        ...result.customer,
        id: String(decoded.id),
        alias: displayAlias,
        firstName: String(decoded.first_name || ""),
        lastName: String(decoded.last_name || ""),
        phone: String(decoded.phone || ""),
        email: String(decoded.email || ""),
        loyaltyTier: String(decoded.loyalty_tier || "none"),
        discountRateBps: decoded.discount_rate_bps ?? null,
        fixedPricePerGram: decoded.fixed_price_per_gram ?? null,
      };
      customerMasked = formatMaskedCustomerIdentifier({
        alias: String(decoded.alias || ""),
        firstName: String(decoded.first_name || ""),
        lastName: String(decoded.last_name || ""),
        phone: String(decoded.phone || ""),
        fallbackId: sale.customerId ?? result.customer._id,
      });
    } catch {
      customer = result.customer;
      customerMasked = formatMaskedCustomerIdentifier({
        lastName: result.customer.lastName ?? null,
        fallbackId: sale.customerId ?? result.customer._id,
      });
    }
  } else if (sale.customerId) {
    customerMasked = formatMaskedCustomerIdentifier({
      fallbackId: sale.customerId,
    });
  }
  return {
    id: sale._id,
    orderNumber: safeDisplayOrderNumber(sale.orderNumber || sale._id),
    orderStatus: sale.orderStatus,
    customerId: sale.customerId ?? null,
    customerMasked,
    paymentMethod: sale.paymentMethod,
    paymentRef: sale.paymentReference ?? null,
    paymentTenders: sale.paymentTenders ?? null,
    subtotal: sale.subtotalCents / 100,
    discountAmount: (sale.discountCents ?? 0) / 100,
    taxAmount: sale.taxAmountCents / 100,
    totalAmount: sale.totalAmountCents / 100,
    amountPaid: sale.amountPaidCents / 100,
    changeAmount: sale.changeAmountCents / 100,
    createdAt: new Date(sale.createdAt).toISOString(),
    updatedAt: new Date(sale.updatedAt).toISOString(),
    customer,
    delivery: result.delivery
      ? {
          id: result.delivery._id,
          status: result.delivery.status,
          address: result.delivery.address,
          dispatchType: result.delivery.dispatchType ?? "merchant_dispatch",
          feeSplitMode:
            result.delivery.feeSplitMode ??
            (result.delivery.chargeCustomer ? "pass_full" : "absorb_full"),
          vendorFeeCents: result.delivery.vendorFeeCents,
          customerFeeCents:
            result.delivery.customerFeeCents ??
            (result.delivery.chargeCustomer ? result.delivery.vendorFeeCents : 0),
          vendorFee: result.delivery.vendorFeeCents / 100,
          customerFee:
            (result.delivery.customerFeeCents ??
              (result.delivery.chargeCustomer ? result.delivery.vendorFeeCents : 0)) / 100,
          estimatedArrivalMinutes: result.delivery.estimatedArrivalMinutes ?? null,
          uberTrackingUrl: result.delivery.uberTrackingUrl ?? null,
        }
      : null,
    items: result.items.map((item: any) => ({
      ...item,
      id: item._id,
      productName: item.productName ?? "Inventory Item",
      sku: item.sku ?? null,
      unitPrice: item.unitPriceCents / 100,
      lineTotal: item.lineTotalCents / 100,
      quantity: item.quantityGrams,
    })),
    allocations: result.allocations.map((allocation: any) => ({
      ...allocation,
      id: allocation._id,
      extendedCost: allocation.extendedCostCents / 100,
      quantity: allocation.quantityGrams,
    })),
    costSummary: {
      costOfGoodsSold: result.costOfGoodsSoldCents / 100,
      grossProfit: result.grossProfitCents / 100,
      grossMarginPercent: Number(result.grossMarginPercent.toFixed(2)),
    },
  };
}

export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> | { id: string } }) {
  try {
    const { id } = await Promise.resolve(params);
    const { client } = await businessClient(request);
    return NextResponse.json(await mapDetail(await client.query(api.checkout.getSaleDetail, { saleId: id })), { headers: { "Cache-Control": "private, no-store" } });
  } catch (error) {
    const message = error instanceof Error ? error.message : "";
    if (message.includes("UNAUTHORIZED:")) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    return NextResponse.json({ error: message.includes("NOT_FOUND:") ? "Sale not found" : "Sale service is temporarily unavailable" }, { status: message.includes("NOT_FOUND:") ? 404 : message.includes("FORBIDDEN:") ? 403 : 503 });
  }
}

export async function PATCH(request: NextRequest, { params }: { params: Promise<{ id: string }> | { id: string } }) {
  try {
    const { id } = await Promise.resolve(params);
    const body: any = await request.json();
    const { client } = await businessClient(request);
    const hasSaleUpdates =
      body.customerId !== undefined ||
      body.paymentMethod !== undefined ||
      body.paymentRef !== undefined ||
      body.paymentTenders !== undefined;
    const hasDeliveryUpdates = Boolean(body.delivery && body.delivery.deliveryId);

    if (!hasSaleUpdates && !hasDeliveryUpdates) {
      return NextResponse.json(
        { error: "No sale or delivery changes were provided" },
        { status: 400 },
      );
    }

    let result: any = null;
    if (hasSaleUpdates) {
      result = await client.mutation(api.checkout.updateSale, {
        saleId: id,
        ...(body.customerId !== undefined ? { customerId: body.customerId } : {}),
        ...(body.paymentMethod !== undefined ? { paymentMethod: body.paymentMethod } : {}),
        ...(body.paymentRef !== undefined ? { paymentReference: body.paymentRef } : {}),
        ...(body.paymentTenders !== undefined ? { paymentTenders: body.paymentTenders } : {}),
      });
    }
    if (hasDeliveryUpdates) {
      await client.mutation((api.deliveries as any).updateDeliveryDetails, {
        deliveryId: body.delivery.deliveryId,
        expectedSaleId: id,
        ...(body.delivery.vendorFeeCents !== undefined ? { vendorFeeCents: body.delivery.vendorFeeCents } : {}),
        ...(body.delivery.feeSplitMode !== undefined ? { feeSplitMode: body.delivery.feeSplitMode } : {}),
        ...(body.delivery.dispatchType !== undefined ? { dispatchType: body.delivery.dispatchType } : {}),
        ...(body.delivery.estimatedArrivalMinutes !== undefined ? { estimatedArrivalMinutes: body.delivery.estimatedArrivalMinutes } : {}),
        ...(body.delivery.uberTrackingUrl !== undefined ? { uberTrackingUrl: body.delivery.uberTrackingUrl } : {}),
        ...(body.delivery.address !== undefined ? { address: body.delivery.address } : {}),
      });
    }
    return NextResponse.json(result ?? { success: true });
  } catch (error) {
    const message = error instanceof Error ? error.message : "";
    if (message.includes("UNAUTHORIZED:")) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    const status = message.includes("NOT_FOUND:") ? 404 : message.includes("FORBIDDEN:") ? 403 : message.includes("INVALID_STATE:") ? 409 : message.includes("INVALID_ARGUMENT:") ? 400 : 503;
    return NextResponse.json({ error: status === 404 ? "Sale not found" : "Sale could not be updated" }, { status });
  }
}
