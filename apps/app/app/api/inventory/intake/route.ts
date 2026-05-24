import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { ensureInventoryBatchForIntake } from "@/lib/inventory/ensure-batch";

interface IntakeRequest {
  inventory_id: string;
  total_cost: number;
  total_weight_grams: number;
  delivery_cost?: number;
  supplier?: string;
}

export async function POST(request: NextRequest) {
  try {
    const body: IntakeRequest = await request.json();
    const {
      inventory_id,
      total_cost,
      total_weight_grams,
      delivery_cost = 0,
      supplier,
    } = body;

    // Validation
    if (!inventory_id) {
      return NextResponse.json(
        { error: "inventory_id is required" },
        { status: 400 }
      );
    }

    if (!total_cost || total_cost <= 0) {
      return NextResponse.json(
        { error: "total_cost must be greater than 0" },
        { status: 400 }
      );
    }

    if (!total_weight_grams || total_weight_grams < 0.01) {
      return NextResponse.json(
        { error: "total_weight_grams must be at least 0.01" },
        { status: 400 }
      );
    }

    if (delivery_cost < 0) {
      return NextResponse.json(
        { error: "delivery_cost cannot be negative" },
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

    // Get inventory item to verify access and get business_id
    const { data: inventoryItem, error: inventoryError } = await supabase
      .from("inventory")
      .select("id, business_id, product_name, unit_cost")
      .eq("id", inventory_id)
      .single();

    if (inventoryError || !inventoryItem) {
      return NextResponse.json(
        { error: "Inventory item not found" },
        { status: 404 }
      );
    }

    const business_id = inventoryItem.business_id;

    // Calculate cost per gram
    const calculated_cost_per_gram = total_cost / total_weight_grams;

    // Get historical average cost to check for unusual values
    let avg_cost = 0;
    try {
      const { data: avgCostData, error: rpcError } = await supabase.rpc(
        "get_avg_cost_per_gram",
        {
          p_inventory_id: inventory_id,
          p_days: 90,
        }
      );

      if (!rpcError && avgCostData !== null) {
        avg_cost = Number(avgCostData);
      }
    } catch (err) {
      console.warn("Failed to fetch historical cost:", err);
    }

    let requires_approval = false; // Default to auto-approve
    let status = "pending";

    // Check if cost deviates more than 50% from historical average
    // Only check if we have history (avg_cost > 0)
    if (avg_cost > 0) {
      const deviation = Math.abs(
        (calculated_cost_per_gram - avg_cost) / avg_cost
      );

      // If deviation is > 50%, require approval
      if (deviation > 0.5) {
        requires_approval = true;
        status = "pending";
      }
    }

    const { data: intake, error: intakeError } = await supabase
      .from("inventory_intakes")
      .insert({
        business_id,
        inventory_id,
        total_cost,
        total_weight_grams,
        calculated_cost_per_gram,
        delivery_cost,
        supplier,
        requires_approval,
        status,
        created_by: user.id,
      })
      .select()
      .single();

    if (intakeError) {
      console.error(
        "Failed to create intake - Details:",
        JSON.stringify(intakeError, null, 2)
      );
      return NextResponse.json(
        { error: "Failed to create intake record" },
        { status: 500 }
      );
    }

    // If auto-approved, process immediately then mark approved.
    if (!requires_approval) {
      await processIntake(supabase, intake.id, inventory_id, business_id, {
        total_cost,
        total_weight_grams,
        calculated_cost_per_gram,
        delivery_cost,
        supplier,
        user_id: user.id,
      });

      const { error: approveError } = await supabase
        .from("inventory_intakes")
        .update({
          status: "approved",
          approved_by: user.id,
          approved_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        })
        .eq("id", intake.id);

      if (approveError) {
        return NextResponse.json(
          { error: "Failed to finalize intake approval" },
          { status: 500 },
        );
      }
    }

    return NextResponse.json({
      success: true,
      intake,
      requires_approval,
      message: requires_approval
        ? "Intake submitted for manager approval due to unusual cost"
        : "Inventory successfully updated and approved",
    });
  } catch (error) {
    console.error("Intake API Error:", error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}

// Helper function to process intake
async function processIntake(
  supabase: any,
  intake_id: string,
  inventory_id: string,
  business_id: string,
  data: {
    total_cost: number;
    total_weight_grams: number;
    calculated_cost_per_gram: number;
    delivery_cost: number;
    supplier?: string;
    user_id: string;
  }
) {
  const {
    total_cost,
    total_weight_grams,
    calculated_cost_per_gram,
    delivery_cost,
    supplier,
    user_id,
  } = data;

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
    // Get current inventory quantity first
    const { data: currentInventory } = await supabase
      .from("inventory")
      .select("quantity_on_hand")
      .eq("id", inventory_id)
      .single();

    const newQuantity =
      (currentInventory?.quantity_on_hand || 0) + total_weight_grams;

    // Update inventory quantity and unit cost
    const { error: updateError } = await supabase
      .from("inventory")
      .update({
        quantity_on_hand: newQuantity,
        unit_cost: calculated_cost_per_gram,
        updated_at: nowIso,
      })
      .eq("id", inventory_id);

    if (updateError) {
      throw new Error(`Failed to update inventory: ${updateError.message}`);
    }

    // Create cost history entry; this is now required for auditability.
    const { error: costHistoryError } = await supabase
      .from("cost_history")
      .insert({
        business_id,
        inventory_id,
        intake_id,
        cost_per_gram: calculated_cost_per_gram,
        total_cost,
        total_weight_grams,
        delivery_cost,
        supplier,
      });

    if (costHistoryError) {
      throw new Error(`Failed to create cost history: ${costHistoryError.message}`);
    }
  } catch (error) {
    // Best-effort compensation only for batches created in this request.
    if (createdNow) {
      await supabase
        .from("inventory_batches")
        .delete()
        .eq("id", ensuredBatchId)
        .eq("intake_id", intake_id);
    }
    throw error;
  }

  // Create inventory log entry for product intake
  const { error: logError } = await supabase.from("inventory_log").insert({
    inventory_id,
    transaction_type: "intake",
    quantity_change: total_weight_grams,
    reason: supplier ? `Intake from ${supplier}` : "Manual intake",
    created_by: user_id,
    metadata: {
      intake_id,
      total_cost,
      cost_per_gram: calculated_cost_per_gram,
    },
  });

  if (logError) {
    throw new Error(`Failed to create inventory log: ${logError.message}`);
  }

  // Create separate log entry for delivery cost if provided
  if (delivery_cost > 0) {
    const { error: deliveryLogError } = await supabase
      .from("inventory_log")
      .insert({
        inventory_id,
        transaction_type: "delivery_cost",
        quantity_change: 0,
        reason: `Delivery cost for intake`,
        created_by: user_id,
        metadata: {
          intake_id,
          delivery_cost,
          supplier,
        },
      });

    if (deliveryLogError) {
      throw new Error(`Failed to create delivery cost log: ${deliveryLogError.message}`);
    }
  }
}
