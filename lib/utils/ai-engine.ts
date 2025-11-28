import { getSupabaseClient } from "@/lib/supabase/client";
import { pricingEngine, type PricingFactors, type PricingRecommendation } from "./pricing-engine";
import { inventoryEngine, type InventoryFactors, type InventoryForecastResult } from "./inventory-engine";

export interface ProductAnalysisRequest {
  businessId: string;
  inventoryId: string;
  productName: string;
  sku: string;
  cost: number;
  currentPrice: number;
  currentStock: number;
  reorderLevel: number;
  minPrice?: number;
  maxPrice?: number;
  supplierLeadTimeDays?: number;
  restockCost?: number;
  hasSeasonality?: boolean;
  marginRequirement?: number;
}

export interface ProductIntelligence {
  pricing: PricingRecommendation | null;
  forecast: InventoryForecastResult | null;
  pricingRecommendationId?: string;
  forecastId?: string;
  alerts: Array<{
    id: string;
    type: string;
    severity: string;
    message: string;
  }>;
  insights: string;
  lastUpdated: string;
}

export class AIEngine {
  private supabase = getSupabaseClient();

  /**
   * Comprehensive product intelligence analysis
   */
  async analyzeProduct(request: ProductAnalysisRequest): Promise<ProductIntelligence> {
    const {
      businessId,
      inventoryId,
      productName,
      sku,
      cost,
      currentPrice,
      currentStock,
      reorderLevel,
      minPrice,
      maxPrice,
      supplierLeadTimeDays = 7,
      restockCost,
      hasSeasonality = false,
      marginRequirement = 0.3,
    } = request;

    const result: ProductIntelligence = {
      pricing: null,
      forecast: null,
      alerts: [],
      insights: "",
      lastUpdated: new Date().toISOString(),
    };

    // Calculate velocity
    const velocity = await inventoryEngine.calculateVelocity(inventoryId, businessId);

    // Generate pricing recommendation
    const pricingFactors: PricingFactors = {
      cost,
      currentPrice,
      costHistory: [],
      salesVelocity7d: velocity.velocity7d,
      salesVelocity30d: velocity.velocity30d,
      currentStock,
      marginRequirement,
      minPrice,
      maxPrice,
    };

    try {
      result.pricing = await pricingEngine.generateRecommendation(pricingFactors);
      if (result.pricing) {
        result.pricingRecommendationId = await pricingEngine.saveRecommendation(
          businessId,
          inventoryId,
          result.pricing,
          currentPrice
        ) || undefined;
      }
    } catch (error) {
      console.error("Error generating pricing recommendation:", error);
    }

    // Generate inventory forecast
    const inventoryFactors: InventoryFactors = {
      currentStock,
      velocity7d: velocity.velocity7d,
      velocity30d: velocity.velocity30d,
      velocity90d: velocity.velocity90d || velocity.velocity30d,
      reorderLevel,
      supplierLeadTimeDays,
      restockCost,
      hasSeasonality,
    };

    try {
      result.forecast = await inventoryEngine.generateForecast(
        inventoryId,
        businessId,
        inventoryFactors
      );

      if (result.forecast) {
        result.forecastId = await inventoryEngine.saveForecast(
          businessId,
          inventoryId,
          result.forecast
        ) || undefined;

        // Process forecast and create alerts
        await inventoryEngine.processForecastAndAlerts(
          businessId,
          inventoryId,
          result.forecast,
          productName
        );
      }

      // Update velocity cache
      await inventoryEngine.updateVelocityCache(
        businessId,
        inventoryId,
        velocity.velocity7d,
        velocity.velocity30d,
        velocity.velocity90d
      );
    } catch (error) {
      console.error("Error generating inventory forecast:", error);
    }

    // Fetch recent alerts
    if (this.supabase) {
      try {
        const { data: alerts } = await this.supabase
          .from("inventory_alerts")
          .select("id, alert_type, severity, message")
          .eq("business_id", businessId)
          .eq("inventory_id", inventoryId)
          .eq("acknowledged", false)
          .order("created_at", { ascending: false })
          .limit(5);

        if (alerts) {
          result.alerts = alerts.map((alert) => ({
            id: alert.id,
            type: alert.alert_type,
            severity: alert.severity,
            message: alert.message,
          }));
        }
      } catch (error) {
        console.error("Error fetching alerts:", error);
      }
    }

    // Generate composite insights
    result.insights = this.generateCompositeInsights(
      productName,
      result.pricing,
      result.forecast,
      result.alerts
    );

    return result;
  }

  /**
   * Generate composite insights from pricing and forecast data
   */
  private generateCompositeInsights(
    productName: string,
    pricing: PricingRecommendation | null,
    forecast: InventoryForecastResult | null,
    alerts: Array<{ type: string; severity: string }>
  ): string {
    const insights: string[] = [];

    if (!pricing && !forecast) {
      return "Insufficient data to generate insights.";
    }

    if (pricing) {
      const pricingAction = pricing.recommendedPrice > pricing.recommendedRangeMin
        ? `increase to $${pricing.recommendedPrice.toFixed(2)}`
        : `consider reducing to $${pricing.recommendedPrice.toFixed(2)}`;

      insights.push(
        `PRICING: ${productName} confidence ${pricing.confidenceScore.toFixed(0)}% - ${pricingAction} (range: $${pricing.recommendedRangeMin.toFixed(2)} - $${pricing.recommendedRangeMax.toFixed(2)})`
      );
    }

    if (forecast) {
      if (forecast.restockUrgency === "critical") {
        insights.push(
          `URGENT: ${productName} stockout projected in ${forecast.daysUntilStockout} days. Restock ${forecast.recommendedRestockQuantity} units immediately.`
        );
      } else if (forecast.daysUntilStockout && forecast.daysUntilStockout < 30) {
        insights.push(
          `INVENTORY: ${productName} will need restocking in ~${forecast.daysUntilStockout} days (recommend ${forecast.recommendedRestockQuantity} units)`
        );
      }

      if (forecast.velocityTrend === "accelerating") {
        insights.push(
          `OPPORTUNITY: ${productName} showing strong demand acceleration. Consider price increase.`
        );
      } else if (forecast.velocityTrend === "stagnant") {
        insights.push(
          `CONCERN: ${productName} has stagnant sales. Consider promotional pricing or discontinuation.`
        );
      }

      if (forecast.inventoryRiskLevel === "high") {
        insights.push(
          `RISK: ${productName} has elevated inventory risk. Current stock: ${forecast.factors.current_stock} units.`
        );
      }
    }

    const criticalAlerts = alerts.filter((a) => a.severity === "critical");
    if (criticalAlerts.length > 0) {
      insights.push(`⚠️ ${criticalAlerts.length} critical alert(s) require immediate attention`);
    }

    return insights.join(" | ");
  }

  /**
   * Batch analyze multiple products
   */
  async analyzeBatch(
    requests: ProductAnalysisRequest[]
  ): Promise<Map<string, ProductIntelligence>> {
    const results = new Map<string, ProductIntelligence>();

    for (const request of requests) {
      try {
        const intelligence = await this.analyzeProduct(request);
        results.set(request.inventoryId, intelligence);
      } catch (error) {
        console.error(`Error analyzing product ${request.sku}:`, error);
        results.set(request.inventoryId, {
          pricing: null,
          forecast: null,
          alerts: [],
          insights: "Error during analysis",
          lastUpdated: new Date().toISOString(),
        });
      }
    }

    return results;
  }

  /**
   * Get all AI recommendations for a business
   */
  async getBusinessIntelligence(businessId: string) {
    if (!this.supabase) {
      return {
        pricingRecommendations: [],
        forecasts: [],
        alerts: [],
      };
    }

    try {
      const [pricingData, forecastData, alertData] = await Promise.all([
        this.supabase
          .from("ai_pricing_recommendations")
          .select("*")
          .eq("business_id", businessId)
          .eq("status", "pending")
          .order("confidence_score", { ascending: false })
          .limit(20),
        this.supabase
          .from("inventory_forecasts")
          .select("*")
          .eq("business_id", businessId)
          .in("restock_urgency", ["high", "critical"])
          .order("updated_at", { ascending: false })
          .limit(20),
        this.supabase
          .from("inventory_alerts")
          .select("*")
          .eq("business_id", businessId)
          .eq("acknowledged", false)
          .in("severity", ["high", "critical"])
          .order("created_at", { ascending: false })
          .limit(30),
      ]);

      return {
        pricingRecommendations: pricingData.data || [],
        forecasts: forecastData.data || [],
        alerts: alertData.data || [],
      };
    } catch (error) {
      console.error("Error fetching business intelligence:", error);
      return {
        pricingRecommendations: [],
        forecasts: [],
        alerts: [],
      };
    }
  }

  /**
   * Log AI decision
   */
  async logDecision(
    businessId: string,
    productId: string,
    decisionType: "pricing" | "inventory" | "forecast",
    oldValue: Record<string, any> | null,
    newValue: Record<string, any> | null,
    aiRecommendation: Record<string, any>,
    reasoning: string,
    decidedBy: "system" | "user",
    decidedByUserId?: string,
    overrideReason?: string
  ): Promise<boolean> {
    if (!this.supabase) {
      console.error("Supabase client not available");
      return false;
    }

    try {
      await this.supabase.from("ai_decision_log").insert({
        business_id: businessId,
        product_id: productId,
        decision_type: decisionType,
        old_value: oldValue,
        new_value: newValue,
        ai_recommendation: aiRecommendation,
        reasoning,
        decided_by: decidedBy,
        decided_by_user_id: decidedByUserId,
        override_reason: overrideReason,
      });

      return true;
    } catch (error) {
      console.error("Error logging decision:", error);
      return false;
    }
  }

  /**
   * Get decision history for a product
   */
  async getDecisionHistory(businessId: string, productId: string, limit: number = 50) {
    if (!this.supabase) {
      return [];
    }

    try {
      const { data } = await this.supabase
        .from("ai_decision_log")
        .select("*")
        .eq("business_id", businessId)
        .eq("product_id", productId)
        .order("created_at", { ascending: false })
        .limit(limit);

      return data || [];
    } catch (error) {
      console.error("Error fetching decision history:", error);
      return [];
    }
  }

  /**
   * Acknowledge alert
   */
  async acknowledgeAlert(
    alertId: string,
    userId?: string
  ): Promise<boolean> {
    if (!this.supabase) {
      console.error("Supabase client not available");
      return false;
    }

    try {
      await this.supabase
        .from("inventory_alerts")
        .update({
          acknowledged: true,
          acknowledged_by: userId,
          acknowledged_at: new Date().toISOString(),
        })
        .eq("id", alertId);

      return true;
    } catch (error) {
      console.error("Error acknowledging alert:", error);
      return false;
    }
  }
}

export const aiEngine = new AIEngine();
