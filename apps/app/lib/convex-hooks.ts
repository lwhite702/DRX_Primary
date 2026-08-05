import { useQuery, useMutation } from "convex/react";
import { api } from "../convex/_generated/api";
import { useIsBypassActive } from "@/lib/adapters/auth/ui";

export function useDRXProducts() {
  try {
    const products = useQuery(api.products.listProducts, {}) || [];
    const categories = useQuery(api.categories.listCategories, {}) || [];
    const createProduct = useMutation(api.products.createProduct);

    return { products, categories, createProduct };
  } catch {
    return { products: [], categories: [], createProduct: async () => {} };
  }
}

export function useDRXCheckout() {
  const isBypassActive = useIsBypassActive();
  try {
    const processCheckout = useMutation(api.checkout.processCheckout);
    const sales = useQuery(api.checkout.getSalesHistory, {}) || [];

    return {
      processCheckout: isBypassActive ? async () => undefined : processCheckout,
      sales,
    };
  } catch {
    return { processCheckout: async () => {}, sales: [] };
  }
}

export function useDRXReporting() {
  try {
    const aggregates = useQuery(api.reporting.getDailySalesAggregate, {}) || {
      orderCount: 0,
      totalRevenueCents: 0,
      totalTaxCents: 0,
      totalSubtotalCents: 0,
      averageOrderValueCents: 0,
    };
    return aggregates;
  } catch {
    return {
      orderCount: 0,
      totalRevenueCents: 0,
      totalTaxCents: 0,
      totalSubtotalCents: 0,
      averageOrderValueCents: 0,
    };
  }
}
