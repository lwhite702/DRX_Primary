import { NextRequest, NextResponse } from "next/server";
import { api } from "@/convex/_generated/api";
import { businessClient } from "@/lib/business/convex-server";
import { customerFailure } from "@/lib/customers/convex-operational";

export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> | { id: string } }) {
  try {
    const { id } = await Promise.resolve(params);
    const { client, businessId, expectedUserId } = await businessClient(request);
    const page = await client.query(api.creditDashboard.accountsPage, { businessId, expectedUserId, paginationOpts: { cursor: null, numItems: 100 } });
    const row = page.page.find(item => String(item.customerId) === id);
    if (!row) return NextResponse.json({ error: "Not Found" }, { status: 404 });
    return NextResponse.json({ id: String(row.customerId), customerId: String(row.customerId), creditLine: row.limitCents / 100, balance: row.balanceCents / 100 }, { headers: { "Cache-Control": "private, no-store" } });
  } catch (error) {
    return customerFailure(error);
  }
}
