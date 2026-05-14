import { NextRequest } from "next/server";
import { db } from "@/lib/db";
import { cleanPhone, resolveAuthContext, toNumber } from "@/app/api/pos/_lib/server";
import { errorResponse, successResponse } from "@/lib/api/response";

export async function GET(request: NextRequest) {
  try {
    const { businessId } = await resolveAuthContext();

    if (!businessId) {
      return errorResponse("UNAUTHORIZED", "Unauthorized", 401);
    }

    const phoneRaw = new URL(request.url).searchParams.get("phone") || "";
    const phone = cleanPhone(phoneRaw);

    if (!phone) {
      return successResponse({ items: [], data: [], count: 0 });
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

    const items = customers.map((customer) => {
      const limit = customer.creditLimits[0];
      const remainingCredit = limit
        ? Math.max(0, toNumber(limit.maxCreditLimit) - toNumber(limit.currentBalance))
        : 0;

      return {
        id: customer.id,
        phone: customer.phoneNumber || "",
        alias: [customer.firstName, customer.lastName].filter(Boolean).join(" "),
        remainingCredit,
      };
    });

    return successResponse({ items, data: items, count: items.length });
  } catch (error: unknown) {
    console.error("POS customers lookup error:", error);
    return errorResponse(
      "INTERNAL_ERROR",
      error instanceof Error ? error.message : "Unexpected server error",
      500,
    );
  }
}
