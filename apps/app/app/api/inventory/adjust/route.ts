import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

interface AdjustmentRequest {
  inventory_id: string;
  type: "set" | "delta";
  value: number;
  reason: string;
}

export async function POST(request: NextRequest) {
  try {
    const body: AdjustmentRequest = await request.json();
    const { inventory_id, type, value, reason } = body;

    if (!inventory_id) {
      return NextResponse.json(
        { error: "inventory_id is required" },
        { status: 400 },
      );
    }
    if (typeof value !== "number") {
      return NextResponse.json(
        { error: "value must be a number" },
        { status: 400 },
      );
    }
    if (!reason) {
      return NextResponse.json(
        { error: "reason is required" },
        { status: 400 },
      );
    }

    const supabase = await createClient();

    // Auth check
    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();
    if (userError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Role check (optional but recommended: verify user has inventory.adjust permission)
    // For now, assuming authenticated user in valid business context is sufficient or RLS handles it.
    // Ideally, we'd check permissions here.

    // Get current inventory
    const { data: item, error: fetchError } = await supabase
      .from("inventory")
      .select("quantity_on_hand, business_id")
      .eq("id", inventory_id)
      .single();

    if (fetchError || !item) {
      return NextResponse.json(
        { error: "Inventory item not found" },
        { status: 404 },
      );
    }

    let newQuantity = 0;
    let delta = 0;

    if (type === "set") {
      newQuantity = value;
      delta = newQuantity - item.quantity_on_hand;
    } else {
      delta = value;
      newQuantity = item.quantity_on_hand + delta;
    }

    if (newQuantity < 0) {
      // Optional: Block negative inventory? PRD says "Out-of-stock warning if negative... blocks action; manager override possible"
      // We'll enforce non-negative for now unless it's a specific "override" flag (not yet in PRD detail but implied).
      return NextResponse.json(
        { error: `Adjustment would result in negative stock (${newQuantity})` },
        { status: 400 },
      );
    }

    // Update Inventory
    const { error: updateError } = await supabase
      .from("inventory")
      .update({
        quantity_on_hand: newQuantity,
        updated_at: new Date().toISOString(),
      })
      .eq("id", inventory_id);

    if (updateError) {
      return NextResponse.json(
        { error: "Failed to update inventory" },
        { status: 500 },
      );
    }

    // Log Transaction
    const { error: logError } = await supabase.from("inventory_log").insert({
      inventory_id,
      business_id: item.business_id, // Ensure log has business_id if schema requires, or RLS relies on join
      transaction_type: "adjustment",
      quantity_change: delta,
      reason,
      created_by: user.id,
      metadata: {
        type,
        original_value: item.quantity_on_hand,
        new_value: newQuantity,
      },
    });

    if (logError) {
      // Non-critical, but bad for audit.
      console.error("Failed to log adjustment:", logError);
    }

    return NextResponse.json({
      success: true,
      new_quantity: newQuantity,
      delta,
    });
  } catch (error) {
    console.error("Adjustment API Error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Unknown error" },
      { status: 500 },
    );
  }
}
