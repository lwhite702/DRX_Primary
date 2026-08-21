import { NextRequest } from "next/server";
import { cleanPhone, toNumber } from "@/app/api/pos/_lib/server";
import { resolveCustomerAccess } from "@/app/api/customers/_lib/server";
import { errorResponse, successResponse } from "@/lib/api/response";
import { lookupPosCustomerCandidates } from "@/lib/customers/core/customer-search";
import { ensureServerFlag } from "@/lib/posthog/server-flags";
import { db } from "@/lib/db";

export async function GET(request: NextRequest) {
  try {
    const context = await resolveCustomerAccess(request, "customers.view");
    if (!context.ok) {
      return errorResponse(
        context.status === 401 ? "UNAUTHORIZED" : "FORBIDDEN",
        context.error,
        context.status,
      );
    }
    const { businessId } = context;

    const url = new URL(request.url);
    const phoneRaw = url.searchParams.get("phone") || "";
    const emailRaw = url.searchParams.get("email") || "";
    const searchRaw = url.searchParams.get("search") || "";

    const cleanedPhone = cleanPhone(phoneRaw).trim();
    const candidateSearch =
      searchRaw.trim() || emailRaw.trim() || cleanedPhone || phoneRaw.trim();

    if (!candidateSearch) {
      return successResponse({ items: [], data: [], count: 0 });
    }

    const deterministicLookupEnabled = await ensureServerFlag(
      "feat_pos_customer_lookup_v2",
      {
        distinctId: businessId,
        groups: { business: businessId },
        defaultValue: true,
      },
    );

    const items = deterministicLookupEnabled
      ? await lookupPosCustomerCandidates({
          businessId,
          search: candidateSearch,
          limit: 10,
        })
      : await (async () => {
          const phone = cleanPhone(phoneRaw || candidateSearch);
          if (!phone) return [] as Array<{ id: string; phone: string; alias: string; remainingCredit: number }>;

          const customers = await db.customers.findMany({
            where: {
              businessId,
              isActive: true,
              phoneNumber: { contains: phone },
            },
            take: 10,
            orderBy: { createdAt: "desc" },
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

          return customers.map((customer: any) => {
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
        })();

    return successResponse({ items, data: items, count: items.length });
  } catch (error: unknown) {
    console.error("POS customers lookup failed", {
      errorType: error instanceof Error ? error.name : "UnknownError",
    });
    return errorResponse("INTERNAL_ERROR", "Unexpected server error", 500);
  }
}
