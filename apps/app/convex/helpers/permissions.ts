import { Doc } from "../_generated/dataModel";

export type Permission =
  | "MANAGE_PRODUCTS"
  | "RECORD_INTAKE"
  | "MANAGE_INVENTORY"
  | "MANAGE_CUSTOMERS"
  | "PROCESS_CHECKOUT"
  | "APPLY_CHECKOUT_OVERRIDE"
  | "MANAGE_SALES_RETURNS"
  | "VIEW_FINANCIALS"
  | "MANAGE_MEMBERS"
  | "VIEW_AUDIT_LOGS";

export const ROLE_PERMISSIONS: Record<string, Permission[]> = {
  OWNER: [
    "MANAGE_PRODUCTS",
    "RECORD_INTAKE",
    "MANAGE_INVENTORY",
    "MANAGE_CUSTOMERS",
    "PROCESS_CHECKOUT",
    "APPLY_CHECKOUT_OVERRIDE",
    "MANAGE_SALES_RETURNS",
    "VIEW_FINANCIALS",
    "MANAGE_MEMBERS",
    "VIEW_AUDIT_LOGS",
  ],
  ADMIN: [
    "MANAGE_PRODUCTS",
    "RECORD_INTAKE",
    "MANAGE_INVENTORY",
    "MANAGE_CUSTOMERS",
    "PROCESS_CHECKOUT",
    "APPLY_CHECKOUT_OVERRIDE",
    "MANAGE_SALES_RETURNS",
    "VIEW_FINANCIALS",
    "VIEW_AUDIT_LOGS",
  ],
  MEMBER: ["PROCESS_CHECKOUT", "MANAGE_CUSTOMERS"],
};

export function hasPermission(
  user: Doc<"users">,
  permission: Permission,
): boolean {
  const allowed = ROLE_PERMISSIONS[user.role] || [];
  return allowed.includes(permission);
}

export function requirePermission(
  user: Doc<"users">,
  permission: Permission,
): void {
  if (!hasPermission(user, permission)) {
    throw new Error(
      `FORBIDDEN: User role '${user.role}' does not possess required permission '${permission}'`,
    );
  }
}
