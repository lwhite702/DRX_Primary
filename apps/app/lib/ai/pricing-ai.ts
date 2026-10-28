import { generatePricingRecommendation, type PricingFactors, type PricingRecommendation } from "../utils/pricing-recommendation";
import { generatePricingInsightsWithAI } from "./ai-sdk";

export async function generatePricingRecommendationWithAI(
  factors: PricingFactors,
  productName = "Product"
): Promise<PricingRecommendation> {
  const baseline = generatePricingRecommendation(factors);
  if (!process.env.OPENAI_API_KEY) {
    return baseline;
  }

  try {
    const aiInsight = await generatePricingInsightsWithAI({
      productName,
      cost: factors.cost,
      currentPrice: factors.currentPrice,
      currentStock: factors.currentStock,
      salesVelocity7d: factors.salesVelocity7d,
      salesVelocity30d: factors.salesVelocity30d,
      baselinePrice: baseline.recommendedPrice,
      baselineReasoning: baseline.reasoning,
    });

    if (aiInsight.priceAdjustmentMultiplier !== 1.0) {
      const adjustedPrice = Math.round(baseline.recommendedPrice * aiInsight.priceAdjustmentMultiplier * 100) / 100;
      const minP = factors.minPrice ?? factors.cost * 1.05;
      const maxP = factors.maxPrice ?? factors.cost * 3.0;
      const finalPrice = Math.max(minP, Math.min(maxP, adjustedPrice));

      return {
        ...baseline,
        recommendedPrice: finalPrice,
        reasoning: `${aiInsight.reasoning} (Baseline: ${baseline.reasoning})`,
        factors: {
          ...baseline.factors,
          aiMultiplier: aiInsight.priceAdjustmentMultiplier,
          usedVercelAISDK: true,
        },
      };
    }

    return {
      ...baseline,
      reasoning: aiInsight.reasoning,
      factors: {
        ...baseline.factors,
        usedVercelAISDK: true,
      },
    };
  } catch {
    return baseline;
  }
}
