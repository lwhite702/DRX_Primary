import { getSupabaseClient } from "@/lib/supabase/client";
import { computeCustomerFeatures } from "./aiEngine/features";
import { computeAICreditLimit } from "./aiEngine/limitEngine";

export interface CreditDecisionLog {
  id?: string;
  business_id: string;
  customer_id: string;
  decision_type: "ai_recommendation" | "manual_override" | "auto_apply";
  old_limit: number;
  new_limit: number;
  risk_score: number;
  reason: string;
  details_json?: Record<string, any>;
  decided_by?: string; // user_id or null for system
  created_at?: string;
}

export async function refreshAICreditRecommendation(
  customer_id: string,
  business_id: string,
  current_limit: number = 0
): Promise<{
  success: boolean;
  recommendation?: {
    recommended_limit: number;
    risk_score: number;
    justification: string;
    range_min: number;
    range_max: number;
  };
  error?: string;
}> {
  const supabase = getSupabaseClient();

  if (!supabase) {
    return { success: false, error: "Supabase client not available" };
  }

  try {
    // Get current limit if not provided
    if (current_limit === 0) {
      const { data, error } = await supabase
        .from("customers")
        .select("credit_limit")
        .eq("id", customer_id)
        .single();

      if (error || !data) {
        return { success: false, error: "Customer not found" };
      }

      current_limit = Number(data.credit_limit || 1000);
    }

    // Get current credit balance
    const { data: limitData, error: limitError } = await supabase
      .from("credit_limits")
      .select("current_balance")
      .eq("customer_id", customer_id)
      .eq("business_id", business_id)
      .single();

    const current_balance = limitData
      ? Number(limitData.current_balance || 0)
      : 0;

    // Compute features
    const features = await computeCustomerFeatures(
      customer_id,
      business_id,
      current_limit
    );

    if (!features) {
      return {
        success: false,
        error: "Could not compute customer features",
      };
    }

    // Get AI recommendation
    const recommendation = await computeAICreditLimit(
      customer_id,
      business_id,
      features,
      current_limit,
      current_balance
    );

    // Store recommendation in database
    const { error: updateError } = await supabase
      .from("customers")
      .update({
        credit_limit_ai_recommended: recommendation.recommended_limit_final,
        credit_risk_score: recommendation.risk_score_final,
        credit_limit_last_reviewed_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .eq("id", customer_id);

    if (updateError) {
      console.error(
        "Error updating customer with AI recommendation:",
        updateError
      );
    }

    return {
      success: true,
      recommendation: {
        recommended_limit: recommendation.recommended_limit_final,
        risk_score: recommendation.risk_score_final,
        justification: recommendation.justification_final,
        range_min: recommendation.suggested_range_min,
        range_max: recommendation.suggested_range_max,
      },
    };
  } catch (error) {
    console.error("Error refreshing AI credit recommendation:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Unknown error",
    };
  }
}

export async function applyAICreditRecommendation(
  customer_id: string,
  business_id: string,
  user_id: string
): Promise<{
  success: boolean;
  new_limit?: number;
  error?: string;
}> {
  const supabase = getSupabaseClient();

  if (!supabase) {
    return { success: false, error: "Supabase client not available" };
  }

  try {
    // Get current limit and AI recommendation
    const { data, error } = await supabase
      .from("customers")
      .select("credit_limit, credit_limit_ai_recommended, credit_risk_score")
      .eq("id", customer_id)
      .single();

    if (error || !data) {
      return { success: false, error: "Customer not found" };
    }

    const old_limit = Number(data.credit_limit || 0);
    const new_limit = Number(data.credit_limit_ai_recommended || 0);
    const risk_score = Number(data.credit_risk_score || 0);

    if (new_limit === 0) {
      return { success: false, error: "No AI recommendation available" };
    }

    // Update credit limit
    const { error: updateError } = await supabase
      .from("customers")
      .update({
        credit_limit: new_limit,
        updated_at: new Date().toISOString(),
      })
      .eq("id", customer_id);

    if (updateError) {
      return { success: false, error: updateError.message };
    }

    // Also update credit_limits table for consistency
    await supabase.from("credit_limits").upsert(
      {
        business_id,
        customer_id,
        max_credit_limit: new_limit,
        updated_at: new Date().toISOString(),
      },
      {
        onConflict: "business_id,customer_id",
      }
    );

    // Log decision
    await logCreditDecision({
      business_id,
      customer_id,
      decision_type: "auto_apply",
      old_limit,
      new_limit,
      risk_score,
      reason: "Applied AI recommendation",
      details_json: {
        applied_by: "system",
        timestamp: new Date().toISOString(),
      },
      decided_by: user_id,
    });

    return { success: true, new_limit };
  } catch (error) {
    console.error("Error applying AI credit recommendation:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Unknown error",
    };
  }
}

export async function overrideCreditLimit(
  customer_id: string,
  business_id: string,
  new_limit: number,
  reason: string,
  user_id: string
): Promise<{
  success: boolean;
  error?: string;
}> {
  const supabase = getSupabaseClient();

  if (!supabase) {
    return { success: false, error: "Supabase client not available" };
  }

  try {
    // Get old limit
    const { data, error: fetchError } = await supabase
      .from("customers")
      .select("credit_limit, credit_risk_score")
      .eq("id", customer_id)
      .single();

    if (fetchError || !data) {
      return { success: false, error: "Customer not found" };
    }

    const old_limit = Number(data.credit_limit || 0);
    const risk_score = Number(data.credit_risk_score || 0);

    // Update credit limit
    const { error: updateError } = await supabase
      .from("customers")
      .update({
        credit_limit: new_limit,
        updated_at: new Date().toISOString(),
      })
      .eq("id", customer_id);

    if (updateError) {
      return { success: false, error: updateError.message };
    }

    // Also update credit_limits table
    await supabase.from("credit_limits").upsert(
      {
        business_id,
        customer_id,
        max_credit_limit: new_limit,
        updated_at: new Date().toISOString(),
      },
      {
        onConflict: "business_id,customer_id",
      }
    );

    // Log decision
    await logCreditDecision({
      business_id,
      customer_id,
      decision_type: "manual_override",
      old_limit,
      new_limit,
      risk_score,
      reason,
      details_json: {
        override_reason: reason,
      },
      decided_by: user_id,
    });

    return { success: true };
  } catch (error) {
    console.error("Error overriding credit limit:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Unknown error",
    };
  }
}

export async function logCreditDecision(decision: CreditDecisionLog): Promise<{
  success: boolean;
  error?: string;
}> {
  const supabase = getSupabaseClient();

  if (!supabase) {
    return { success: false, error: "Supabase client not available" };
  }

  try {
    const { error } = await supabase.from("ai_credit_decisions").insert({
      business_id: decision.business_id,
      customer_id: decision.customer_id,
      decision_type: decision.decision_type,
      old_limit: decision.old_limit,
      new_limit: decision.new_limit,
      risk_score: decision.risk_score,
      reason: decision.reason,
      details_json: decision.details_json || {},
      decided_by: decision.decided_by || null,
      created_at: new Date().toISOString(),
    });

    if (error) {
      console.error("Error logging credit decision:", error);
      return { success: false, error: error.message };
    }

    return { success: true };
  } catch (error) {
    console.error("Error in logCreditDecision:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Unknown error",
    };
  }
}

export async function getCreditDecisionHistory(
  customer_id: string,
  limit: number = 10
): Promise<CreditDecisionLog[]> {
  const supabase = getSupabaseClient();

  if (!supabase) {
    return [];
  }

  try {
    const { data, error } = await supabase
      .from("ai_credit_decisions")
      .select("*")
      .eq("customer_id", customer_id)
      .order("created_at", { ascending: false })
      .limit(limit);

    if (error || !data) {
      return [];
    }

    return data.map((record: any) => ({
      id: record.id,
      business_id: record.business_id,
      customer_id: record.customer_id,
      decision_type: record.decision_type,
      old_limit: Number(record.old_limit || 0),
      new_limit: Number(record.new_limit || 0),
      risk_score: Number(record.risk_score || 0),
      reason: record.reason,
      details_json: record.details_json,
      decided_by: record.decided_by,
      created_at: record.created_at,
    }));
  } catch (error) {
    console.error("Error fetching credit decision history:", error);
    return [];
  }
}

export async function getCreditExposureReport(business_id: string): Promise<{
  total_credit_limits: number;
  total_credit_balance: number;
  utilization_ratio: number;
  at_risk_customers: number;
  customers_reviewed_today: number;
}> {
  const supabase = getSupabaseClient();

  if (!supabase) {
    return {
      total_credit_limits: 0,
      total_credit_balance: 0,
      utilization_ratio: 0,
      at_risk_customers: 0,
      customers_reviewed_today: 0,
    };
  }

  try {
    // Get all credit limits for business
    const { data: limits, error: limitsError } = await supabase
      .from("credit_limits")
      .select("max_credit_limit, current_balance")
      .eq("business_id", business_id);

    const { data: customers, error: customersError } = await supabase
      .from("customers")
      .select("id, credit_risk_score, credit_limit_last_reviewed_at")
      .eq("business_id", business_id);

    if (limitsError || customersError) {
      return {
        total_credit_limits: 0,
        total_credit_balance: 0,
        utilization_ratio: 0,
        at_risk_customers: 0,
        customers_reviewed_today: 0,
      };
    }

    const total_credit_limits = (limits || []).reduce(
      (sum: number, l: any) => sum + Number(l.max_credit_limit || 0),
      0
    );
    const total_credit_balance = (limits || []).reduce(
      (sum: number, l: any) => sum + Number(l.current_balance || 0),
      0
    );
    const utilization_ratio =
      total_credit_limits > 0 ? total_credit_balance / total_credit_limits : 0;

    const at_risk_customers = (customers || []).filter(
      (c: any) => c.credit_risk_score && c.credit_risk_score > 70
    ).length;

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const customers_reviewed_today = (customers || []).filter((c: any) => {
      const reviewDate = new Date(c.credit_limit_last_reviewed_at || "");
      reviewDate.setHours(0, 0, 0, 0);
      return reviewDate.getTime() === today.getTime();
    }).length;

    return {
      total_credit_limits,
      total_credit_balance,
      utilization_ratio,
      at_risk_customers,
      customers_reviewed_today,
    };
  } catch (error) {
    console.error("Error fetching credit exposure report:", error);
    return {
      total_credit_limits: 0,
      total_credit_balance: 0,
      utilization_ratio: 0,
      at_risk_customers: 0,
      customers_reviewed_today: 0,
    };
  }
}
