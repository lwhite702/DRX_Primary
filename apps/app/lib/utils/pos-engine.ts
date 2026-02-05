import { z } from "zod";
import {
  posCheckoutSchema,
  type POSCheckout,
  type SalesLineItem,
} from "@/lib/validations/schemas";
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
  overridden_price?: number;
  original_price?: number;
  override_reason?: string;
  unit_cost?: number;
}

export interface CartState {
  items: CartItem[];
  customer_id?: string;
  payment_method: "cash" | "card" | "credit" | "mixed" | "zelle";
  payment_ref?: string;
  tax_rate: number;
  tax_enabled: boolean;
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
      tax_enabled: true, // Default enabled
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
  setPaymentMethod(method: "cash" | "card" | "credit" | "mixed" | "zelle") {
    this.cart.payment_method = method;
    return this.cart;
  }

  // Set payment reference (for Zelle, etc.)
  setPaymentRef(ref: string) {
    this.cart.payment_ref = ref;
    return this.cart;
  }

  // Set tax rate
  setTaxRate(rate: number) {
    this.cart.tax_rate = rate;
    this.recalculate();
    return this.cart;
  }

  // Set tax enabled/disabled
  setTaxEnabled(enabled: boolean) {
    this.cart.tax_enabled = enabled;
    this.recalculate();
    return this.cart;
  }

  // Override item price
  overrideItemPrice(inventory_id: string, new_price: number, reason?: string) {
    const item = this.cart.items.find(
      (item) => item.inventory_id === inventory_id
    );
    if (item) {
      item.original_price = item.unit_price;
      item.overridden_price = new_price;
      item.unit_price = new_price;
      item.override_reason = reason;
      item.line_total = item.quantity * new_price;
      this.recalculate();
    }
    return this.cart;
  }

  // Clear price override for an item
  clearPriceOverride(inventory_id: string) {
    const item = this.cart.items.find(
      (item) => item.inventory_id === inventory_id
    );
    if (item && item.original_price) {
      item.unit_price = item.original_price;
      item.overridden_price = undefined;
      item.original_price = undefined;
      item.override_reason = undefined;
      item.line_total = item.quantity * item.unit_price;
      this.recalculate();
    }
    return this.cart;
  }

  // Recalculate totals
  private recalculate() {
    this.cart.subtotal = this.cart.items.reduce(
      (sum, item) => sum + item.line_total,
      0
    );
    // Only calculate tax if tax is enabled
    this.cart.tax_amount = this.cart.tax_enabled
      ? this.cart.subtotal * this.cart.tax_rate
      : 0;
    this.cart.total =
      this.cart.subtotal + this.cart.tax_amount + this.cart.delivery_price;

    if (this.cart.amount_paid) {
      this.cart.change_amount = this.cart.amount_paid - this.cart.total;
    }
  }

  // Get current cart state
  getCart(): CartState {
    return { ...this.cart };
  }

  // Set delivery management
  setDelivery(
    delivery_id: string | undefined,
    delivery_address?: string,
    delivery_price?: number
  ) {
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
  calculateQuantityFromAmount(
    unitPrice: number,
    amountPaid: number
  ): {
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
      tax_enabled: true,
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
  async getAIPricingRecommendations(
    business_id: string
  ): Promise<AIPricingRecommendation[]> {
    if (!this.supabase) {
      return [];
    }

    const { data, error } = await this.supabase.rpc(
      "get_ai_pricing_recommendations",
      {
        p_business_id: business_id,
        p_limit: 10,
      }
    );

    if (error || !data) {
      return [];
    }

    return data;
  }

  // Apply AI pricing recommendation
  async applyAIPricingRecommendation(
    business_id: string,
    recommendationId: string
  ): Promise<{
    success: boolean;
    message?: string;
    newPrice?: number;
  }> {
    if (!this.supabase) {
      return { success: false, message: "Supabase client not available" };
    }

    const { data, error } = await this.supabase.rpc(
      "apply_ai_pricing_recommendation",
      {
        p_business_id: business_id,
        p_recommendation_id: recommendationId,
      }
    );

    if (error || !data) {
      return {
        success: false,
        message: error?.message || "Failed to apply recommendation",
      };
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
      return {
        valid: false,
        errors: [
          { inventory_id: "", message: "Supabase client not available" },
        ],
      };
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

  // Validate credit limit (AI-aware)
  async validateCreditLimit(business_id: string): Promise<{
    valid: boolean;
    credit_limit?: number;
    ai_limit?: number;
    current_balance?: number;
    warning?: string;
  }> {
    if (!this.cart.customer_id || this.cart.payment_method !== "credit") {
      return { valid: true };
    }

    if (!this.supabase) {
      return { valid: true, warning: "Could not validate credit limits" };
    }

    try {
      // Get customer credit info
      const { data: customer, error: customerError } = await this.supabase
        .from("customers")
        .select("credit_limit, credit_limit_ai_recommended")
        .eq("id", this.cart.customer_id)
        .single();

      if (customerError || !customer) {
        return { valid: true, warning: "Customer not found for credit check" };
      }

      // Get current balance
      const { data: creditLimit, error: balanceError } = await this.supabase
        .from("credit_limits")
        .select("current_balance")
        .eq("customer_id", this.cart.customer_id)
        .eq("business_id", business_id)
        .single();

      const current_balance = creditLimit
        ? Number(creditLimit.current_balance || 0)
        : 0;
      const credit_limit = Number(customer.credit_limit || 1000);
      const ai_limit = Number(
        customer.credit_limit_ai_recommended || credit_limit
      );

      // Check against AI recommended limit (softer check - generates warning)
      const projected_balance = current_balance + this.cart.total;

      if (ai_limit > 0 && projected_balance > ai_limit) {
        return {
          valid: true,
          credit_limit,
          ai_limit,
          current_balance,
          warning: `Transaction would exceed AI recommended limit (${ai_limit.toFixed(
            2
          )}). Manager approval required.`,
        };
      }

      // Check against hard limit (hard block)
      if (credit_limit > 0 && projected_balance > credit_limit) {
        return {
          valid: false,
          credit_limit,
          ai_limit,
          current_balance,
        };
      }

      return {
        valid: true,
        credit_limit,
        ai_limit,
        current_balance,
      };
    } catch (error) {
      console.error("Error validating credit limit:", error);
      return { valid: true, warning: "Could not validate credit limits" };
    }
  }

  // Process checkout
  async checkout(
    business_id: string,
    fees: MiscFee[] = []
  ): Promise<{
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

    // Validate credit limit (AI-aware)
    const creditValidation = await this.validateCreditLimit(business_id);
    if (!creditValidation.valid) {
      return {
        success: false,
        error: `Credit limit exceeded. Limit: ${creditValidation.credit_limit?.toFixed(
          2
        )}, Current Balance: ${creditValidation.current_balance?.toFixed(2)}`,
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
      payment_ref: this.cart.payment_ref, // Include payment reference
      line_items: this.cart.items.map((item) => ({
        inventory_id: item.inventory_id,
        quantity: item.quantity,
        unit_price: item.unit_price,
        overridden_price: item.overridden_price,
        override_reason: item.override_reason,
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

    // Call RPC function - use enhanced version for all standard checkouts
    // We treat Zelle as a standard checkout that might have extra metadata (ref)
    // Note: The RPC might need to be fast-followed to explicitly store payment_ref if it doesn't already.
    // Since we just added the column, we might need to manually update the RPC to insert it, or assuming
    // the RPC uses a simple insert, we might need to adjust it.
    // However, if the RPC just inserts into `sales`, we need to make sure we pass `payment_ref`.
    // Validating current RPCs: `process_pos_checkout_enhanced` likely takes specific params.
    // If we assume we can't easily modify the RPC function definition from here without a migration file specifically for it,
    // we should use the `execute_sql` tool or assume standard insert if possible.
    // BUT, the existing code calls `process_pos_checkout_enhanced`.
    // Let's rely on the RPC being updated or using a direct insert if the RPC doesn't support it yet.
    // Actually, I should update the RPC in a migration if I want to support it properly.
    // For now, I will pass it to the RPC call, but I suspect the RPC won't accept the extra parameter yet.
    // Let's check if I can just use a direct insert for Zelle or if I really need the RPC.
    // The RPC handles inventory deduction, etc. so it's critical.

    // STRATEGY: I will modify the RPC call to include `p_payment_ref` IF I have updated the RPC.
    // Since I haven't updated the RPC function signature in the DB yet (only the table), I need to create a migration for the RPC update.
    // I will stick to the existing RPC for now and proceed with the assumption that I will update the RPC next.

    // Wait, I can't pass parameters the RPC doesn't expect.
    // I need to update the RPC function signature.

    const { data, error } = await this.supabase.rpc(
      "process_pos_checkout_enhanced",
      {
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
        // p_payment_ref: checkoutData.payment_ref || null // TODO: Update RPC to accept this
      }
    );

    if (error) {
      return { success: false, error: error.message };
    }

    if (data && data.length > 0 && !data[0].success) {
      return { success: false, error: data[0].error_message };
    }

    // Post-checkout: Update payment_ref if it exists and wasn't handled by RPC
    if (checkoutData.payment_ref && data?.[0]?.sale_id) {
      const { error: updateError } = await this.supabase
        .from("sales")
        .update({ payment_ref: checkoutData.payment_ref })
        .eq("id", data[0].sale_id);

      if (updateError) {
        console.error("Failed to save payment ref:", updateError);
      }
    }

    // Clear cart on success
    this.clearCart();

    return { success: true, sale_id: data?.[0]?.sale_id };
  }
}
