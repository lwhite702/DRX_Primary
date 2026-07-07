import "dotenv/config";
import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import pg from "pg";

const { Pool } = pg;

const enabled = ["1", "true", "yes"].includes(
  String(process.env.BETA_E2E_ENABLED || "").toLowerCase(),
);

if (!enabled) {
  console.error(
    "Refusing to seed beta E2E data: set BETA_E2E_ENABLED=true for the dedicated beta database.",
  );
  process.exit(1);
}

if (process.env.VERCEL_ENV === "production" || process.env.NODE_ENV === "production") {
  console.error("Refusing to seed beta E2E data in a production environment.");
  process.exit(1);
}

if (!process.env.DATABASE_URL) {
  console.error("DATABASE_URL is required for beta E2E seeding.");
  process.exit(1);
}

const betaUserId = process.env.BETA_E2E_USER_ID || process.env.CLERK_E2E_USER_ID;
if (!betaUserId) {
  console.error(
    "BETA_E2E_USER_ID or CLERK_E2E_USER_ID must match the Clerk identity used by the real beta E2E.",
  );
  process.exit(1);
}

const pool = new Pool({ connectionString: process.env.DATABASE_URL });
const prisma = new PrismaClient({ adapter: new PrismaPg(pool) });

const key = process.env.BETA_E2E_KEY || "drx-beta-e2e";
const businessName =
  process.env.BETA_E2E_BUSINESS_NAME || "DRX Beta E2E Market";
const clerkOrgId = process.env.BETA_E2E_CLERK_ORG_ID || null;
const sku = process.env.BETA_E2E_PRODUCT_SKU || "DRX-BETA-E2E-001";
const customerPhone = process.env.BETA_E2E_CUSTOMER_PHONE || "5550199001";
const customerEmail =
  process.env.BETA_E2E_CUSTOMER_EMAIL || "beta-e2e-customer@deelrx.local";
const supplier = `${key}:fifo`;

const privacyProtocol = {
  profile: "business_crm_mode",
  alias_only_mode: false,
  fields: {
    alias: { visible: true, recommended: true },
    first_name: { visible: true, recommended: true },
    phone: { visible: true, recommended: true },
    email: { visible: true, recommended: true },
    address: { visible: true, recommended: true },
    notes: { visible: true, recommended: true },
  },
  retention: {
    enabled: true,
    days: 365,
    frequency: "daily",
    local_hour: 2,
    hard_delete: true,
  },
  screen_privacy: {
    mode: "manual",
    default_enabled: false,
  },
  ephemeral_profiles: {
    enabled: true,
    default_retention_days: 7,
    allow_in_standard_customer_create: false,
  },
  inventory_monitoring: {
    enabled: true,
    refresh_frequency: "daily",
  },
};

async function upsertBusiness() {
  const existing = await prisma.businessProfile.findFirst({
    where: {
      OR: [{ businessName }, { ownerId: betaUserId }],
    },
    orderBy: { createdAt: "asc" },
  });

  if (existing) {
    return prisma.businessProfile.update({
      where: { id: existing.id },
      data: {
        businessName,
        businessType: "Dispensary",
        email: "beta-e2e@deelrx.local",
        phoneNumber: "555-0199",
        address: "100 Beta Test Way",
        city: "Atlanta",
        state: "GA",
        zipCode: "30303",
        ownerId: betaUserId,
        clerkOrgId,
        isActive: true,
      },
    });
  }

  return prisma.businessProfile.create({
    data: {
      businessName,
      businessType: "Dispensary",
      email: "beta-e2e@deelrx.local",
      phoneNumber: "555-0199",
      address: "100 Beta Test Way",
      city: "Atlanta",
      state: "GA",
      zipCode: "30303",
      ownerId: betaUserId,
      clerkOrgId,
      isActive: true,
    },
  });
}

async function main() {
  const business = await upsertBusiness();

  await prisma.businessSettings.upsert({
    where: { businessId: business.id },
    update: {
      currency: "USD",
      timezone: "America/New_York",
      collectTax: false,
      settingsData: {
        beta_e2e_key: key,
        onboarding_completed: true,
        privacy_protocol: privacyProtocol,
        privacy_preset: privacyProtocol.profile,
      },
    },
    create: {
      businessId: business.id,
      currency: "USD",
      timezone: "America/New_York",
      collectTax: false,
      settingsData: {
        beta_e2e_key: key,
        onboarding_completed: true,
        privacy_protocol: privacyProtocol,
        privacy_preset: privacyProtocol.profile,
      },
    },
  });

  await prisma.userRole.deleteMany({
    where: {
      businessId: business.id,
      userId: betaUserId,
    },
  });

  await prisma.userRole.create({
    data: {
      businessId: business.id,
      userId: betaUserId,
      role: "owner",
      permissions: { all: true, beta_e2e: true },
    },
  });

  const inventory = await prisma.inventory.upsert({
    where: {
      businessId_sku: {
        businessId: business.id,
        sku,
      },
    },
    update: {
      productName: "Beta E2E Test Flower 1g",
      description: `Seeded by ${key}; safe to reset.`,
      category: "Flower",
      quantityOnHand: 100,
      reorderLevel: 10,
      unitCost: "4.00",
      sellingPrice: "12.50",
      aiPricingEnabled: false,
      quantityUnit: "unit",
      unitToServingRatio: "1",
      baseUnit: "g",
      convertToGrams: "1",
      inventoryInGrams: "100",
      allowFractionalWeight: false,
      pricePerGram: "12.5000",
    },
    create: {
      businessId: business.id,
      sku,
      productName: "Beta E2E Test Flower 1g",
      description: `Seeded by ${key}; safe to reset.`,
      category: "Flower",
      quantityOnHand: 100,
      reorderLevel: 10,
      unitCost: "4.00",
      sellingPrice: "12.50",
      aiPricingEnabled: false,
      quantityUnit: "unit",
      unitToServingRatio: "1",
      baseUnit: "g",
      convertToGrams: "1",
      inventoryInGrams: "100",
      allowFractionalWeight: false,
      pricePerGram: "12.5000",
    },
  });

  const intake = await prisma.inventoryIntake.create({
    data: {
      businessId: business.id,
      inventoryId: inventory.id,
      totalCost: "400.0000",
      totalWeightGrams: "100.0000",
      calculatedCostPerGram: "4.000000",
      deliveryCost: "0.00",
      supplier,
      requiresApproval: false,
      status: "approved",
      createdBy: betaUserId,
    },
  });

  await prisma.inventoryBatch.deleteMany({
    where: {
      businessId: business.id,
      inventoryId: inventory.id,
      supplier,
    },
  });

  const batch = await prisma.inventoryBatch.create({
    data: {
      businessId: business.id,
      inventoryId: inventory.id,
      intakeId: intake.id,
      originalQuantityGrams: "100.0000",
      remainingQuantityGrams: "100.0000",
      unitCostPerGram: "4.000000",
      supplier,
      createdBy: betaUserId,
    },
  });

  const existingCustomer = await prisma.customers.findFirst({
    where: {
      businessId: business.id,
      OR: [{ phoneNumber: customerPhone }, { email: customerEmail }],
    },
  });

  const customerData = {
    businessId: business.id,
    firstName: "Beta",
    lastName: "Customer",
    phoneNumber: customerPhone,
    email: customerEmail,
    city: "Atlanta",
    state: "GA",
    zipCode: "30303",
    customerType: "retail",
    totalPurchases: "0",
    totalCreditUsed: "0",
    purchaseCount: 0,
    loyaltyTier: "none",
    discountRate: "0",
    nextTierAt: 5,
    isActive: true,
    notes: "Seeded beta E2E customer",
    lastActivityAt: new Date(),
    ephemeral: false,
    ephemeralExpiresAt: null,
  };

  const customer = existingCustomer
    ? await prisma.customers.update({
        where: { id: existingCustomer.id },
        data: customerData,
      })
    : await prisma.customers.create({ data: customerData });

  console.log(
    JSON.stringify(
      {
        ok: true,
        key,
        businessId: business.id,
        userId: betaUserId,
        inventoryId: inventory.id,
        batchId: batch.id,
        sku,
        customerId: customer.id,
        customerPhone,
      },
      null,
      2,
    ),
  );
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
    await pool.end();
  });
