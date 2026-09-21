import { NextRequest, NextResponse } from "next/server";
import { api } from "@/convex/_generated/api";
import { businessClient } from "@/lib/business/convex-server";
import { encodeCustomerPii } from "@/lib/privacy/customer-pii";
import { convexPiiArgs, customerFailure, dollarsToCents } from "@/lib/customers/convex-operational";

const headers = { "Cache-Control": "private, no-store" };

export async function POST(request: NextRequest) {
  try {
    const { client, businessId, expectedUserId } = await businessClient(request);
    const body: unknown = await request.json().catch(() => null);
    if (!body || typeof body !== "object" || Array.isArray(body)) throw new Error("INVALID_ARGUMENT: Invalid request body");
    const input = body as Record<string, unknown>;
    const name = typeof (input.customerCreditName ?? input.customer_name) === "string" ? String(input.customerCreditName ?? input.customer_name).trim() : "";
    if (!name) return NextResponse.json({ error: "customerCreditName is required" }, { status: 400 });
    const initialCreditLine = dollarsToCents(input.initialCreditLine ?? input.initial_credit_line ?? 0, "Initial credit line") ?? 0;
    const storage = await encodeCustomerPii({ alias: name });
    const result = await client.mutation(api.customers.createOrAttachOperational, {
      businessId, expectedUserId, ...convexPiiArgs(storage), matchBy: "alias", aliasHash: storage.aliasHash,
      lastName: null, city: null, state: null, zipCode: null, customerType: "retail", fixedPricePerGramCents: null,
      creditLimitCents: initialCreditLine, ephemeral: false, ephemeralExpiresAt: null, isActive: true, changedFields: ["alias", "credit_limit"],
    });
    const customer = result.customer;
    return NextResponse.json({ id: String(customer._id), customerId: String(customer._id), creditLine: customer.creditLimitCents / 100, balance: customer.totalCreditUsedCents / 100 }, { status: 201, headers });
  } catch (error) {
    return customerFailure(error);
  }
}

export async function GET(request: NextRequest) {
  try {
    const { client, businessId, expectedUserId } = await businessClient(request);
    const params = new URL(request.url).searchParams;
    const page = await client.query(api.creditDashboard.accountsPage, { businessId, expectedUserId, paginationOpts: { cursor: null, numItems: 100 } });
    const customerId = params.get("customer_id") || params.get("customerId");
    const rows = (customerId ? page.page.filter(row => String(row.customerId) === customerId) : page.page).map(row => ({ id: String(row.customerId), customerId: String(row.customerId), creditLine: row.limitCents / 100, balance: row.balanceCents / 100 }));
    return NextResponse.json({ data: rows }, { headers });
  } catch (error) {
    return customerFailure(error);
  }
}
