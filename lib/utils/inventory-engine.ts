import { getSupabaseClient } from "@/lib/supabase/client";

export interface InventoryFactors {
  currentStock: number;
  velocity7d: number;
  velocity30d: number;
  velocity90d: number;
  reorderLevel: number;
  supplierLeadTimeDays?: number;
  restockCost?: number;
  lastRestockDate?: string;
  hasSeasonality?: boolean;
}

export interface InventoryForecastResult {
  projectedStockoutDate: string | null;
  daysUntilStockout: number | null;
  recommendedRestockQuantity: number;
  restockUrgency: "low" | "medium" | "high" | "critical";
  inventoryRiskLevel: "low" | "medium" | "high";
  reasoning: string;
  confidenceScore: number;
  factors: Record<string, any>;
  velocityTrend: "accelerating" | "stable" | "declining" | "stagnant";
}

export class InventoryEngine {
  private supabase = getSupabaseClient();

  /**
   * Calculate sales velocity (units per day) from different time periods
   */
  async calculateVelocity(
    inventoryId: string,
    businessId: string
  ): Promise<{ velocity7d: number; velocity30d: number; velocity90d: number }> {
    if (!this.supabase) {
      return { velocity7d: 0, velocity30d: 0, velocity90d: 0 };
    }

    try {
      const now = new Date();
      const days7Ago = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
      const days30Ago = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
      const days90Ago = new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000);

      // Get sales for different periods
      const { data: sales7d } = await this.supabase
        .from("sales_line_items")
        .select("quantity")
        .eq("inventory_id", inventoryId)
        .gte("created_at", days7Ago.toISOString());

      const { data: sales30d } = await this.supabase
        .from("sales_line_items")
        .select("quantity")
        .eq("inventory_id", inventoryId)
        .gte("created_at", days30Ago.toISOString());

      const { data: sales90d } = await this.supabase
        .from("sales_line_items")
        .select("quantity")
        .eq("inventory_id", inventoryId)
        .gte("created_at", days90Ago.toISOString());

      const total7d = sales7d?.reduce((sum, item) => sum + item.quantity, 0) || 0;
      const total30d = sales30d?.reduce((sum, item) => sum + item.quantity, 0) || 0;
      const total90d = sales90d?.reduce((sum, item) => sum + item.quantity, 0) || 0;

      return {
        velocity7d: total7d / 7,
        velocity30d: total30d / 30,
        velocity90d: total90d / 90,
      };
    } catch (error) {
      console.error("Error calculating velocity:", error);
      return { velocity7d: 0, velocity30d: 0, velocity90d: 0 };
    }
  }

  /**
   * Detect velocity trend
   */
  private detectVelocityTrend(
    velocity7d: number,
    velocity30d: number,
    velocity90d: number
  ): "accelerating" | "stable" | "declining" | "stagnant" {
    if (velocity7d === 0 && velocity30d === 0 && velocity90d === 0) {
      return "stagnant";
    }

    const avgRecent = velocity7d;
    const avgPrevious = velocity30d;

    if (avgRecent === 0) return "stagnant";
    if (avgPrevious === 0) return "accelerating";

    const change = ((avgRecent - avgPrevious) / avgPrevious) * 100;

    if (change > 20) return "accelerating";
    if (change < -20) return "declining";
    return "stable";
  }

  /**
   * Calculate projected stockout date
   */
  private calculateStockoutProjection(
    currentStock: number,
    velocity: number
  ): { date: string | null; daysRemaining: number | null } {
    if (velocity <= 0) {
      return { date: null, daysRemaining: null };
    }

    const daysRemaining = Math.floor(currentStock / velocity);

    if (daysRemaining < 0) {
      return { date: null, daysRemaining: 0 };
    }

    const stockoutDate = new Date();
    stockoutDate.setDate(stockoutDate.getDate() + daysRemaining);

    return {
      date: stockoutDate.toISOString().split("T")[0],
      daysRemaining,
    };
  }

  /**
   * Determine restock urgency
   */
  private determineRestockUrgency(
    daysUntilStockout: number | null,
    currentStock: number,
    reorderLevel: number,
    supplierLeadTimeDays: number = 7
  ): "low" | "medium" | "high" | "critical" {
    if (daysUntilStockout === null || daysUntilStockout === Infinity) {
      return "low";
    }

    // Calculate when we need to reorder based on lead time
    const reorderDueDate = daysUntilStockout - supplierLeadTimeDays;

    if (reorderDueDate <= 0) {
      return "critical";
    }

    if (reorderDueDate <= 3) {
      return "high";
    }

    if (reorderDueDate <= 7) {
      return "medium";
    }

    if (currentStock <= reorderLevel) {
      return "medium";
    }

    return "low";
  }

  /**
   * Determine inventory risk level
   */
  private determineRiskLevel(
    daysUntilStockout: number | null,
    currentStock: number,
    velocity: number,
    reorderLevel: number
  ): "low" | "medium" | "high" {
    // Critical low stock
    if (currentStock < reorderLevel / 2) {
      return "high";
    }

    // Stagnant product
    if (velocity === 0) {
      if (currentStock > reorderLevel * 3) {
        return "high";
      }
      return "medium";
    }

    // Very fast moving with low stock
    if (velocity > reorderLevel && currentStock < reorderLevel * 2) {
      return "high";
    }

    // Normal range
    if (currentStock > reorderLevel && daysUntilStockout && daysUntilStockout > 30) {
      return "low";
    }

    return "medium";
  }

  /**
   * Calculate recommended restock quantity
   */
  private calculateRestockQuantity(
    velocity7d: number,
    velocity30d: number,
    velocity90d: number,
    currentStock: number,
    reorderLevel: number,
    supplierLeadTimeDays: number = 7,
    hasSeasonality: boolean = false
  ): number {
    const avgVelocity = (velocity7d + velocity30d + velocity90d) / 3;

    if (avgVelocity === 0) {
      // Stagnant product - reorder only if below reorder level
      return Math.max(0, reorderLevel - currentStock);
    }

    // Calculate coverage period (default 45 days, extended for seasonal products)
    const coverageDays = hasSeasonality ? 60 : 45;

    // Quantity needed for coverage period
    const coverageQuantity = Math.ceil(avgVelocity * coverageDays);

    // Account for current stock
    const quantityToOrder = Math.max(0, coverageQuantity - currentStock);

    // Ensure minimum order respects reorder level
    const minimumOrder = Math.max(reorderLevel, quantityToOrder);

    return minimumOrder;
  }

  /**
   * Generate inventory forecast
   */
  async generateForecast(
    inventoryId: string,
    businessId: string,
    factors: Partial<InventoryFactors>
  ): Promise<InventoryForecastResult> {
    const {
      currentStock = 0,
      velocity7d = 0,
      velocity30d = 0,
      velocity90d = 0,
      reorderLevel = 10,
      supplierLeadTimeDays = 7,
      restockCost = 0,
      hasSeasonality = false,
    } = factors;

    let reasoning = "";
    const factors_detail: Record<string, any> = {
      current_stock: currentStock,
      velocity_7d: velocity7d,
      velocity_30d: velocity30d,
      velocity_90d: velocity90d,
      reorder_level: reorderLevel,
    };

    // Detect velocity trend
    const velocityTrend = this.detectVelocityTrend(velocity7d, velocity30d, velocity90d);

    // Use most recent velocity for projections
    const activeVelocity = velocity7d > 0 ? velocity7d : velocity30d > 0 ? velocity30d : 0;

    // Calculate stockout projection
    const stockoutProjection = this.calculateStockoutProjection(currentStock, activeVelocity);

    // Determine urgency and risk
    const restockUrgency = this.determineRestockUrgency(
      stockoutProjection.daysRemaining,
      currentStock,
      reorderLevel,
      supplierLeadTimeDays
    );

    const inventoryRiskLevel = this.determineRiskLevel(
      stockoutProjection.daysRemaining,
      currentStock,
      activeVelocity,
      reorderLevel
    );

    // Calculate recommended restock quantity
    const recommendedRestockQuantity = this.calculateRestockQuantity(
      velocity7d,
      velocity30d,
      velocity90d,
      currentStock,
      reorderLevel,
      supplierLeadTimeDays,
      hasSeasonality
    );

    // Build reasoning
    if (velocityTrend === "stagnant") {
      reasoning = "No sales detected for this product. Limited recommendation due to lack of sales history. ";
    } else if (velocityTrend === "accelerating") {
      reasoning = `Strong demand acceleration detected. Recommend increasing restock quantity by 20-30% to prevent stockouts. `;
    } else if (velocityTrend === "declining") {
      reasoning = `Declining demand trend. Recommend reducing restock quantities to avoid overstock. `;
    }

    if (stockoutProjection.daysRemaining !== null) {
      if (stockoutProjection.daysRemaining <= 7) {
        reasoning += `Critical: Stock will be depleted in ${stockoutProjection.daysRemaining} days. Urgent restock needed. `;
      } else if (stockoutProjection.daysRemaining <= 14) {
        reasoning += `Warning: Stock will be depleted in ${stockoutProjection.daysRemaining} days. Schedule restock soon. `;
      } else if (stockoutProjection.daysRemaining > 60) {
        reasoning += `Ample stock supply (${stockoutProjection.daysRemaining} days remaining). No immediate action needed. `;
      }
    }

    if (currentStock > reorderLevel * 2 && activeVelocity < reorderLevel / 14) {
      reasoning += `Overstock risk: Current inventory significantly exceeds velocity. Consider promotions to reduce excess stock. `;
    }

    if (restockCost > 0 && recommendedRestockQuantity > 0) {
      const totalRestockCost = restockCost * recommendedRestockQuantity;
      factors_detail.estimated_restock_cost = totalRestockCost;
      reasoning += `Estimated restock cost: $${totalRestockCost.toFixed(2)}. `;
    }

    const confidenceScore =
      activeVelocity > 0
        ? Math.min(95, 70 + Math.min(25, velocity90d / 10))
        : velocityTrend === "stagnant"
          ? 30
          : 50;

    if (reasoning === "") {
      reasoning = "Normal inventory levels. Current forecast suggests stable operations.";
    }

    return {
      projectedStockoutDate: stockoutProjection.date,
      daysUntilStockout: stockoutProjection.daysRemaining,
      recommendedRestockQuantity,
      restockUrgency,
      inventoryRiskLevel,
      reasoning: reasoning.trim(),
      confidenceScore: Math.max(20, Math.min(95, confidenceScore)),
      factors: factors_detail,
      velocityTrend,
    };
  }

  /**
   * Save forecast to database
   */
  async saveForecast(
    businessId: string,
    inventoryId: string,
    forecast: InventoryForecastResult
  ): Promise<string | null> {
    if (!this.supabase) {
      console.error("Supabase client not available");
      return null;
    }

    try {
      const { data, error } = await this.supabase
        .from("inventory_forecasts")
        .insert({
          business_id: businessId,
          inventory_id: inventoryId,
          current_stock: forecast.factors.current_stock,
          velocity_7d: forecast.factors.velocity_7d,
          velocity_30d: forecast.factors.velocity_30d,
          velocity_90d: forecast.factors.velocity_90d,
          velocity_trend: forecast.velocityTrend,
          projected_stockout_date: forecast.projectedStockoutDate,
          days_until_stockout: forecast.daysUntilStockout,
          recommended_restock_quantity: forecast.recommendedRestockQuantity,
          restock_urgency: forecast.restockUrgency,
          inventory_risk_level: forecast.inventoryRiskLevel,
          reasoning: forecast.reasoning,
          confidence_score: forecast.confidenceScore,
          forecast_factors: forecast.factors,
        })
        .select()
        .single();

      if (error) {
        console.error("Failed to save inventory forecast:", error);
        return null;
      }

      return data?.id;
    } catch (error) {
      console.error("Error saving inventory forecast:", error);
      return null;
    }
  }

  /**
   * Create inventory alert
   */
  async createAlert(
    businessId: string,
    inventoryId: string,
    alertType: string,
    severity: "low" | "medium" | "high" | "critical",
    message: string,
    data?: Record<string, any>
  ): Promise<string | null> {
    if (!this.supabase) {
      console.error("Supabase client not available");
      return null;
    }

    try {
      const { data: result, error } = await this.supabase
        .from("inventory_alerts")
        .insert({
          business_id: businessId,
          inventory_id: inventoryId,
          alert_type: alertType,
          severity,
          message,
          data,
        })
        .select()
        .single();

      if (error) {
        console.error("Failed to create inventory alert:", error);
        return null;
      }

      return result?.id;
    } catch (error) {
      console.error("Error creating inventory alert:", error);
      return null;
    }
  }

  /**
   * Process forecast and generate alerts
   */
  async processForecastAndAlerts(
    businessId: string,
    inventoryId: string,
    forecast: InventoryForecastResult,
    productName: string
  ): Promise<void> {
    // High stock + low velocity alert
    if (
      forecast.inventoryRiskLevel === "high" &&
      forecast.velocityTrend === "stagnant"
    ) {
      await this.createAlert(
        businessId,
        inventoryId,
        "overstock_risk",
        "high",
        `Overstock risk: ${productName} has high inventory but no sales velocity. Consider price adjustment or promotions.`,
        { stock: forecast.factors.current_stock, velocity: 0 }
      );
    }

    // Low stock + high velocity alert
    if (
      forecast.restockUrgency === "critical" ||
      forecast.restockUrgency === "high"
    ) {
      await this.createAlert(
        businessId,
        inventoryId,
        "stockout_risk",
        forecast.restockUrgency === "critical" ? "critical" : "high",
        `Stock at risk: ${productName} projected to stock out in ${forecast.daysUntilStockout} days.`,
        {
          days_until_stockout: forecast.daysUntilStockout,
          projected_date: forecast.projectedStockoutDate,
        }
      );
    }

    // Demand spike alert
    if (forecast.velocityTrend === "accelerating") {
      await this.createAlert(
        businessId,
        inventoryId,
        "demand_spike",
        "medium",
        `Demand acceleration detected for ${productName}. Sales velocity increasing. Monitor stock levels closely.`,
        { velocity_7d: forecast.factors.velocity_7d }
      );
    }
  }

  /**
   * Update sales velocity cache
   */
  async updateVelocityCache(
    businessId: string,
    inventoryId: string,
    velocity7d: number,
    velocity30d: number,
    velocity90d: number
  ): Promise<boolean> {
    if (!this.supabase) {
      console.error("Supabase client not available");
      return false;
    }

    try {
      // Calculate units sold
      const units7d = Math.round(velocity7d * 7);
      const units30d = Math.round(velocity30d * 30);
      const units90d = Math.round(velocity90d * 90);

      // Check if cache exists
      const { data: existing } = await this.supabase
        .from("sales_velocity_cache")
        .select("id")
        .eq("business_id", businessId)
        .eq("inventory_id", inventoryId)
        .single();

      if (existing) {
        await this.supabase
          .from("sales_velocity_cache")
          .update({
            velocity_7d: velocity7d,
            velocity_30d: velocity30d,
            velocity_90d: velocity90d,
            last_7d_units: units7d,
            last_30d_units: units30d,
            last_90d_units: units90d,
            cache_updated_at: new Date().toISOString(),
          })
          .eq("business_id", businessId)
          .eq("inventory_id", inventoryId);
      } else {
        await this.supabase.from("sales_velocity_cache").insert({
          business_id: businessId,
          inventory_id: inventoryId,
          velocity_7d: velocity7d,
          velocity_30d: velocity30d,
          velocity_90d: velocity90d,
          last_7d_units: units7d,
          last_30d_units: units30d,
          last_90d_units: units90d,
        });
      }

      return true;
    } catch (error) {
      console.error("Error updating velocity cache:", error);
      return false;
    }
  }
}

export const inventoryEngine = new InventoryEngine();
