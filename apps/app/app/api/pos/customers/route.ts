import { NextRequest } from "next/server";
import { api } from "@/convex/_generated/api";
import { businessClient } from "@/lib/business/convex-server";
import { errorResponse, successResponse } from "@/lib/api/response";
import { customerMatchesSearch, normalizeCustomerSearchInput } from "@/lib/customers/core/customer-normalizer";
import { mapConvexCustomer } from "@/lib/customers/convex-operational";

export async function GET(request: NextRequest) {
  try {
    const { client, businessId, expectedUserId } = await businessClient(request);
    const params = new URL(request.url).searchParams;
    const candidateSearch = (params.get("search") || params.get("email") || params.get("phone") || "").trim();
    if (!candidateSearch) return successResponse({ items: [], data: [], count: 0 });
    const search = normalizeCustomerSearchInput(candidateSearch);
    const customers = await client.query(api.customers.listOperational, { businessId, expectedUserId, isActive: true, windowSize: 240 });
    const mapped = await Promise.all(customers.map(customer => mapConvexCustomer(customer)));
    const items = mapped.filter(customer => customerMatchesSearch(customer, search)).slice(0, 10).map(customer => ({
      id: String(customer.id),
      phone: String(customer.phone || ""),
      alias: String(customer.alias || [customer.first_name, customer.last_name].filter(Boolean).join(" ") || "Customer"),
      remainingCredit: Math.max(0, Number(customer.credit_limit || 0) - Number(customer.total_credit_used || 0)),
    }));
    return successResponse({ items, data: items, count: items.length });
  } catch (error) {
    const message = error instanceof Error ? error.message : "";
    const status = message.includes("UNAUTH") ? 401 : message.includes("FORBIDDEN:") ? 403 : 503;
    return errorResponse(status === 401 ? "UNAUTHORIZED" : status === 403 ? "FORBIDDEN" : "INTERNAL_ERROR", status === 503 ? "Customer lookup is temporarily unavailable" : "Access denied", status);
  }
}
