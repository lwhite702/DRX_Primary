import { Prisma, type Customers } from "@prisma/client";
import { db } from "@/lib/db";
import {
  hashEmailLookupCandidates,
  hashPhoneLookupCandidates,
} from "@/lib/privacy/pii-hash";
import {
  normalizeEmail,
  normalizePhone,
} from "@/lib/customers/core/customer-normalizer";

type TransactionClient = Prisma.TransactionClient;

type IdentityCandidates = {
  phone: string | null;
  email: string | null;
  phoneHashes: string[];
  emailHashes: string[];
};

type AuditSnapshot = {
  changedFields: string[];
  isActive: boolean;
  ephemeral: boolean;
  customerType: string | null;
};

export class CustomerConflictError extends Error {
  constructor(readonly existingCustomerId: string) {
    super("A customer with that phone or email already exists");
  }
}

export class CustomerLifecycleNotFoundError extends Error {
  constructor() {
    super("Customer not found");
  }
}

async function buildIdentityCandidates(input: {
  phone?: string | null;
  email?: string | null;
}): Promise<IdentityCandidates> {
  const phone = normalizePhone(input.phone);
  const email = normalizeEmail(input.email);
  const [phoneHashes, emailHashes] = await Promise.all([
    hashPhoneLookupCandidates(phone || input.phone),
    hashEmailLookupCandidates(email || input.email),
  ]);

  return {
    phone,
    email,
    phoneHashes: [...new Set(phoneHashes)].sort(),
    emailHashes: [...new Set(emailHashes)].sort(),
  };
}

function identityWhere(
  candidates: IdentityCandidates,
): Prisma.CustomersWhereInput[] {
  return [
    ...candidates.phoneHashes.map((phoneHash) => ({ phoneHash })),
    ...candidates.emailHashes.map((emailHash) => ({ emailHash })),
    ...(candidates.phone ? [{ phoneNumber: candidates.phone }] : []),
    ...(candidates.email
      ? [{ email: { equals: candidates.email, mode: "insensitive" as const } }]
      : []),
  ];
}

async function lockIdentity(
  tx: TransactionClient,
  businessId: string,
  candidates: IdentityCandidates,
) {
  const hashes = [
    ...candidates.phoneHashes.map((hash) => `phone:${hash}`),
    ...candidates.emailHashes.map((hash) => `email:${hash}`),
  ].sort();
  if (hashes.length === 0) return;

  for (const hash of hashes) {
    const lockKey = `customer-identity:${businessId}:${hash}`;
    await tx.$queryRaw`SELECT pg_advisory_xact_lock(hashtextextended(${lockKey}, 0))`;
  }
}

async function findConflict(
  tx: TransactionClient,
  businessId: string,
  candidates: IdentityCandidates,
  excludeCustomerId?: string,
) {
  const OR = identityWhere(candidates);
  if (OR.length === 0) return null;

  return tx.customers.findFirst({
    where: {
      businessId,
      isActive: true,
      ...(excludeCustomerId ? { id: { not: excludeCustomerId } } : {}),
      OR,
    },
    select: { id: true },
  });
}

export async function createCustomerWithAudit(input: {
  businessId: string;
  actorUserId: string;
  phone?: string | null;
  email?: string | null;
  data: Prisma.CustomersUncheckedCreateInput;
  audit: AuditSnapshot;
}): Promise<Customers> {
  const candidates = await buildIdentityCandidates(input);

  return db.$transaction(
    async (tx: TransactionClient) => {
      const isActive = input.data.isActive !== false;
      if (isActive) {
        await lockIdentity(tx, input.businessId, candidates);
        const conflict = await findConflict(tx, input.businessId, candidates);
        if (conflict) {
          throw new CustomerConflictError(conflict.id);
        }
      }

      const created = await tx.customers.create({ data: input.data });
      await tx.systemAuditLog.create({
        data: {
          action: "customer_created",
          entityType: "customer",
          entityId: created.id,
          businessId: input.businessId,
          userId: input.actorUserId,
          newValues: input.audit,
        },
      });

      return created;
    },
    { isolationLevel: Prisma.TransactionIsolationLevel.ReadCommitted },
  );
}

export async function updateCustomerWithAudit(input: {
  businessId: string;
  actorUserId: string;
  customerId: string;
  phone?: string | null;
  email?: string | null;
  data: Prisma.CustomersUncheckedUpdateInput;
  changedFields: string[];
}): Promise<Customers> {
  const candidates = await buildIdentityCandidates(input);

  return db.$transaction(
    async (tx: TransactionClient) => {
      const recordLockKey = `customer-record:${input.businessId}:${input.customerId}`;
      await tx.$queryRaw`SELECT pg_advisory_xact_lock(hashtextextended(${recordLockKey}, 0))`;

      const current = await tx.customers.findFirst({
        where: { id: input.customerId, businessId: input.businessId },
      });
      if (!current) {
        throw new CustomerLifecycleNotFoundError();
      }

      const nextIsActive =
        typeof input.data.isActive === "boolean"
          ? input.data.isActive
          : current.isActive;
      const isLifecycleOnlyUpdate =
        input.changedFields.length === 1 &&
        input.changedFields[0] === "is_active";
      if (isLifecycleOnlyUpdate && nextIsActive === current.isActive) {
        return current;
      }

      if (nextIsActive) {
        await lockIdentity(tx, input.businessId, candidates);
        const conflict = await findConflict(
          tx,
          input.businessId,
          candidates,
          input.customerId,
        );
        if (conflict) {
          throw new CustomerConflictError(conflict.id);
        }
      }

      const updated = await tx.customers.update({
        where: { id: input.customerId },
        data: input.data,
      });
      await tx.systemAuditLog.create({
        data: {
          action:
            current.isActive && !updated.isActive
              ? "customer_archived"
              : !current.isActive && updated.isActive
                ? "customer_reactivated"
                : "customer_updated",
          entityType: "customer",
          entityId: input.customerId,
          businessId: input.businessId,
          userId: input.actorUserId,
          oldValues: {
            isActive: current.isActive,
            ephemeral: current.ephemeral,
            customerType: current.customerType,
          },
          newValues: {
            changedFields: input.changedFields,
            isActive: updated.isActive,
            ephemeral: updated.ephemeral,
            customerType: updated.customerType,
          },
        },
      });

      return updated;
    },
    { isolationLevel: Prisma.TransactionIsolationLevel.ReadCommitted },
  );
}
