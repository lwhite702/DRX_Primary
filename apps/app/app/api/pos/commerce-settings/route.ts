import { NextRequest, NextResponse } from "next/server";
import { ConvexHttpClient } from "convex/browser";
import type { FunctionReturnType } from "convex/server";
import { api } from "@/convex/_generated/api";
import { getConvexAuthToken } from "@/lib/auth/convex-token";
async function clientFor(request?: NextRequest) {
  const token = await getConvexAuthToken();
  if (!token) throw new Error("UNAUTHENTICATED:");
  const url = process.env.NEXT_PUBLIC_CONVEX_URL;
  if (!url) throw new Error("UNAVAILABLE:");
  const client = new ConvexHttpClient(url); client.setAuth(token);
  const businessId = request?.headers.get("x-business-id") || request?.nextUrl.searchParams.get("business_id") || undefined;
  return { client, businessId };
}
function failure(error: unknown) {
  const raw = error instanceof Error ? error.message : "";
  const status = raw.includes("UNAUTHENTICATED:") ? 401 : /FORBIDDEN:|UNAUTHORIZED:/.test(raw) ? 403 : raw.includes("NOT_FOUND:") ? 404 : raw.includes("INVALID_ARGUMENT:") ? 400 : raw.includes("CONFLICT:") ? 409 : 503;
  const cleaned = raw.replace(/^(UNAUTHENTICATED|FORBIDDEN|UNAUTHORIZED|NOT_FOUND|INVALID_ARGUMENT|CONFLICT|UNAVAILABLE):\s*/, "").trim();
  return NextResponse.json({
    error: status === 403
      ? (cleaned || "You cannot configure commerce for this business")
      : status === 400 || status === 409
      ? (cleaned || "Check the commerce settings")
      : (cleaned || "Commerce settings are unavailable; refresh and retry"),
  }, { status });
}
export async function GET(request?: NextRequest) {
  try {
    const { client, businessId } = await clientFor(request);
    const settings = await client.query(api.commerceSettings.getSettings, { businessId });
    const products = [];
    let cursor: string | null = null;
    do {
      const result: FunctionReturnType<typeof api.products.listCatalogPage> = await client.query(api.products.listCatalogPage, { businessId: settings.businessId, paginationOpts: { numItems: 200, cursor } });
      products.push(...result.page.map(product => ({ id: product._id, name: product.productName, sku: product.sku,
        baseUnitPrice: product.sellingPriceCents / 100, availableQuantity: product.quantityOnHandGrams,
        config: { fractionalEnabled: product.allowFractionalWeight, sellingUnit: product.sellingUnit, decimalPrecision: product.quantityPrecision,
          minimumSaleQuantity: product.minimumSaleQuantity, quantityIncrement: product.quantityIncrement,
          suggestedDollarAmounts: product.suggestedDollarPresetsCents.map(cents => cents / 100), suggestedQuantities: product.suggestedQuantityPresets,
          bulkPriceTiers: product.bulkPriceTiers.map((tier, index) => ({ id: `tier-${index}`, label: `${tier.minimumQuantity}+`, minimumQuantity: tier.minimumQuantity, unitPrice: tier.bundlePriceCents === undefined ? tier.unitPriceCents / 100 : tier.bundlePriceCents / tier.minimumQuantity / 100, ...(tier.bundlePriceCents === undefined ? {} : { totalPrice: tier.bundlePriceCents / 100 }) })) } })));
      if (result.isDone) break;
      if (result.continueCursor === cursor) throw new Error("UNAVAILABLE:");
      cursor = result.continueCursor;
    } while (cursor);
    const customers = [];
    cursor = null;
    do {
      const result: FunctionReturnType<typeof api.commerceSettings.customerOptions> = await client.query(api.commerceSettings.customerOptions, { businessId: settings.businessId, paginationOpts: { numItems: 200, cursor } });
      customers.push(...result.page);
      if (result.isDone) break;
      if (result.continueCursor === cursor) throw new Error("UNAVAILABLE:");
      cursor = result.continueCursor;
    } while (cursor);
    return NextResponse.json({ businessId: settings.businessId, merchant: JSON.parse(settings.merchantJson), products, customers }, { headers: { "Cache-Control": "private, no-store" } });
  } catch (error) { return failure(error); }
}
export async function PATCH(request: NextRequest) {
  try {
    const { client, businessId } = await clientFor(request);
    const body = await request.json();
    await client.mutation(api.commerceSettings.saveSettings, { businessId, patchJson: JSON.stringify(body) });
    return NextResponse.json({ success: true });
  } catch (error) { return failure(error); }
}
