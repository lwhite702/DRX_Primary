import { getSupabaseClient } from "@/lib/supabase/client";
import type { CustomerFeatures, NormalizedFeatures } from "./features";
import { normalizeFeatures } from "./features";

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

interface AIEngineResponse {
  recommended_limit: number;
  suggested_range_min: number;
  suggested_range_max: number;
  risk_score: number;
  justification: string;
}

async function getBusinessConfig(business_id: string): Promise<AIEngineConfig> {
  const supabase = getSupabaseClient();

  if (!supabase) {
    return {
      global_max_credit_per_customer: 10000,
      global_max_credit_ratio_of_inventory: 0.5,
      default_credit_limit_for_new_customer: 1000,
    };
  }

  try {
    const { data, error } = await supabase
      .from("business_settings")
      .select(
        "global_max_credit_per_customer, global_max_credit_ratio_of_inventory, default_credit_limit_for_new_customer"
      )
      .eq("business_id", business_id)
      .single();

    if (error || !data) {
      return {
        global_max_credit_per_customer: 10000,
        global_max_credit_ratio_of_inventory: 0.5,
        default_credit_limit_for_new_customer: 1000,
      };
    }

    return {
      global_max_credit_per_customer: Number(
        data.global_max_credit_per_customer || 10000
      ),
      global_max_credit_ratio_of_inventory: Number(
        data.global_max_credit_ratio_of_inventory || 0.5
      ),
      default_credit_limit_for_new_customer: Number(
        data.default_credit_limit_for_new_customer || 1000
      ),
    };
  } catch (error) {
    console.error("Error fetching business config:", error);
    return {
      global_max_credit_per_customer: 10000,
      global_max_credit_ratio_of_inventory: 0.5,
      default_credit_limit_for_new_customer: 1000,
    };
  }
}

async function callAILimitEngine(
  features: NormalizedFeatures,
  current_balance: number,
  total_inventory_value: number,
  config: AIEngineConfig
): Promise<AIEngineResponse | null> {
  const apiKey = process.env.OPENAI_API_KEY;

  if (!apiKey) {
    console.warn("OPENAI_API_KEY not configured");
    return null;
  }

  const prompt = buildPrompt(
    features,
    current_balance,
    total_inventory_value,
    config
  );

  try {
    const response = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: "gpt-5.1",
        messages: [
          {
            role: "system",
            content: `You are a credit risk assessment specialist. Analyze customer credit metrics and recommend safe credit limits. 
Always return valid JSON with no additional text.`,
          },
          {
            role: "user",
            content: prompt,
          },
        ],
        temperature: 0.7,
        max_tokens: 500,
      }),
    });

    if (!response.ok) {
      console.error("AI API error:", response.statusText);
      return null;
    }

    const data = await response.json();

    if (!data.choices || !data.choices[0]?.message?.content) {
      console.error("Unexpected AI response format");
      return null;
    }

    const content = data.choices[0].message.content.trim();

    // Try to extract JSON from response
    let jsonStr = content;
    const jsonMatch = content.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      jsonStr = jsonMatch[0];
    }

    const parsed = JSON.parse(jsonStr);

    return {
      recommended_limit: Math.max(0, Number(parsed.recommended_limit || 0)),
      suggested_range_min: Math.max(0, Number(parsed.suggested_range_min || 0)),
      suggested_range_max: Math.max(
        0,
        Number(parsed.suggested_range_max || 5000)
      ),
      risk_score: Math.min(100, Math.max(0, Number(parsed.risk_score || 50))),
      justification: String(
        parsed.justification || "AI recommendation"
      ).substring(0, 200),
    };
  } catch (error) {
    console.error("Error calling AI limit engine:", error);
    return null;
  }
}

function buildPrompt(
  features: NormalizedFeatures,
  current_balance: number,
  total_inventory_value: number,
  config: AIEngineConfig
): string {
  return `
You are analyzing a customer's creditworthiness. Based on the metrics below, recommend a safe credit limit.

CUSTOMER METRICS:
- Recency Score (0-100): ${features.recency_score.toFixed(1)}
- Frequency Score (0-100): ${features.frequency_score.toFixed(1)}
- Monetary Score (0-100): ${features.monetary_score.toFixed(1)}
- Tenure (days): ${features.tenure_days}
- On-Time Repayment Ratio (0-1): ${features.on_time_ratio.toFixed(2)}
- Late Payment Count: ${features.late_payment_count}
- Credit Issued in Last 30 Days: $${features.credit_issued_30d.toFixed(2)}
- Current Credit Balance: $${current_balance.toFixed(2)}
- Business Inventory Value: $${total_inventory_value.toFixed(2)}
- Inventory Coverage Ratio (0-1): ${features.inventory_coverage_ratio.toFixed(
    2
  )}
- Inventory Turnover Score (0-100): ${features.inventory_turnover.toFixed(1)}

CONSTRAINTS:
- Maximum Per Customer: $${config.global_max_credit_per_customer.toFixed(2)}
- Maximum as % of Inventory: $${(
    total_inventory_value * config.global_max_credit_ratio_of_inventory
  ).toFixed(2)}
- Recommended Default (New Customer): $${config.default_credit_limit_for_new_customer.toFixed(
    2
  )}

SCORING RULES:
- New customer (tenure < 30 days): Start conservative, near default or lower
- Perfect repayment history: Can increase 10-50% above current
- Any late payments: Do not increase, suggest current or lower
- High inventory value: Can support higher limits
- Low inventory value: Keep limits conservative
- High recency/frequency/monetary: Increase confidence in recommendation

Respond with ONLY valid JSON (no markdown, no explanation):
{
  "recommended_limit": <number>,
  "suggested_range_min": <number>,
  "suggested_range_max": <number>,
  "risk_score": <0-100>,
  "justification": "<short explanation>"
}
`;
}

function applyRuleBasedFallback(
  features: NormalizedFeatures,
  current_balance: number,
  total_inventory_value: number,
  config: AIEngineConfig,
  current_limit: number
): AILimitRecommendation {
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

async function clampAndValidateResult(
  recommendation: AIEngineResponse,
  config: AIEngineConfig,
  total_inventory_value: number
): Promise<AIEngineResponse> {
  const inventory_cap =
    total_inventory_value * config.global_max_credit_ratio_of_inventory;

  return {
    ...recommendation,
    recommended_limit: Math.min(
      Math.max(recommendation.recommended_limit, 0),
      Math.min(config.global_max_credit_per_customer, inventory_cap)
    ),
    suggested_range_min: Math.max(recommendation.suggested_range_min, 0),
    suggested_range_max: Math.min(
      recommendation.suggested_range_max,
      config.global_max_credit_per_customer
    ),
    risk_score: Math.min(100, Math.max(0, recommendation.risk_score)),
  };
}

export async function computeAICreditLimit(
  customer_id: string,
  business_id: string,
  features: CustomerFeatures,
  current_limit: number,
  current_balance: number
): Promise<AILimitRecommendation> {
  try {
    const normalized = normalizeFeatures(features);
    const config = await getBusinessConfig(business_id);

    // Try AI first
    const aiRecommendation = await callAILimitEngine(
      normalized,
      current_balance,
      features.total_inventory_value,
      config
    );

    if (aiRecommendation) {
      const clamped = await clampAndValidateResult(
        aiRecommendation,
        config,
        features.total_inventory_value
      );

      return {
        recommended_limit_final: clamped.recommended_limit,
        risk_score_final: clamped.risk_score,
        justification_final: clamped.justification,
        suggested_range_min: clamped.suggested_range_min,
        suggested_range_max: clamped.suggested_range_max,
        used_ai: true,
      };
    }

    // Fallback to rule-based
    return applyRuleBasedFallback(
      normalized,
      current_balance,
      features.total_inventory_value,
      config,
      current_limit
    );
  } catch (error) {
    console.error("Error in computeAICreditLimit:", error);

    // Emergency fallback
    return {
      recommended_limit_final: 1000,
      risk_score_final: 50,
      justification_final: "System error - using safe default limit",
      suggested_range_min: 500,
      suggested_range_max: 2000,
      used_ai: false,
      fallback_reason: "System error occurred",
    };
  }
}
