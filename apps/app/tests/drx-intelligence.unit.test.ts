import { describe, expect, it } from "vitest";
import {
  computeTrustScore,
  evaluateFrontApproval,
  recommendCreditLimit,
} from "../lib/credit/intelligenceEngine";

describe("DRX Intelligence engine", () => {
  it("computes high trust for strong repayment behavior", () => {
    const trust = computeTrustScore({
      payments_on_time_ratio: 0.98,
      avg_repayment_days: 2,
      unpaid_front_count: 0,
      forgiven_balance_total: 0,
      purchase_frequency_30d: 8,
      customer_lifetime_days: 240,
      avg_transaction_size: 120,
      open_balance: 40,
      days_since_last_payment: 3,
    });

    expect(trust.score).toBeGreaterThanOrEqual(75);
    expect(trust.risk_flags.length).toBe(0);
  });

  it("recommends conservative limit and deny when risk is high and stock is low", () => {
    const trust = computeTrustScore({
      payments_on_time_ratio: 0.3,
      avg_repayment_days: 35,
      unpaid_front_count: 4,
      forgiven_balance_total: 900,
      purchase_frequency_30d: 1,
      customer_lifetime_days: 20,
      avg_transaction_size: 80,
      open_balance: 600,
      days_since_last_payment: 45,
    });

    const limit = recommendCreditLimit(trust, {
      payments_on_time_ratio: 0.3,
      avg_repayment_days: 35,
      unpaid_front_count: 4,
      forgiven_balance_total: 900,
      purchase_frequency_30d: 1,
      customer_lifetime_days: 20,
      avg_transaction_size: 80,
      open_balance: 600,
      days_since_last_payment: 45,
    }, 200);

    const decision = evaluateFrontApproval({
      trust_score: trust.score,
      current_balance: 180,
      credit_limit: 200,
      requested_amount: 80,
      days_since_last_payment: 45,
      inventory: {
        inventory_id: "inv-1",
        quantity_on_hand: 2,
        reorder_threshold: 10,
        scarcity_level: "HIGH",
      },
    });

    expect(limit.recommended_limit).toBeLessThanOrEqual(limit.hard_cap_limit);
    expect(decision.suggestion).toBe("DENY");
    expect(decision.risk_flags).toContain("LOW_STOCK");
  });
});
