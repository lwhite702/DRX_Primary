import { generateText } from "ai";
import { createOpenAI } from "@ai-sdk/openai";
import { z } from "zod";
import { logger } from "@/lib/logging";

/**
 * Normalized fetch wrapper to ensure OpenAI response compatibility across
 * both production OpenAI endpoints and test/mock response payloads.
 */
function createNormalizedFetch(baseFetch: typeof fetch = fetch): typeof fetch {
  return async (input: RequestInfo | URL, init?: RequestInit): Promise<Response> => {
    const response = await baseFetch(input, init);
    if (!response.ok) return response;

    try {
      const cloned = response.clone();
      const text = await cloned.text();
      const trimmed = text.trim();
      if (trimmed.startsWith("{") || trimmed.startsWith("[")) {
        const data = JSON.parse(trimmed);
        if (data && Array.isArray(data.choices)) {
          let modified = false;
          const choices = data.choices.map((c: any, index: number) => {
            if (c.index === undefined || c.finish_reason === undefined) {
              modified = true;
              return {
                index: c.index ?? index,
                finish_reason: c.finish_reason ?? "stop",
                ...c,
              };
            }
            return c;
          });

          if (modified) {
            data.choices = choices;
            return new Response(JSON.stringify(data), {
              status: response.status,
              statusText: response.statusText,
              headers: { "Content-Type": "application/json" },
            });
          }
        }
      }
    } catch {
      // Fall through to original response if parsing fails
    }

    return response;
  };
}

/**
 * Get configured OpenAI provider instance using Vercel AI SDK.
 */
export function getOpenAIProvider() {
  const apiKey = process.env.OPENAI_API_KEY || "";
  return createOpenAI({
    apiKey,
    fetch: createNormalizedFetch(globalThis.fetch),
  });
}

/**
 * Get language model instance for AI operations.
 */
export function getLanguageModel(modelName?: string) {
  const provider = getOpenAIProvider();
  const selectedModel = modelName || process.env.OPENAI_MODEL || "gpt-4o-mini";
  return provider.chat(selectedModel);
}

/**
 * Schema for credit limit recommendation output.
 */
export const creditLimitRecommendationSchema = z.object({
  recommended_limit: z.number().finite().nonnegative(),
  suggested_range_min: z.number().finite().nonnegative(),
  suggested_range_max: z.number().finite().nonnegative(),
  risk_score: z.number().finite().min(0).max(100),
  justification: z.string().trim().min(1),
});

export type CreditLimitRecommendationAI = z.infer<typeof creditLimitRecommendationSchema>;

/**
 * Call Vercel AI SDK to generate structured credit limit recommendation.
 */
export async function generateCreditRecommendationText(prompt: string): Promise<string> {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    throw new Error("OPENAI_API_KEY_MISSING");
  }

  const model = getLanguageModel();
  const result = await generateText({
    model,
    system: `You are a credit risk assessment specialist. Analyze customer credit metrics and recommend safe credit limits. Always return valid JSON matching the requested schema with no markdown formatting or extra text.`,
    prompt,
    temperature: 0.7,
    maxRetries: 0,
  });

  return result.text.trim();
}

/**
 * Schema for pricing recommendation AI enhancement.
 */
export const pricingRecommendationSchema = z.object({
  recommendedPrice: z.number().finite().positive(),
  recommendedRangeMin: z.number().finite().positive(),
  recommendedRangeMax: z.number().finite().positive(),
  reasoning: z.string().trim().min(1),
  confidenceScore: z.number().finite().min(0).max(100),
});

export type PricingRecommendationAI = z.infer<typeof pricingRecommendationSchema>;

/**
 * Generate AI-powered pricing reasoning using Vercel AI SDK.
 */
export async function generatePricingInsightsWithAI(input: {
  productName: string;
  cost: number;
  currentPrice: number;
  currentStock: number;
  salesVelocity7d: number;
  salesVelocity30d: number;
  baselinePrice: number;
  baselineReasoning: string;
}): Promise<{ reasoning: string; priceAdjustmentMultiplier: number }> {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    return {
      reasoning: input.baselineReasoning,
      priceAdjustmentMultiplier: 1.0,
    };
  }

  try {
    const model = getLanguageModel();
    const prompt = `
Analyze product pricing for "${input.productName}":
- Cost per unit: $${input.cost.toFixed(2)}
- Current Selling Price: $${input.currentPrice.toFixed(2)}
- Current Stock: ${input.currentStock} units
- 7-day Sales Velocity: ${input.salesVelocity7d} units/day
- 30-day Sales Velocity: ${input.salesVelocity30d} units/day
- Baseline Recommended Price: $${input.baselinePrice.toFixed(2)}
- Baseline Analysis: ${input.baselineReasoning}

Provide a concise 1-2 sentence operator insight explaining any optimal price adjustment and recommend an adjustment multiplier between 0.85 and 1.15.
Respond in JSON:
{
  "reasoning": "<concise insight>",
  "multiplier": <number between 0.85 and 1.15>
}
`;

    const result = await generateText({
      model,
      system: "You are an inventory pricing strategist for regulated retail businesses. Keep insights concise, realistic, and commercially sound. Return valid JSON only.",
      prompt,
      temperature: 0.3,
    });

    const parsed = JSON.parse(result.text.match(/\{[\s\S]*\}/)?.[0] || result.text);
    const multiplier = typeof parsed.multiplier === "number" && Number.isFinite(parsed.multiplier)
      ? Math.max(0.85, Math.min(1.15, parsed.multiplier))
      : 1.0;
    const reasoning = typeof parsed.reasoning === "string" && parsed.reasoning.trim()
      ? parsed.reasoning.trim()
      : input.baselineReasoning;

    return { reasoning, priceAdjustmentMultiplier: multiplier };
  } catch (error) {
    logger.warn("Failed to generate pricing insights with AI SDK", { error });
    return {
      reasoning: input.baselineReasoning,
      priceAdjustmentMultiplier: 1.0,
    };
  }
}
