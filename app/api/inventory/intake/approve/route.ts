import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

interface ApproveIntakeRequest {
  intake_id: string;
  action: "approve" | "reject";
  rejection_reason?: string;
}

export async function POST(request: NextRequest) {
  try {
    const body: ApproveIntakeRequest = await request.json();
    const { intake_id, action, rejection_reason } = body;

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

    const supabase = await createClient();

    // Get current user
    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();

    if (userError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Get intake record
    const { data: intake, error: intakeError } = await supabase
      .from("inventory_intakes")
      .select("*")
      .eq("id", intake_id)
      .single();

    if (intakeError || !intake) {
      return NextResponse.json({ error: "Intake not found" }, { status: 404 });
    }

    // Check if user is a manager for this business
    const { data: isManagerData, error: managerError } = await supabase.rpc(
      "is_manager",
      {
        user_id: user.id,
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
          approved_by: user.id,
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
    const { error: updateError } = await supabase
      .from("inventory_intakes")
      .update({
        status: "approved",
        approved_by: user.id,
        approved_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .eq("id", intake_id);

    if (updateError) {
      return NextResponse.json(
        { error: "Failed to approve intake" },
        { status: 500 }
      );
    }

    // Process the intake
    await processApprovedIntake(supabase, intake, user.id);

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

  // Update inventory quantity and unit cost
  const { error: updateError } = await supabase.rpc(
    "update_inventory_on_intake",
    {
      p_inventory_id: inventory_id,
      p_weight_grams: total_weight_grams,
      p_cost_per_gram: calculated_cost_per_gram,
    }
  );

  if (updateError) {
    // Fallback to direct update if RPC doesn't exist
    const { error: directUpdateError } = await supabase
      .from("inventory")
      .update({
        quantity_on_hand: supabase.raw(
          `quantity_on_hand + ${total_weight_grams}`
        ),
        unit_cost: calculated_cost_per_gram,
        updated_at: new Date().toISOString(),
      })
      .eq("id", inventory_id);

    if (directUpdateError) {
      throw new Error(
        `Failed to update inventory: ${directUpdateError.message}`
      );
    }
  }

  // Create cost history entry
  await supabase.from("cost_history").insert({
    business_id,
    inventory_id,
    intake_id,
    cost_per_gram: calculated_cost_per_gram,
    total_cost,
    total_weight_grams,
    delivery_cost,
    supplier,
  });

  // Create inventory log entries
  await supabase.from("inventory_log").insert({
    inventory_id,
    transaction_type: "intake",
    quantity_change: total_weight_grams,
    reason: supplier
      ? `Intake from ${supplier} (approved)`
      : "Manual intake (approved)",
    created_by: user_id,
    metadata: {
      intake_id,
      total_cost,
      cost_per_gram: calculated_cost_per_gram,
    },
  });

  if (delivery_cost > 0) {
    await supabase.from("inventory_log").insert({
      inventory_id,
      transaction_type: "delivery_cost",
      quantity_change: 0,
      reason: "Delivery cost for approved intake",
      created_by: user_id,
      metadata: {
        intake_id,
        delivery_cost,
        supplier,
      },
    });
  }
}
