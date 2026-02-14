import { NextRequest, NextResponse } from "next/server";
import { Prisma } from "@prisma/client";
import { db } from "@/lib/db";
import { resolveAuthContext, toNumber } from "@/app/api/pos/_lib/server";
import type { QuickPosCheckoutRequest, QuickPosCheckoutResponse } from "@/lib/quick-pos/types";

function asDecimal(value: number) {
  return new Prisma.Decimal(value.toFixed(2));
}

export async function POST(request: NextRequest) {
  const { userId, businessId } = await resolveAuthContext();

  if (!userId || !businessId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = (await request.json()) as QuickPosCheckoutRequest;

  if (!body.items || body.items.length === 0) {
    return NextResponse.json({ error: "Cart is empty" }, { status: 400 });
  }

  if (!["cash", "card", "credit"].includes(body.payment?.method || "")) {
    return NextResponse.json({ error: "Invalid payment method" }, { status: 400 });
  }

  const inventoryItems = body.items.filter((item) => item.source === "inventory" && item.inventoryId);

  try {
    const result = await db.$transaction(async (tx) => {
      if (inventoryItems.length > 0) {
        const inventoryIds = inventoryItems.map((item) => item.inventoryId!) as string[];

        const stock = await tx.inventory.findMany({
          where: {
            businessId,
            id: { in: inventoryIds },
          },
          select: {
            id: true,
            quantityOnHand: true,
          },
        });

        const stockById = new Map(stock.map((row) => [row.id, row.quantityOnHand]));

        for (const item of inventoryItems) {
          const available = stockById.get(item.inventoryId!);
          if (available === undefined) {
            throw new Error("Inventory item not found");
          }
          if (available < item.qty) {
            throw new Error(`Insufficient stock for ${item.name}`);
          }
        }
      }

      const subtotal = body.items.reduce((sum, item) => sum + item.unitPrice * item.qty, 0);
      const total = Number(subtotal.toFixed(2));

      if (body.payment.method === "credit") {
        if (!body.customerId) {
          throw new Error("Credit payment requires customer");
        }

        if (!body.payment.creditConfirmed) {
          throw new Error("Credit payment requires confirmation");
        }

        const credit = await tx.creditLimit.findFirst({
          where: {
            businessId,
            customerId: body.customerId,
          },
          select: {
            id: true,
            maxCreditLimit: true,
            currentBalance: true,
          },
        });

        if (!credit) {
          throw new Error("No credit limit configured for customer");
        }

        const remaining = toNumber(credit.maxCreditLimit) - toNumber(credit.currentBalance);

        if (remaining < total) {
          throw new Error("Credit cap exceeded");
        }
      }

      const sale = await tx.sales.create({
        data: {
          businessId,
          customerId: body.customerId || null,
          orderNumber: `QPOS-${Date.now()}-${Math.floor(Math.random() * 10000)}`,
          orderStatus: "completed",
          orderType: "retail",
          paymentMethod: body.payment.method,
          subtotal: asDecimal(subtotal),
          taxAmount: asDecimal(0),
          totalAmount: asDecimal(total),
          amountPaid: asDecimal(total),
          changeAmount: asDecimal(0),
          fees: [{ type: "receipt", value: body.payment.receipt }],
          createdBy: userId,
          items: {
            create: body.items.map((item) => ({
              inventoryId: item.inventoryId,
              quantity: item.qty,
              unitPrice: asDecimal(item.unitPrice),
              lineTotal: asDecimal(item.unitPrice * item.qty),
            })),
          },
        },
        select: {
          id: true,
        },
      });

      for (const item of inventoryItems) {
        await tx.inventory.update({
          where: { id: item.inventoryId! },
          data: {
            quantityOnHand: { decrement: item.qty },
          },
        });
      }

      if (body.payment.method === "credit" && body.customerId) {
        await tx.creditLimit.updateMany({
          where: {
            businessId,
            customerId: body.customerId,
          },
          data: {
            currentBalance: { increment: asDecimal(total) },
          },
        });

        await tx.creditTransaction.create({
          data: {
            businessId,
            customerId: body.customerId,
            transactionType: "extension",
            amount: asDecimal(total),
            description: `Quick POS sale ${sale.id}`,
            status: "completed",
            createdBy: userId,
          },
        });
      }

      return sale;
    });

    const payload: QuickPosCheckoutResponse = {
      success: true,
      saleId: result.id,
    };

    return NextResponse.json(payload, { status: 201 });
  } catch (error) {
    const payload: QuickPosCheckoutResponse = {
      success: false,
      error: error instanceof Error ? error.message : "Checkout failed",
    };

    return NextResponse.json(payload, { status: 400 });
  }
}
