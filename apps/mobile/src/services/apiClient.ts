// Basic API Client for communicating with Next.js Backend
const API_URL = process.env.EXPO_PUBLIC_API_URL || "http://localhost:3000";

async function fetchWithAuth(
  url: string,
  token: string | null,
  options: RequestInit = {},
) {
  const headers = new Headers(options.headers);
  headers.set("Content-Type", "application/json");

  if (token) {
    headers.set("Authorization", `Bearer ${token}`);
  }

  const response = await fetch(`${API_URL}${url}`, {
    ...options,
    headers,
  });

  if (!response.ok) {
    const errorBody = await response.json().catch(() => ({}));
    throw new Error(
      errorBody.error || `Request failed with status ${response.status}`,
    );
  }

  return response.json();
}

// ==================== INVENTORY ====================

export const getProducts = async (businessId: string, token: string | null) => {
  const encodedId = encodeURIComponent(businessId);
  const data = await fetchWithAuth(
    `/api/inventory?businessId=${encodedId}`,
    token,
  );
  return data.data || [];
};

export const createProduct = async (productData: any, token: string | null) => {
  return fetchWithAuth("/api/inventory", token, {
    method: "POST",
    body: JSON.stringify(productData),
  });
};

// ==================== SALES ====================

export const createSale = async (saleData: any, token: string | null) => {
  // Map frontend saleData to API expectation if needed
  // API expects: { sku, product_name... } for POST inventory? No, this is createSale
  // We need to check the API for sales. Assuming /api/sales exists?
  // User didn't verify /api/sales yet. Let's assume standard REST for now.
  const data = await fetchWithAuth("/api/sales", token, {
    method: "POST",
    body: JSON.stringify(saleData),
  });
  return data;
};

export const getSalesHistory = async (businessId: string, token: string | null) => {
  const data = await fetchWithAuth("/api/sales", token);
  return data.data || [];
};

export const getDailySummary = async (token: string | null, from?: string, to?: string) => {
  let url = "/api/reports/pos-baseline";
  const params = new URLSearchParams();
  if (from) params.append("from", from);
  if (to) params.append("to", to);
  if (params.toString()) url += `?${params.toString()}`;
  return fetchWithAuth(url, token);
};

export const recordDrawerEvent = async (token: string | null, eventType: string = "no_sale", note?: string) => {
  return fetchWithAuth("/api/pos/drawer", token, {
    method: "POST",
    body: JSON.stringify({ eventType, note }),
  });
};

export const getPosReconciliation = async (token: string | null, from?: string, to?: string) => {
  let url = "/api/reports/pos-reconciliation";
  const params = new URLSearchParams();
  if (from) params.append("from", from);
  if (to) params.append("to", to);
  if (params.toString()) url += `?${params.toString()}`;
  return fetchWithAuth(url, token);
};

// ==================== CUSTOMERS ====================

export const getCustomers = async (
  businessId: string,
  token: string | null,
  search?: string,
) => {
  const encodedId = encodeURIComponent(businessId);
  let url = `/api/customers?businessId=${encodedId}`;
  if (search) {
    url += `&search=${encodeURIComponent(search)}`;
  }
  const data = await fetchWithAuth(url, token);
  return data.data || [];
};

export const getBusinessSettings = async (token: string | null) => {
  return fetchWithAuth("/api/business/settings", token);
};

export const getScreenPrivacyPreference = async (token: string | null) => {
  return fetchWithAuth("/api/privacy/protexion/preferences", token);
};

export const setScreenPrivacyPreference = async (
  token: string | null,
  manualEnabled: boolean,
) => {
  return fetchWithAuth("/api/privacy/protexion/preferences", token, {
    method: "POST",
    body: JSON.stringify({ manual_enabled: manualEnabled }),
  });
};

export const createCustomer = async (
  customerData: any,
  token: string | null,
) => {
  return fetchWithAuth("/api/customers", token, {
    method: "POST",
    body: JSON.stringify(customerData),
  });
};

export const updateCustomer = async (
  customerId: string,
  customerData: any,
  token: string | null,
) => {
  return fetchWithAuth(`/api/customers/${customerId}`, token, {
    method: "PUT",
    body: JSON.stringify(customerData),
  });
};

// ==================== EXTRAS ====================

export const getProductUnitAliases = async (
  businessId: string,
  token: string | null,
) => {
  // Placeholder if API doesn't exist yet
  return [];
};

export const getAIPricingRecommendations = async (
  businessId: string,
  token: string | null,
) => {
  // Placeholder
  return [];
};

export const applyAIPricingRecommendation = async (
  businessId: string,
  recId: string,
  token: string | null,
) => {
  return {
    success: false,
    message: "Not implemented on backend yet",
    newPrice: undefined,
  };
};

export const createCreditTransaction = async (
  data: any,
  token: string | null,
) => {
  return fetchWithAuth("/api/credit/transactions", token, {
    method: "POST",
    body: JSON.stringify(data),
  });
};

export const getCustomerCreditBalance = async (
  customerId: string,
  token: string | null,
) => {
  // Return 0 for now as balance is handled by customer object updates
  return 0;
};

export const getCreditTransactions = async (
  businessId: string,
  token: string | null,
) => {
  const encodedId = encodeURIComponent(businessId);
  const data = await fetchWithAuth(
    `/api/credit/transactions?businessId=${encodedId}`,
    token,
  );
  return Array.isArray(data) ? data : [];
};

export const recordCreditPayment = async (
  businessId: string,
  customerId: string,
  amount: number,
  token: string | null,
) => {
  return fetchWithAuth("/api/credit/transactions", token, {
    method: "POST",
    body: JSON.stringify({
      business_id: businessId,
      customer_id: customerId,
      amount,
      transaction_type: "payment",
      description: "Payment received",
    }),
  });
};

export const extendCredit = async (
  businessId: string,
  customerId: string,
  amount: number,
  description: string,
  dueDate: string,
  token: string | null,
) => {
  return fetchWithAuth("/api/credit/transactions", token, {
    method: "POST",
    body: JSON.stringify({
      business_id: businessId,
      customer_id: customerId,
      amount,
      transaction_type: "purchase",
      description,
    }),
  });
};
