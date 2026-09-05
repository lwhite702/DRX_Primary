import { NextRequest, NextResponse } from "next/server";
import { resolveAuthContext } from "@/app/api/pos/_lib/server";
import {
  canApproveInventoryIntake,
  decideInventoryIntake,
  InventoryIntakeError,
} from "@/lib/inventory/intake-service";

export async function POST(request: NextRequest) {
  try {
    const { userId, businessId } = await resolveAuthContext(request);
    if (!userId || !businessId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    if (!(await canApproveInventoryIntake(userId, businessId))) {
      return NextResponse.json({ error: "Only managers can approve intakes" }, { status: 403 });
    }

    const body = await request.json();
    const intakeId = typeof body.intake_id === "string" ? body.intake_id : "";
    const action = body.action === "approve" || body.action === "reject" ? body.action : null;
    if (!intakeId) {
      return NextResponse.json({ error: "intake_id is required" }, { status: 400 });
    }
    if (!action) {
      return NextResponse.json({ error: "action must be 'approve' or 'reject'" }, { status: 400 });
    }

    const rawOverrides = body.override_values as Record<string, unknown> | undefined;
    const overrides = rawOverrides
      ? {
          ...(rawOverrides.total_cost !== undefined
            ? { totalCost: Number(rawOverrides.total_cost) }
            : {}),
          ...(rawOverrides.total_weight_grams !== undefined
            ? { totalWeightGrams: Number(rawOverrides.total_weight_grams) }
            : {}),
          ...(rawOverrides.delivery_cost !== undefined
            ? { deliveryCost: Number(rawOverrides.delivery_cost) }
            : {}),
          ...(typeof rawOverrides.supplier === "string"
            ? { supplier: rawOverrides.supplier.trim() || undefined }
            : {}),
        }
      : undefined;
    if (overrides?.totalCost !== undefined && (!Number.isFinite(overrides.totalCost) || overrides.totalCost <= 0)) {
      return NextResponse.json({ error: "total_cost must be greater than 0" }, { status: 400 });
    }
    if (overrides?.totalWeightGrams !== undefined && (!Number.isFinite(overrides.totalWeightGrams) || overrides.totalWeightGrams < 0.01)) {
      return NextResponse.json({ error: "total_weight_grams must be at least 0.01" }, { status: 400 });
    }
    if (overrides?.deliveryCost !== undefined && (!Number.isFinite(overrides.deliveryCost) || overrides.deliveryCost < 0)) {
      return NextResponse.json({ error: "delivery_cost cannot be negative" }, { status: 400 });
    }

    await decideInventoryIntake({
      businessId,
      intakeId,
      actorUserId: userId,
      action,
      rejectionReason:
        typeof body.rejection_reason === "string" ? body.rejection_reason.trim() || undefined : undefined,
      overrides,
    });

    return NextResponse.json({
      success: true,
      message: action === "approve" ? "Intake approved and processed" : "Intake rejected",
    });
  } catch (error) {
    console.error("Approve Intake API Error:", error);
    if (error instanceof InventoryIntakeError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }
    return NextResponse.json({ error: "Failed to process intake decision" }, { status: 500 });
  }
}
