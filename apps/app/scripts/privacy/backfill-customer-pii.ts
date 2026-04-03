import "dotenv/config";

import { db } from "../../lib/db";
import { encodeCustomerPii } from "../../lib/privacy/customer-pii";

const BATCH_SIZE = 200;

type Args = {
  businessId?: string;
  dryRun: boolean;
};

function parseArgs(): Args {
  const args = process.argv.slice(2);
  const parsed: Args = { dryRun: false };

  for (let i = 0; i < args.length; i += 1) {
    const arg = args[i];
    if (arg === "--businessId") {
      parsed.businessId = args[i + 1];
      i += 1;
    } else if (arg === "--dry-run") {
      parsed.dryRun = true;
    }
  }

  return parsed;
}

async function main() {
  const { businessId, dryRun } = parseArgs();

  let cursor: string | undefined;
  let scanned = 0;
  let migrated = 0;

  for (;;) {
    const customers = await db.customers.findMany({
      where: {
        ...(businessId ? { businessId } : {}),
        OR: [
          { alias: { not: null } },
          { firstName: { not: null } },
          { phoneNumber: { not: null } },
          { email: { not: null } },
          { address: { not: null } },
          { notes: { not: null } },
        ],
      },
      orderBy: { id: "asc" },
      take: BATCH_SIZE,
      ...(cursor ? { skip: 1, cursor: { id: cursor } } : {}),
    });

    if (customers.length === 0) break;

    for (const customer of customers) {
      scanned += 1;

      const piiStorage = await encodeCustomerPii({
        alias: customer.alias,
        first_name: customer.firstName,
        phone: customer.phoneNumber,
        email: customer.email,
        address: customer.address,
        notes: customer.notes,
      });

      if (!dryRun) {
        await db.customers.update({
          where: { id: customer.id },
          data: {
            alias: null,
            firstName: null,
            phoneNumber: null,
            email: null,
            address: null,
            notes: null,
            ...piiStorage,
          },
        });
      }

      migrated += 1;
    }

    cursor = customers[customers.length - 1]?.id;
    console.log(`[privacy-backfill] scanned=${scanned} migrated=${migrated}`);
  }

  console.log(
    `[privacy-backfill] done scanned=${scanned} migrated=${migrated} dryRun=${dryRun}`,
  );
}

main()
  .catch((error) => {
    console.error("[privacy-backfill] failed", error);
    process.exit(1);
  })
  .finally(async () => {
    await db.$disconnect();
  });
