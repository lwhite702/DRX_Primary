import { NextResponse } from "next/server";
import {
  computeTrustScore,
  evaluateFrontApproval,
  getCustomerBehaviorMetrics,
  recommendCreditLimit,
} from "@/lib/credit/intelligenceEngine";
import { db } from "@/lib/db";

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



    const metrics = await getCustomerBehaviorMetrics(customer_id, business_id);
    if (!metrics) {
      return NextResponse.json(
        { error: "Could not load customer behavior" },
        { status: 404 }
      );
    }

    const trust = computeTrustScore(metrics);

    const limitRecord = await db.creditLimit.findFirst({
      where: { customerId: customer_id, businessId: business_id },
      select: { maxCreditLimit: true },
    });

    const current_limit = Number(limitRecord?.maxCreditLimit || 0);

    const recommendation = recommendCreditLimit(trust, metrics, current_limit);

    const inventory = await db.inventory.findFirst({
      where: { id: inventory_id, businessId: business_id },
      select: { quantityOnHand: true, reorderLevel: true },
    });

    const quantity = Number(inventory?.quantityOnHand || 0);
    const threshold = Number(inventory?.reorderLevel || 10);

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
