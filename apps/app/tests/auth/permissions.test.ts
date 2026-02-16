import { describe, it, expect } from "vitest";
import { ROLE_PERMISSIONS, Role } from "../../lib/auth/permissions";

// Helper to simulate hasPermission logic
const hasPermission = (role: Role, permission: string) => {
  if (role === "super_admin") return true;
  return ROLE_PERMISSIONS[role]?.includes(permission as any) || false;
};

describe("RBAC Permission Logic", () => {
  describe("Cashier Role", () => {
    const role: Role = "cashier";

    it("can create sales", () => {
      expect(hasPermission(role, "sales.create")).toBe(true);
    });

    it("can view catalog", () => {
      expect(hasPermission(role, "catalog.view")).toBe(true);
    });

    it("cannot manage inventory", () => {
      expect(hasPermission(role, "inventory.manage")).toBe(false);
    });

    it("cannot void sales", () => {
      expect(hasPermission(role, "sales.void")).toBe(false);
    });

    it("cannot manage users", () => {
      expect(hasPermission(role, "staff.manage")).toBe(false);
    });
  });

  describe("Supervisor Role", () => {
    const role: Role = "supervisor";

    it("can create sales (Cashier inheritance)", () => {
      expect(hasPermission(role, "sales.create")).toBe(true);
    });

    it("can void sales", () => {
      expect(hasPermission(role, "sales.void")).toBe(true);
    });

    it("can view daily reports", () => {
      expect(hasPermission(role, "reports.view_daily")).toBe(true);
    });

    it("cannot manage inventory", () => {
      expect(hasPermission(role, "inventory.manage")).toBe(false);
    });

    it("cannot manage users", () => {
      expect(hasPermission(role, "staff.manage")).toBe(false);
    });
  });

  describe("Manager Role", () => {
    const role: Role = "manager";

    it("can void sales (Supervisor inheritance)", () => {
      expect(hasPermission(role, "sales.void")).toBe(true);
    });

    it("can manage inventory", () => {
      expect(hasPermission(role, "inventory.manage")).toBe(true);
    });

    it("can manage staff", () => {
      expect(hasPermission(role, "staff.manage")).toBe(true);
    });

    it("cannot manage system/audit (Super Admin only)", () => {
      expect(hasPermission(role, "system.manage")).toBe(false);
      // Note: If Manager had system.manage it would be here.
      // Based on definition, Managers do NOT have 'system.manage'
    });
  });

  describe("Super Admin Role", () => {
    const role: Role = "super_admin";

    it("has all permissions", () => {
      expect(hasPermission(role, "sales.create")).toBe(true);
      expect(hasPermission(role, "inventory.manage")).toBe(true);
      expect(hasPermission(role, "system.manage")).toBe(true);
      expect(hasPermission(role, "any.random.permission")).toBe(true);
    });
  });
});
