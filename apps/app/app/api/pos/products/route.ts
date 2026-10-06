import { NextRequest, NextResponse } from "next/server";
import { ConvexHttpClient } from "convex/browser";
import type { FunctionReturnType } from "convex/server";
import { api } from "@/convex/_generated/api";
import { getConvexAuthToken } from "@/lib/auth/convex-token";
import { resolveAuthContext } from "@/app/api/pos/_lib/server";
import { posCatalogItem } from "@/lib/pos/catalog-item";
import { successResponse } from "@/lib/api/response";
export async function GET(request: NextRequest) {
  try {
    const { businessId } = await resolveAuthContext(request);
    const token = await getConvexAuthToken();
    if (!businessId || !token) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    const client = new ConvexHttpClient(process.env.NEXT_PUBLIC_CONVEX_URL!);
    client.setAuth(token);
    const search = (request.nextUrl.searchParams.get("search") ?? "").trim().toLowerCase();
    const exact = request.nextUrl.searchParams.get("exact") === "1";
    const products: FunctionReturnType<typeof api.products.listCatalogPage>["page"] = [];
    let cursor: string | null = null;
    let pageCount = 0;
    const maxPages = 50;
    do {
      if (pageCount++ >= maxPages) break;
      const result: FunctionReturnType<typeof api.products.listCatalogPage> = await client.query(api.products.listCatalogPage, { businessId, paginationOpts: { numItems: 200, cursor } });
      products.push(...result.page.filter(product => !search || (exact
        ? product.sku.toLowerCase() === search || product.barcode?.toLowerCase() === search || product.productName.toLowerCase() === search
        : product.sku.toLowerCase().includes(search) || product.barcode?.toLowerCase().includes(search) || product.productName.toLowerCase().includes(search))));
      if (result.isDone) break;
      if (result.continueCursor === cursor) throw new Error("Catalog pagination did not advance");
      cursor = result.continueCursor;
    } while (cursor);
    const items = products.sort((a, b) => a.productName.localeCompare(b.productName)).slice(0, exact ? 5 : 30).map(posCatalogItem);
    return successResponse({ items, data: items, count: items.length });
  } catch { return NextResponse.json({ error: "Products are temporarily unavailable" }, { status: 503 }); }
}
