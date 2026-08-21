import { db } from "@/lib/db";
import { decodeCustomerPii } from "@/lib/privacy/customer-pii";
import {
  buildDeterministicLookupHashes,
  hashAliasLookupCandidates,
  hashEmailLookupCandidates,
  hashPhoneLookupCandidates,
} from "@/lib/privacy/pii-hash";
import {
  customerMatchesSearch,
  mapCustomerToOperationalModel,
  normalizeCustomerSearchInput,
  toNumberSafe,
} from "@/lib/customers/core/customer-normalizer";

function clampLimit(limit: number): number {
  if (!Number.isFinite(limit)) return 50;
  return Math.max(1, Math.min(200, Math.trunc(limit)));
}

function clampOffset(offset: number): number {
  if (!Number.isFinite(offset)) return 0;
  return Math.max(0, Math.trunc(offset));
}

function uniqueById<T extends { id: string }>(rows: T[]): T[] {
  const seen = new Set<string>();
  const deduped: T[] = [];
  for (const row of rows) {
    if (seen.has(row.id)) continue;
    seen.add(row.id);
    deduped.push(row);
  }
  return deduped;
}

async function decodeForFiltering(customer: any) {
  const pii = await decodeCustomerPii(customer as Record<string, unknown>);
  return {
    id: customer.id,
    alias: pii.alias,
    first_name: pii.first_name,
    last_name: customer.lastName || "",
    phone: pii.phone,
    email: pii.email,
    model: mapCustomerToOperationalModel(customer, pii),
  };
}

export async function findCustomersForSearch(args: {
  businessId: string;
  search?: string;
  limit?: number;
  offset?: number;
  isActive?: boolean;
}): Promise<Array<Record<string, unknown>>> {
  const limit = clampLimit(args.limit ?? 50);
  const offset = clampOffset(args.offset ?? 0);
  const search = normalizeCustomerSearchInput(args.search);
  const isActive = args.isActive ?? true;

  if (!search.hasQuery) {
    const rows = await db.customers.findMany({
      where: { businessId: args.businessId, isActive },
      orderBy: { createdAt: "desc" },
      take: limit,
      skip: offset,
    });

    const decoded = await Promise.all(
      rows.map((row: any) => decodeForFiltering(row)),
    );
    return decoded.map((row) => row.model);
  }

  const hashCandidates = await buildDeterministicLookupHashes({
    alias: search.alias,
    phone: search.phone,
    email: search.email,
  });

  const [aliasHashes, phoneHashes, emailHashes] = await Promise.all([
    hashAliasLookupCandidates(search.alias || search.raw),
    hashPhoneLookupCandidates(search.phone || search.raw),
    hashEmailLookupCandidates(search.email || search.raw),
  ]);

  const orClauses: any[] = [];

  if (hashCandidates.aliasHash) {
    orClauses.push({ aliasHash: hashCandidates.aliasHash });
  }
  if (hashCandidates.phoneHash) {
    orClauses.push({ phoneHash: hashCandidates.phoneHash });
  }
  if (hashCandidates.emailHash) {
    orClauses.push({ emailHash: hashCandidates.emailHash });
  }

  orClauses.push(
    ...aliasHashes.map((aliasHash) => ({ aliasHash })),
    ...phoneHashes.map((phoneHash) => ({ phoneHash })),
    ...emailHashes.map((emailHash) => ({ emailHash })),
  );

  // Transitional fallback for legacy plaintext rows until full backfill completes.
  if (search.raw) {
    orClauses.push(
      { firstName: { contains: search.raw, mode: "insensitive" } },
      { lastName: { contains: search.raw, mode: "insensitive" } },
      { phoneNumber: { contains: search.raw, mode: "insensitive" } },
      { email: { contains: search.raw, mode: "insensitive" } },
    );
  }

  const primaryRows = await db.customers.findMany({
    where: {
      businessId: args.businessId,
      isActive,
      OR: orClauses.length > 0 ? orClauses : undefined,
    },
    orderBy: { createdAt: "desc" },
    take: Math.max(40, limit * 4),
  });

  const primaryDecoded = await Promise.all(
    primaryRows.map((row: any) => decodeForFiltering(row)),
  );

  let matched = primaryDecoded.filter((row) =>
    customerMatchesSearch(row, search),
  );

  if (matched.length < offset + limit) {
    const fallbackRows = await db.customers.findMany({
      where: { businessId: args.businessId, isActive },
      orderBy: { createdAt: "desc" },
      take: Math.max(120, limit * 8),
    });

    const fallbackDecoded = await Promise.all(
      fallbackRows.map((row: any) => decodeForFiltering(row)),
    );

    matched = uniqueById([...matched, ...fallbackDecoded]).filter((row) =>
      customerMatchesSearch(row, search),
    );
  }

  const paged = matched.slice(offset, offset + limit);
  return paged.map((row) => row.model);
}

export async function lookupPosCustomerCandidates(args: {
  businessId: string;
  search: string;
  limit?: number;
}) {
  const limit = clampLimit(args.limit ?? 10);
  const normalized = normalizeCustomerSearchInput(args.search);

  if (!normalized.hasQuery)
    return [] as Array<{
      id: string;
      phone: string;
      alias: string;
      remainingCredit: number;
    }>;

  const [phoneHashes, emailHashes, aliasHashes] = await Promise.all([
    hashPhoneLookupCandidates(normalized.phone || normalized.raw),
    hashEmailLookupCandidates(normalized.email || normalized.raw),
    hashAliasLookupCandidates(normalized.alias || normalized.raw),
  ]);

  const legacyOr: any[] = [];
  if (normalized.phone)
    legacyOr.push({ phoneNumber: { contains: normalized.phone } });
  if (normalized.email)
    legacyOr.push({
      email: { contains: normalized.email, mode: "insensitive" },
    });
  if (normalized.raw) {
    legacyOr.push(
      { firstName: { contains: normalized.raw, mode: "insensitive" } },
      { lastName: { contains: normalized.raw, mode: "insensitive" } },
    );
  }

  const rows = await db.customers.findMany({
    where: {
      businessId: args.businessId,
      isActive: true,
      OR: [
        ...phoneHashes.map((phoneHash) => ({ phoneHash })),
        ...emailHashes.map((emailHash) => ({ emailHash })),
        ...aliasHashes.map((aliasHash) => ({ aliasHash })),
        ...legacyOr,
      ],
    },
    take: Math.max(30, limit * 4),
    orderBy: { createdAt: "desc" },
    select: {
      id: true,
      firstName: true,
      lastName: true,
      aliasEncrypted: true,
      firstNameEncrypted: true,
      phoneEncrypted: true,
      emailEncrypted: true,
      addressEncrypted: true,
      notesEncrypted: true,
      alias: true,
      phoneNumber: true,
      email: true,
      creditLimits: {
        where: { businessId: args.businessId },
        take: 1,
        select: {
          maxCreditLimit: true,
          currentBalance: true,
        },
      },
    },
  });

  const decoded = await Promise.all(
    rows.map((row: any) => decodeForFiltering(row)),
  );
  const filtered = decoded.filter((row) =>
    customerMatchesSearch(row, normalized),
  );

  return filtered.slice(0, limit).map((row) => {
    const limitRow = rows.find((candidate: any) => candidate.id === row.id)
      ?.creditLimits?.[0];
    const remainingCredit = limitRow
      ? Math.max(
          0,
          toNumberSafe(limitRow.maxCreditLimit) -
            toNumberSafe(limitRow.currentBalance),
        )
      : 0;

    return {
      id: row.id,
      phone: row.phone || "",
      alias:
        row.alias ||
        [row.first_name || "", row.last_name || ""].filter(Boolean).join(" ") ||
        "Customer",
      remainingCredit,
    };
  });
}
