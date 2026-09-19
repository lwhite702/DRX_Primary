export type Role =
  | "cashier"
  | "supervisor"
  | "manager"
  | "super_admin"
  | "owner"
  | "admin"
  | "staff"
  | "operator";

export type Permission =
  // Sales
  | "sales.create"
  | "sales.void"
  | "sales.discount"
  | "payments.process"
  | "shift.view"

  // Inventory
  | "catalog.view"
  | "inventory.manage"
  | "pricing.manage"

  // Customers
  | "customers.view"
  | "customers.manage"

  // Reports
  | "reports.view_daily"
  | "reports.view_all"

  // Settings & System
  | "settings.configure_pos"
  | "system.manage"
  | "audit.view"

  // Users
  | "staff.manage"
  | "users.manage_all";

export const ROLES: Record<string, Role> = {
  CASHIER: "cashier",
  SUPERVISOR: "supervisor",
  MANAGER: "manager",
  SUPER_ADMIN: "super_admin",
  STAFF: "staff",
  OPERATOR: "operator",
};

export const PERMISSIONS: Record<string, Permission> = {
  // Sales
  SALES_CREATE: "sales.create",
  SALES_VOID: "sales.void",
  SALES_DISCOUNT: "sales.discount",
  PAYMENTS_PROCESS: "payments.process",
  SHIFT_VIEW: "shift.view",

  // Inventory
  CATALOG_VIEW: "catalog.view",
  INVENTORY_MANAGE: "inventory.manage",
  PRICING_MANAGE: "pricing.manage",

  // Customers
  CUSTOMERS_VIEW: "customers.view",
  CUSTOMERS_MANAGE: "customers.manage",

  // Reports
  REPORTS_VIEW_DAILY: "reports.view_daily",
  REPORTS_VIEW_ALL: "reports.view_all",

  // Settings
  SETTINGS_CONFIGURE_POS: "settings.configure_pos",
  SYSTEM_MANAGE: "system.manage",
  AUDIT_VIEW: "audit.view",

  // Users
  STAFF_MANAGE: "staff.manage",
  USERS_MANAGE_ALL: "users.manage_all",
};

// Frontend definition of permissions (should match DB)
// Used for optimistic checks or when DB fetch is delayed
export const ROLE_PERMISSIONS: Record<Role, Permission[]> = {
  cashier: [
    "sales.create",
    "payments.process",
    "shift.view",
    "catalog.view",
    "customers.view",
  ],
  supervisor: [
    "sales.create",
    "payments.process",
    "shift.view",
    "catalog.view",
    "customers.view",
    "sales.void",
    "sales.discount",
    "reports.view_daily",
    "customers.manage",
  ],
  manager: [
    "sales.create",
    "payments.process",
    "shift.view",
    "catalog.view",
    "customers.view",
    "sales.void",
    "sales.discount",
    "reports.view_daily",
    "customers.manage",
    "inventory.manage",
    "pricing.manage",
    "settings.configure_pos",
    "reports.view_all",
    "staff.manage",
  ],
  super_admin: [
    "sales.create",
    "payments.process",
    "shift.view",
    "catalog.view",
    "customers.view",
    "sales.void",
    "sales.discount",
    "reports.view_daily",
    "customers.manage",
    "inventory.manage",
    "pricing.manage",
    "settings.configure_pos",
    "reports.view_all",
    "staff.manage",
    "system.manage",
    "audit.view",
  ],
  owner: [
    "sales.create",
    "payments.process",
    "shift.view",
    "catalog.view",
    "customers.view",
    "sales.void",
    "sales.discount",
    "reports.view_daily",
    "customers.manage",
    "inventory.manage",
    "pricing.manage",
    "settings.configure_pos",
    "reports.view_all",
    "staff.manage",
    "system.manage",
    "audit.view",
  ],
  admin: [
    "sales.create",
    "payments.process",
    "shift.view",
    "catalog.view",
    "customers.view",
    "sales.void",
    "sales.discount",
    "reports.view_daily",
    "customers.manage",
    "inventory.manage",
    "pricing.manage",
    "settings.configure_pos",
    "reports.view_all",
    "staff.manage",
    "system.manage",
    "audit.view",
  ],
  staff: [
    "sales.create",
    "payments.process",
    "shift.view",
    "catalog.view",
    "customers.view",
    "customers.manage",
    "inventory.manage",
  ],
  operator: [
    "sales.create",
    "payments.process",
    "shift.view",
    "catalog.view",
    "customers.view",
    "customers.manage",
    "inventory.manage",
  ],
};
