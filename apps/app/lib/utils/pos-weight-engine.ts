import { createAppClient } from "@/lib/data/client/supabase-client";

export interface WeightBasedCartItem {
  inventory_id: string;
  product_name: string;
  sku: string;
  weight_grams: number;
  price_per_gram: number;
  bulk_tier_applied?: string;
  loyalty_discount_applied?: number;
  line_total: number;
}

export interface BulkPricingTier {
  min_weight_grams: number;
  max_weight_grams?: number;
  price_per_gram: number;
  tier_name: string;
}

export interface LoyaltyInfo {
  loyalty_tier: string;
  discount_rate: number;
  purchase_count: number;
}

export class POSWeightEngine {
  private supabase = createAppClient();

  /**
   * Get bulk pricing for a specific weight
   */
  async getBulkPricing(
    businessId: string,
    inventoryId: string,
    weightGrams: number
  ): Promise<{
    price_per_gram: number;
    tier_name?: string;
    total_price: number;
  }> {
    if (!this.supabase) {
      return { price_per_gram: 0, total_price: 0 };
    }

    try {
      const { data, error } = await this.supabase.rpc("get_bulk_pricing", {
        p_business_id: businessId,
        p_inventory_id: inventoryId,
        p_weight_grams: weightGrams,
      });

      if (error || !data) {
        console.warn("Failed to get bulk pricing, using default");
        // Fallback to base price
        const { data: inv } = await this.supabase
          .from("inventory")
          .select("price_per_gram")
          .eq("id", inventoryId)
          .single();

        const pricePerGram = inv?.price_per_gram || 0;
        return {
          price_per_gram: pricePerGram,
          total_price: weightGrams * pricePerGram,
        };
      }

      return data[0];
    } catch (error) {
      console.error("Error getting bulk pricing:", error);
      return { price_per_gram: 0, total_price: 0 };
    }
  }

  /**
   * Get loyalty information for customer
   */
  async getLoyaltyInfo(
    businessId: string,
    customerId: string
  ): Promise<LoyaltyInfo> {
    if (!this.supabase) {
      return {
        loyalty_tier: "none",
        discount_rate: 0,
        purchase_count: 0,
      };
    }

    try {
      const { data, error } = await this.supabase
        .from("customers")
        .select("loyalty_tier, discount_rate, purchase_count")
        .eq("id", customerId)
        .eq("business_id", businessId)
        .single();

      if (error || !data) {
        return {
          loyalty_tier: "none",
          discount_rate: 0,
          purchase_count: 0,
        };
      }

      return {
        loyalty_tier: data.loyalty_tier || "none",
        discount_rate: data.discount_rate || 0,
        purchase_count: data.purchase_count || 0,
      };
    } catch (error) {
      console.error("Error getting loyalty info:", error);
      return {
        loyalty_tier: "none",
        discount_rate: 0,
        purchase_count: 0,
      };
    }
  }

  /**
   * Apply loyalty discount to price
   */
  async applyLoyaltyDiscount(
    businessId: string,
    customerId: string,
    subtotal: number
  ): Promise<{
    loyalty_tier: string;
    discount_rate: number;
    discount_amount: number;
    final_price: number;
  }> {
    if (!this.supabase) {
      return {
        loyalty_tier: "none",
        discount_rate: 0,
        discount_amount: 0,
        final_price: subtotal,
      };
    }

    try {
      const { data, error } = await this.supabase.rpc(
        "apply_loyalty_discount",
        {
          p_business_id: businessId,
          p_customer_id: customerId,
          p_subtotal: subtotal,
        }
      );

      if (error || !data) {
        return {
          loyalty_tier: "none",
          discount_rate: 0,
          discount_amount: 0,
          final_price: subtotal,
        };
      }

      return data[0];
    } catch (error) {
      console.error("Error applying loyalty discount:", error);
      return {
        loyalty_tier: "none",
        discount_rate: 0,
        discount_amount: 0,
        final_price: subtotal,
      };
    }
  }

  /**
   * Validate weight-based inventory
   */
  async validateWeightAvailable(
    businessId: string,
    inventoryId: string,
    weightGrams: number
  ): Promise<{
    valid: boolean;
    available_weight_grams?: number;
    error?: string;
  }> {
    if (!this.supabase) {
      return { valid: false, error: "Supabase client not available" };
    }

    try {
      const { data, error } = await this.supabase
        .from("inventory")
        .select("inventory_in_grams, product_name")
        .eq("id", inventoryId)
        .eq("business_id", businessId)
        .single();

      if (error || !data) {
        return {
          valid: false,
          error: "Inventory item not found",
        };
      }

      if (data.inventory_in_grams < weightGrams) {
        return {
          valid: false,
          available_weight_grams: data.inventory_in_grams,
          error: `Insufficient weight. Available: ${data.inventory_in_grams.toFixed(2)}g, Requested: ${weightGrams.toFixed(2)}g`,
        };
      }

      return {
        valid: true,
        available_weight_grams: data.inventory_in_grams,
      };
    } catch (error) {
      console.error("Error validating weight:", error);
      return { valid: false, error: "Failed to validate weight" };
    }
  }

  /**
   * Get default bulk pricing tiers from business settings
   */
  async getDefaultBulkPricingTiers(
    businessId: string
  ): Promise<BulkPricingTier[]> {
    if (!this.supabase) {
      return [];
    }

    try {
      const { data, error } = await this.supabase
        .from("business_settings")
        .select("default_bulk_pricing_tiers")
        .eq("business_id", businessId)
        .single();

      if (error || !data) {
        return [
          {
            min_weight_grams: 1,
            max_weight_grams: 3.4,
            price_per_gram: 0,
            tier_name: "1g",
          },
          {
            min_weight_grams: 3.5,
            max_weight_grams: 6.9,
            price_per_gram: 0,
            tier_name: "3.5g",
          },
          {
            min_weight_grams: 7,
            max_weight_grams: 9.9,
            price_per_gram: 0,
            tier_name: "7g",
          },
          {
            min_weight_grams: 10,
            price_per_gram: 0,
            tier_name: "10g+",
          },
        ];
      }

      return data.default_bulk_pricing_tiers || [];
    } catch (error) {
      console.error("Error fetching bulk pricing tiers:", error);
      return [];
    }
  }

  /**
   * Record shrinkage event
   */
  async recordShrinkage(
    businessId: string,
    inventoryId: string,
    quantityGrams: number,
    shrinkageType: string = "personal_use",
    note?: string
  ): Promise<{
    success: boolean;
    shrinkage_id?: string;
    new_inventory_grams?: number;
    error?: string;
  }> {
    if (!this.supabase) {
      return { success: false, error: "Supabase client not available" };
    }

    try {
      const { data, error } = await this.supabase.rpc(
        "record_shrinkage_event",
        {
          p_business_id: businessId,
          p_inventory_id: inventoryId,
          p_quantity_grams: quantityGrams,
          p_shrinkage_type: shrinkageType,
          p_note: note,
        }
      );

      if (error || !data || !data[0].success) {
        return {
          success: false,
          error: error?.message || data?.[0]?.error_message || "Failed to record shrinkage",
        };
      }

      return {
        success: true,
        shrinkage_id: data[0].shrinkage_id,
        new_inventory_grams: data[0].new_inventory_grams,
      };
    } catch (error) {
      console.error("Error recording shrinkage:", error);
      return {
        success: false,
        error: error instanceof Error ? error.message : "Failed to record shrinkage",
      };
    }
  }

  /**
   * Record no-sale / drawer event
   */
  async recordDrawerEvent(
    businessId: string,
    eventType: string = "no_sale",
    note?: string
  ): Promise<{
    success: boolean;
    event_id?: string;
    error?: string;
  }> {
    if (!this.supabase) {
      return { success: false, error: "Supabase client not available" };
    }

    try {
      const { data, error } = await this.supabase.rpc("record_drawer_event", {
        p_business_id: businessId,
        p_event_type: eventType,
        p_note: note,
      });

      if (error || !data || !data[0].success) {
        return {
          success: false,
          error: error?.message || data?.[0]?.error_message || "Failed to record drawer event",
        };
      }

      return {
        success: true,
        event_id: data[0].event_id,
      };
    } catch (error) {
      console.error("Error recording drawer event:", error);
      return {
        success: false,
        error: error instanceof Error ? error.message : "Failed to record drawer event",
      };
    }
  }

  /**
   * Get random inventory check product
   */
  async getRandomCheckProduct(
    businessId: string
  ): Promise<{
    inventory_id?: string;
    product_name?: string;
    expected_weight_grams?: number;
    error?: string;
  }> {
    if (!this.supabase) {
      return { error: "Supabase client not available" };
    }

    try {
      const { data, error } = await this.supabase.rpc(
        "get_random_inventory_check_product",
        {
          p_business_id: businessId,
        }
      );

      if (error || !data || data.length === 0) {
        return { error: "No products available for check" };
      }

      return data[0];
    } catch (error) {
      console.error("Error getting random check product:", error);
      return { error: "Failed to get random check product" };
    }
  }

  /**
   * Record inventory check
   */
  async recordInventoryCheck(
    businessId: string,
    inventoryId: string,
    measuredWeightGrams: number
  ): Promise<{
    success: boolean;
    check_id?: string;
    delta_grams?: number;
    delta_percentage?: number;
    discrepancy_flagged?: boolean;
    error?: string;
  }> {
    if (!this.supabase) {
      return { success: false, error: "Supabase client not available" };
    }

    try {
      const { data, error } = await this.supabase.rpc(
        "record_inventory_check",
        {
          p_business_id: businessId,
          p_inventory_id: inventoryId,
          p_measured_weight_grams: measuredWeightGrams,
        }
      );

      if (error || !data || !data[0].success) {
        return {
          success: false,
          error: error?.message || data?.[0]?.error_message || "Failed to record inventory check",
        };
      }

      return {
        success: true,
        check_id: data[0].check_id,
        delta_grams: data[0].delta_grams,
        delta_percentage: data[0].delta_percentage,
        discrepancy_flagged: data[0].discrepancy_flagged,
      };
    } catch (error) {
      console.error("Error recording inventory check:", error);
      return {
        success: false,
        error: error instanceof Error ? error.message : "Failed to record inventory check",
      };
    }
  }

  /**
   * Update customer loyalty tier and get new discount
   */
  async updateCustomerLoyaltyTier(
    businessId: string,
    customerId: string
  ): Promise<{
    success: boolean;
    old_tier?: string;
    new_tier?: string;
    new_discount?: number;
    tier_changed?: boolean;
    error?: string;
  }> {
    if (!this.supabase) {
      return { success: false, error: "Supabase client not available" };
    }

    try {
      const { data, error } = await this.supabase.rpc(
        "update_customer_loyalty_tier",
        {
          p_business_id: businessId,
          p_customer_id: customerId,
        }
      );

      if (error || !data || !data[0].success) {
        return {
          success: false,
          error: error?.message || data?.[0]?.error_message || "Failed to update loyalty tier",
        };
      }

      const tierChanged = data[0].old_tier !== data[0].new_tier;

      return {
        success: true,
        old_tier: data[0].old_tier,
        new_tier: data[0].new_tier,
        new_discount: data[0].new_discount,
        tier_changed: tierChanged,
      };
    } catch (error) {
      console.error("Error updating loyalty tier:", error);
      return {
        success: false,
        error: error instanceof Error ? error.message : "Failed to update loyalty tier",
      };
    }
  }

  /**
   * Check if random inventory check should be triggered
   */
  async shouldTriggerRandomCheck(businessId: string): Promise<{
    should_check: boolean;
    transaction_count?: number;
    check_frequency?: number;
  }> {
    if (!this.supabase) {
      return { should_check: false };
    }

    try {
      const { data, error } = await this.supabase.rpc(
        "increment_transaction_counter",
        {
          p_business_id: businessId,
        }
      );

      if (error || !data) {
        return { should_check: false };
      }

      return {
        should_check: data[0].should_prompt_check,
        transaction_count: data[0].current_count,
        check_frequency: data[0].check_frequency,
      };
    } catch (error) {
      console.error("Error checking random trigger:", error);
      return { should_check: false };
    }
  }
}

export const posWeightEngine = new POSWeightEngine();
