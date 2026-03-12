import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { resolveAuthContext } from "@/app/api/pos/_lib/server";
import { validateCreditBalance } from "@/lib/pos/core";

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
    const result = await validateCreditBalance(db, businessId, customerId, amount);

    return NextResponse.json({
      valid: result.valid,
      currentBalance: result.currentBalance,
      maxLimit: result.maxLimit,
      remaining: result.remaining,
      warning: result.warning,
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Unknown error";
    console.error("Credit Validation Error:", error);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
