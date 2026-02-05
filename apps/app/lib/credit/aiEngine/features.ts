import { getSupabaseClient } from "@/lib/supabase/client";

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
  recency_score: number; // 0-100: how recently they've transacted
  frequency_score: number; // 0-100: how often they transact
  monetary_score: number; // 0-100: average transaction size
  tenure_days: number; // days since first transaction
  on_time_ratio: number; // 0-1: % of on-time repayments
  late_payment_count: number;
  credit_issued_30d: number;
  inventory_coverage_ratio: number; // 0-1: available inventory / credit requested
  inventory_turnover: number; // 0-100 normalized
}

async function getCustomerSalesMetrics(
  supabase: any,
  customer_id: string
): Promise<{
  sales_30d: number;
  sales_90d: number;
  sales_all_time: number;
  completed_transactions: number;
  average_ticket_size: number;
  days_since_first_transaction: number;
}> {
  if (!supabase) {
    return {
      sales_30d: 0,
      sales_90d: 0,
      sales_all_time: 0,
      completed_transactions: 0,
      average_ticket_size: 0,
      days_since_first_transaction: 0,
    };
  }

  const { data, error } = await supabase
    .from("v_credit_analytics")
    .select(
      "sales_30d, sales_90d, sales_all_time, completed_transactions, days_since_first_transaction"
    )
    .eq("customer_id", customer_id)
    .single();

  if (error || !data) {
    return {
      sales_30d: 0,
      sales_90d: 0,
      sales_all_time: 0,
      completed_transactions: 0,
      average_ticket_size: 0,
      days_since_first_transaction: 0,
    };
  }

  const average_ticket_size =
    data.completed_transactions > 0
      ? Number(data.sales_all_time) / data.completed_transactions
      : 0;

  return {
    sales_30d: Number(data.sales_30d || 0),
    sales_90d: Number(data.sales_90d || 0),
    sales_all_time: Number(data.sales_all_time || 0),
    completed_transactions: data.completed_transactions || 0,
    average_ticket_size,
    days_since_first_transaction: Math.max(
      data.days_since_first_transaction || 0,
      1
    ),
  };
}

async function getCustomerCreditMetrics(
  supabase: any,
  customer_id: string,
  credit_limit: number
): Promise<{
  credit_issued_30d: number;
  credit_issued_90d: number;
  credit_issued_all_time: number;
  credit_repaid_all_time: number;
  late_payment_count: number;
  current_credit_balance: number;
}> {
  if (!supabase) {
    return {
      credit_issued_30d: 0,
      credit_issued_90d: 0,
      credit_issued_all_time: 0,
      credit_repaid_all_time: 0,
      late_payment_count: 0,
      current_credit_balance: 0,
    };
  }

  const { data, error } = await supabase
    .from("v_credit_analytics")
    .select(
      "credit_issued_30d, credit_issued_90d, credit_issued_all_time, credit_repaid_all_time, late_payment_count, current_credit_balance"
    )
    .eq("customer_id", customer_id)
    .single();

  if (error || !data) {
    return {
      credit_issued_30d: 0,
      credit_issued_90d: 0,
      credit_issued_all_time: 0,
      credit_repaid_all_time: 0,
      late_payment_count: 0,
      current_credit_balance: 0,
    };
  }

  return {
    credit_issued_30d: Number(data.credit_issued_30d || 0),
    credit_issued_90d: Number(data.credit_issued_90d || 0),
    credit_issued_all_time: Number(data.credit_issued_all_time || 0),
    credit_repaid_all_time: Number(data.credit_repaid_all_time || 0),
    late_payment_count: data.late_payment_count || 0,
    current_credit_balance: Number(data.current_credit_balance || 0),
  };
}

async function getInventoryMetrics(
  supabase: any,
  business_id: string
): Promise<{
  total_inventory_value: number;
  inventory_turnover: number;
  inventory_restock_cost_ratio: number;
}> {
  if (!supabase) {
    return {
      total_inventory_value: 0,
      inventory_turnover: 0,
      inventory_restock_cost_ratio: 0,
    };
  }

  const { data, error } = await supabase
    .from("inventory")
    .select("id, quantity_on_hand, unit_cost, selling_price, created_at")
    .eq("business_id", business_id);

  if (error || !data || data.length === 0) {
    return {
      total_inventory_value: 0,
      inventory_turnover: 0,
      inventory_restock_cost_ratio: 0,
    };
  }

  const total_inventory_value = data.reduce(
    (sum: number, item: any) =>
      sum + Number(item.unit_cost || 0) * (item.quantity_on_hand || 0),
    0
  );

  const total_selling_value = data.reduce(
    (sum: number, item: any) =>
      sum + Number(item.selling_price || 0) * (item.quantity_on_hand || 0),
    0
  );

  const inventory_restock_cost_ratio =
    total_selling_value > 0 ? total_inventory_value / total_selling_value : 0;

  // Simple proxy for turnover: count of items with low stock
  const items_needing_restock = data.filter(
    (item: any) => item.quantity_on_hand < 10
  ).length;
  const inventory_turnover = (items_needing_restock / data.length) * 100;

  return {
    total_inventory_value,
    inventory_turnover,
    inventory_restock_cost_ratio,
  };
}

export async function computeCustomerFeatures(
  customer_id: string,
  business_id: string,
  current_credit_limit: number
): Promise<CustomerFeatures | null> {
  const supabase = getSupabaseClient();

  if (!supabase) {
    return null;
  }

  try {
    const sales = await getCustomerSalesMetrics(supabase, customer_id);
    const credit = await getCustomerCreditMetrics(
      supabase,
      customer_id,
      current_credit_limit
    );
    const inventory = await getInventoryMetrics(supabase, business_id);

    const purchase_frequency_per_week =
      sales.days_since_first_transaction > 0
        ? sales.completed_transactions /
          (sales.days_since_first_transaction / 7)
        : 0;

    const total_extended =
      sales.completed_transactions > 0 ? credit.credit_issued_all_time : 0;
    const total_repaid = credit.credit_repaid_all_time || 0;
    const on_time_repayment_ratio =
      total_extended > 0
        ? Math.max(
            0,
            (total_extended - credit.late_payment_count * 100) / total_extended
          )
        : 1; // New customers are assumed on-time

    const credit_utilization_ratio =
      current_credit_limit > 0
        ? credit.current_credit_balance / current_credit_limit
        : 0;

    // Inventory velocity: simple approximation based on turnover
    const inventory_velocity_7d = (inventory.inventory_turnover / 100) * 7; // Items per week

    return {
      customer_id,
      sales_30d: sales.sales_30d,
      sales_90d: sales.sales_90d,
      sales_all_time: sales.sales_all_time,
      credit_issued_30d: credit.credit_issued_30d,
      credit_issued_90d: credit.credit_issued_90d,
      credit_issued_all_time: credit.credit_issued_all_time,
      credit_repaid_all_time: credit.credit_repaid_all_time,
      completed_transactions: sales.completed_transactions,
      late_payment_count: credit.late_payment_count,
      days_since_first_transaction: sales.days_since_first_transaction,
      current_credit_balance: credit.current_credit_balance,
      average_ticket_size: sales.average_ticket_size,
      purchase_frequency_per_week,
      on_time_repayment_ratio: Math.min(
        1,
        Math.max(0, on_time_repayment_ratio)
      ),
      credit_utilization_ratio,
      total_inventory_value: inventory.total_inventory_value,
      inventory_velocity_7d,
      inventory_restock_cost_ratio: inventory.inventory_restock_cost_ratio,
    };
  } catch (error) {
    console.error("Error computing customer features:", error);
    return null;
  }
}

export function normalizeFeatures(
  features: CustomerFeatures
): NormalizedFeatures {
  // Recency: recent activity scores higher (0-100)
  // Last transaction within 30 days = high score, beyond 1 year = low
  const recency_days = 30;
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
