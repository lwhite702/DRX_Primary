import { NextResponse } from "next/server";
import {
  computeTrustScore,
  evaluateFrontApproval,
  evaluateFrontApprovalWithAI,
  getCustomerBehaviorMetrics,
  recommendCreditLimit,
} from "@/lib/credit/intelligenceEngine";
import { api } from "@/convex/_generated/api";
import { businessClient } from "@/lib/business/convex-server";

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



    const { client, expectedUserId } = await businessClient();
    const [metrics, customerDetails, products] = await Promise.all([
      getCustomerBehaviorMetrics(customer_id, business_id),
      client.query(api.customers.getOperational, { businessId: business_id, expectedUserId, customerId: customer_id }),
      client.query(api.products.listProducts, {}),
    ]);
    if (!metrics) {
      return NextResponse.json(
        { error: "Could not load customer behavior" },
        { status: 404 }
      );
    }

    const trust = computeTrustScore(metrics);

    const current_limit = Number(customerDetails.customer?.creditLimitCents || 0) / 100;

    const recommendation = recommendCreditLimit(trust, metrics, current_limit);

    const inventory = products.find((product) => product._id === inventory_id || product.legacyPrismaId === inventory_id);
    if (!inventory) return NextResponse.json({ error: "Inventory item unavailable" }, { status: 404 });

    const quantity = Number(inventory.quantityOnHandGrams || 0);
    const threshold = Number(inventory.reorderLevelGrams || 10);

    const scarcity_level =
      quantity <= threshold * 0.5 ? "HIGH" : quantity <= threshold * 1.2 ? "MEDIUM" : "LOW";

    const decision = await evaluateFrontApprovalWithAI({
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
    console.error("Failed to evaluate front approval:", error);
    return NextResponse.json(
      {
        error: "Failed to evaluate front approval",
      },
      { status: 500 }
    );
  }
}
