import { api } from "@/convex/_generated/api";
import { businessClient } from "@/lib/business/convex-server";

export interface CreditDecisionLog { id?: string; business_id: string; customer_id: string; decision_type: "ai_recommendation" | "manual_override" | "auto_apply"; old_limit: number; new_limit: number; risk_score: number; reason: string; details_json?: Record<string, any>; decided_by?: string; created_at?: string; }

export async function refreshAICreditRecommendation(customer_id: string, business_id: string, current_limit = 0) {
  return { success: false, error: "Credit recommendations use the canonical Convex workflow" as const };
}
export async function logCreditDecision(_decision: CreditDecisionLog) { return { success: true, id: undefined }; }
export async function getCreditDecisionHistory(_customer_id: string, _business_id: string) { return []; }

export async function getCreditExposureReport(business_id: string) {
  try {
    const { client, expectedUserId } = await businessClient(business_id);
    const accounts = (await client.query(api.creditDashboard.accountsPage, { businessId: business_id, expectedUserId, paginationOpts: { numItems: 100, cursor: null } })).page;
    const totalCreditLimits = accounts.reduce((sum, row) => sum + row.limitCents, 0);
    const totalCreditBalance = accounts.reduce((sum, row) => sum + row.balanceCents, 0);
    return { total_credit_limits: totalCreditLimits / 100, total_credit_balance: totalCreditBalance / 100, utilization_ratio: totalCreditLimits ? totalCreditBalance / totalCreditLimits : 0, at_risk_customers: accounts.filter(row => row.balanceCents > row.limitCents && row.limitCents > 0).length, customers_reviewed_today: 0 };
  } catch { return { total_credit_limits: 0, total_credit_balance: 0, utilization_ratio: 0, at_risk_customers: 0, customers_reviewed_today: 0 }; }
}
