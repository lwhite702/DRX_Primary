import { getSupabaseClient } from "@/lib/supabase/client";
import { refreshAICreditRecommendation } from "./creditDecisionService";

export interface SchedulerLog {
  business_id: string;
  customer_id: string;
  status: "success" | "failure" | "fallback";
  old_recommended: number;
  new_recommended: number;
  risk_score: number;
  error_message?: string;
  timestamp: string;
}

const logs: SchedulerLog[] = [];

export async function refreshAllCustomerLimits(
  business_id: string,
  max_age_days: number = 7
): Promise<{
  processed: number;
  successful: number;
  failed: number;
  logs: SchedulerLog[];
}> {
  const supabase = getSupabaseClient();

  if (!supabase) {
    return { processed: 0, successful: 0, failed: 0, logs: [] };
  }

  try {
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - max_age_days);

    // Get customers who haven't been reviewed recently or have activity
    const { data: customers, error } = await supabase
      .from("customers")
      .select(
        `
        id,
        credit_limit,
        credit_limit_ai_recommended,
        credit_risk_score,
        credit_limit_last_reviewed_at
      `
      )
      .eq("business_id", business_id)
      .eq("is_active", true)
      .or(
        `credit_limit_last_reviewed_at.is.null,credit_limit_last_reviewed_at.lt.${cutoffDate.toISOString()}`
      );

    if (error || !customers) {
      console.error("Error fetching customers for refresh:", error);
      return { processed: 0, successful: 0, failed: 0, logs: [] };
    }

    let successful = 0;
    let failed = 0;

    for (const customer of customers) {
      try {
        const old_recommended = customer.credit_limit_ai_recommended || 0;

        const result = await refreshAICreditRecommendation(
          customer.id,
          business_id,
          customer.credit_limit || 1000
        );

        if (result.success && result.recommendation) {
          successful++;

          logs.push({
            business_id,
            customer_id: customer.id,
            status: "success",
            old_recommended,
            new_recommended: result.recommendation.recommended_limit,
            risk_score: result.recommendation.risk_score,
            timestamp: new Date().toISOString(),
          });
        } else {
          failed++;

          logs.push({
            business_id,
            customer_id: customer.id,
            status: "failure",
            old_recommended,
            new_recommended: 0,
            risk_score: 0,
            error_message: result.error,
            timestamp: new Date().toISOString(),
          });
        }
      } catch (err) {
        failed++;

        logs.push({
          business_id,
          customer_id: customer.id,
          status: "failure",
          old_recommended: 0,
          new_recommended: 0,
          risk_score: 0,
          error_message:
            err instanceof Error ? err.message : "Unknown error",
          timestamp: new Date().toISOString(),
        });
      }
    }

    return {
      processed: customers.length,
      successful,
      failed,
      logs,
    };
  } catch (error) {
    console.error("Error in refreshAllCustomerLimits:", error);
    return { processed: 0, successful: 0, failed: 0, logs: [] };
  }
}

export async function scheduleNightlyRefresh(): Promise<void> {
  // This would be called by a cron job (Vercel Cron, AWS Lambda, or similar)
  // For now, this serves as the interface that external schedulers can call

  const supabase = getSupabaseClient();

  if (!supabase) {
    console.error("Supabase client not available for scheduler");
    return;
  }

  try {
    // Get all active businesses
    const { data: businesses, error } = await supabase
      .from("business_profile")
      .select("id")
      .eq("is_active", true);

    if (error || !businesses) {
      console.error("Error fetching businesses:", error);
      return;
    }

    console.log(`Starting nightly credit limit refresh for ${businesses.length} businesses`);

    for (const business of businesses) {
      try {
        const result = await refreshAllCustomerLimits(business.id);
        console.log(
          `Business ${business.id}: Processed ${result.processed}, Success: ${result.successful}, Failed: ${result.failed}`
        );

        // Optionally log to database for monitoring
        await logSchedulerRun(business.id, result);
      } catch (err) {
        console.error(`Error processing business ${business.id}:`, err);
      }
    }
  } catch (error) {
    console.error("Error in scheduleNightlyRefresh:", error);
  }
}

async function logSchedulerRun(
  business_id: string,
  result: {
    processed: number;
    successful: number;
    failed: number;
    logs: SchedulerLog[];
  }
): Promise<void> {
  const supabase = getSupabaseClient();

  if (!supabase) {
    return;
  }

  try {
    // You could optionally store scheduler logs in a dedicated table
    // For now, we'll just log to console
    console.log(`Scheduler run logged for business ${business_id}`);
  } catch (error) {
    console.error("Error logging scheduler run:", error);
  }
}

// Hook for manual trigger
export async function manualRefreshCustomerLimit(
  customer_id: string,
  business_id: string
): Promise<{
  success: boolean;
  message: string;
}> {
  try {
    const result = await refreshAICreditRecommendation(
      customer_id,
      business_id
    );

    if (result.success) {
      return {
        success: true,
        message: `Recommendation updated: $${result.recommendation?.recommended_limit.toFixed(2)}`,
      };
    }

    return {
      success: false,
      message: result.error || "Failed to refresh recommendation",
    };
  } catch (error) {
    return {
      success: false,
      message:
        error instanceof Error
          ? error.message
          : "Unexpected error occurred",
    };
  }
}
