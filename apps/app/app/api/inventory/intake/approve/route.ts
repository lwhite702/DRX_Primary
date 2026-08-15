import { NextRequest, NextResponse } from "next/server";
import { createLegacyServerDbClient as createServerDbClient } from "@/lib/data-access/server";
import { ensureInventoryBatchForIntake } from "@/lib/inventory/ensure-batch";
import { applyIntakeMutationViaRpc } from "@/lib/inventory/mutations/apply-intake";
import { resolveAuthContext } from "@/app/api/pos/_lib/server";

interface ApproveIntakeRequest {
  intake_id: string;
  action: "approve" | "reject";
  rejection_reason?: string;
  override_values?: {
    total_cost?: number;
    total_weight_grams?: number;
    delivery_cost?: number;
    supplier?: string;
  };
}

export async function POST(request: NextRequest) {
  try {
    const { userId, businessId } = await resolveAuthContext(request);
    if (!userId || !businessId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body: ApproveIntakeRequest = await request.json();
    const { intake_id, action, rejection_reason, override_values } = body;

    if (!intake_id) {
      return NextResponse.json(
        { error: "intake_id is required" },
        { status: 400 }
      );
    }

    if (!action || !["approve", "reject"].includes(action)) {
      return NextResponse.json(
        { error: "action must be 'approve' or 'reject'" },
        { status: 400 }
      );
    }

    const supabase = await createServerDbClient();

    // Get intake record
    const { data: intake, error: intakeError } = await supabase
      .from("inventory_intakes")
      .select("*")
      .eq("id", intake_id)
      .single();

    if (intakeError || !intake) {
      return NextResponse.json({ error: "Intake not found" }, { status: 404 });
    }

    if (intake.business_id !== businessId) {
      return NextResponse.json(
        { error: "Forbidden: intake belongs to a different business" },
        { status: 403 },
      );
    }

    // Check if user is a manager for this business
    const { data: isManagerData, error: managerError } = await supabase.rpc(
      "is_manager",
      {
        user_id: userId,
        business_id: intake.business_id,
      }
    );

    if (managerError || !isManagerData) {
      return NextResponse.json(
        { error: "Only managers can approve intakes" },
        { status: 403 }
      );
    }

    // Check if intake is pending
    if (intake.status !== "pending") {
      return NextResponse.json(
        { error: `Intake is already ${intake.status}` },
        { status: 400 }
      );
    }

    if (action === "reject") {
      // Reject intake
      const { error: updateError } = await supabase
        .from("inventory_intakes")
        .update({
          status: "rejected",
          approved_by: userId,
          approved_at: new Date().toISOString(),
          rejection_reason,
          updated_at: new Date().toISOString(),
        })
        .eq("id", intake_id);

      if (updateError) {
        return NextResponse.json(
          { error: "Failed to reject intake" },
          { status: 500 }
        );
      }

      return NextResponse.json({
        success: true,
        message: "Intake rejected",
      });
    }

    // Approve and process intake

    // 1. If there are overrides, update the intake record first
    if (override_values && Object.keys(override_values).length > 0) {
      // Calculate new cost per gram if cost or weight changed
      let new_cost_per_gram = intake.calculated_cost_per_gram;

      const final_cost = override_values.total_cost ?? intake.total_cost;
      const final_weight =
        override_values.total_weight_grams ?? intake.total_weight_grams;

      if (override_values.total_cost || override_values.total_weight_grams) {
        new_cost_per_gram = final_weight > 0 ? final_cost / final_weight : 0;
      }

      const { data: refreshedIntake, error: overrideError } = await supabase
        .from("inventory_intakes")
        .update({
          ...override_values,
          calculated_cost_per_gram: new_cost_per_gram,
          updated_at: new Date().toISOString(),
        })
        .eq("id", intake_id)
        .select()
        .single();

      if (overrideError) {
        return NextResponse.json(
          { error: "Failed to apply overrides: " + overrideError.message },
          { status: 500 }
        );
      }

      if (refreshedIntake) {
        // Update local object to use for processing
        Object.assign(intake, refreshedIntake);
      }
    }

    // 2. Process first; if processing fails, do not mark the intake approved.
    await processApprovedIntake(supabase, intake, userId);

    // 3. Mark approved only after successful processing.
    const { error: updateError } = await supabase
      .from("inventory_intakes")
      .update({
        status: "approved",
        approved_by: userId,
        approved_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .eq("id", intake_id);

    if (updateError) {
      return NextResponse.json(
        { error: "Failed to finalize intake approval" },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      message: "Intake approved and processed",
    });
  } catch (error) {
    console.error("Approve Intake API Error:", error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}

async function processApprovedIntake(
  supabase: any,
  intake: any,
  user_id: string
) {
  const {
    inventory_id,
    business_id,
    total_cost,
    total_weight_grams,
    calculated_cost_per_gram,
    delivery_cost,
    supplier,
    id: intake_id,
  } = intake;

  const nowIso = new Date().toISOString();
  const { batchId: ensuredBatchId, createdNow } = await ensureInventoryBatchForIntake({
    supabase,
    businessId: business_id,
    inventoryId: inventory_id,
    intakeId: intake_id,
    quantityGrams: total_weight_grams,
    unitCostPerGram: calculated_cost_per_gram,
    supplier,
    createdBy: user_id,
    receivedAtIso: nowIso,
  });

  try {
    await applyIntakeMutationViaRpc({
      supabase,
      businessId: business_id,
      inventoryId: inventory_id,
      intakeId: intake_id,
      totalCost: total_cost,
      totalWeightGrams: total_weight_grams,
      calculatedCostPerGram: calculated_cost_per_gram,
      deliveryCost: delivery_cost,
      supplier,
      userId: user_id,
      reasonSuffix: " (approved)",
    });
  } catch (error) {
    if (createdNow) {
      await supabase
        .from("inventory_batches")
        .delete()
        .eq("id", ensuredBatchId)
        .eq("intake_id", intake_id);
    }
    throw error;
  }
}
