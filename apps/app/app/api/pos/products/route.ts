import { NextRequest, NextResponse } from "next/server";
import { ConvexHttpClient } from "convex/browser";
import type { FunctionReturnType } from "convex/server";
import { api } from "@/convex/_generated/api";
import { getConvexAuthToken } from "@/lib/auth/convex-token";
import { resolveAuthContext } from "@/app/api/pos/_lib/server";
import { posCatalogItem } from "@/lib/pos/catalog-item";
import { successResponse } from "@/lib/api/response";
import { db } from "@/lib/db";

export async function GET(request: NextRequest) {
  if (process.env.BYPASS_AUTH_FOR_TESTING === "true") {
    const search = (request.nextUrl.searchParams.get("search") ?? "").trim().toLowerCase();
    const items = await db.inventory.findMany({
      where: {
        businessId: "org_required_ux",
        OR: search ? [
          { sku: { contains: search, mode: "insensitive" } },
          { productName: { contains: search, mode: "insensitive" } },
        ] : undefined,
      },
      orderBy: { productName: "asc" },
    });
    const mapped = (items || []).map((p: any) => ({
      id: p.id,
      name: p.productName,
      price: Number(p.sellingPrice),
      sku: p.sku,
      barcode: p.sku,
      quantity_on_hand: Number(p.quantityOnHand),
    }));
    return successResponse({ items: mapped, data: mapped, count: mapped.length });
  }
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
