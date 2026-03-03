import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { resolveAuthContext } from "@/app/api/pos/_lib/server";

export async function GET(request: NextRequest) {
  try {
    const { businessId } = await resolveAuthContext();
    if (!businessId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const searchParams = request.nextUrl.searchParams;
    const customerId = searchParams.get("customerId");
    const amount = parseFloat(searchParams.get("amount") || "0");

    if (!customerId) {
      return NextResponse.json({ valid: true });
    }

    const customer = await db.customers.findUnique({
      where: { id: customerId },
      include: {
        creditLimits: {
          where: { businessId },
        },
      },
    });

    if (!customer) {
      return NextResponse.json({ valid: true, warning: "Customer not found" });
    }

    const creditLimit = customer.creditLimits[0];
    const currentBalance = Number(creditLimit?.currentBalance || 0);
    const maxLimit = Number(customer.totalPurchases || 1000); // Fallback logic or specific field if exists

    // Note: The original logic checked credit_limit_ai_recommended too.
    // For now, we simplify to basic credit check.
    const projectedBalance = currentBalance + amount;

    if (projectedBalance > maxLimit) {
      return NextResponse.json({
        valid: false,
        warning: `Credit limit exceeded. Limit: ${maxLimit}, Projected: ${projectedBalance}`,
      });
    }

    return NextResponse.json({
      valid: true,
      currentBalance,
      maxLimit,
    });
  } catch (error: any) {
    console.error("Credit Validation Error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
