import { getSupabaseClient } from "@/lib/supabase/client";

export interface PricingFactors {
  cost: number;
  currentPrice: number;
  costHistory: number[];
  deliveryCostHistory?: number[]; // NEW: historical delivery costs
  avgDeliveryCostPerUnit?: number; // NEW: average delivery cost per unit sold
  salesVelocity7d: number;
  salesVelocity30d: number;
  salesVelocity90d?: number; // Made optional for consistency
  currentStock: number;
  marginRequirement: number;
  reorderQuantity?: number;
  reorderCost?: number;
  competitorPrice?: number;
  seasonalityFactor?: number;
  minPrice?: number;
  maxPrice?: number;
  taxRate?: number;
}

export interface PricingRecommendation {
  recommendedPrice: number;
  recommendedRangeMin: number;
  recommendedRangeMax: number;
  reasoning: string;
  confidenceScore: number;
  factors: Record<string, any>;
}

export class PricingEngine {
  private supabase = getSupabaseClient();

  /**
   * Calculate baseline deterministic price
   */
  private calculateBaselinePrice(
    cost: number,
    marginRequirement: number
  ): number {
    if (cost <= 0) return 0;
    return cost * (1 + marginRequirement);
  }

  /**
   * Detect cost trend from history
   */
  private detectCostTrend(costHistory: number[]): {
    trend: string;
    change: number;
  } {
    if (costHistory.length < 2) return { trend: "stable", change: 0 };

    const recent = costHistory.slice(-5);
    const avg = recent.reduce((a, b) => a + b, 0) / recent.length;
    const first = recent[0];
    const change = ((avg - first) / first) * 100;

    if (Math.abs(change) < 2) return { trend: "stable", change };
    if (change > 0) return { trend: "rising", change };
    return { trend: "declining", change };
  }

  /**
   * Analyze inventory levels and velocity
   */
  private analyzeInventoryPosition(
    currentStock: number,
    velocity7d: number,
    velocity30d: number,
    minReorderLevel?: number
  ): { position: string; daysSupply: number; urgency: string } {
    const avgVelocity = (velocity7d + velocity30d) / 2;
    if (avgVelocity === 0) {
      return { position: "stagnant", daysSupply: Infinity, urgency: "low" };
    }

    const daysSupply = currentStock / avgVelocity;
    let position = "optimal";
    let urgency = "low";

    if (daysSupply < 7) {
      position = "critical";
      urgency = "critical";
    } else if (daysSupply < 14) {
      position = "low";
      urgency = "high";
    } else if (daysSupply > 60) {
      position = "high";
      urgency = "medium";
    } else if (daysSupply > 90) {
      position = "overstock";
      urgency = "high";
    }

    return { position, daysSupply, urgency };
  }

  /**
   * Calculate demand elasticity impact
   */
  private calculateDemandImpact(
    velocity7d: number,
    velocity30d: number,
    velocity90d: number
  ): { elasticity: string; acceleration: number } {
    if (velocity7d === 0 && velocity30d === 0 && velocity90d === 0) {
      return { elasticity: "unknown", acceleration: 0 };
    }

    const avg30 = velocity30d || 1;
    const avg90 = velocity90d || avg30;
    const acceleration = ((velocity7d - avg30) / avg30) * 100;

    let elasticity = "stable";
    if (acceleration > 20) elasticity = "accelerating";
    else if (acceleration < -20) elasticity = "declining";

    return { elasticity, acceleration };
  }

  /**
   * Apply price constraints
   */
  private applyConstraints(
    recommendedPrice: number,
    cost: number,
    minMarginRequired: number = 0.1,
    globalSafetyFactor: number = 2.0,
    minPrice?: number,
    maxPrice?: number
  ): { price: number; rangeMin: number; rangeMax: number } {
    const absoluteMin = cost * (1 + minMarginRequired);
    const absoluteMax = cost * globalSafetyFactor;

    const finalMin = Math.max(absoluteMin, minPrice || absoluteMin);
    const finalMax = Math.min(absoluteMax, maxPrice || absoluteMax);
    const finalPrice = Math.max(finalMin, Math.min(recommendedPrice, finalMax));

    return {
      price: Math.round(finalPrice * 100) / 100,
      rangeMin: Math.round(finalMin * 100) / 100,
      rangeMax: Math.round(finalMax * 100) / 100,
    };
  }

  /**
   * Generate AI pricing recommendation
   */
  async generateRecommendation(
    factors: PricingFactors
  ): Promise<PricingRecommendation> {
    const {
      cost,
      currentPrice,
      costHistory = [],
      salesVelocity7d = 0,
      salesVelocity30d = 0,
      salesVelocity90d = 0,
      currentStock = 0,
      marginRequirement = 0.3,
      minPrice,
      maxPrice,
    } = factors;

    // Validate inputs
    if (cost <= 0) {
      return {
        recommendedPrice: currentPrice,
        recommendedRangeMin: currentPrice * 0.95,
        recommendedRangeMax: currentPrice * 1.05,
        reasoning: "Cost is not set; unable to compute recommendation.",
        confidenceScore: 20,
        factors: { error: "invalid_cost" },
      };
    }

    const baselinePrice = this.calculateBaselinePrice(cost, marginRequirement);

    // Analyze various factors
    const costTrend = this.detectCostTrend(costHistory);
    const inventoryAnalysis = this.analyzeInventoryPosition(
      currentStock,
      salesVelocity7d,
      salesVelocity30d
    );
    const demandAnalysis = this.calculateDemandImpact(
      salesVelocity7d,
      salesVelocity30d,
      salesVelocity90d
    );

    // Initialize price adjustment factors
    let priceAdjustment = 1.0;
    let confidenceScore = 75;
    let reasoning = "";
    const factors_detail: Record<string, any> = {
      baseline_price: baselinePrice,
      cost_trend: costTrend,
      inventory_analysis: inventoryAnalysis,
      demand_analysis: demandAnalysis,
    };

    // NEW: Analyze delivery cost trends
    const deliveryCostHistory = factors.deliveryCostHistory || [];
    const avgDeliveryCost = factors.avgDeliveryCostPerUnit || 0;
    if (deliveryCostHistory.length > 0) {
      const recentDeliveryCosts = deliveryCostHistory.slice(-5);
      const avgRecent =
        recentDeliveryCosts.reduce((a, b) => a + b, 0) /
        recentDeliveryCosts.length;
      const avgHistorical =
        deliveryCostHistory.reduce((a, b) => a + b, 0) /
        deliveryCostHistory.length;
      const deliveryCostChange =
        avgHistorical > 0
          ? ((avgRecent - avgHistorical) / avgHistorical) * 100
          : 0;

      factors_detail.delivery_cost_trend = {
        avg_recent: avgRecent,
        avg_historical: avgHistorical,
        change_percent: deliveryCostChange,
      };

      // Adjust pricing if delivery costs are rising significantly
      if (deliveryCostChange > 15) {
        priceAdjustment *= 1.03;
        reasoning += `Delivery costs rising ${deliveryCostChange.toFixed(
          1
        )}% - slight price increase to maintain margin. `;
      } else if (deliveryCostChange < -15) {
        reasoning += `Delivery costs declining ${Math.abs(
          deliveryCostChange
        ).toFixed(1)}% - opportunity for competitive pricing. `;
      }
    }

    // Adjust for cost changes
    if (costTrend.change > 5) {
      priceAdjustment *= 1.05;
      reasoning += `Cost rising ${costTrend.change.toFixed(
        1
      )}% - slight increase. `;
    } else if (costTrend.change < -5) {
      priceAdjustment *= 0.95;
      reasoning += `Cost declining ${Math.abs(costTrend.change).toFixed(
        1
      )}% - consider price reduction. `;
    }

    // Adjust for inventory position
    if (inventoryAnalysis.position === "overstock") {
      priceAdjustment *= 0.92;
      confidenceScore = Math.max(60, confidenceScore - 10);
      reasoning += `Overstock detected (${inventoryAnalysis.daysSupply.toFixed(
        0
      )}d supply) - recommend discount to clear inventory. `;
    } else if (inventoryAnalysis.position === "critical") {
      priceAdjustment *= 1.08;
      confidenceScore = Math.max(65, confidenceScore - 5);
      reasoning += `Critical stock level - opportunity for premium pricing. `;
    } else if (inventoryAnalysis.position === "low") {
      priceAdjustment *= 1.03;
      reasoning += `Low stock - slight premium to maximize margin. `;
    }

    // Adjust for demand trends
    if (demandAnalysis.elasticity === "accelerating") {
      priceAdjustment *= 1.06;
      confidenceScore = Math.max(70, confidenceScore - 5);
      reasoning += `Strong demand acceleration detected (${demandAnalysis.acceleration.toFixed(
        1
      )}%) - can support higher prices. `;
    } else if (demandAnalysis.elasticity === "declining") {
      priceAdjustment *= 0.97;
      confidenceScore = Math.max(65, confidenceScore - 10);
      reasoning += `Demand decline detected (${demandAnalysis.acceleration.toFixed(
        1
      )}%) - consider competitive pricing. `;
    }

    // Handle stagnant products
    if (inventoryAnalysis.position === "stagnant") {
      priceAdjustment *= 0.85;
      confidenceScore = Math.max(40, confidenceScore - 30);
      reasoning += `No sales history (stagnant product) - deep discount recommended to stimulate demand. `;
    }

    const recommendedPrice = baselinePrice * priceAdjustment;

    const constraints = this.applyConstraints(
      recommendedPrice,
      cost,
      0.1,
      2.0,
      minPrice,
      maxPrice
    );

    // Build final reasoning
    if (reasoning === "") {
      reasoning =
        "Current pricing is near optimal based on cost, inventory, and demand patterns.";
    }

    return {
      recommendedPrice: constraints.price,
      recommendedRangeMin: constraints.rangeMin,
      recommendedRangeMax: constraints.rangeMax,
      reasoning: reasoning.trim(),
      confidenceScore: Math.min(95, Math.max(20, confidenceScore)),
      factors: factors_detail,
    };
  }

  /**
   * Save recommendation to database
   */
  async saveRecommendation(
    businessId: string,
    inventoryId: string,
    recommendation: PricingRecommendation,
    currentPrice: number
  ): Promise<string | null> {
    if (!this.supabase) {
      console.error("Supabase client not available");
      return null;
    }

    try {
      const { data, error } = await this.supabase
        .from("ai_pricing_recommendations")
        .insert({
          business_id: businessId,
          inventory_id: inventoryId,
          current_price: currentPrice,
          recommended_price: recommendation.recommendedPrice,
          recommended_range_min: recommendation.recommendedRangeMin,
          recommended_range_max: recommendation.recommendedRangeMax,
          confidence_score: recommendation.confidenceScore,
          reasoning: recommendation.reasoning,
          factors: recommendation.factors,
          status: "pending",
        })
        .select()
        .single();

      if (error) {
        console.error("Failed to save pricing recommendation:", error);
        return null;
      }

      return data?.id;
    } catch (error) {
      console.error("Error saving pricing recommendation:", error);
      return null;
    }
  }

  /**
   * Apply recommendation and log decision
   */
  async applyRecommendation(
    businessId: string,
    inventoryId: string,
    recommendationId: string,
    newPrice: number,
    userId?: string
  ): Promise<boolean> {
    if (!this.supabase) {
      console.error("Supabase client not available");
      return false;
    }

    try {
      // Get current price
      const { data: inventory } = await this.supabase
        .from("inventory")
        .select("selling_price")
        .eq("id", inventoryId)
        .single();

      if (!inventory) {
        console.error("Inventory item not found");
        return false;
      }

      // Update inventory price
      const { error: updateError } = await this.supabase
        .from("inventory")
        .update({
          selling_price: newPrice,
          updated_at: new Date().toISOString(),
        })
        .eq("id", inventoryId);

      if (updateError) {
        console.error("Failed to update inventory price:", updateError);
        return false;
      }

      // Update recommendation status
      await this.supabase
        .from("ai_pricing_recommendations")
        .update({
          status: "applied",
          applied_at: new Date().toISOString(),
        })
        .eq("id", recommendationId);

      // Log decision
      await this.supabase.from("ai_decision_log").insert({
        business_id: businessId,
        product_id: inventoryId,
        decision_type: "pricing",
        old_value: { selling_price: inventory.selling_price },
        new_value: { selling_price: newPrice },
        ai_recommendation: { recommended_price: newPrice },
        decided_by: userId ? "user" : "system",
        decided_by_user_id: userId,
      });

      return true;
    } catch (error) {
      console.error("Error applying recommendation:", error);
      return false;
    }
  }

  /**
   * Get historical cost data for an inventory item
   */
  async getCostHistory(
    inventoryId: string,
    days: number = 90
  ): Promise<number[]> {
    if (!this.supabase) {
      return [];
    }

    try {
      const { data } = await this.supabase
        .from("inventory_log")
        .select("quantity_change, created_at")
        .eq("inventory_id", inventoryId)
        .gte(
          "created_at",
          new Date(Date.now() - days * 24 * 60 * 60 * 1000).toISOString()
        )
        .order("created_at", { ascending: true });

      // For now, return empty array as we need cost change tracking
      // In a real implementation, this would track cost changes from supplier updates
      return [];
    } catch (error) {
      console.error("Error fetching cost history:", error);
      return [];
    }
  }
}

export const pricingEngine = new PricingEngine();
