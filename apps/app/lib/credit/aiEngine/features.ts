import { api } from "@/convex/_generated/api";
import { businessClient } from "@/lib/business/convex-server";

export interface CustomerFeatures { customer_id: string; sales_30d: number; sales_90d: number; sales_all_time: number; credit_issued_30d: number; credit_issued_90d: number; credit_issued_all_time: number; credit_repaid_all_time: number; completed_transactions: number; late_payment_count: number; days_since_first_transaction: number; current_credit_balance: number; average_ticket_size: number; purchase_frequency_per_week: number; on_time_repayment_ratio: number; credit_utilization_ratio: number; total_inventory_value: number; inventory_turnover: number; inventory_restock_cost_ratio: number; inventory_velocity_7d: number; }

export async function computeCustomerFeatures(customer_id: string, business_id: string, current_credit_limit: number): Promise<CustomerFeatures | null> {
  try {
    const { client, expectedUserId } = await businessClient(business_id);
    const account = (await client.query(api.creditDashboard.accountsPage, { businessId: business_id, expectedUserId, paginationOpts: { numItems: 100, cursor: null } })).page.find(row => String(row.customerId) === customer_id);
    const balance = account?.balanceCents ?? 0;
    return { customer_id, sales_30d: 0, sales_90d: 0, sales_all_time: 0, credit_issued_30d: balance / 100, credit_issued_90d: balance / 100, credit_issued_all_time: balance / 100, credit_repaid_all_time: 0, completed_transactions: 0, late_payment_count: 0, days_since_first_transaction: 0, current_credit_balance: balance / 100, average_ticket_size: 0, purchase_frequency_per_week: 0, on_time_repayment_ratio: 1, credit_utilization_ratio: current_credit_limit > 0 ? balance / 100 / current_credit_limit : 0, total_inventory_value: 0, inventory_turnover: 0, inventory_restock_cost_ratio: 0, inventory_velocity_7d: 0 };
  } catch { return null; }
}
