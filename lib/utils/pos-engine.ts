import { z } from "zod";
import { posCheckoutSchema, type POSCheckout, type SalesLineItem } from "@/lib/validations/schemas";
import { getSupabaseClient } from "@/lib/supabase/client";

export type MiscFee = {
  type: string;
  amount: number;
};

export type DeliveryOption = {
  id: string;
  name: string;
  provider?: string;
  base_price: number;
  allow_price_override: boolean;
};

export type AIPricingRecommendation = {
  id: string;
  inventory_id: string;
  product_name: string;
  current_price: number;
  recommended_price: number;
  confidence_score: number;
  price_change_percentage: number;
  recommendation_reason?: string;
};

export const calculateFees = (fees: MiscFee[]): number =>
  fees.reduce((sum, f) => sum + f.amount, 0);

export interface CartItem {
  inventory_id: string;
  product_name: string;
  sku: string;
  quantity: number;
  unit_price: number;
  line_total: number;
}

export interface CartState {
  items: CartItem[];
  customer_id?: string;
  payment_method: "cash" | "card" | "credit" | "mixed";
  tax_rate: number;
  subtotal: number;
  tax_amount: number;
  total: number;
  delivery_management_id?: string;
  delivery_address?: string;
  delivery_price: number;
  amount_paid?: number;
  change_amount?: number;
}

export class POSEngine {
  private cart: CartState;
  private supabase = getSupabaseClient();

  constructor() {
    this.cart = {
      items: [],
      payment_method: "cash",
      tax_rate: 0.08, // Default 8% tax
      subtotal: 0,
      tax_amount: 0,
      total: 0,
      delivery_price: 0,
    };
  }

  // Add item to cart
  addItem(item: Omit<CartItem, "line_total">) {
    const line_total = item.quantity * item.unit_price;
    const cartItem: CartItem = { ...item, line_total };

    // Check if item already exists, update quantity
    const existingIndex = this.cart.items.findIndex(
      (i) => i.inventory_id === item.inventory_id
    );

    if (existingIndex >= 0) {
      this.cart.items[existingIndex].quantity += item.quantity;
      this.cart.items[existingIndex].line_total =
        this.cart.items[existingIndex].quantity *
        this.cart.items[existingIndex].unit_price;
    } else {
      this.cart.items.push(cartItem);
    }

    this.recalculate();
    return this.cart;
  }

  // Remove item from cart
  removeItem(inventory_id: string) {
    this.cart.items = this.cart.items.filter(
      (item) => item.inventory_id !== inventory_id
    );
    this.recalculate();
    return this.cart;
  }

  // Update item quantity
  updateQuantity(inventory_id: string, quantity: number) {
    if (quantity <= 0) {
      return this.removeItem(inventory_id);
    }

    const item = this.cart.items.find(
      (item) => item.inventory_id === inventory_id
    );
    if (item) {
      item.quantity = quantity;
      item.line_total = item.quantity * item.unit_price;
      this.recalculate();
    }
    return this.cart;
  }

  // Set customer
  setCustomer(customer_id: string | undefined) {
    this.cart.customer_id = customer_id;
    return this.cart;
  }

  // Set payment method
  setPaymentMethod(method: "cash" | "card" | "credit" | "mixed") {
    this.cart.payment_method = method;
    return this.cart;
  }

  // Set tax rate
  setTaxRate(rate: number) {
    this.cart.tax_rate = rate;
    this.recalculate();
    return this.cart;
  }

  // Recalculate totals
  private recalculate() {
    this.cart.subtotal = this.cart.items.reduce(
      (sum, item) => sum + item.line_total,
      0
    );
    this.cart.tax_amount = this.cart.subtotal * this.cart.tax_rate;
    this.cart.total = this.cart.subtotal + this.cart.tax_amount + this.cart.delivery_price;
    
    if (this.cart.amount_paid) {
      this.cart.change_amount = this.cart.amount_paid - this.cart.total;
    }
  }

  // Get current cart state
  getCart(): CartState {
    return { ...this.cart };
  }

  // Set delivery management
  setDelivery(delivery_id: string | undefined, delivery_address?: string, delivery_price?: number) {
    this.cart.delivery_management_id = delivery_id;
    this.cart.delivery_address = delivery_address;
    if (delivery_price !== undefined) {
      this.cart.delivery_price = delivery_price;
      this.recalculate();
    }
    return this.cart;
  }

  // Set amount paid and calculate change
  setAmountPaid(amount: number) {
    this.cart.amount_paid = amount;
    this.recalculate();
    return this.cart;
  }

  // Calculate product quantity from amount paid (for single item)
  calculateQuantityFromAmount(unitPrice: number, amountPaid: number): {
    quantity: number;
    amountUsed: number;
    changeAmount: number;
  } {
    const quantity = Math.floor(amountPaid / unitPrice);
    const amountUsed = quantity * unitPrice;
    const changeAmount = amountPaid - amountUsed;
    return { quantity, amountUsed, changeAmount };
  }

  // Clear cart
  clearCart() {
    this.cart = {
      items: [],
      payment_method: "cash",
      tax_rate: 0.08,
      subtotal: 0,
      tax_amount: 0,
      total: 0,
      delivery_price: 0,
    };
    return this.cart;
  }

  // Get delivery options
  async getDeliveryOptions(business_id: string): Promise<DeliveryOption[]> {
    if (!this.supabase) {
      return [];
    }

    const { data, error } = await this.supabase
      .from("delivery_management")
      .select("id, name, provider, base_price, allow_price_override")
      .eq("business_id", business_id)
      .eq("is_active", true);

    if (error || !data) {
      return [];
    }

    return data;
  }

  // Get AI pricing recommendations
  async getAIPricingRecommendations(business_id: string): Promise<AIPricingRecommendation[]> {
    if (!this.supabase) {
      return [];
    }

    const { data, error } = await this.supabase.rpc("get_ai_pricing_recommendations", {
      p_business_id: business_id,
      p_limit: 10,
    });

    if (error || !data) {
      return [];
    }

    return data;
  }

  // Apply AI pricing recommendation
  async applyAIPricingRecommendation(
    business_id: string,
    recommendationId: string,
  ): Promise<{
    success: boolean;
    message?: string;
    newPrice?: number;
  }> {
    if (!this.supabase) {
      return { success: false, message: "Supabase client not available" };
    }

    const { data, error } = await this.supabase.rpc("apply_ai_pricing_recommendation", {
      p_business_id: business_id,
      p_recommendation_id: recommendationId,
    });

    if (error || !data) {
      return { success: false, message: error?.message || "Failed to apply recommendation" };
    }

    return {
      success: data.success,
      message: data.message,
      newPrice: data.new_price,
    };
  }

  // Validate stock availability
  async validateStock(business_id: string): Promise<{
    valid: boolean;
    errors: Array<{ inventory_id: string; message: string }>;
  }> {
    if (!this.supabase) {
      return { valid: false, errors: [{ inventory_id: "", message: "Supabase client not available" }] };
    }

    const errors: Array<{ inventory_id: string; message: string }> = [];

    for (const item of this.cart.items) {
      const { data, error } = await this.supabase
        .from("inventory")
        .select("quantity_on_hand, product_name")
        .eq("id", item.inventory_id)
        .eq("business_id", business_id)
        .single();

      if (error || !data) {
        errors.push({
          inventory_id: item.inventory_id,
          message: `Item not found: ${item.product_name}`,
        });
        continue;
      }

      if (data.quantity_on_hand < item.quantity) {
        errors.push({
          inventory_id: item.inventory_id,
          message: `Insufficient stock. Available: ${data.quantity_on_hand}, Requested: ${item.quantity}`,
        });
      }
    }

    return {
      valid: errors.length === 0,
      errors,
    };
  }

  // Process checkout
  async checkout(business_id: string, fees: MiscFee[] = []): Promise<{
    success: boolean;
    sale_id?: string;
    error?: string;
  }> {
    if (!this.supabase) {
      return { success: false, error: "Supabase client not available" };
    }

    // Validate stock
    const stockValidation = await this.validateStock(business_id);
    if (!stockValidation.valid) {
      return {
        success: false,
        error: stockValidation.errors.map((e) => e.message).join(", "),
      };
    }

    // Validate cart
    if (this.cart.items.length === 0) {
      return { success: false, error: "Cart is empty" };
    }

    if (!this.cart.payment_method) {
      return { success: false, error: "Payment method required" };
    }

    // Prepare checkout data
    const checkoutData: POSCheckout = {
      business_id,
      customer_id: this.cart.customer_id,
      order_type: "retail",
      payment_method: this.cart.payment_method,
      line_items: this.cart.items.map((item) => ({
        inventory_id: item.inventory_id,
        quantity: item.quantity,
        unit_price: item.unit_price,
      })),
      tax_amount: this.cart.tax_amount,
      fees: fees,
    };

    // Validate with Zod
    const validation = posCheckoutSchema.safeParse(checkoutData);
    if (!validation.success) {
      return {
        success: false,
        error: validation.error.errors.map((e) => e.message).join(", "),
      };
    }

    // Call RPC function - use enhanced version if delivery or amount_paid is set
    if (this.cart.delivery_management_id || this.cart.amount_paid) {
      const { data, error } = await this.supabase.rpc("process_pos_checkout_enhanced", {
        p_business_id: business_id,
        p_customer_id: this.cart.customer_id || null,
        p_order_type: checkoutData.order_type,
        p_payment_method: checkoutData.payment_method,
        p_line_items: checkoutData.line_items,
        p_tax_amount: this.cart.tax_amount,
        p_fees: fees,
        p_delivery_management_id: this.cart.delivery_management_id || null,
        p_delivery_address: this.cart.delivery_address || null,
        p_delivery_price: this.cart.delivery_price || 0,
        p_amount_paid: this.cart.amount_paid || 0,
      });

      if (error) {
        return { success: false, error: error.message };
      }

      if (data && data.length > 0 && !data[0].success) {
        return { success: false, error: data[0].error_message };
      }

      // Clear cart on success
      this.clearCart();

      return { success: true, sale_id: data?.[0]?.sale_id };
    } else {
      const { data, error } = await this.supabase.rpc("process_pos_checkout", {
        p_business_id: business_id,
        p_customer_id: this.cart.customer_id || null,
        p_order_type: checkoutData.order_type,
        p_payment_method: checkoutData.payment_method,
        p_line_items: checkoutData.line_items,
        p_tax_amount: this.cart.tax_amount,
        p_fees: fees,
      });

      if (error) {
        return { success: false, error: error.message };
      }

      // Clear cart on success
      this.clearCart();

      return { success: true, sale_id: data };
    }
  }
}

