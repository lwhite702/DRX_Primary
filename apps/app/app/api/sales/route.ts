import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/adapters/auth/server";
import { db } from "@/lib/db";
import { Prisma } from "@prisma/client";

export async function POST(request: NextRequest) {
  try {
    const { userId } = await auth();
    if (!userId)
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    let businessId: string | undefined;
    const ownedBusiness = await db.businessProfile.findFirst({
      where: { ownerId: userId },
      select: { id: true },
    });
    businessId = ownedBusiness?.id;
    if (!businessId) {
      const userRole = await db.userRole.findFirst({
        where: { userId: userId },
        select: { businessId: true },
      });
      businessId = userRole?.businessId;
    }
    if (!businessId)
      return NextResponse.json(
        { error: "Business not found" },
        { status: 404 },
      );

    const body = await request.json();
    const {
      customer_id,
      payment_method,
      total_amount,
      amount_paid,
      change_amount,
      delivery_price,
      items, // Array of { inventory_id, quantity, unit_price, line_total }
    } = body;

    // Transaction logic
    const sale = await db.$transaction(async (tx) => {
      // 1. Create Sale
      const newSale = await tx.sales.create({
        data: {
          businessId: businessId!,
          customerId: customer_id,
          orderNumber: `ORD-${Date.now()}`, // Simple generation
          paymentMethod: payment_method,
          totalAmount: total_amount,
          amountPaid: amount_paid,
          changeAmount: change_amount,
          deliveryPrice: delivery_price,
          orderStatus: "completed",
          // Create items
          items: {
            create: items.map((item: any) => ({
              inventoryId: item.inventory_id,
              quantity: item.quantity,
              unitPrice: item.unit_price,
              lineTotal: item.line_total,
            })),
          },
        },
        include: { items: true },
      });

      // 2. Update Inventory
      for (const item of items) {
        if (item.inventory_id) {
          await tx.inventory.update({
            where: { id: item.inventory_id },
            data: {
              quantityOnHand: { decrement: item.quantity },
            },
          });
        }
      }

      // 3. Update Customer Credit Usage if credit
      if (payment_method === "credit" && customer_id) {
        await tx.customers.update({
          where: { id: customer_id },
          data: {
            totalCreditUsed: { increment: total_amount },
          },
        });

        // Note: Creating CreditTransaction record might be separate?
        // Mobile calls createCreditTransaction separately.
      }

      return newSale;
    });

    return NextResponse.json(sale, { status: 201 });
  } catch (error) {
    console.error("Create Sale Error:", error);
    return NextResponse.json(
      { error: "Internal Server Error" },
      { status: 500 },
    );
  }
}
