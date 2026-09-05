import { describe, it, expect } from "vitest";
import { convexTest } from "convex-test";
import schema from "../../convex/schema";
import { api } from "../../convex/_generated/api";

import { hasPermission, requirePermission } from "../../convex/helpers/permissions";
import { formatConvexError, ConvexAppError } from "../../convex/helpers/errors";
import { transformPrismaToConvexSnapshot } from "../../scripts/migration/export-prisma-snapshot.mjs";
import { reconcileMigrationData } from "../../scripts/migration/reconcile-convex-import.mjs";

import * as onboarding from "../../convex/onboarding";
import * as products from "../../convex/products";
import * as intake from "../../convex/intake";
import * as customers from "../../convex/customers";
import * as checkout from "../../convex/checkout";
import * as generatedApi from "../../convex/_generated/api";

const modules = {
  "_generated/api.js": async () => generatedApi,
  "onboarding.ts": async () => onboarding,
  "products.ts": async () => products,
  "intake.ts": async () => intake,
  "customers.ts": async () => customers,
  "checkout.ts": async () => checkout,
};

describe("Convex Phase 2 Foundation & Infrastructure", () => {
  describe("RBAC Permissions System", () => {
    it("correctly evaluates permissions for OWNER, ADMIN, and MEMBER roles", () => {
      const ownerUser: any = { role: "OWNER" };
      const adminUser: any = { role: "ADMIN" };
      const memberUser: any = { role: "MEMBER" };

      expect(hasPermission(ownerUser, "MANAGE_MEMBERS")).toBe(true);
      expect(hasPermission(ownerUser, "VIEW_FINANCIALS")).toBe(true);
      expect(hasPermission(ownerUser, "MANAGE_COMMERCE_SETTINGS")).toBe(true);

      expect(hasPermission(adminUser, "MANAGE_MEMBERS")).toBe(false);
      expect(hasPermission(adminUser, "PROCESS_CHECKOUT")).toBe(true);
      expect(hasPermission(adminUser, "MANAGE_COMMERCE_SETTINGS")).toBe(true);

      expect(hasPermission(memberUser, "RECORD_INTAKE")).toBe(false);
      expect(hasPermission(memberUser, "PROCESS_CHECKOUT")).toBe(true);
      expect(hasPermission(memberUser, "MANAGE_COMMERCE_SETTINGS")).toBe(false);

      expect(() => requirePermission(memberUser, "MANAGE_PRODUCTS")).toThrowError(
        /User role 'MEMBER' does not possess required permission 'MANAGE_PRODUCTS'/
      );
    });
  });

  describe("Sentry-Safe Error Sanitization", () => {
    it("formats custom errors cleanly without exposing internals", () => {
      const err = new ConvexAppError("INSUFFICIENT_STOCK", "Stock is depleted");
      const formatted = formatConvexError(err);
      expect(formatted).toEqual({
        code: "INSUFFICIENT_STOCK",
        message: "[INSUFFICIENT_STOCK] Stock is depleted",
      });

      const standardErr = new Error("[UNAUTHORIZED] Access denied");
      expect(formatConvexError(standardErr)).toEqual({
        code: "UNAUTHORIZED",
        message: "Access denied",
      });
    });
  });

  describe("Data Migration Transformation & Reconciliation", () => {
    it("transforms Prisma records into integer math Convex documents and verifies reconciliation", () => {
      const samplePrisma = {
        businesses: [
          { id: "b1", businessName: "DRX West", ownerId: "u_owner_1" },
        ],
        inventory: [
          { sku: "SKU-100", productName: "Product 100", sellingPrice: 20.0, quantityOnHand: 150 },
        ],
        customers: [
          { firstName: "Bob", lastName: "Jones", totalPurchases: 40.0 },
        ],
        sales: [
          { orderNumber: "ORD-99", totalAmount: 40.0, subtotal: 40.0 },
        ],
      };

      const snapshot = transformPrismaToConvexSnapshot(samplePrisma);

      expect(snapshot.products[0].sellingPriceCents).toBe(2000);
      expect(snapshot.products[0].quantityOnHandGrams).toBe(150);
      expect(snapshot.sales[0].totalAmountCents).toBe(4000);

      const reconciliation = reconcileMigrationData(samplePrisma, snapshot);
      expect(reconciliation.reconciled).toBe(true);
      expect(reconciliation.discrepancies).toHaveLength(0);
      expect(reconciliation.metrics.sourceSalesSumCents).toBe(4000);
      expect(reconciliation.metrics.targetSalesSumCents).toBe(4000);
    });
  });
});
