import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { api } from "@/convex/_generated/api";
import type { Id } from "@/convex/_generated/dataModel";
import { intakeClient, intakeFailure, IntakeRequestError, moneyCents } from "@/lib/inventory/convex-intake";
import { catalogResponse } from "@/lib/inventory/catalog-response";
const updateSchema = z.object({
  product_name: z.string().min(1).optional(), sku: z.string().min(1).optional(), description: z.string().optional(),
  category: z.string().optional(), unit_of_measure: z.string().min(1).max(40).optional(),
  location: z.string().optional(), is_taxable: z.boolean().optional(),
  quantity_on_hand: z.number().finite().nonnegative().optional(), reorder_level: z.number().finite().nonnegative().optional(),
  unit_cost: z.number().nonnegative().optional(), selling_price: z.number().nonnegative().optional(),
  business_id: z.string().optional(), id: z.string().optional(),
}).strict();
type RouteContext = { params: Promise<{ id: string }> | { id: string } };
export async function GET(request: NextRequest, context: RouteContext) {
  try {
    const { client, businessId } = await intakeClient(request);
    const { id } = await context.params;
    const product = await client.query(api.products.getCatalogProduct, { businessId, productId: id as Id<"products"> });
    return NextResponse.json({ data: catalogResponse(product) }, { headers: { "Cache-Control": "private, no-store" } });
  } catch (error) { return intakeFailure(error); }
}
export async function PUT(request: NextRequest, context: RouteContext) {
  try {
    const { client, businessId } = await intakeClient(request);
    const { id } = await context.params;
    const input = updateSchema.safeParse(await request.json());
    if (!input.success) throw new IntakeRequestError("Check the product details");
    const body = input.data;
    if ((body.id && body.id !== id) || (body.business_id && body.business_id !== businessId)) throw new IntakeRequestError("Product or business changed; refresh before saving", 409);
    await client.mutation(api.inventory.updateProduct, { businessId, productId: id as Id<"products">,
      productName: body.product_name, sku: body.sku, description: body.description, category: body.category,
      sellingUnit: body.unit_of_measure, location: body.location, isTaxable: body.is_taxable,
      quantity: body.quantity_on_hand, reorderLevel: body.reorder_level,
      unitCostCents: body.unit_cost === undefined ? undefined : moneyCents(body.unit_cost, "unit cost", true),
      sellingPriceCents: body.selling_price === undefined ? undefined : moneyCents(body.selling_price, "selling price", true),
    });
    const product = await client.query(api.products.getCatalogProduct, { businessId, productId: id as Id<"products"> });
    return NextResponse.json({ data: catalogResponse(product) });
  } catch (error) { return intakeFailure(error); }
}
