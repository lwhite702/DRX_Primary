import { ROLE_PERMISSIONS as WEB_ROLE_PERMISSIONS, type Role as WebRole, type Permission as WebPermission } from "../../lib/auth/permissions";
import { Doc } from "../_generated/dataModel";

export type Permission =
  | "MANAGE_PRICING"
  | "MANAGE_PRODUCTS"
  | "RECORD_INTAKE"
  | "MANAGE_INVENTORY"
  | "VIEW_CUSTOMERS"
  | "MANAGE_CUSTOMERS"
  | "PROCESS_CHECKOUT"
  | "APPLY_CHECKOUT_OVERRIDE"
  | "MANAGE_SALES_RETURNS"
  | "MANAGE_DELIVERIES"
  | "MANAGE_COMMERCE_SETTINGS"
  | "VIEW_FINANCIALS"
  | "MANAGE_MEMBERS"
  | "VIEW_AUDIT_LOGS";

export const ROLE_PERMISSIONS: Record<string, Permission[]> = {
  OWNER: [
    "MANAGE_PRICING",
    "MANAGE_PRODUCTS",
    "RECORD_INTAKE",
    "MANAGE_INVENTORY",
    "VIEW_CUSTOMERS",
    "MANAGE_CUSTOMERS",
    "PROCESS_CHECKOUT",
    "APPLY_CHECKOUT_OVERRIDE",
    "MANAGE_SALES_RETURNS",
    "MANAGE_DELIVERIES",
    "MANAGE_COMMERCE_SETTINGS",
    "VIEW_FINANCIALS",
    "MANAGE_MEMBERS",
    "VIEW_AUDIT_LOGS",
  ],
  ADMIN: [
    "MANAGE_PRICING",
    "MANAGE_PRODUCTS",
    "RECORD_INTAKE",
    "MANAGE_INVENTORY",
    "VIEW_CUSTOMERS",
    "MANAGE_CUSTOMERS",
    "PROCESS_CHECKOUT",
    "APPLY_CHECKOUT_OVERRIDE",
    "MANAGE_SALES_RETURNS",
    "MANAGE_DELIVERIES",
    "MANAGE_COMMERCE_SETTINGS",
    "VIEW_FINANCIALS",
    "MANAGE_MEMBERS",
    "VIEW_AUDIT_LOGS",
  ],
  MEMBER: [
    "PROCESS_CHECKOUT",
    "VIEW_CUSTOMERS",
    "MANAGE_CUSTOMERS",
    "MANAGE_DELIVERIES",
    "MANAGE_PRODUCTS",
    "MANAGE_INVENTORY",
  ],
  OPERATOR: [
    "PROCESS_CHECKOUT",
    "VIEW_CUSTOMERS",
    "MANAGE_CUSTOMERS",
    "MANAGE_DELIVERIES",
    "MANAGE_PRODUCTS",
    "MANAGE_INVENTORY",
  ],
  STAFF: [
    "PROCESS_CHECKOUT",
    "VIEW_CUSTOMERS",
    "MANAGE_CUSTOMERS",
    "MANAGE_DELIVERIES",
    "MANAGE_PRODUCTS",
    "MANAGE_INVENTORY",
  ],
};

export function hasPermission(user: Doc<"users">, permission: Permission): boolean {
  const webPermission: Record<Permission, WebPermission> = {
    MANAGE_PRICING: "pricing.manage", MANAGE_PRODUCTS: "inventory.manage", RECORD_INTAKE: "inventory.manage", MANAGE_INVENTORY: "inventory.manage",
    VIEW_CUSTOMERS: "customers.view", MANAGE_CUSTOMERS: "customers.manage", PROCESS_CHECKOUT: "sales.create", APPLY_CHECKOUT_OVERRIDE: "pricing.manage",
    MANAGE_SALES_RETURNS: "sales.void", MANAGE_DELIVERIES: "sales.create",
    MANAGE_COMMERCE_SETTINGS: "settings.configure_pos", VIEW_FINANCIALS: "reports.view_all",
    MANAGE_MEMBERS: "staff.manage", VIEW_AUDIT_LOGS: "audit.view",
  };
  const mapped = webPermission[permission];
  // Tenant permission grants never confer platform authority. Existing native
  // role defaults remain intact; migrated web roles retain their explicit matrix.
  if (user.permissions?.[mapped] === true) return true;
  if (ROLE_PERMISSIONS[user.role]) return ROLE_PERMISSIONS[user.role].includes(permission);
  const upperRole = user.role.toUpperCase();
  if (ROLE_PERMISSIONS[upperRole]) return ROLE_PERMISSIONS[upperRole].includes(permission);
  if (user.role === "super_admin") return false;
  return (WEB_ROLE_PERMISSIONS[user.role.toLowerCase() as WebRole] ?? []).includes(mapped);
}

export function requirePermission(user: Doc<"users">, permission: Permission): void {
  if (!hasPermission(user, permission)) {
    throw new Error(
      `FORBIDDEN: User role '${user.role}' does not possess required permission '${permission}'`
    );
  }
}
