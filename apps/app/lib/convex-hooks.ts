import { useQuery, useMutation } from "convex/react";
import { api } from "../convex/_generated/api";

const EMPTY_LIST: never[] = [];
const NOOP_MUTATION = async () => {};
const EMPTY_REPORTING = {
  orderCount: 0,
  totalRevenueCents: 0,
  totalTaxCents: 0,
  totalSubtotalCents: 0,
  averageOrderValueCents: 0,
};
const CONVEX_CONFIGURED = Boolean(
  process.env.NEXT_PUBLIC_CONVEX_URL &&
    !process.env.NEXT_PUBLIC_CONVEX_URL.includes("build-placeholder.invalid"),
);

export function useDRXProducts() {
  try {
    const products = useQuery(api.products.listProducts, {}) || EMPTY_LIST;
    const categories = useQuery(api.categories.listCategories, {}) || EMPTY_LIST;
    const createProduct = useMutation(api.products.createProduct);

    return { products, categories, createProduct };
  } catch {
    return {
      products: EMPTY_LIST,
      categories: EMPTY_LIST,
      createProduct: NOOP_MUTATION,
    };
  }
}

export function useDRXCheckout() {
  try {
    const processCheckout = useMutation(api.checkout.processCheckout);
    const sales = useQuery(api.checkout.getSalesHistory, {}) || EMPTY_LIST;

    return { processCheckout, sales, isConfigured: CONVEX_CONFIGURED };
  } catch {
    return {
      processCheckout: NOOP_MUTATION,
      sales: EMPTY_LIST,
      isConfigured: false,
    };
  }
}

export function useDRXReporting() {
  try {
    const aggregates =
      useQuery(api.reporting.getDailySalesAggregate, {}) || EMPTY_REPORTING;
    return aggregates;
  } catch {
    return EMPTY_REPORTING;
  }
}
