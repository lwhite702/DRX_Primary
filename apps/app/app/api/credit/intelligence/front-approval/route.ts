import { NextResponse } from "next/server";
import {
  computeTrustScore,
  evaluateFrontApproval,
  getCustomerBehaviorMetrics,
  recommendCreditLimit,
} from "@/lib/credit/intelligenceEngine";
import { getSupabaseClient } from "@/lib/supabase/client";

export async function POST(request: Request) {
  try {
    const { customer_id, business_id, inventory_id, amount_being_fronted } =
      await request.json();

    if (!customer_id || !business_id || !inventory_id || !amount_being_fronted) {
      return NextResponse.json(
        { error: "Missing required fields" },
        { status: 400 }
      );
    }

    const supabase = getSupabaseClient();
    if (!supabase) {
      return NextResponse.json(
        { error: "Supabase client not available" },
        { status: 500 }
      );
    }

    const metrics = await getCustomerBehaviorMetrics(customer_id, business_id);
    if (!metrics) {
      return NextResponse.json(
        { error: "Could not load customer behavior" },
        { status: 404 }
      );
    }

    const trust = computeTrustScore(metrics);

    const { data: customer } = await supabase
      .from("customers")
      .select("credit_limit")
      .eq("id", customer_id)
      .single();

    const current_limit = Number(customer?.credit_limit || 0);

    const recommendation = recommendCreditLimit(trust, metrics, current_limit);

    const { data: inventory } = await supabase
      .from("inventory")
      .select("quantity_on_hand, reorder_point")
      .eq("id", inventory_id)
      .eq("business_id", business_id)
      .single();

    const quantity = Number(inventory?.quantity_on_hand || 0);
    const threshold = Number(inventory?.reorder_point || 10);

    const scarcity_level =
      quantity <= threshold * 0.5 ? "HIGH" : quantity <= threshold * 1.2 ? "MEDIUM" : "LOW";

    const decision = evaluateFrontApproval({
      trust_score: trust.score,
      current_balance: metrics.open_balance,
      credit_limit: current_limit,
      requested_amount: Number(amount_being_fronted),
      days_since_last_payment: metrics.days_since_last_payment,
      inventory: {
        inventory_id,
        quantity_on_hand: quantity,
        reorder_threshold: threshold,
        scarcity_level,
      },
    });

    return NextResponse.json({
      trust_score: trust,
      recommended_credit_limit: recommendation,
      front_approval: decision,
      generated_at: new Date().toISOString(),
    });
  } catch (error) {
    return NextResponse.json(
      {
        error: "Failed to evaluate front approval",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}
