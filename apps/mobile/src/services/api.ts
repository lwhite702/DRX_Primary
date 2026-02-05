import axios from 'axios';

const API_BASE_URL = process.env.EXPO_PUBLIC_BACKEND_URL || '';

const api = axios.create({
  baseURL: `${API_BASE_URL}/api`,
  headers: {
    'Content-Type': 'application/json',
  },
  timeout: 15000,
});

// Types
export interface Vendor {
  id: string;
  name: string;
  contact_name?: string;
  phone?: string;
  email?: string;
  address?: string;
  license_number?: string;
  notes?: string;
  created_at: string;
  updated_at: string;
  is_active: boolean;
}

export interface Customer {
  id: string;
  name: string;
  customer_type: 'retail' | 'wholesale';
  phone?: string;
  email?: string;
  address?: string;
  date_of_birth?: string;
  age_verified: boolean;
  age_verified_date?: string;
  id_type?: string;
  id_number?: string;
  company_name?: string;
  tax_id?: string;
  credit_limit: number;
  notes?: string;
  created_at: string;
  updated_at: string;
  total_spent: number;
  outstanding_credit: number;
  is_active: boolean;
}

export interface Product {
  id: string;
  name: string;
  category: string;
  description?: string;
  sku?: string;
  unit: string;
  thc_percentage?: number;
  cbd_percentage?: number;
  retail_price: number;
  wholesale_price: number;
  current_stock: number;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface InventoryIntake {
  id: string;
  product_id: string;
  vendor_id: string;
  quantity: number;
  unit_cost: number;
  batch_number?: string;
  notes?: string;
  intake_date: string;
  total_cost: number;
  product_name?: string;
  vendor_name?: string;
}

export interface SaleItem {
  product_id: string;
  product_name: string;
  quantity: number;
  unit_price: number;
  total_price: number;
}

export interface Sale {
  id: string;
  customer_id?: string;
  customer_name?: string;
  items: SaleItem[];
  subtotal: number;
  tax_rate: number;
  tax_amount: number;
  discount: number;
  total: number;
  payment_method: 'cash' | 'card' | 'credit';
  amount_paid: number;
  notes?: string;
  sale_date: string;
  is_credit: boolean;
  credit_id?: string;
}

export interface Credit {
  id: string;
  customer_id: string;
  customer_name: string;
  sale_id?: string;
  original_amount: number;
  remaining_amount: number;
  status: 'pending' | 'partial' | 'paid' | 'overdue';
  notes?: string;
  due_date?: string;
  created_at: string;
}

export interface Payment {
  id: string;
  credit_id: string;
  amount: number;
  payment_method: 'cash' | 'card' | 'credit';
  notes?: string;
  payment_date: string;
  customer_id?: string;
  customer_name?: string;
}

export interface DashboardStats {
  total_customers: number;
  total_products: number;
  total_vendors: number;
  total_sales_today: number;
  total_sales_count_today: number;
  outstanding_credits: number;
  low_stock_count: number;
  recent_sales: Array<{
    id: string;
    customer_name: string;
    total: number;
    sale_date: string;
  }>;
  top_products: Array<{
    id: string;
    name: string;
    current_stock: number;
    retail_price: number;
  }>;
}

// API Functions

// Dashboard
export const getDashboardStats = () => api.get<DashboardStats>('/dashboard/stats');

// Vendors
export const getVendors = (activeOnly = true) => 
  api.get<Vendor[]>('/vendors', { params: { active_only: activeOnly } });
export const getVendor = (id: string) => api.get<Vendor>(`/vendors/${id}`);
export const createVendor = (data: Omit<Vendor, 'id' | 'created_at' | 'updated_at' | 'is_active'>) => 
  api.post<Vendor>('/vendors', data);
export const updateVendor = (id: string, data: Partial<Vendor>) => 
  api.put<Vendor>(`/vendors/${id}`, data);
export const deleteVendor = (id: string) => api.delete(`/vendors/${id}`);

// Customers
export const getCustomers = (params?: { customer_type?: string; search?: string; active_only?: boolean }) => 
  api.get<Customer[]>('/customers', { params });
export const getCustomer = (id: string) => api.get<Customer>(`/customers/${id}`);
export const createCustomer = (data: Omit<Customer, 'id' | 'created_at' | 'updated_at' | 'total_spent' | 'outstanding_credit' | 'is_active'>) => 
  api.post<Customer>('/customers', data);
export const updateCustomer = (id: string, data: Partial<Customer>) => 
  api.put<Customer>(`/customers/${id}`, data);
export const deleteCustomer = (id: string) => api.delete(`/customers/${id}`);

// Products
export const getProducts = (params?: { category?: string; search?: string; active_only?: boolean; low_stock?: boolean }) => 
  api.get<Product[]>('/products', { params });
export const getProduct = (id: string) => api.get<Product>(`/products/${id}`);
export const getProductCategories = () => api.get<string[]>('/products/categories');
export const createProduct = (data: Omit<Product, 'id' | 'created_at' | 'updated_at' | 'current_stock'>) => 
  api.post<Product>('/products', data);
export const updateProduct = (id: string, data: Partial<Product>) => 
  api.put<Product>(`/products/${id}`, data);
export const deleteProduct = (id: string) => api.delete(`/products/${id}`);

// Inventory
export const getInventoryIntakes = (params?: { product_id?: string; vendor_id?: string; limit?: number }) => 
  api.get<InventoryIntake[]>('/inventory/intake', { params });
export const createInventoryIntake = (data: Omit<InventoryIntake, 'id' | 'intake_date' | 'total_cost' | 'product_name' | 'vendor_name'>) => 
  api.post<InventoryIntake>('/inventory/intake', data);

// Sales
export const getSales = (params?: { customer_id?: string; date_from?: string; date_to?: string; limit?: number }) => 
  api.get<Sale[]>('/sales', { params });
export const getSale = (id: string) => api.get<Sale>(`/sales/${id}`);
export const createSale = (data: Omit<Sale, 'id' | 'sale_date' | 'is_credit' | 'credit_id'>) => 
  api.post<Sale>('/sales', data);

// Credits
export const getCredits = (params?: { customer_id?: string; status?: string }) => 
  api.get<Credit[]>('/credits', { params });
export const getCredit = (id: string) => api.get<Credit>(`/credits/${id}`);
export const makePayment = (creditId: string, data: { amount: number; payment_method: string; notes?: string }) => 
  api.post<Payment>(`/credits/${creditId}/payments`, { ...data, credit_id: creditId });
export const getCreditPayments = (creditId: string) => 
  api.get<Payment[]>(`/credits/${creditId}/payments`);

export default api;
