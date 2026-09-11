import { NextRequest, NextResponse } from "next/server";
import { api } from "@/convex/_generated/api";
import type { Id } from "@/convex/_generated/dataModel";
import { intakeClient, intakeFailure, IntakeRequestError, moneyCents } from "@/lib/inventory/convex-intake";

export async function POST(request: NextRequest) {
  try {
    const { client, businessId } = await intakeClient(request);
    let body;
    try { body = await request.json(); } catch { throw new IntakeRequestError("Invalid intake decision"); }
    if (!body || typeof body !== "object" || Array.isArray(body)) throw new IntakeRequestError("Invalid intake decision");
    if (typeof body.intake_id !== "string" || !body.intake_id) throw new IntakeRequestError("Select an intake");
    if (body.action !== "approve" && body.action !== "reject") throw new IntakeRequestError("Select approve or reject");
    const raw = body.override_values;
    if (raw != null && (typeof raw !== "object" || Array.isArray(raw))) throw new IntakeRequestError("Invalid intake values");
    const overrides = raw ? {
      ...(raw.total_cost !== undefined ? { totalCostCents: moneyCents(raw.total_cost, "total cost") } : {}),
      ...(raw.total_weight_grams !== undefined ? { totalWeightGrams: raw.total_weight_grams } : {}),
      ...(raw.delivery_cost !== undefined ? { deliveryCostCents: moneyCents(raw.delivery_cost, "delivery cost", true) } : {}),
      ...(typeof raw.supplier === "string" ? { supplier: raw.supplier.trim() } : {}),
    } : undefined;
    if (overrides?.totalWeightGrams !== undefined && (typeof overrides.totalWeightGrams !== "number" || !Number.isFinite(overrides.totalWeightGrams) || overrides.totalWeightGrams < 0.01)) throw new IntakeRequestError("Quantity must be at least 0.01");
    await client.mutation(api.intake.decideIntake, { businessId, intakeId: body.intake_id as Id<"inventoryIntakes">,
      action: body.action, ...(overrides ? { overrides } : {}),
      ...(typeof body.rejection_reason === "string" ? { rejectionReason: body.rejection_reason.trim() } : {}),
    });
    return NextResponse.json({ success: true, message: body.action === "approve" ? "Intake approved and processed" : "Intake rejected" });
  } catch (error) { return intakeFailure(error); }
}
