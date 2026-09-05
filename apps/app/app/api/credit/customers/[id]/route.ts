import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { resolveAuthContext } from "@/app/api/pos/_lib/server";
import { toNumberSafe } from "@/lib/customers/core/customer-normalizer";

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> | { id: string } },
) {
  try {
    const { businessId } = await resolveAuthContext();
    if (!businessId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await Promise.resolve(params);

    const credit = await db.creditLimit.findFirst({
      where: {
        id,
        businessId,
      },
    });

    if (!credit) {
      return NextResponse.json({ error: "Not Found" }, { status: 404 });
    }

    return NextResponse.json({
      id: credit.id,
      customerId: credit.customerId,
      creditLine: toNumberSafe(credit.maxCreditLimit),
      balance: toNumberSafe(credit.currentBalance),
    });
  } catch (error) {
    console.error("[credit/customers/:id]", error);
    return NextResponse.json(
      { error: "Internal Server Error" },
      { status: 500 },
    );
  }
}
