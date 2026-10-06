import { NextRequest, NextResponse } from "next/server";
import { api } from "@/convex/_generated/api";
import { businessClient } from "@/lib/business/convex-server";

function mapDetail(result: any) {
  const sale = result.sale;
  return {
    id: sale._id, orderNumber: sale.orderNumber, orderStatus: sale.orderStatus, customerId: sale.customerId ?? null,
    paymentMethod: sale.paymentMethod, paymentRef: sale.paymentReference ?? null, subtotal: sale.subtotalCents / 100,
    taxAmount: sale.taxAmountCents / 100, totalAmount: sale.totalAmountCents / 100, amountPaid: sale.amountPaidCents / 100,
    changeAmount: sale.changeAmountCents / 100, createdAt: new Date(sale.createdAt).toISOString(), updatedAt: new Date(sale.updatedAt).toISOString(),
    customer: result.customer, items: result.items.map((item: any) => ({ ...item, id: item._id, unitPrice: item.unitPriceCents / 100, lineTotal: item.lineTotalCents / 100, quantity: item.quantityGrams })),
    allocations: result.allocations.map((allocation: any) => ({ ...allocation, id: allocation._id, extendedCost: allocation.extendedCostCents / 100, quantity: allocation.quantityGrams })),
    costSummary: { costOfGoodsSold: result.costOfGoodsSoldCents / 100, grossProfit: result.grossProfitCents / 100, grossMarginPercent: Number(result.grossMarginPercent.toFixed(2)) },
  };
}

export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> | { id: string } }) {
  try {
    const { id } = await Promise.resolve(params);
    const { client } = await businessClient(request);
    return NextResponse.json(mapDetail(await client.query(api.checkout.getSaleDetail, { saleId: id })), { headers: { "Cache-Control": "private, no-store" } });
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
    const result = await client.mutation(api.checkout.updateSale, { saleId: id, ...(body.customerId !== undefined ? { customerId: body.customerId } : {}), ...(body.paymentMethod !== undefined ? { paymentMethod: body.paymentMethod } : {}), ...(body.paymentRef !== undefined ? { paymentReference: body.paymentRef } : {}) });
    return NextResponse.json(result);
  } catch (error) {
    const message = error instanceof Error ? error.message : "";
    if (message.includes("UNAUTHORIZED:")) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    const status = message.includes("NOT_FOUND:") ? 404 : message.includes("FORBIDDEN:") ? 403 : message.includes("INVALID_STATE:") ? 409 : 503;
    return NextResponse.json({ error: status === 404 ? "Sale not found" : "Sale could not be updated" }, { status });
  }
}
