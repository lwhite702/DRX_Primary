import { NextRequest, NextResponse } from "next/server";
import { api } from "@/convex/_generated/api";
import { newProductCommerceSchema } from "@/lib/commerce/product-creation";
import { intakeClient, intakeFailure, IntakeRequestError, moneyCents } from "@/lib/inventory/convex-intake";

import type { FunctionReturnType } from "convex/server";

import { catalogResponse } from "@/lib/inventory/catalog-response";

export async function GET(request: NextRequest) {
  try {
    const { client, businessId } = await intakeClient(request);
    const params = request.nextUrl.searchParams;
    const limit = Number(params.get("limit") ?? 50);
    const offset = Number(params.get("offset") ?? 0);
    if (!Number.isInteger(limit) || limit < 1 || limit > 200 || !Number.isSafeInteger(offset) || offset < 0) {
      throw new IntakeRequestError("Invalid inventory page");
    }
    const search = (params.get("search") ?? "").trim().toLowerCase();
    let cursor: string | null = params.get("cursor");
    let skipped = 0;
    let isDone = false;
    const status = params.get("status") || undefined;
    const data: Awaited<ReturnType<typeof catalogResponse>>[] = [];
    // Keep the existing offset/search contract while reading bounded Convex pages.
    // Cursor callers can continue without rereading earlier records.
    do {
      const result: FunctionReturnType<typeof api.products.listCatalogPage> = await client.query(api.products.listCatalogPage, {
        businessId, paginationOpts: { numItems: Math.min(200, limit - data.length), cursor }, status,
      });
      for (const product of result.page) {
        if (search && !product.productName.toLowerCase().includes(search) && !product.sku.toLowerCase().includes(search) && !product.barcode?.toLowerCase().includes(search)) continue;
        if (skipped++ < offset) continue;
        data.push(catalogResponse(product));
      }
      cursor = result.continueCursor;
      isDone = result.isDone;
    } while (!isDone && data.length < limit);
    return NextResponse.json({ data, continueCursor: cursor, isDone }, { headers: { "Cache-Control": "private, no-store" } });
  } catch (error) { return intakeFailure(error); }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    // Preserve the existing web form's selected-business body field.
    const selectedRequest = new NextRequest(request.url, { headers: request.headers });
    if (!selectedRequest.headers.has("x-business-id") && typeof body.business_id === "string") {
      selectedRequest.headers.set("x-business-id", body.business_id);
    }
    const { client, businessId } = await intakeClient(selectedRequest);
    if (typeof body.product_name !== "string" || !body.product_name.trim()) {
      throw new IntakeRequestError("Product Name is required");
    }
    const commerce = body.commerce_config === undefined ? undefined : newProductCommerceSchema.safeParse(body.commerce_config);
    if (commerce && !commerce.success) throw new IntakeRequestError("Check the product selling rules");
    const config = commerce?.success ? commerce.data : undefined;
    const id = await client.mutation(api.products.createProduct, {
      selectedBusinessId: businessId, sku: typeof body.sku === "string" ? body.sku.trim() : "",
      barcode: typeof body.barcode === "string" ? body.barcode.trim() || undefined : undefined,
      productName: body.product_name.trim(),
      description: body.description || undefined, category: body.category || undefined,
      location: typeof body.location === "string" ? body.location.trim() || undefined : undefined,
      isTaxable: typeof body.is_taxable === "boolean" ? body.is_taxable : undefined,
      sellingPriceCents: moneyCents(body.selling_price, "selling price"),
      unitCostCents: body.purchase_cost_basis ? 0 : moneyCents(body.unit_cost ?? 0, "unit cost", true),
      purchaseCostBasis: body.purchase_cost_basis ? {
        costCents: moneyCents(body.purchase_cost_basis.costCents / 100, "purchase cost", true),
        quantity: Number(body.purchase_cost_basis.quantity),
        unit: body.purchase_cost_basis.unit,
        actualSellingQuantity: body.purchase_cost_basis.actualSellingQuantity,
      } : undefined,
      initialQuantity: body.quantity_on_hand ?? 0, reorderLevelGrams: body.reorder_level ?? 10,
      allowFractionalWeight: config?.fractionalEnabled ?? true,
      commerceConfig: config ? {
        sellingUnit: config.sellingUnit, decimalPrecision: config.decimalPrecision,
        minimumSaleQuantity: config.minimumSaleQuantity, quantityIncrement: config.quantityIncrement,
        suggestedDollarAmounts: config.suggestedDollarAmounts, suggestedQuantities: config.suggestedQuantities,
        bulkPriceTiers: config.bulkPriceTiers.map(tier => ({
          minimumQuantity: tier.minimumQuantity,
          unitPriceCents: Math.round(tier.unitPrice * 100),
          ...(tier.totalPrice === undefined ? {} : { bundlePriceCents: Math.round(tier.totalPrice * 100) }),
        })),
      } : undefined,
    });
    const product = await client.query(api.products.getCatalogProduct, { businessId, productId: id });
    return NextResponse.json(catalogResponse(product), { status: 201 });
  } catch (error) { return intakeFailure(error); }
}
