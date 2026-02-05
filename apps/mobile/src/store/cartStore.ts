import { create } from "zustand";
import { Inventory } from "../lib/types";

// Match POS CartItem structure exactly
export interface CartItem {
  product: Inventory;
  quantity: number;
  unitPrice: number;
  lineTotal: number;
  originalPrice?: number;
  overrideReason?: string;
}

interface CartState {
  cart: CartItem[];
  // Logic helpers
  addToCart: (item: CartItem) => void;
  removeFromCart: (index: number) => void;
  updateCartItem: (index: number, item: CartItem) => void;
  clearCart: () => void;
}

export const useCartStore = create<CartState>((set) => ({
  cart: [],

  addToCart: (newItem) => {
    set((state) => {
      // Check for existing item compatibility (same product, same price/override)
      const existingIndex = state.cart.findIndex(
        (item) =>
          item.product.id === newItem.product.id &&
          item.unitPrice === newItem.unitPrice && // Separate line if price differs? usually yes in POS
          item.overrideReason === newItem.overrideReason,
      );

      if (existingIndex >= 0) {
        const newCart = [...state.cart];
        const existingItem = newCart[existingIndex];
        const newQty = existingItem.quantity + newItem.quantity;
        newCart[existingIndex] = {
          ...existingItem,
          quantity: newQty,
          lineTotal: newQty * existingItem.unitPrice,
        };
        return { cart: newCart };
      }
      return { cart: [...state.cart, newItem] };
    });
  },

  removeFromCart: (index) => {
    set((state) => {
      const newCart = [...state.cart];
      newCart.splice(index, 1);
      return { cart: newCart };
    });
  },

  updateCartItem: (index, updatedItem) => {
    set((state) => {
      const newCart = [...state.cart];
      newCart[index] = updatedItem;
      return { cart: newCart };
    });
  },

  clearCart: () => {
    set({ cart: [] });
  },
}));
