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
  weight_grams?: number;
  price_per_gram?: number;
  bulk_tier_applied?: string;
  loyalty_discount_applied?: number;
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

  // Get current cart state
  getCart() {
    return { ...this.cart };
  }

  // Add item to cart
  addItem(item: Omit<CartItem, "line_total">) {
    const line_total = item.quantity * item.unit_price;
    const cartItem: CartItem = { ...item, line_total };

    const existingIndex = this.cart.items.findIndex(
      (i) => i.inventory_id === item.inventory_id,
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
      (item) => item.inventory_id !== inventory_id,
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
      (item) => item.inventory_id === inventory_id,
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

  // Set payment reference
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

  // Toggle tax
  setTaxEnabled(enabled: boolean) {
    this.cart.tax_enabled = enabled;
    this.recalculate();
    return this.cart;
  }

  // Set delivery
  setDelivery(delivery_id: string | undefined, address: string, price: number) {
    this.cart.delivery_management_id = delivery_id;
    this.cart.delivery_address = address;
    this.cart.delivery_price = price;
    this.recalculate();
    return this.cart;
  }

  // Set amount paid
  setAmountPaid(amount: number) {
    this.cart.amount_paid = amount;
    this.recalculate();
    return this.cart;
  }

  // Price override
  overrideItemPrice(inventory_id: string, newPrice: number, reason?: string) {
    const item = this.cart.items.find((i) => i.inventory_id === inventory_id);
    if (item) {
      if (!item.original_price) {
        item.original_price = item.unit_price;
      }
      item.overridden_price = newPrice;
      item.unit_price = newPrice;
      item.override_reason = reason;
      item.line_total = item.quantity * item.unit_price;
      this.recalculate();
    }
    return this.cart;
  }

  // Recalculate totals
  private recalculate() {
    this.cart.subtotal = this.cart.items.reduce(
      (sum, item) => sum + item.line_total,
      0,
    );

    this.cart.tax_amount = this.cart.tax_enabled
      ? this.cart.subtotal * this.cart.tax_rate
      : 0;

    this.cart.total =
      this.cart.subtotal + this.cart.tax_amount + this.cart.delivery_price;

    if (this.cart.amount_paid) {
      this.cart.change_amount = this.cart.amount_paid - this.cart.total;
    } else {
      this.cart.change_amount = 0;
    }
  }

  // --- API CALLS (Bypassing blocked Supabase) ---

  async validateStock(business_id: string): Promise<{
    valid: boolean;
    errors: Array<{ inventory_id: string; message: string }>;
  }> {
    try {
      const res = await fetch("/api/pos/preflight", {
        method: "POST",
        headers: { "Content-Type": "application/json", "x-business-id": business_id },
        body: JSON.stringify({
          businessId: business_id,
          items: this.cart.items.map((i) => ({
            inventory_id: i.inventory_id,
            quantity: i.quantity,
            unit_price: i.unit_price,
            weight_grams: i.weight_grams,
          })),
        }),
      });
      if (!res.ok) throw new Error("Checkout validation is unavailable");
      const payload = await res.json();
      return {
        valid: Boolean(payload?.stock?.valid ?? payload?.valid),
        errors: Array.isArray(payload?.stock?.errors)
          ? payload.stock.errors.map((entry: { inventoryId?: string; message: string }) => ({
              inventory_id: entry.inventoryId ?? "",
              message: entry.message,
            }))
          : [],
      };
    } catch (e: any) {
      return {
        valid: false,
        errors: [
          {
            inventory_id: "",
            message: `Stock validation failed: ${e.message}`,
          },
        ],
      };
    }
  }

  async validateCreditLimit(business_id: string): Promise<{
    valid: boolean;
    credit_limit?: number;
    ai_limit?: number;
    current_balance?: number;
    warning?: string;
  }> {
    if (!this.cart.customer_id) return { valid: true };

    try {
      const res = await fetch("/api/pos/preflight", {
        method: "POST",
        headers: { "Content-Type": "application/json", "x-business-id": business_id },
        body: JSON.stringify({
          businessId: business_id,
          customerId: this.cart.customer_id,
          amount: Math.round(this.cart.total * 100) / 100,
          items: this.cart.items.map((i) => ({
            inventory_id: i.inventory_id,
            quantity: i.quantity,
            unit_price: i.unit_price,
            weight_grams: i.weight_grams,
          })),
        }),
      });
      if (!res.ok) throw new Error("Checkout validation is unavailable");
      const payload = await res.json();
      if (payload?.credit) {
        return {
          valid: payload.credit.valid === true,
          credit_limit: payload.credit.maxLimit,
          current_balance: payload.credit.currentBalance,
          warning: payload.credit.warning,
        };
      }
      return { valid: false, warning: "Credit validation unavailable" };
    } catch (e: any) {
      return { valid: false, warning: "Credit validation unavailable" };
    }
  }

  async getDeliveryOptions(business_id: string): Promise<DeliveryOption[]> {
    try {
      const res = await fetch(
        `/api/pos/delivery-options?businessId=${business_id}`,
      );
      if (!res.ok) return [];
      return await res.json();
    } catch (e) {
      console.error("Failed to get delivery options:", e);
      return [];
    }
  }

  async getAIPricingRecommendations(
    business_id: string,
  ): Promise<AIPricingRecommendation[]> {
    try {
      const res = await fetch(`/api/pos/ai-pricing?businessId=${business_id}`);
      if (!res.ok) return [];
      return await res.json();
    } catch (e) {
      console.error("Failed to get AI recommendations:", e);
      return [];
    }
  }

  async applyAIPricingRecommendation(
    business_id: string,
    recommendation_id: string,
  ): Promise<{ success: boolean; message?: string; newPrice?: number }> {
    try {
      const res = await fetch("/api/pos/apply-pricing", {
        method: "POST",
        body: JSON.stringify({ recommendationId: recommendation_id }),
      });
      return await res.json();
    } catch (e: any) {
      return { success: false, message: e.message };
    }
  }

  async checkout(
    business_id: string,
    fees: MiscFee[] = [],
  ): Promise<{
    success: boolean;
    saleId?: string;
    orderNumber?: string;
    total?: number;
    changeAmount?: number;
    error?: string;
  }> {
    // Validate stock
    const stockValidation = await this.validateStock(business_id);
    if (!stockValidation.valid) {
      return {
        success: false,
        error: stockValidation.errors.map((e) => e.message).join(", "),
      };
    }

    // Validate credit limit
    const creditValidation = await this.validateCreditLimit(business_id);
    if (!creditValidation.valid) {
      return {
        success: false,
        error: creditValidation.warning || "Credit limit exceeded",
      };
    }

    try {
      const checkoutData = {
        mode: "full",
        source: "legacy-sales",
        idempotencyKey: crypto.randomUUID(),
        customerId: this.cart.customer_id,
        payment: {
          method: this.cart.payment_method,
          receipt: "none",
          creditConfirmed: this.cart.payment_method === "credit",
        },
        items: this.cart.items.map((i) => ({
          id: i.inventory_id,
          inventoryId: i.inventory_id,
          name: i.product_name,
          sku: i.sku,
          unitPrice: i.overridden_price ?? i.unit_price,
          qty: i.quantity,
          source: "inventory",
          weightGrams: i.weight_grams,
          pricePerGram: i.price_per_gram,
          bulkTierApplied: i.bulk_tier_applied,
          loyaltyDiscountApplied: i.loyalty_discount_applied,
          originalPrice: i.original_price,
          overrideReason: i.override_reason,
        })),
        taxAmount: this.cart.tax_amount,
        fees: fees,
        paymentRef: this.cart.payment_ref,
        deliveryManagementId: this.cart.delivery_management_id,
        deliveryAddress: this.cart.delivery_address,
        deliveryPrice: this.cart.delivery_price,
        amountPaid: this.cart.amount_paid,
      };

      const res = await fetch("/api/pos/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(checkoutData),
      });

      const result = await res.json();
      if (result.success) {
        this.clearCart();
      }
      return {
        success: result.success,
        saleId: result.saleId ?? null,
        orderNumber: result.orderNumber ?? null,
        total: result.totals?.total ?? result.total,
        changeAmount: result.totals?.changeAmount ?? result.changeAmount,
        error:
          result.error ??
          (Array.isArray(result.errors) ? result.errors.join(", ") : undefined),
      };
    } catch (e: any) {
      return { success: false, error: e.message };
    }
  }

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
}
