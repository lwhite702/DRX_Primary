import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import { Pool } from "pg";

const connectionString = process.env.DATABASE_URL;
if (!connectionString) {
  throw new Error("DATABASE_URL is required for backfill script");
}
const pool = new Pool({ connectionString });
const adapter = new PrismaPg(pool);
const db = new PrismaClient({ adapter });

function asNumber(value) {
  if (typeof value === "number") return value;
  if (value && typeof value === "object" && typeof value.toNumber === "function") {
    return value.toNumber();
  }
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
}

async function main() {
  const dryRun = process.argv.includes("--dry-run");

  const sales = await db.sales.findMany({
    where: {
      orderStatus: "completed",
      items: {
        some: {
          inventoryId: {
            not: null,
          },
        },
      },
      allocations: {
        none: {},
      },
    },
    select: {
      id: true,
      createdAt: true,
      items: {
        select: {
          id: true,
          inventoryId: true,
          quantity: true,
          weightSoldGrams: true,
          unitCost: true,
          inventory: {
            select: {
              convertToGrams: true,
            },
          },
        },
      },
    },
    orderBy: { createdAt: "asc" },
  });

  let createdAllocations = 0;
  let taggedSales = 0;

  for (const sale of sales) {
    const rows = sale.items.filter((item) => item.inventoryId);
    if (rows.length === 0) continue;

    if (!dryRun) {
      await db.$transaction(async (tx) => {
        for (const item of rows) {
          const qty = item.quantity;
          const weightSold = asNumber(item.weightSoldGrams);
          const convertToGrams = asNumber(item.inventory?.convertToGrams);
          const quantityGrams =
            weightSold > 0
              ? weightSold
              : convertToGrams > 0
                ? convertToGrams * qty
                : qty;

          if (quantityGrams <= 0) {
            continue;
          }

          const unitCost = asNumber(item.unitCost);
          const unitCostPerGram = quantityGrams > 0 ? unitCost / quantityGrams : 0;
          const extendedCost = unitCostPerGram * quantityGrams;

          await tx.salesLineItemAllocation.create({
            data: {
              saleId: sale.id,
              salesLineItemId: item.id,
              inventoryId: item.inventoryId,
              batchId: null,
              quantityGrams,
              unitCostPerGram,
              extendedCost,
            },
          });
          createdAllocations += 1;
        }

        await tx.$executeRaw`
          UPDATE sales
          SET checkout_version = 'legacy-estimate'
          WHERE id = ${sale.id}::uuid
        `;
      });
    }

    taggedSales += 1;
  }

  console.log(
    JSON.stringify(
      {
        dryRun,
        scannedSales: sales.length,
        taggedSales,
        createdAllocations,
      },
      null,
      2,
    ),
  );
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await db.$disconnect();
    await pool.end();
  });
