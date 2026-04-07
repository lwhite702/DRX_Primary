import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { resolveAuthContext } from "../../pos/_lib/server";

function toNumber(value: unknown): number {
  if (typeof value === "number") return value;
  if (value && typeof value === "object" && "toNumber" in value) {
    return (value as { toNumber: () => number }).toNumber();
  }
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
}

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } },
) {
  try {
    const { businessId } = await resolveAuthContext();
    if (!businessId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const saleId = params.id;

    const sale = await db.sales.findFirst({
      where: { id: saleId, businessId },
      include: {
        items: {
          include: {
            inventory: true,
            allocations: {
              include: {
                batch: {
                  include: {
                    intake: true,
                  },
                },
              },
            },
          },
        },
        customer: true,
      },
    });

    if (!sale) {
      return NextResponse.json({ error: "Sale not found" }, { status: 404 });
    }

    const costOfGoodsSold = sale.items.reduce((sum: number, item: any) => {
      const allocationCost = (item.allocations ?? []).reduce(
        (allocationSum: number, allocation: any) =>
          allocationSum + toNumber(allocation.extendedCost),
        0,
      );
      return sum + allocationCost;
    }, 0);
    const totalRevenue = toNumber(sale.totalAmount);
    const grossProfit = totalRevenue - costOfGoodsSold;
    const grossMarginPercent = totalRevenue > 0 ? (grossProfit / totalRevenue) * 100 : 0;

    return NextResponse.json({
      ...sale,
      costSummary: {
        costOfGoodsSold: Number(costOfGoodsSold.toFixed(4)),
        grossProfit: Number(grossProfit.toFixed(4)),
        grossMarginPercent: Number(grossMarginPercent.toFixed(2)),
      },
    });
  } catch (error) {
    console.error("GET Sale Error:", error);
    return NextResponse.json(
      { error: "Internal Server Error" },
      { status: 500 },
    );
  }
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } },
) {
  try {
    const { businessId } = await resolveAuthContext();
    if (!businessId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const saleId = params.id;
    const body = await request.json();

    const sale = await db.sales.findFirst({
      where: { id: saleId, businessId },
    });

    if (!sale) {
      return NextResponse.json({ error: "Sale not found" }, { status: 404 });
    }

    // Handle customer reassignment if customerId is provided
    if (body.customerId !== undefined) {
      return await handleCustomerAssignment(
        saleId,
        businessId,
        body.customerId,
      );
    }

    // Handle payment update
    const updated = await db.sales.update({
      where: { id: saleId },
      data: {
        paymentMethod: body.paymentMethod || sale.paymentMethod,
        paymentRef: body.paymentRef ?? sale.paymentRef,
      },
    });

    return NextResponse.json(updated);
  } catch (error) {
    console.error("PATCH Sale Error:", error);
    return NextResponse.json(
      { error: "Internal Server Error" },
      { status: 500 },
    );
  }
}

async function handleCustomerAssignment(
  saleId: string,
  businessId: string,
  newCustomerId: string | null,
) {
  return await db.$transaction(async (tx: any) => {
    const sale = await tx.sales.findFirst({
      where: { id: saleId, businessId },
    });

    if (!sale) throw new Error("Sale not found");
    const oldCustomerId = sale.customerId;

    // 1. Update sale
    const updated = await tx.sales.update({
      where: { id: saleId },
      data: { customerId: newCustomerId },
    });

    // 2. Adjust credit bookkeeping if it was a credit sale
    if (sale.paymentMethod === "credit") {
      // Revert old customer's credit usage
      if (oldCustomerId) {
        await tx.customers.update({
          where: { id: oldCustomerId },
          data: {
            totalCreditUsed: { decrement: sale.totalAmount || 0 },
            lastActivityAt: new Date(),
          },
        });
      }

      // Add to new customer's credit usage
      if (newCustomerId) {
        await tx.customers.update({
          where: { id: newCustomerId },
          data: {
            totalCreditUsed: { increment: sale.totalAmount || 0 },
            lastActivityAt: new Date(),
          },
        });
      }
    } else if (newCustomerId) {
      await tx.customers.update({
        where: { id: newCustomerId },
        data: { lastActivityAt: new Date() },
      });
    }

    return NextResponse.json({ success: true, sale: updated });
  });
}
