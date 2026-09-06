import { NextRequest, NextResponse } from "next/server";
import { ConvexHttpClient } from "convex/browser";
import type { FunctionReturnType } from "convex/server";
import { api } from "@/convex/_generated/api";
import { getConvexAuthToken } from "@/lib/auth/convex-token";
import { resolveAuthContext } from "@/app/api/pos/_lib/server";
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
    do {
      const result: FunctionReturnType<typeof api.products.listCatalogPage> = await client.query(api.products.listCatalogPage, { businessId, paginationOpts: { numItems: 200, cursor } });
      products.push(...result.page.filter(product => !search || (exact
        ? product.sku.toLowerCase() === search || product.productName.toLowerCase() === search
        : product.sku.toLowerCase().includes(search) || product.productName.toLowerCase().includes(search))));
      if (result.isDone) break;
      if (result.continueCursor === cursor) throw new Error("Catalog pagination did not advance");
      cursor = result.continueCursor;
    } while (cursor);
    const items = products.sort((a, b) => a.productName.localeCompare(b.productName)).slice(0, exact ? 5 : 30).map(product => {
      const config = { fractionalEnabled: product.allowFractionalWeight, sellingUnit: product.sellingUnit,
        decimalPrecision: product.quantityPrecision, minimumSaleQuantity: product.minimumSaleQuantity,
        quantityIncrement: product.quantityIncrement, baseUnitPrice: product.sellingPriceCents / 100,
        suggestedDollarAmounts: product.suggestedDollarPresetsCents.map(cents => cents / 100), suggestedQuantities: product.suggestedQuantityPresets,
        bulkPriceTiers: product.bulkPriceTiers.map((tier, index) => ({ id: `${product._id}-${index}`, label: `${tier.minimumQuantity}+`, minimumQuantity: tier.minimumQuantity, unitPrice: tier.unitPriceCents / 100 })) };
      return { id: product._id, name: product.productName, sku: product.sku, barcode: null, price: product.sellingPriceCents / 100,
        quantity_on_hand: product.quantityOnHandGrams, low_stock_threshold: product.reorderLevelGrams,
        commerce_config: config, fractional_config: product.allowFractionalWeight ? config : undefined };
    });
    return successResponse({ items, data: items, count: items.length });
  } catch { return NextResponse.json({ error: "Products are temporarily unavailable" }, { status: 503 }); }
}
