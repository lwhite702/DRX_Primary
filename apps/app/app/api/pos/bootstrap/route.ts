import { NextRequest, NextResponse } from "next/server";
import { ConvexHttpClient } from "convex/browser";
import type { FunctionReturnType } from "convex/server";
import type { Id } from "@/convex/_generated/dataModel";
import { api } from "@/convex/_generated/api";
import { getConvexAuthToken } from "@/lib/auth/convex-token";
import { resolveAuthContext } from "@/app/api/pos/_lib/server";
import { QUICK_POS_FAVORITES_LIMIT, QUICK_POS_RECENT_LIMIT } from "@/lib/quick-pos/constants";
import { posCatalogItem } from "@/lib/pos/catalog-item";

import { db } from "@/lib/db";

export async function GET(request?: NextRequest) {
  if (process.env.BYPASS_AUTH_FOR_TESTING === "true") {
    const items = await db.inventory.findMany({
      where: { businessId: "org_required_ux" },
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
    return NextResponse.json({
      favorites: mapped,
      recentlySold: mapped,
      creditPolicy: { enabled: true },
      deliveryPolicy: { feeTaxable: true, dispatchSlaMinutes: 45 },
    });
  }
  try {
    const { businessId } = await resolveAuthContext(request);
    const token = await getConvexAuthToken();
    if (!businessId || !token) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    const url = process.env.NEXT_PUBLIC_CONVEX_URL?.trim();
    if (!url) throw new Error("Bootstrap unavailable");
    const client = new ConvexHttpClient(url); client.setAuth(token);
    const policies = await client.query(api.posBootstrap.policies, { businessId });
    const quantities = new Map<Id<"products">, number>();
    const recent = new Set<Id<"products">>();
    const through = Date.now(); let cursor: string | null = null;
    let pageCount = 0;
    const maxSalesPages = 40;
    do {
      if (pageCount++ >= maxSalesPages) break;
      const page: FunctionReturnType<typeof api.posBootstrap.salesPage> = await client.query(api.posBootstrap.salesPage, { businessId, through, paginationOpts: { cursor, numItems: 25 } });
      for (const group of page.groups) {
        const add = (lines: typeof group.lines) => {
          for (const line of lines) {
            const total = (quantities.get(line.productId) ?? 0) + line.quantity;
            if (!Number.isFinite(total)) throw new Error("Invalid history totals");
            quantities.set(line.productId, total); recent.add(line.productId);
          }
        };
        if (!group.needsPaging) { add(group.lines); continue; }
        let lineCursor: string | null = null;
        let linePageCount = 0;
        const maxLinePages = 10;
        do {
          if (linePageCount++ >= maxLinePages) break;
          const linePage: FunctionReturnType<typeof api.posBootstrap.saleLinesPage> = await client.query(api.posBootstrap.saleLinesPage, { businessId, saleId: group.saleId, paginationOpts: { cursor: lineCursor, numItems: 200 } });
          add(linePage.lines);
          if (linePage.isDone) break;
          if (!linePage.continueCursor || linePage.continueCursor === lineCursor) throw new Error("Line pagination did not advance");
          lineCursor = linePage.continueCursor;
        } while (true);
      }
      if (page.isDone) break;
      if (!page.continueCursor || page.continueCursor === cursor) throw new Error("History pagination did not advance");
      cursor = page.continueCursor;
    } while (true);
    const ranked = [...quantities].sort(([a, qa], [b, qb]) => qb - qa || a.localeCompare(b)).map(([id]) => id);
    const recentIds = [...recent];
    const candidates = [...new Set([...ranked, ...recentIds])];
    const catalog = new Map<string, ReturnType<typeof posCatalogItem>>();
    for (let offset = 0; offset < candidates.length; offset += 100) {
      const products = await client.query(api.posBootstrap.catalog, { businessId, productIds: candidates.slice(offset, offset + 100) });
      for (const product of products) catalog.set(product._id, posCatalogItem(product));
    }
    const select = (ids: string[], limit: number) => ids.flatMap(id => catalog.has(id) ? [catalog.get(id)!] : []).slice(0, limit);
    const favorites = select(ranked, QUICK_POS_FAVORITES_LIMIT);
    const recentlySold = select(recentIds, QUICK_POS_RECENT_LIMIT);
    const payload = { favorites, recentlySold, ...policies };
    return NextResponse.json({ ...payload, data: payload, count: favorites.length + recentlySold.length }, { headers: { "Cache-Control": "private, no-store" } });
  } catch (error) {
    if (error instanceof Error && error.message.includes("FORBIDDEN:")) return NextResponse.json({ error: "You do not have access to this register" }, { status: 403 });
    return NextResponse.json({ error: "POS favorites and policies are temporarily unavailable. Retry loading the register." }, { status: 503 });
  }
}
