import "dotenv/config";
import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import pg from "pg";

const { Pool } = pg;
const pool = new Pool({ connectionString: process.env.DATABASE_URL });
const prisma = new PrismaClient({ adapter: new PrismaPg(pool) });

const DEMO_BUSINESS_NAME = process.env.DRX_DEMO_BUSINESS_NAME || "DRX Demo Market";
const DEMO_OWNER_ID =
  process.env.BYPASS_AUTH_USER_ID || "11111111-1111-4111-8111-111111111111";

const demoProducts = [
  {
    sku: "DRX-FLW-001",
    productName: "Blue Dream 3.5g",
    category: "Flower",
    description: "Hybrid flower eighth jar",
    quantityOnHand: 24,
    reorderLevel: 6,
    unitCost: "14.50",
    sellingPrice: "32.00",
    quantityUnit: "g",
  },
  {
    sku: "DRX-PRR-002",
    productName: "Pre-Roll Twin Pack",
    category: "Pre-Rolls",
    description: "2 x 0.5g infused pre-rolls",
    quantityOnHand: 40,
    reorderLevel: 10,
    unitCost: "8.25",
    sellingPrice: "22.00",
    quantityUnit: "unit",
  },
  {
    sku: "DRX-VPE-003",
    productName: "Citrus Live Resin Cart 1g",
    category: "Vapes",
    description: "1g live resin cartridge",
    quantityOnHand: 18,
    reorderLevel: 5,
    unitCost: "16.00",
    sellingPrice: "38.00",
    quantityUnit: "unit",
  },
  {
    sku: "DRX-EDB-004",
    productName: "Sleep Gummies 10pk",
    category: "Edibles",
    description: "10-pack low-dose gummies",
    quantityOnHand: 33,
    reorderLevel: 8,
    unitCost: "6.75",
    sellingPrice: "18.00",
    quantityUnit: "unit",
  },
  {
    sku: "DRX-TIN-005",
    productName: "Pain Relief Tincture 30ml",
    category: "Tinctures",
    description: "30ml tincture bottle",
    quantityOnHand: 12,
    reorderLevel: 4,
    unitCost: "12.00",
    sellingPrice: "29.00",
    quantityUnit: "ml",
  },
  {
    sku: "DRX-ACC-006",
    productName: "Battery Pen",
    category: "Accessories",
    description: "510 battery pen",
    quantityOnHand: 20,
    reorderLevel: 5,
    unitCost: "4.50",
    sellingPrice: "12.00",
    quantityUnit: "unit",
  },
];

const demoCustomers = [
  {
    firstName: "Maya",
    lastName: "Johnson",
    phoneNumber: "555-0101",
    email: "maya.demo@deelrx.local",
    city: "Atlanta",
    state: "GA",
    zipCode: "30303",
    customerType: "retail",
  },
  {
    firstName: "Andre",
    lastName: "Lewis",
    phoneNumber: "555-0102",
    email: "andre.demo@deelrx.local",
    city: "Atlanta",
    state: "GA",
    zipCode: "30303",
    customerType: "credit",
  },
  {
    firstName: "Jasmine",
    lastName: "Patel",
    phoneNumber: "555-0103",
    email: "jasmine.demo@deelrx.local",
    city: "Atlanta",
    state: "GA",
    zipCode: "30303",
    customerType: "retail",
  },
  {
    firstName: "David",
    lastName: "Nguyen",
    phoneNumber: "555-0104",
    email: "david.demo@deelrx.local",
    city: "Atlanta",
    state: "GA",
    zipCode: "30303",
    customerType: "wholesale",
  },
];

async function upsertDemoBusiness() {
  const existing = await prisma.businessProfile.findFirst({
    where: {
      OR: [{ businessName: DEMO_BUSINESS_NAME }, { ownerId: DEMO_OWNER_ID }],
    },
    orderBy: { createdAt: "desc" },
    select: {
      id: true,
      businessName: true,
    },
  });

  if (existing) {
    return existing;
  }

  const created = await prisma.businessProfile.create({
    data: {
      businessName: DEMO_BUSINESS_NAME,
      businessType: "dispensary",
      address: "123 Demo Ave",
      city: "Atlanta",
      state: "GA",
      zipCode: "30303",
      phoneNumber: "555-0000",
      email: "demo@deelrx.local",
      ownerId: DEMO_OWNER_ID,
      isActive: true,
    },
    select: {
      id: true,
      businessName: true,
    },
  });

  return created;
}

async function ensureBusinessSettings(businessId) {
  const existing = await prisma.businessSettings.findFirst({
    where: { businessId },
    select: { id: true, settingsData: true },
  });

  const nextSettingsData = {
    onboarding_completed: true,
    default_unit: "g",
    quick_quantities: [
      { label: "1g", value: 1, unit: "g", enabled: true },
      { label: "3.5g", value: 3.5, unit: "g", enabled: true },
      { label: "7g", value: 7, unit: "g", enabled: true },
      { label: "14g", value: 14, unit: "g", enabled: true },
    ],
    privacy_preset: "balanced",
    seeded_demo: true,
    seeded_at: new Date().toISOString(),
  };

  if (existing) {
    await prisma.businessSettings.update({
      where: { id: existing.id },
      data: {
        currency: "USD",
        timezone: "America/New_York",
        settingsData: {
          ...(existing.settingsData && typeof existing.settingsData === "object"
            ? existing.settingsData
            : {}),
          ...nextSettingsData,
        },
      },
    });
    return;
  }

  await prisma.businessSettings.create({
    data: {
      businessId,
      currency: "USD",
      timezone: "America/New_York",
      settingsData: nextSettingsData,
    },
  });
}

async function ensureOwnerRole(businessId) {
  const existing = await prisma.userRole.findFirst({
    where: { businessId, userId: DEMO_OWNER_ID },
    select: { id: true },
  });

  if (existing) return;

  await prisma.userRole.create({
    data: {
      businessId,
      userId: DEMO_OWNER_ID,
      role: "owner",
      permissions: { all: true, seeded_demo: true },
    },
  });
}

async function ensureProducts(businessId) {
  let created = 0;
  let updated = 0;

  for (const product of demoProducts) {
    const existing = await prisma.inventory.findFirst({
      where: { businessId, sku: product.sku },
      select: { id: true },
    });

    if (existing) {
      await prisma.inventory.update({
        where: { id: existing.id },
        data: product,
      });
      updated += 1;
      continue;
    }

    await prisma.inventory.create({
      data: {
        businessId,
        aiPricingEnabled: false,
        unitToServingRatio: "1",
        ...product,
      },
    });
    created += 1;
  }

  return { created, updated };
}

async function ensureCustomers(businessId) {
  let created = 0;
  let updated = 0;

  for (const customer of demoCustomers) {
    const existing = await prisma.customers.findFirst({
      where: { businessId, email: customer.email },
      select: { id: true },
    });

    if (existing) {
      await prisma.customers.update({
        where: { id: existing.id },
        data: customer,
      });
      updated += 1;
      continue;
    }

    await prisma.customers.create({
      data: {
        businessId,
        totalPurchases: "0",
        totalCreditUsed: "0",
        isActive: true,
        ...customer,
      },
    });
    created += 1;
  }

  return { created, updated };
}

async function main() {
  const business = await upsertDemoBusiness();
  await ensureBusinessSettings(business.id);
  await ensureOwnerRole(business.id);
  const products = await ensureProducts(business.id);
  const customers = await ensureCustomers(business.id);

  console.log("✅ Demo business seeded");
  console.log(`Business: ${business.businessName} (${business.id})`);
  console.log(`Owner (bypass): ${DEMO_OWNER_ID}`);
  console.log(`Products: +${products.created} created, ${products.updated} updated`);
  console.log(`Customers: +${customers.created} created, ${customers.updated} updated`);
  console.log("Quick Sale exit PIN (demo settings): not configured");
}

main()
  .catch((error) => {
    console.error("❌ Demo seed failed");
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
    await pool.end();
  });
