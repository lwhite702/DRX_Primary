import { getSupabaseClient } from "@/lib/supabase/client";

export type FrontSuggestion = "APPROVE" | "CAUTION" | "DENY";

export interface TrustScoreWeights {
  payment_history: number;
  average_repayment_time: number;
  unpaid_fronts: number;
  forgiven_balances: number;
  purchase_frequency: number;
  customer_lifetime: number;
  average_transaction_size: number;
  open_balances: number;
}

export interface PaymentBehaviorMetrics {
  payments_on_time_ratio: number;
  avg_repayment_days: number;
  unpaid_front_count: number;
  forgiven_balance_total: number;
  purchase_frequency_30d: number;
  customer_lifetime_days: number;
  avg_transaction_size: number;
  open_balance: number;
  days_since_last_payment: number;
}

export interface TrustScoreBreakdown {
  score: number;
  weights: TrustScoreWeights;
  factors: Record<string, number>;
  risk_flags: string[];
  summary: string;
}

export interface CreditLimitRecommendation {
  recommended_limit: number;
  hard_cap_limit: number;
  reliability_band: "NEW" | "BUILDING" | "STABLE" | "STRONG";
  rationale: string;
  manual_override_allowed: true;
}

export interface InventoryContext {
  inventory_id: string;
  quantity_on_hand: number;
  reorder_threshold: number;
  scarcity_level: "LOW" | "MEDIUM" | "HIGH";
}

export interface FrontApprovalInput {
  trust_score: number;
  current_balance: number;
  credit_limit: number;
  requested_amount: number;
  days_since_last_payment: number;
  inventory: InventoryContext;
}

export interface FrontApprovalDecision {
  suggestion: FrontSuggestion;
  confidence: number;
  reasons: string[];
  risk_flags: string[];
  inventory_message: string;
  operator_message: string;
}

export const TRUST_SCORE_WEIGHTS: TrustScoreWeights = {
  payment_history: 0.25,
  average_repayment_time: 0.15,
  unpaid_fronts: 0.15,
  forgiven_balances: 0.1,
  purchase_frequency: 0.1,
  customer_lifetime: 0.1,
  average_transaction_size: 0.05,
  open_balances: 0.1,
};

const clamp = (value: number, min = 0, max = 100) =>
  Math.max(min, Math.min(max, value));

function normalizeRepaymentTime(avgRepaymentDays: number) {
  if (avgRepaymentDays <= 3) return 100;
  if (avgRepaymentDays <= 7) return 85;
  if (avgRepaymentDays <= 14) return 65;
  if (avgRepaymentDays <= 30) return 40;
  return 15;
}

function normalizeUnpaidFronts(unpaidFrontCount: number) {
  if (unpaidFrontCount <= 0) return 100;
  if (unpaidFrontCount === 1) return 75;
  if (unpaidFrontCount === 2) return 45;
  if (unpaidFrontCount === 3) return 20;
  return 0;
}

function normalizeForgivenBalance(forgivenBalanceTotal: number) {
  if (forgivenBalanceTotal <= 0) return 100;
  if (forgivenBalanceTotal <= 100) return 70;
  if (forgivenBalanceTotal <= 300) return 45;
  if (forgivenBalanceTotal <= 700) return 20;
  return 0;
}

function normalizePurchaseFrequency(purchaseFrequency30d: number) {
  return clamp((purchaseFrequency30d / 12) * 100);
}

function normalizeCustomerLifetime(customerLifetimeDays: number) {
  return clamp((customerLifetimeDays / 365) * 100);
}

function normalizeTransactionSize(avgTransactionSize: number) {
  return clamp((avgTransactionSize / 300) * 100);
}

function normalizeOpenBalance(openBalance: number) {
  if (openBalance <= 0) return 100;
  if (openBalance <= 50) return 90;
  if (openBalance <= 150) return 70;
  if (openBalance <= 300) return 45;
  if (openBalance <= 500) return 20;
  return 0;
}

export function computeTrustScore(
  metrics: PaymentBehaviorMetrics
): TrustScoreBreakdown {
  const factors = {
    payment_history: clamp(metrics.payments_on_time_ratio * 100),
    average_repayment_time: normalizeRepaymentTime(metrics.avg_repayment_days),
    unpaid_fronts: normalizeUnpaidFronts(metrics.unpaid_front_count),
    forgiven_balances: normalizeForgivenBalance(metrics.forgiven_balance_total),
    purchase_frequency: normalizePurchaseFrequency(metrics.purchase_frequency_30d),
    customer_lifetime: normalizeCustomerLifetime(metrics.customer_lifetime_days),
    average_transaction_size: normalizeTransactionSize(metrics.avg_transaction_size),
    open_balances: normalizeOpenBalance(metrics.open_balance),
  };

  const weightedScore = Object.entries(TRUST_SCORE_WEIGHTS).reduce(
    (sum, [k, weight]) => sum + factors[k as keyof typeof factors] * weight,
    0
  );

  const score = clamp(Math.round(weightedScore));
  const risk_flags: string[] = [];

  if (metrics.unpaid_front_count >= 2) risk_flags.push("MULTIPLE_UNPAID_FRONTS");
  if (metrics.forgiven_balance_total > 300) risk_flags.push("HIGH_FORGIVEN_BALANCE");
  if (metrics.days_since_last_payment > 21) risk_flags.push("PAYMENT_STALE");
  if (metrics.open_balance > 300) risk_flags.push("OPEN_BALANCE_HIGH");

  let summary = "Customer usually settles up.";
  if (score < 40) summary = "High risk: balance behavior is rough.";
  else if (score < 65) summary = "Mixed behavior: keep the front tight.";
  else if (score >= 80) summary = "Customer always settles up.";

  return { score, weights: TRUST_SCORE_WEIGHTS, factors, risk_flags, summary };
}

export function recommendCreditLimit(
  trust: TrustScoreBreakdown,
  metrics: PaymentBehaviorMetrics,
  currentLimit: number
): CreditLimitRecommendation {
  const baseLimit = metrics.avg_transaction_size * 2.5;
  const trustMultiplier = 0.6 + trust.score / 100;
  const reliabilityPenalty = Math.max(0.5, 1 - metrics.unpaid_front_count * 0.15);
  const paymentReliabilityBoost = 0.8 + metrics.payments_on_time_ratio * 0.4;

  const recommended = Math.round(
    baseLimit * trustMultiplier * reliabilityPenalty * paymentReliabilityBoost
  );

  const hardCap = Math.round(Math.max(currentLimit * 1.5, metrics.avg_transaction_size * 4));
  const recommended_limit = Math.max(50, Math.min(recommended, hardCap));

  let reliability_band: CreditLimitRecommendation["reliability_band"] = "NEW";
  if (trust.score >= 80) reliability_band = "STRONG";
  else if (trust.score >= 65) reliability_band = "STABLE";
  else if (trust.score >= 45) reliability_band = "BUILDING";

  const rationale =
    reliability_band === "STRONG"
      ? "Solid history. You can front a little more."
      : reliability_band === "STABLE"
        ? "Good payment behavior with normal limits."
        : reliability_band === "BUILDING"
          ? "Still proving consistency. Keep limits medium."
          : "New or risky behavior. Keep the limit conservative.";

  return {
    recommended_limit,
    hard_cap_limit: hardCap,
    reliability_band,
    rationale,
    manual_override_allowed: true,
  };
}

export function evaluateFrontApproval(input: FrontApprovalInput): FrontApprovalDecision {
  const reasons: string[] = [];
  const flags: string[] = [];

  const projectedBalance = input.current_balance + input.requested_amount;
  const utilization = input.credit_limit > 0 ? projectedBalance / input.credit_limit : 1;

  let score = 0;

  if (input.trust_score >= 80) score += 40;
  else if (input.trust_score >= 65) score += 30;
  else if (input.trust_score >= 50) score += 20;
  else score += 5;

  if (utilization <= 0.65) score += 25;
  else if (utilization <= 0.85) score += 10;
  else score -= 30;

  if (input.days_since_last_payment <= 7) score += 15;
  else if (input.days_since_last_payment <= 21) score += 5;
  else score -= 20;

  if (input.inventory.quantity_on_hand < input.inventory.reorder_threshold) {
    score -= 30;
    reasons.push("Inventory running low.");
    flags.push("LOW_STOCK");
  } else {
    reasons.push("Inventory has room for this front.");
  }

  if (input.inventory.scarcity_level === "HIGH") {
    score -= 25;
    reasons.push("This product is scarce.");
    flags.push("PRODUCT_SCARCE");
  } else if (input.inventory.scarcity_level === "LOW") {
    score += 10;
  }

  if (projectedBalance > input.credit_limit) {
    flags.push("LIMIT_EXCEEDED");
    reasons.push("Balance would go over limit.");
  }

  let suggestion: FrontSuggestion = "CAUTION";
  if (score >= 60 && projectedBalance <= input.credit_limit) suggestion = "APPROVE";
  if (score < 30 || projectedBalance > input.credit_limit * 1.1) suggestion = "DENY";

  const operator_message =
    suggestion === "APPROVE"
      ? "Looks good. This front is safe."
      : suggestion === "CAUTION"
        ? "Balance getting high. Double-check before fronting."
        : "Too risky right now. Hold this front.";

  const inventory_message =
    input.inventory.quantity_on_hand < input.inventory.reorder_threshold
      ? "Inventory running low."
      : input.inventory.scarcity_level === "HIGH"
        ? "Scarce item. Protect your stock."
        : "Inventory status is healthy.";

  return {
    suggestion,
    confidence: clamp(Math.round(score), 0, 100),
    reasons,
    risk_flags: flags,
    inventory_message,
    operator_message,
  };
}

export async function getCustomerBehaviorMetrics(customer_id: string, business_id: string) {
  const supabase = getSupabaseClient();
  if (!supabase) return null;

  const { data: tx } = await supabase
    .from("credit_transactions")
    .select("transaction_type, amount, status, created_at, paid_date")
    .eq("customer_id", customer_id)
    .eq("business_id", business_id);

  const { data: sales } = await supabase
    .from("sales")
    .select("total_amount, created_at")
    .eq("customer_id", customer_id)
    .eq("business_id", business_id);

  const { data: limits } = await supabase
    .from("credit_limits")
    .select("current_balance")
    .eq("customer_id", customer_id)
    .eq("business_id", business_id)
    .single();

  const now = Date.now();
  type CreditTxRow = {
    transaction_type: string;
    amount: number | string | null;
    status: string | null;
    created_at: string;
    paid_date: string | null;
  };
  type SaleRow = { total_amount: number | string | null; created_at: string };

  const creditTx = (tx || []) as CreditTxRow[];
  const salesRows = (sales || []) as SaleRow[];

  const frontTx = creditTx.filter((t) => t.transaction_type === "extension");
  const paymentTx = creditTx.filter((t) => t.transaction_type === "payment");
  const unpaid = frontTx.filter((t) => t.status === "pending").length;
  const forgiven = (tx || [])
    .filter((t: CreditTxRow) => t.transaction_type === "forgiveness")
    .reduce((sum: number, t: CreditTxRow) => sum + Number(t.amount || 0), 0);

  const paymentOnTimeRatio =
    paymentTx.length === 0
      ? 0.75
      : paymentTx.filter((t) => (t.status || "").toLowerCase() === "completed").length /
        paymentTx.length;

  const avgRepaymentDays =
    paymentTx.length === 0
      ? 14
      : paymentTx.reduce((sum: number, t) => {
          const start = new Date(t.created_at).getTime();
          const paid = t.paid_date ? new Date(t.paid_date).getTime() : now;
          const days = Math.max(1, Math.round((paid - start) / (1000 * 60 * 60 * 24)));
          return sum + days;
        }, 0) / paymentTx.length;

  const purchaseFrequency30d = salesRows.filter(
    (s) => now - new Date(s.created_at).getTime() <= 1000 * 60 * 60 * 24 * 30
  ).length;

  const firstSale = salesRows.length
    ? Math.min(...salesRows.map((s) => new Date(s.created_at).getTime()))
    : now;

  const avgTransactionSize =
    salesRows.length > 0
      ? salesRows.reduce((sum: number, s) => sum + Number(s.total_amount || 0), 0) /
        salesRows.length
      : 0;

  const lastPaymentDate = paymentTx.length
    ? Math.max(...paymentTx.map((t) => new Date(t.created_at).getTime()))
    : now;

  const metrics: PaymentBehaviorMetrics = {
    payments_on_time_ratio: paymentOnTimeRatio,
    avg_repayment_days: avgRepaymentDays,
    unpaid_front_count: unpaid,
    forgiven_balance_total: forgiven,
    purchase_frequency_30d: purchaseFrequency30d,
    customer_lifetime_days: Math.max(1, Math.round((now - firstSale) / (1000 * 60 * 60 * 24))),
    avg_transaction_size: avgTransactionSize,
    open_balance: Number(limits?.current_balance || 0),
    days_since_last_payment: Math.max(
      0,
      Math.round((now - lastPaymentDate) / (1000 * 60 * 60 * 24))
    ),
  };

  return metrics;
}
