import { NextRequest, NextResponse } from "next/server";
import { api } from "@/convex/_generated/api";
import type { Id } from "@/convex/_generated/dataModel";
import { intakeClient, intakeFailure, IntakeRequestError, moneyCents } from "@/lib/inventory/convex-intake";

export async function GET(request: NextRequest) {
  try {
    const { client, businessId } = await intakeClient(request);
    const status = request.nextUrl.searchParams.get("status") ?? "pending";
    if (status !== "pending" && status !== "approved" && status !== "rejected") throw new IntakeRequestError("Invalid intake status");
    const result = await client.query(api.intake.listIntakes, { businessId, status,
      paginationOpts: { numItems: 100, cursor: request.nextUrl.searchParams.get("cursor") } });
    return NextResponse.json({ items: result.page, continueCursor: result.continueCursor, isDone: result.isDone }, { headers: { "Cache-Control": "private, no-store" } });
  } catch (error) { return intakeFailure(error); }
}

export async function POST(request: NextRequest) {
  try {
    const { client, businessId } = await intakeClient(request);
    let body;
    try { body = await request.json(); } catch { throw new IntakeRequestError("Invalid intake request"); }
    if (!body || typeof body !== "object" || Array.isArray(body)) throw new IntakeRequestError("Invalid intake request");
    if (typeof body.inventory_id !== "string" || !body.inventory_id) throw new IntakeRequestError("Select a product");
    const idempotencyKey = body.idempotency_key ?? request.headers.get("idempotency-key");
    if (typeof idempotencyKey !== "string" || !idempotencyKey.trim() || idempotencyKey.length > 200) throw new IntakeRequestError("A submission key is required; refresh and try again");
    if (typeof body.total_weight_grams !== "number" || !Number.isFinite(body.total_weight_grams) || body.total_weight_grams < 0.01) throw new IntakeRequestError("Quantity must be at least 0.01");
    const result = await client.mutation(api.intake.submitIntake, { businessId,
      productId: body.inventory_id as Id<"products">, idempotencyKey,
      totalCostCents: moneyCents(body.total_cost, "total cost"), totalWeightGrams: body.total_weight_grams,
      deliveryCostCents: moneyCents(body.delivery_cost ?? 0, "delivery cost", true),
      ...(typeof body.supplier === "string" ? { supplier: body.supplier.trim() } : {}),
    });
    return NextResponse.json({ success: true, intake: { id: result.intakeId, status: result.status },
      requires_approval: result.requiresApproval, replayed: result.replayed,
      message: result.requiresApproval ? "Intake submitted for manager approval due to unusual cost" :
        result.status === "rejected" ? "This intake was already rejected; refresh to start a new entry" : "Stock added and approved." });
  } catch (error) { return intakeFailure(error); }
}
