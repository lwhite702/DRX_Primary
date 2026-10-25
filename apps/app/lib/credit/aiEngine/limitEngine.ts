import { ConvexHttpClient } from "convex/browser";
import { api } from "@/convex/_generated/api";
import { getCurrentUser } from "@/lib/adapters/auth";
import { getConvexAuthToken } from "@/lib/auth/convex-token";
import { redis } from "@/lib/redis";
import { logger } from "@/lib/logging";
import { Ratelimit } from "@upstash/ratelimit";
import { generateCreditRecommendationText } from "@/lib/ai/ai-sdk";
import type { CustomerFeatures, NormalizedFeatures, AILimitRecommendation, AIEngineConfig, AIEngineResponse } from "./calculation";
import { normalizeFeatures, applyRuleBasedFallback, clampAndValidateResult, validateProviderResponse } from "./calculation";
export type { AILimitRecommendation, AIEngineConfig } from "./calculation";

async function getBusinessConfig(businessId: string): Promise<{ config: AIEngineConfig; revision: number; businessId: string; operatorId: string }> {
  const user = await getCurrentUser();
  const token = await getConvexAuthToken(), url = process.env.NEXT_PUBLIC_CONVEX_URL?.trim();
  if (!user || !token || !url) throw new Error("Recommendation settings unavailable");
  const client = new ConvexHttpClient(url); client.setAuth(token);
  const settings = await client.query(api.creditRecommendationSettings.read, { businessId, expectedUserId: user.id });
  if (!settings || !settings.enabled) throw new Error("Recommendation settings missing or disabled");
  if (![settings.maxCustomerCents, settings.newCustomerCents, settings.inventoryCapBps, settings.revision].every(Number.isSafeInteger) || settings.maxCustomerCents < 0 || settings.newCustomerCents < 0 || settings.inventoryCapBps < 0 || settings.inventoryCapBps > 10000 || settings.revision < 1) throw new Error("Invalid recommendation settings");
  return { revision: settings.revision, businessId: settings.businessId, operatorId: user.id, config: {
    global_max_credit_per_customer: settings.maxCustomerCents / 100,
    global_max_credit_ratio_of_inventory: settings.inventoryCapBps / 10000,
    default_credit_limit_for_new_customer: settings.newCustomerCents / 100,
  } };
}

async function callAILimitEngine(
  features: NormalizedFeatures,
  current_balance: number,
  total_inventory_value: number,
  config: AIEngineConfig
): Promise<AIEngineResponse | null> {
  const apiKey = process.env.OPENAI_API_KEY;

  if (!apiKey) {
    logger.warn("OPENAI_API_KEY not configured");
    return null;
  }

  const prompt = buildPrompt(
    features,
    current_balance,
    total_inventory_value,
    config
  );

  try {
    const content = await generateCreditRecommendationText(prompt);

    // Try to extract JSON from response
    let jsonStr = content;
    const jsonMatch = content.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      jsonStr = jsonMatch[0];
    }

    const parsed = JSON.parse(jsonStr);

    return validateProviderResponse(parsed);
  } catch {
    // Invalid or failed provider output must never become an actionable fallback.
    throw new Error("CREDIT_RECOMMENDATION_UNAVAILABLE: Credit provider response is unavailable");
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

export async function computeAICreditLimit(
  customer_id: string,
  business_id: string,
  features: CustomerFeatures,
  current_limit: number,
  current_balance: number
): Promise<AILimitRecommendation> {
  try {
    const normalized = normalizeFeatures(features);
    for (const value of [current_limit, current_balance]) {
      if (!Number.isFinite(value) || value < 0) throw new Error("Invalid credit amount");
    }
    if (redis) {
      const ratelimit = new Ratelimit({ redis, limiter: Ratelimit.slidingWindow(10, "1 h") });
      const { success } = await ratelimit.limit(`limit_engine:${business_id}`);
      if (!success) throw new Error("Credit recommendation rate limit reached");
    }
    const snapshot = await getBusinessConfig(business_id);
    const config = snapshot.config;
    // Validate all inputs/configuration before any provider call. This same
    // deterministic result is used only when no provider key is configured.
    const fallback = applyRuleBasedFallback(normalized, current_balance, features.total_inventory_value, config, current_limit);
    const aiRecommendation = await callAILimitEngine(normalized, current_balance, features.total_inventory_value, config);
    const currentSettings = await getBusinessConfig(business_id);
    if (currentSettings.revision !== snapshot.revision || currentSettings.businessId !== snapshot.businessId || currentSettings.operatorId !== snapshot.operatorId || JSON.stringify(currentSettings.config) !== JSON.stringify(config)) throw new Error("Recommendation settings changed during generation");
    if (!aiRecommendation) return fallback;
    const clamped = clampAndValidateResult(aiRecommendation, config, features.total_inventory_value);
    // Do not reuse the former customer-only recommendation cache: it omitted
    // source balances, policy, inventory and feature revisions.
    return {
      recommended_limit_final: clamped.recommended_limit,
      risk_score_final: clamped.risk_score,
      justification_final: clamped.justification,
      suggested_range_min: clamped.suggested_range_min,
      suggested_range_max: clamped.suggested_range_max,
      used_ai: true,
    };
  } catch {
    throw new Error("CREDIT_RECOMMENDATION_UNAVAILABLE: Credit recommendation is unavailable");
  }
}
