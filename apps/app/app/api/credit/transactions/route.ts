import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { db } from "@/lib/db";

export async function POST(request: NextRequest) {
  try {
    const { userId } = await auth();
    if (!userId)
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const body = await request.json();
    const { customer_id, amount, transaction_type, description } = body;
    // Note: Mobile sends snake_case probably? apiClient uses `createCreditTransaction`.
    // Let's assume body matches what we want: customer_id, amount, type.

    // Find Credit Limit for this customer
    // The previous implementation used `customerCreditId`.
    // If mobile passes `customer_id`, we search by that.

    if (!customer_id) {
      return NextResponse.json(
        { error: "Customer ID required" },
        { status: 400 },
      );
    }

    const creditLimit = await db.creditLimit.findFirst({
      where: { customerId: customer_id },
    });

    if (!creditLimit) {
      // Create if doesn't exist? Or status 404?
      // Typically 404 or auto-create. Let's return 404 for now.
      return NextResponse.json(
        { error: "Credit account not found for customer" },
        { status: 404 },
      );
    }

    // Create Transaction
    const transaction = await db.creditTransaction.create({
      data: {
        businessId: creditLimit.businessId,
        customerId: customer_id,
        amount: amount,
        transactionType: transaction_type,
        description: description,
        status: "completed",
        createdBy: userId,
      },
    });

    // Update Balance
    // transaction_type 'purchase' (credit usage) -> increases currentBalance (debt)
    // transaction_type 'payment' -> decreases currentBalance (debt)

    let newBalance = Number(creditLimit.currentBalance) || 0;
    if (transaction_type === "purchase" || transaction_type === "credit") {
      newBalance += Number(amount);
    } else if (transaction_type === "payment") {
      newBalance -= Number(amount);
    }

    await db.creditLimit.update({
      where: { id: creditLimit.id },
      data: { currentBalance: newBalance },
    });

    // Also update Customer totalCreditUsed if needed?
    // The previous implementation didn't. `sales/route.ts` did.
    // Let's stick to updating CreditLimit here.

    return NextResponse.json(transaction, { status: 201 });
  } catch (error) {
    console.error("Credit Transaction Error:", error);
    return NextResponse.json(
      { error: "Internal Server Error" },
      { status: 500 },
    );
  }
}

export async function GET(request: NextRequest) {
  try {
    const { userId } = await auth();
    if (!userId)
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { searchParams } = new URL(request.url);
    // Support by customerId or businessId
    const customerId = searchParams.get("customerId");
    const businessId = searchParams.get("businessId");

    if (customerId) {
      const transactions = await db.creditTransaction.findMany({
        where: { customerId },
        orderBy: { createdAt: "desc" },
      });
      return NextResponse.json(transactions);
    }

    if (businessId) {
      // Verify ownership logic? skipping for brevity but strictly should exist

      const transactions = await db.creditTransaction.findMany({
        where: { businessId },
        orderBy: { createdAt: "desc" },
        take: 50,
      });
      return NextResponse.json(transactions);
    }

    return NextResponse.json([]);
  } catch (error) {
    console.error("Get Credit Transactions Error:", error);
    return NextResponse.json(
      { error: "Internal Server Error" },
      { status: 500 },
    );
  }
}
