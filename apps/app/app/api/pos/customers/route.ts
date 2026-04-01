import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { cleanPhone, resolveAuthContext, toNumber } from "@/app/api/pos/_lib/server";

export async function GET(request: NextRequest) {
  const { businessId } = await resolveAuthContext();

  if (!businessId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const phoneRaw = new URL(request.url).searchParams.get("phone") || "";
  const phone = cleanPhone(phoneRaw);

  if (!phone) {
    return NextResponse.json({ items: [] });
  }

  const customers = await db.customers.findMany({
    where: {
      businessId,
      isActive: true,
      phoneNumber: { contains: phone },
    },
    take: 10,
    orderBy: {
      createdAt: "desc",
    },
    select: {
      id: true,
      firstName: true,
      lastName: true,
      phoneNumber: true,
      creditLimits: {
        where: { businessId },
        take: 1,
        select: {
          maxCreditLimit: true,
          currentBalance: true,
        },
      },
    },
  });

  return NextResponse.json({
    items: customers.map((customer) => {
      const limit = customer.creditLimits[0];
      const remainingCredit = limit
        ? Math.max(0, toNumber(limit.maxCreditLimit) - toNumber(limit.currentBalance))
        : 0;

      return {
        id: customer.id,
        phone: customer.phoneNumber || "",
        alias: `${customer.firstName} ${customer.lastName}`.trim(),
        remainingCredit,
      };
    }),
  });
}
