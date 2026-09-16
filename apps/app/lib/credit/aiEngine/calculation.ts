/**
 * Pure legacy credit heuristics; amounts are dollars, not ledger cents.
 * Recency uses customer tenure. The supplied on-time ratio is historically
 * max(0, (issued - lateCount * 100) / issued), or 1 without eligible history;
 * it does not measure actual repayment timing. Extraction does not endorse it.
 * Suggested ranges retain legacy caps (global maximum only), so can exceed
 * the inventory cap. A zero recommendation is an amount, never permission to
 * enable unlimited credit. No policy, persistence or provider calls occur here.
 */
export interface CustomerFeatures {
  customer_id: string;
  sales_30d: number;
  sales_90d: number;
  sales_all_time: number;
  credit_issued_30d: number;
  credit_issued_90d: number;
  credit_issued_all_time: number;
  credit_repaid_all_time: number;
  completed_transactions: number;
  late_payment_count: number;
  days_since_first_transaction: number;
  current_credit_balance: number;
  average_ticket_size: number;
  purchase_frequency_per_week: number;
  on_time_repayment_ratio: number;
  credit_utilization_ratio: number;
  total_inventory_value: number;
  inventory_velocity_7d: number;
  inventory_restock_cost_ratio: number;
}

export interface NormalizedFeatures {
  customer_id: string;
  recency_score: number; // Legacy score derived from tenure, not last activity
  frequency_score: number; // 0-100: how often they transact
  monetary_score: number; // 0-100: average transaction size
  tenure_days: number; // days since first transaction
  on_time_ratio: number; // Legacy repayment proxy, not measured payment timeliness
  late_payment_count: number;
  credit_issued_30d: number;
  inventory_coverage_ratio: number; // 0-1: available inventory / credit requested
  inventory_turnover: number; // 0-100 normalized
}

export interface AILimitRecommendation {
  recommended_limit_final: number;
  risk_score_final: number;
  justification_final: string;
  suggested_range_min: number;
  suggested_range_max: number;
  used_ai: boolean;
  fallback_reason?: string;
}

export interface AIEngineConfig {
  global_max_credit_per_customer: number;
  global_max_credit_ratio_of_inventory: number;
  default_credit_limit_for_new_customer: number;
}

export interface AIEngineResponse {
  recommended_limit: number;
  suggested_range_min: number;
  suggested_range_max: number;
  risk_score: number;
  justification: string;
}


function nonnegative(value: number) {
  if (typeof value !== "number" || !Number.isFinite(value) || value < 0) throw new Error("INVALID_CREDIT_CALCULATION: Expected finite nonnegative number");
}
function bounded(value: number, max: number) { nonnegative(value); if (value > max) throw new Error("INVALID_CREDIT_CALCULATION: Value outside permitted range"); }
function customerId(value: string) { if (typeof value !== "string" || !value.trim()) throw new Error("INVALID_CREDIT_CALCULATION: Customer identity required"); }
function validateCustomerFeatures(features: CustomerFeatures) {
  customerId(features.customer_id);
  const fields = ["sales_30d", "sales_90d", "sales_all_time", "credit_issued_30d", "credit_issued_90d", "credit_issued_all_time", "credit_repaid_all_time", "completed_transactions", "late_payment_count", "days_since_first_transaction", "current_credit_balance", "average_ticket_size", "purchase_frequency_per_week", "on_time_repayment_ratio", "credit_utilization_ratio", "total_inventory_value", "inventory_velocity_7d", "inventory_restock_cost_ratio"] as const;
  for (const field of fields) nonnegative(features[field]);
  bounded(features.on_time_repayment_ratio, 1);
}
function validateNormalizedFeatures(features: NormalizedFeatures) {
  customerId(features.customer_id);
  for (const field of ["recency_score", "frequency_score", "monetary_score", "inventory_turnover"] as const) bounded(features[field], 100);
  for (const field of ["tenure_days", "late_payment_count", "credit_issued_30d"] as const) nonnegative(features[field]);
  bounded(features.on_time_ratio, 1); bounded(features.inventory_coverage_ratio, 1);
}
function validateConfig(config: AIEngineConfig) {
  nonnegative(config.global_max_credit_per_customer); nonnegative(config.default_credit_limit_for_new_customer);
  bounded(config.global_max_credit_ratio_of_inventory, 1);
}
export function validateProviderResponse(value: unknown): AIEngineResponse {
  if (!value || typeof value !== "object" || Array.isArray(value)) throw new Error("INVALID_CREDIT_CALCULATION: Invalid provider response");
  const row = value as Record<string, unknown>;
  for (const field of ["recommended_limit", "suggested_range_min", "suggested_range_max", "risk_score"] as const) nonnegative(row[field] as number);
  bounded(row.risk_score as number, 100);
  if (typeof row.justification !== "string" || !row.justification.trim() || row.justification.length > 200 || (row.suggested_range_min as number) > (row.suggested_range_max as number)) throw new Error("INVALID_CREDIT_CALCULATION: Invalid provider response");
  return { recommended_limit: row.recommended_limit as number, suggested_range_min: row.suggested_range_min as number, suggested_range_max: row.suggested_range_max as number, risk_score: row.risk_score as number, justification: row.justification };
}

export function normalizeFeatures(
  features: CustomerFeatures
): NormalizedFeatures {
  validateCustomerFeatures(features);
  // Preserved legacy heuristic: tenure is used as a recency proxy.
  const days_since_transaction = features.days_since_first_transaction;
  const recency_score = Math.max(
    0,
    100 * (1 - Math.min(days_since_transaction / 365, 1))
  );

  // Frequency: transactions per week (normalize 0-10 per week to 0-100)
  const frequency_score = Math.min(
    100,
    features.purchase_frequency_per_week * 10
  );

  // Monetary: average ticket size (normalize $0-$5000 to 0-100)
  const monetary_score = Math.min(
    100,
    (features.average_ticket_size / 5000) * 100
  );

  // Inventory coverage: can business support this customer's credit?
  const inventory_coverage_ratio =
    features.total_inventory_value > 0
      ? Math.min(
          1,
          features.total_inventory_value / Math.max(1, features.sales_30d)
        )
      : 0;

  // Inventory turnover normalized to 0-100
  const inventory_turnover = Math.min(100, features.inventory_velocity_7d * 10);

  return {
    customer_id: features.customer_id,
    recency_score,
    frequency_score,
    monetary_score,
    tenure_days: features.days_since_first_transaction,
    on_time_ratio: features.on_time_repayment_ratio,
    late_payment_count: features.late_payment_count,
    credit_issued_30d: features.credit_issued_30d,
    inventory_coverage_ratio,
    inventory_turnover,
  };
}

export function applyRuleBasedFallback(
  features: NormalizedFeatures,
  current_balance: number,
  total_inventory_value: number,
  config: AIEngineConfig,
  current_limit: number
): AILimitRecommendation {
  validateNormalizedFeatures(features);
  validateConfig(config);
  nonnegative(current_balance); nonnegative(total_inventory_value); nonnegative(current_limit);
  nonnegative(total_inventory_value * config.global_max_credit_ratio_of_inventory);
  let recommended_limit = config.default_credit_limit_for_new_customer;
  let risk_score = 50; // Medium risk by default

  // For new customers with very little history
  if (features.tenure_days < 30) {
    recommended_limit = Math.min(
      config.default_credit_limit_for_new_customer,
      config.global_max_credit_per_customer * 0.3
    );
    risk_score = 70;
  } else if (features.tenure_days < 90) {
    // Early stage customers
    recommended_limit = Math.min(
      config.default_credit_limit_for_new_customer * 1.5,
      config.global_max_credit_per_customer * 0.5
    );
    risk_score = 60;
  } else {
    // Established customers
    // Use historical sales as a base
    const sales_based_limit = Math.min(
      features.credit_issued_30d * 3, // 3x monthly average
      config.global_max_credit_per_customer
    );

    // Consider repayment behavior
    if (features.on_time_ratio >= 0.95 && features.late_payment_count === 0) {
      recommended_limit = sales_based_limit * 1.2;
      risk_score = 20;
    } else if (features.on_time_ratio >= 0.8) {
      recommended_limit = sales_based_limit;
      risk_score = 45;
    } else if (features.on_time_ratio >= 0.5) {
      recommended_limit = sales_based_limit * 0.7;
      risk_score = 70;
    } else {
      recommended_limit = sales_based_limit * 0.3;
      risk_score = 90;
    }
  }

  // Apply hard cap based on inventory
  const inventory_based_cap =
    total_inventory_value * config.global_max_credit_ratio_of_inventory;
  recommended_limit = Math.min(recommended_limit, inventory_based_cap);

  // Apply global maximum cap
  recommended_limit = Math.min(
    recommended_limit,
    config.global_max_credit_per_customer
  );

  // Never return negative
  recommended_limit = Math.max(recommended_limit, 0);

  const suggested_range_min = Math.max(0, recommended_limit * 0.8);
  const suggested_range_max = Math.min(
    config.global_max_credit_per_customer,
    recommended_limit * 1.3
  );

  const justification = buildFallbackJustification(
    features,
    recommended_limit,
    current_limit
  );

  return {
    recommended_limit_final: recommended_limit,
    risk_score_final: Math.min(100, Math.max(0, risk_score)),
    justification_final: justification,
    suggested_range_min,
    suggested_range_max,
    used_ai: false,
    fallback_reason: "Using rule-based fallback",
  };
}

function buildFallbackJustification(
  features: NormalizedFeatures,
  recommended_limit: number,
  current_limit: number
): string {
  const parts: string[] = [];

  if (features.tenure_days < 30) {
    parts.push("New customer - conservative limit recommended");
  } else if (features.on_time_ratio >= 0.95) {
    parts.push("Excellent payment history");
  } else if (features.on_time_ratio < 0.5) {
    parts.push("Recent late payments - caution advised");
  }

  if (recommended_limit > current_limit) {
    parts.push(`Strong sales performance suggests room to increase`);
  } else if (recommended_limit < current_limit) {
    parts.push(`Recent activity suggests lower limit is prudent`);
  }

  return parts.join(". ") || "Limit based on customer profile and history";
}

export function clampAndValidateResult(
  recommendation: unknown,
  config: AIEngineConfig,
  total_inventory_value: number
): AIEngineResponse {
  validateConfig(config); nonnegative(total_inventory_value);
  const parsed = validateProviderResponse(recommendation);
  const inventory_cap =
    total_inventory_value * config.global_max_credit_ratio_of_inventory;

  nonnegative(inventory_cap);
  const result = {
    ...parsed,
    recommended_limit: Math.min(
      Math.max(parsed.recommended_limit, 0),
      Math.min(config.global_max_credit_per_customer, inventory_cap)
    ),
    suggested_range_min: Math.max(parsed.suggested_range_min, 0),
    suggested_range_max: Math.min(
      parsed.suggested_range_max,
      config.global_max_credit_per_customer
    ),
    risk_score: Math.min(100, Math.max(0, parsed.risk_score)),
  };
  if (result.suggested_range_min > result.suggested_range_max) throw new Error("INVALID_CREDIT_CALCULATION: Inverted capped range");
  return result;
}

