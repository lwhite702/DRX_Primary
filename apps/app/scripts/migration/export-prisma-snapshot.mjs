import { writeFileSync, mkdirSync } from "fs";
import { join } from "path";

/**
 * Snapshot exporter transforming Postgres/Prisma records into Convex-compatible JSON documents.
 */
export function transformPrismaToConvexSnapshot(prismaExportData) {
  const { businesses = [], users = [], inventory = [], customers = [], sales = [] } = prismaExportData;

  const convexBusinesses = businesses.map((b) => ({
    clerkOrgId: b.clerkOrgId || undefined,
    name: b.businessName,
    businessType: b.businessType || "Retail POS",
    ownerId: b.ownerId,
    currency: "USD",
    timezone: "America/New_York",
    collectTax: true,
    taxRateBps: 825,
    createdAt: new Date(b.createdAt || Date.now()).getTime(),
    updatedAt: new Date(b.updatedAt || Date.now()).getTime(),
  }));

  const convexProducts = inventory.map((inv) => ({
    sku: inv.sku,
    productName: inv.productName,
    sellingPriceCents: Math.round(Number(inv.sellingPrice || 0) * 100),
    unitCostCents: Math.round(Number(inv.unitCost || 0) * 100),
    quantityOnHandGrams: Number(inv.quantityOnHand || 0),
    reorderLevelGrams: Number(inv.reorderLevel || 10),
    allowFractionalWeight: true,
    isActive: true,
    createdAt: new Date(inv.createdAt || Date.now()).getTime(),
    updatedAt: new Date(inv.updatedAt || Date.now()).getTime(),
  }));

  const convexCustomers = customers.map((c) => ({
    firstName: c.firstName || undefined,
    lastName: c.lastName || undefined,
    phoneNumber: c.phoneNumber || undefined,
    email: c.email || undefined,
    totalPurchasesCents: Math.round(Number(c.totalPurchases || 0) * 100),
    totalCreditUsedCents: Math.round(Number(c.totalCreditUsed || 0) * 100),
    creditLimitCents: 0,
    purchaseCount: Number(c.purchaseCount || 0),
    loyaltyTier: c.loyaltyTier || "standard",
    discountRateBps: 0,
    isActive: true,
    createdAt: new Date(c.createdAt || Date.now()).getTime(),
    updatedAt: new Date(c.updatedAt || Date.now()).getTime(),
  }));

  const convexSales = sales.map((s) => ({
    orderNumber: s.orderNumber,
    orderStatus: s.orderStatus || "completed",
    subtotalCents: Math.round(Number(s.subtotal || 0) * 100),
    taxAmountCents: Math.round(Number(s.taxAmount || 0) * 100),
    totalAmountCents: Math.round(Number(s.totalAmount || 0) * 100),
    amountPaidCents: Math.round(Number(s.amountPaid || s.totalAmount || 0) * 100),
    changeAmountCents: Math.round(Number(s.changeAmount || 0) * 100),
    paymentMethod: s.paymentMethod || "cash",
    createdBy: s.createdBy || "system_import",
    createdAt: new Date(s.createdAt || Date.now()).getTime(),
    updatedAt: new Date(s.updatedAt || Date.now()).getTime(),
  }));

  return {
    businesses: convexBusinesses,
    products: convexProducts,
    customers: convexCustomers,
    sales: convexSales,
    summary: {
      totalBusinesses: convexBusinesses.length,
      totalProducts: convexProducts.length,
      totalCustomers: convexCustomers.length,
      totalSales: convexSales.length,
    },
  };
}

// Sample export runner for local CLI
if (process.argv[1]?.endsWith("export-prisma-snapshot.mjs")) {
  const samplePrisma = {
    businesses: [{ id: "b1", businessName: "DRX Main Store", ownerId: "u1" }],
    inventory: [{ sku: "SKU1", productName: "Product 1", sellingPrice: 25.00, quantityOnHand: 100 }],
    customers: [{ firstName: "Alice", lastName: "Smith", totalPurchases: 150.00 }],
    sales: [{ orderNumber: "ORD-001", totalAmount: 25.00, subtotal: 25.00 }],
  };

  const outputDir = join(process.cwd(), "output/migration");
  mkdirSync(outputDir, { recursive: true });
  const snapshot = transformPrismaToConvexSnapshot(samplePrisma);
  writeFileSync(join(outputDir, "convex-snapshot.json"), JSON.stringify(snapshot, null, 2));
  console.log("✅ Migration snapshot successfully created at output/migration/convex-snapshot.json");
}
