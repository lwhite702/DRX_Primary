import { z } from "zod";
import { posCheckoutSchema, type POSCheckout, type SalesLineItem } from "@/lib/validations/schemas";
import { getSupabaseClient } from "@/lib/supabase/client";

export type MiscFee = {
  type: string;
  amount: number;
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
    this.cart.total = this.cart.subtotal + this.cart.tax_amount;
  }

  // Get current cart state
  getCart(): CartState {
    return { ...this.cart };
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
    };
    return this.cart;
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

      const current_balance = creditLimit ? Number(creditLimit.current_balance || 0) : 0;
      const credit_limit = Number(customer.credit_limit || 1000);
      const ai_limit = Number(customer.credit_limit_ai_recommended || credit_limit);

      // Check against AI recommended limit (softer check - generates warning)
      const projected_balance = current_balance + this.cart.total;
      
      if (ai_limit > 0 && projected_balance > ai_limit) {
        return {
          valid: true,
          credit_limit,
          ai_limit,
          current_balance,
          warning: `Transaction would exceed AI recommended limit (${ai_limit.toFixed(2)}). Manager approval required.`,
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

    // Validate credit limit (AI-aware)
    const creditValidation = await this.validateCreditLimit(business_id);
    if (!creditValidation.valid) {
      return {
        success: false,
        error: `Credit limit exceeded. Limit: ${creditValidation.credit_limit?.toFixed(2)}, Current Balance: ${creditValidation.current_balance?.toFixed(2)}`,
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

    // Call RPC function
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

