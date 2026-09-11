import type { FunctionReturnType } from "convex/server";
import { ConvexHttpClient } from "convex/browser";
import { NextRequest, NextResponse } from "next/server";
import { resolveAuthContext } from "@/app/api/pos/_lib/server";
import { api } from "@/convex/_generated/api";
import { getConvexAuthToken } from "@/lib/auth/convex-token";
import { checkoutFailure } from "@/app/api/pos/_lib/full-checkout";
export async function GET(request?: NextRequest) {
  try {
    const { businessId } = await resolveAuthContext(request);
    const token = await getConvexAuthToken();
    if (!businessId || !token) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    const url = process.env.NEXT_PUBLIC_CONVEX_URL;
    if (!url) throw new Error("Unavailable");
    const client = new ConvexHttpClient(url); client.setAuth(token);
    const options = []; let cursor: string | null = null;
    do {
      const result: FunctionReturnType<typeof api.deliveryProfiles.list> = await client.query(api.deliveryProfiles.list, { businessId, paginationOpts: { cursor, numItems: 100 } });
      options.push(...result.page);
      if (result.isDone) break;
      if (result.continueCursor === cursor) throw new Error("Pagination did not advance");
      cursor = result.continueCursor;
    } while (true);
    return NextResponse.json(options, { headers: { "Cache-Control": "private, no-store" } });
  } catch (error) { return checkoutFailure(error); }
}
