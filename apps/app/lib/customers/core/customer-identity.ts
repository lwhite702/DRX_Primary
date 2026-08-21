import { db } from "@/lib/db";
import {
  decodeCustomerPii,
  encodeCustomerPii,
  getCustomerDisplayName,
} from "@/lib/privacy/customer-pii";
import {
  mapCustomerToOperationalModel,
  normalizeAlias,
  normalizeEmail,
  normalizePhone,
} from "@/lib/customers/core/customer-normalizer";
import {
  hashAliasLookup,
  hashEmailLookupCandidates,
  hashPhoneLookupCandidates,
} from "@/lib/privacy/pii-hash";
import {
  createCustomerWithAudit,
  CustomerConflictError,
} from "@/lib/customers/core/customer-lifecycle";

function buildEphemeralExpiry(days: 1 | 7 | 30): Date {
  return new Date(Date.now() + days * 24 * 60 * 60 * 1000);
}

export async function resolveCustomerByDeterministicLookup(args: {
  businessId: string;
  phone?: string | null;
  email?: string | null;
}) {
  const phone = normalizePhone(args.phone);
  const email = normalizeEmail(args.email);

  const [phoneHashes, emailHashes] = await Promise.all([
    hashPhoneLookupCandidates(phone || args.phone),
    hashEmailLookupCandidates(email || args.email),
  ]);

  return db.customers.findFirst({
    where: {
      businessId: args.businessId,
      isActive: true,
      OR: [
        ...phoneHashes.map((phoneHash) => ({ phoneHash })),
        ...emailHashes.map((emailHash) => ({ emailHash })),
        ...(phone ? [{ phoneNumber: phone }] : []),
        ...(email ? [{ email }] : []),
      ],
    },
    orderBy: { createdAt: "desc" },
  });
}

export async function createOrAttachQuickCustomer(args: {
  businessId: string;
  actorUserId: string;
  phone: string;
  alias?: string | null;
  useEphemeral: boolean;
  ephemeralRetentionDays: 1 | 7 | 30;
}) {
  const normalizedPhone = normalizePhone(args.phone);
  if (!normalizedPhone) {
    throw new Error("Phone is required");
  }

  const existing = await resolveCustomerByDeterministicLookup({
    businessId: args.businessId,
    phone: normalizedPhone,
  });

  if (existing) {
    const pii = await decodeCustomerPii(
      existing as unknown as Record<string, unknown>,
    );
    return {
      created: false,
      customer: existing,
      model: {
        id: existing.id,
        phone: pii.phone || normalizedPhone,
        alias: getCustomerDisplayName(pii),
        ephemeral: !!existing.ephemeral,
        ephemeral_expires_at: existing.ephemeralExpiresAt || null,
        remainingCredit: 0,
      },
    };
  }

  const normalizedAlias = normalizeAlias(args.alias || "");
  const piiStorage = await encodeCustomerPii({
    alias: normalizedAlias || `Customer ${normalizedPhone.slice(-4)}`,
    phone: normalizedPhone,
  });

  let created;
  try {
    created = await createCustomerWithAudit({
      businessId: args.businessId,
      actorUserId: args.actorUserId,
      phone: normalizedPhone,
      data: {
        businessId: args.businessId,
        alias: null,
        firstName: null,
        lastName: null,
        phoneNumber: null,
        email: null,
        address: null,
        notes: null,
        customerType: "retail",
        isActive: true,
        ephemeral: args.useEphemeral,
        ephemeralExpiresAt: args.useEphemeral
          ? buildEphemeralExpiry(args.ephemeralRetentionDays)
          : null,
        lastActivityAt: new Date(),
        ...piiStorage,
      },
      audit: {
        changedFields: ["alias", "phone", "ephemeral"],
        isActive: true,
        ephemeral: args.useEphemeral,
        customerType: "retail",
      },
    });
  } catch (error) {
    if (!(error instanceof CustomerConflictError)) throw error;
    const concurrentExisting = await db.customers.findFirst({
      where: {
        id: error.existingCustomerId,
        businessId: args.businessId,
        isActive: true,
      },
    });
    if (!concurrentExisting) throw error;

    const pii = await decodeCustomerPii(
      concurrentExisting as unknown as Record<string, unknown>,
    );
    return {
      created: false,
      customer: concurrentExisting,
      model: {
        id: concurrentExisting.id,
        phone: pii.phone || normalizedPhone,
        alias: getCustomerDisplayName(pii),
        ephemeral: !!concurrentExisting.ephemeral,
        ephemeral_expires_at: concurrentExisting.ephemeralExpiresAt || null,
        remainingCredit: 0,
      },
    };
  }

  const pii = await decodeCustomerPii(
    created as unknown as Record<string, unknown>,
  );

  return {
    created: true,
    customer: created,
    model: {
      id: created.id,
      phone: pii.phone || normalizedPhone,
      alias: getCustomerDisplayName(pii),
      ephemeral: args.useEphemeral,
      ephemeral_expires_at: created.ephemeralExpiresAt || null,
      remainingCredit: 0,
    },
  };
}

export async function createOrAttachCreditCustomer(args: {
  businessId: string;
  customerName: string;
}) {
  const normalizedAlias =
    normalizeAlias(args.customerName) || "credit-customer";
  const aliasHash = await hashAliasLookup(normalizedAlias);
  const whereOr = [
    ...(aliasHash ? [{ aliasHash }] : []),
    { firstName: args.customerName },
  ];

  const existing = await db.customers.findFirst({
    where: {
      businessId: args.businessId,
      isActive: true,
      OR: whereOr,
    },
    orderBy: { createdAt: "desc" },
  });

  if (existing) {
    return existing;
  }

  const piiStorage = await encodeCustomerPii({
    alias: args.customerName,
  });

  return db.customers.create({
    data: {
      businessId: args.businessId,
      alias: null,
      firstName: null,
      lastName: "",
      phoneNumber: null,
      email: null,
      address: null,
      notes: null,
      customerType: "retail",
      isActive: true,
      ephemeral: false,
      lastActivityAt: new Date(),
      ...piiStorage,
    },
  });
}

export async function mapOperationalCustomerRecord(customer: any) {
  const pii = await decodeCustomerPii(
    customer as unknown as Record<string, unknown>,
  );
  return mapCustomerToOperationalModel(customer, pii);
}
