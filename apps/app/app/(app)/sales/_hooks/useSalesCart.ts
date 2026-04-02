import { useState, useEffect, useCallback } from "react";
import { toast } from "sonner";
import {
  POSEngine,
  type CartState,
  type MiscFee,
} from "@/lib/utils/pos-engine";

export function useSalesCart(businessId?: string) {
  const [posEngine] = useState(() => new POSEngine());
  const [cart, setCart] = useState<CartState>(posEngine.getCart());
  const [fees, setFees] = useState<MiscFee[]>([]);
  const [processing, setProcessing] = useState(false);

  const refreshCart = useCallback(() => setCart(posEngine.getCart()), [posEngine]);

  // Re-initialize if needed when businessId changes, though POSEngine might be stateless regarding businessId until checkout
  useEffect(() => {
    // If there was specific business logic initialization for engine
  }, [businessId]);

  const addToCart = (item: any) => {
    if (item.quantity_on_hand <= 0) {
      toast.error("Item is out of stock");
      return;
    }

    posEngine.addItem({
      inventory_id: item.id,
      product_name: item.product_name,
      sku: item.sku,
      quantity: 1,
      unit_price: Number(item.selling_price || 0),
      unit_cost: Number(item.unit_cost || 0),
    });
    refreshCart();
    toast.success(`${item.product_name} added to cart`);
  };

  const addWeightedItem = (item: {
    inventory_id: string;
    product_name: string;
    sku: string;
    weight_grams: number;
    unit_price: number;
    price_per_gram?: number;
    bulk_tier_applied?: string;
    line_total: number;
  }) => {
    posEngine.addItem({
      inventory_id: item.inventory_id,
      product_name: `${item.product_name} (${item.weight_grams.toFixed(2)}g)`,
      sku: item.sku,
      quantity: 1,
      unit_price: item.line_total,
      weight_grams: item.weight_grams,
      price_per_gram: item.price_per_gram,
      bulk_tier_applied: item.bulk_tier_applied,
    });
    refreshCart();
  };

  const updateQuantity = (inventory_id: string, delta: number) => {
    const item = cart.items.find((i) => i.inventory_id === inventory_id);
    if (item) {
      posEngine.updateQuantity(inventory_id, item.quantity + delta);
      refreshCart();
    }
  };

  const setQuantity = (inventory_id: string, quantity: number) => {
    posEngine.updateQuantity(inventory_id, quantity);
    refreshCart();
  };

  const removeFromCart = (inventory_id: string) => {
    posEngine.removeItem(inventory_id);
    refreshCart();
    toast.success("Item removed from cart");
  };

  const clearCart = () => {
    posEngine.clearCart();
    refreshCart();
    setFees([]);
  };

  const setCustomer = (customerId: string | undefined) => {
    posEngine.setCustomer(customerId);
    refreshCart();
  };

  const overridePrice = (
    inventory_id: string,
    newPrice: number,
    reason?: string,
  ) => {
    posEngine.overrideItemPrice(inventory_id, newPrice, reason);
    refreshCart();
  };

  const setDelivery = (
    deliveryId: string | undefined,
    address: string,
    price: number,
  ) => {
    posEngine.setDelivery(deliveryId, address, price);
    refreshCart();
  };

  const setAmountPaid = (amount: number) => {
    posEngine.setAmountPaid(amount);
  };

  const processCheckout = async (
    customerId: string | undefined,
    amountPaid: string,
  ) => {
    if (cart.items.length === 0) {
      toast.error("Cart is empty");
      return { success: false };
    }

    if (!businessId) {
      toast.error("Business not found");
      return { success: false };
    }

    setProcessing(true);
    try {
      posEngine.setCustomer(customerId);

      if (amountPaid) {
        posEngine.setAmountPaid(parseFloat(amountPaid));
      }

      const result = await posEngine.checkout(businessId, fees);

      if (result.success) {
        clearCart();
      }

      return result;
    } finally {
      setProcessing(false);
    }
  };

  const applyAIPricing = async (
    businessId: string,
    recommendationId: string,
  ) => {
    const result = await posEngine.applyAIPricingRecommendation(
      businessId,
      recommendationId,
    );
    if (result.success) {
      // Pricing might have changed in DB, but if it affects cart items we might need to reload?
      // The original code triggers a toast and updates state, but doesn't seem to reload cart
      // unless the recommendation was for an item ALREADY in cart and the engine handles it?
      // Looking at original code: it assumes the user sees it in the list.
      // If the engine updates the DB, we might want to re-add items if they were in cart?
      // Actually POSEngine.applyAIPricingRecommendation likely updates the inventory record.
      // We might need to refresh inventory list, which is handled by the parent's useRealtimeInventory.
    }
    return result;
  };

  const setTaxEnabled = (enabled: boolean) => {
    posEngine.setTaxEnabled(enabled);
    refreshCart();
  };

  return {
    posEngine,
    cart,
    fees,
    setFees,
    processing,
    addToCart,
    addWeightedItem,
    updateQuantity,
    setQuantity,
    removeFromCart,
    clearCart,
    setCustomer,
    processCheckout,
    overridePrice,
    setDelivery,
    setTaxEnabled,
    applyAIPricing,
    setAmountPaid,
  };
}
