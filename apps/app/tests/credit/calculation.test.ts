import { expect, it } from "vitest";
import { applyRuleBasedFallback, clampAndValidateResult, normalizeFeatures, validateProviderResponse, type CustomerFeatures, type NormalizedFeatures } from "../../lib/credit/aiEngine/calculation";
const config = { global_max_credit_per_customer: 10000, global_max_credit_ratio_of_inventory: 0.5, default_credit_limit_for_new_customer: 1000 };
const raw: CustomerFeatures = { customer_id: "synthetic", sales_30d: 1000, sales_90d: 2000, sales_all_time: 5000, credit_issued_30d: 100, credit_issued_90d: 200, credit_issued_all_time: 500, credit_repaid_all_time: 300, completed_transactions: 10, late_payment_count: 0, days_since_first_transaction: 182.5, current_credit_balance: 200, average_ticket_size: 2500, purchase_frequency_per_week: 12, on_time_repayment_ratio: 0.95, credit_utilization_ratio: 2, total_inventory_value: 500, inventory_velocity_7d: 7, inventory_restock_cost_ratio: 1.2 };
const normalized: NormalizedFeatures = { customer_id: "synthetic", recency_score: 50, frequency_score: 50, monetary_score: 50, tenure_days: 90, on_time_ratio: 1, late_payment_count: 0, credit_issued_30d: 100, inventory_coverage_ratio: 1, inventory_turnover: 50 };
it("retains tenure-derived recency and normalization saturation without mutating source", () => {
  const input = Object.freeze({ ...raw });
  expect(normalizeFeatures(input)).toEqual({ customer_id: "synthetic", recency_score: 50, frequency_score: 100, monetary_score: 50, tenure_days: 182.5, on_time_ratio: 0.95, late_payment_count: 0, credit_issued_30d: 100, inventory_coverage_ratio: 0.5, inventory_turnover: 70 });
  expect(normalizeFeatures({ ...raw, days_since_first_transaction: 0 }).recency_score).toBe(100);
  expect(normalizeFeatures({ ...raw, days_since_first_transaction: 365 }).recency_score).toBe(0);
  expect(normalizeFeatures({ ...raw, total_inventory_value: 0 }).inventory_coverage_ratio).toBe(0);
});
it.each([[29, 1000, 70], [30, 1500, 60], [89, 1500, 60], [90, 360, 20]])("preserves tenure boundary %s", (tenure, amount, risk) => {
  const result = applyRuleBasedFallback({ ...normalized, tenure_days: tenure }, 999, 100000, config, 500);
  expect(result.recommended_limit_final).toBe(amount); expect(result.risk_score_final).toBe(risk); expect(result.used_ai).toBe(false); expect(result.fallback_reason).toBe("Using rule-based fallback");
});
it.each([[0.95, 0, 360, 20], [0.95, 1, 300, 45], [0.8, 0, 300, 45], [0.5, 0, 210, 70], [0.49, 0, 90, 90]])("retains repayment proxy thresholds %s with %s late events", (ratio, late, amount, risk) => {
  const result = applyRuleBasedFallback({ ...normalized, on_time_ratio: ratio, late_payment_count: late }, 0, 100000, config, 500);
  expect(result.recommended_limit_final).toBe(amount); expect(result.risk_score_final).toBe(risk);
});
it("applies inventory and global caps while preserving legacy suggested-range semantics", () => {
  const result = applyRuleBasedFallback({ ...normalized, credit_issued_30d: 10000 }, 0, 1000, config, 1000);
  expect(result.recommended_limit_final).toBe(500); expect(result.suggested_range_min).toBe(400); expect(result.suggested_range_max).toBe(650);
  expect(applyRuleBasedFallback({ ...normalized, credit_issued_30d: 10000 }, 0, 100000, config, 1000).recommended_limit_final).toBe(10000);
});
it("preserves zero as a recommendation amount without enabling unlimited credit or defaulting risk", () => {
  const zero = applyRuleBasedFallback(normalized, 100, 0, config, 1000);
  expect(zero).toMatchObject({ recommended_limit_final: 0, suggested_range_min: 0, suggested_range_max: 0, used_ai: false });
  expect(zero).not.toHaveProperty("creditEnabled"); expect(zero).not.toHaveProperty("unlimited");
  expect(clampAndValidateResult({ recommended_limit: 0, suggested_range_min: 0, suggested_range_max: 0, risk_score: 0, justification: "Zero recommendation" }, config, 1000).risk_score).toBe(0);
});
it("clamps valid provider output without coercion, defaults, side effects or extra fields", () => {
  const input = Object.freeze({ recommended_limit: 2000, suggested_range_min: 100, suggested_range_max: 20000, risk_score: 37.5, justification: "Synthetic result", extra: "ignored" });
  expect(clampAndValidateResult(input, config, 1000)).toEqual({ recommended_limit: 500, suggested_range_min: 100, suggested_range_max: 10000, risk_score: 37.5, justification: "Synthetic result" });
  expect(input.recommended_limit).toBe(2000);
});
it.each([NaN, Infinity, -1, undefined, "100"])("rejects invalid provider numeric values %s", value => {
  expect(() => validateProviderResponse({ recommended_limit: value, suggested_range_min: 0, suggested_range_max: 100, risk_score: 50, justification: "Synthetic" })).toThrow(/INVALID_CREDIT_CALCULATION/);
});
it.each([{ risk_score: 101 }, { suggested_range_min: 200 }, { justification: "" }, { justification: "a".repeat(201) }])("rejects malformed provider structure %j", patch => {
  expect(() => clampAndValidateResult({ recommended_limit: 50, suggested_range_min: 0, suggested_range_max: 100, risk_score: 50, justification: "Synthetic", ...patch }, config, 1000)).toThrow(/INVALID_CREDIT_CALCULATION/);
});
it("rejects an inverted capped provider range instead of returning internally invalid output", () => {
  expect(() => clampAndValidateResult({ recommended_limit: 50, suggested_range_min: 40, suggested_range_max: 100, risk_score: 50, justification: "Synthetic" }, { ...config, global_max_credit_per_customer: 20 }, 1000)).toThrow(/Inverted/);
});
it.each([{ on_time_repayment_ratio: 1.1 }, { sales_90d: -1 }, { inventory_restock_cost_ratio: Infinity }, { average_ticket_size: NaN }])("rejects invalid raw features %j", patch => {
  expect(() => normalizeFeatures({ ...raw, ...patch })).toThrow(/INVALID_CREDIT_CALCULATION/);
});
it("validates normalized inputs, current balances, config ratios and inventory without fake defaults", () => {
  expect(() => applyRuleBasedFallback({ ...normalized, recency_score: 101 }, 0, 1000, config, 100)).toThrow();
  expect(() => applyRuleBasedFallback({ ...normalized, inventory_coverage_ratio: 2 }, 0, 1000, config, 100)).toThrow();
  expect(() => applyRuleBasedFallback(normalized, -1, 1000, config, 100)).toThrow();
  expect(() => applyRuleBasedFallback(normalized, 0, Infinity, config, 100)).toThrow();
  expect(() => applyRuleBasedFallback(normalized, 0, 1000, { ...config, global_max_credit_ratio_of_inventory: 1.1 }, 100)).toThrow();
});
