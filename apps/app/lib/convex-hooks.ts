import { useQuery, useMutation } from "convex/react";
import { api } from "../convex/_generated/api";

export function useDRXProducts() {
  const products = useQuery(api.products.listProducts, {}) || [];
  const categories = useQuery(api.categories.listCategories, {}) || [];
  const createProduct = useMutation(api.products.createProduct);

  return {
    products,
    categories,
    createProduct,
  };
}

export function useDRXCheckout() {
  const processCheckout = useMutation(api.checkout.processCheckout);
  const sales = useQuery(api.checkout.getSalesHistory, {}) || [];

  return {
    processCheckout,
    sales,
  };
}

export function useDRXReporting() {
  const aggregates = useQuery(api.reporting.getDailySalesAggregate, {}) || {
    orderCount: 0,
    totalRevenueCents: 0,
    totalTaxCents: 0,
    totalSubtotalCents: 0,
    averageOrderValueCents: 0,
  };

  return aggregates;
}
