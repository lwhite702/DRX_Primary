import "server-only";

import { Prisma } from "@prisma/client";
import { db } from "@/lib/db";
import { toNumber } from "@/app/api/pos/_lib/server";
import type { CartLineItem } from "@/lib/pos/contract";
import type {
  PosCart,
  PosCartItem,
  PosCheckoutResult,
  PosFee,
  PosPayment,
  PosQuote,
} from "@/lib/pos/types";

const DEFAULT_PAYMENT: PosPayment = {
  method: "cash",
  receipt: "none",
  creditConfirmed: false,
};
const CHECKOUT_VERSION = "v2";

type CheckoutDbClient = Prisma.TransactionClient | typeof db;
type SqlCapableClient = {
  $queryRaw<T = unknown>(query: Prisma.Sql): Promise<T>;
};

type InventoryRow = {
  id: string;
  product_name: string;
  quantity_on_hand: number;
  inventory_in_grams: number | null;
  unit_cost: number | null;
  convert_to_grams: number | null;
};

type InventoryValidationError = {
  inventoryId: string | null;
  message: string;
};

type InventoryAvailabilityResult = {
  valid: boolean;
  errors: InventoryValidationError[];
  stockById: Map<
    string,
    {
      id: string;
        productName: string;
        quantityOnHand: number;
        inventoryInGrams: number;
        unitCost: number;
        convertToGrams: number;
      }
    >;
};

type InventoryBatchAllocation = {
  batchId: string | null;
  inventoryId: string;
  quantityGrams: number;
  unitCostPerGram: number;
  extendedCost: number;
};
type InventoryBatchRow = {
  id: string;
  remaining_quantity_grams: number;
  unit_cost_per_gram: number;
};

type CreditValidationResult = {
  valid: boolean;
  currentBalance: number;
  maxLimit: number;
  remaining: number;
  warning?: string;
};

class PosCheckoutError extends Error {
  status: number;

  constructor(message: string, status = 400) {
    super(message);
    this.status = status;
  }
}

function asDecimal(value: number, scale = 2) {
  return new Prisma.Decimal(value.toFixed(scale));
}

function roundCurrency(value: number) {
  return Number(value.toFixed(2));
}

function roundWeight(value: number) {
  return Number(value.toFixed(4));
}

function buildOrderNumber(idempotencyKey: string) {
  return `POS-${idempotencyKey}`.slice(0, 50);
}

function getLineTotal(item: CartLineItem) {
  if (item.weightGrams && item.weightGrams > 0) {
    if (item.pricePerGram && item.pricePerGram > 0) {
      return roundCurrency(item.pricePerGram * item.weightGrams);
    }
    return roundCurrency(item.unitPrice * item.qty);
  }

  return roundCurrency(item.unitPrice * item.qty);
}

async function getCollectTaxSetting(tx: CheckoutDbClient, businessId: string) {
  const settings = await tx.businessSettings.findUnique({
    where: { businessId },
    select: { collectTax: true },
  });

  return settings?.collectTax !== false;
}

async function loadInventoryRows(
  tx: CheckoutDbClient,
  businessId: string,
  inventoryIds: string[],
  lockRows: boolean,
): Promise<InventoryRow[]> {
  if (inventoryIds.length === 0) {
    return [];
  }
  const sqlClient = tx as unknown as SqlCapableClient;

  if (lockRows) {
    return sqlClient.$queryRaw<InventoryRow[]>(
      Prisma.sql`
        SELECT id, product_name, quantity_on_hand, inventory_in_grams, unit_cost, convert_to_grams
        FROM inventory
        WHERE business_id = ${businessId}
          AND id IN (${Prisma.join(inventoryIds)})
        FOR UPDATE
      `,
    );
  }

  return sqlClient.$queryRaw<InventoryRow[]>(
    Prisma.sql`
      SELECT id, product_name, quantity_on_hand, inventory_in_grams, unit_cost, convert_to_grams
      FROM inventory
      WHERE business_id = ${businessId}
        AND id IN (${Prisma.join(inventoryIds)})
    `,
  );
}

export async function validateInventoryAvailability(
  tx: CheckoutDbClient,
  businessId: string,
  items: CartLineItem[],
  options?: { lockRows?: boolean },
): Promise<InventoryAvailabilityResult> {
  const inventoryItems = items.filter((item) => item.inventoryId);
  const inventoryIds = Array.from(
    new Set(inventoryItems.map((item) => item.inventoryId!).filter(Boolean)),
  );
  const rows = await loadInventoryRows(tx, businessId, inventoryIds, Boolean(options?.lockRows));
  const stockById: InventoryAvailabilityResult["stockById"] = new Map(
    rows.map((row) => [
      row.id,
      {
        id: row.id,
        productName: row.product_name,
        quantityOnHand: row.quantity_on_hand,
        inventoryInGrams: toNumber(row.inventory_in_grams),
        unitCost: toNumber(row.unit_cost),
        convertToGrams: toNumber(row.convert_to_grams),
      },
    ]),
  );

  const errors: InventoryValidationError[] = [];

  for (const item of inventoryItems) {
    const inventory = stockById.get(item.inventoryId!);
    if (!inventory) {
      errors.push({
        inventoryId: item.inventoryId ?? null,
        message: `Inventory item not found for ${item.name}`,
      });
      continue;
    }

    if (item.weightGrams && item.weightGrams > 0) {
      if (inventory.inventoryInGrams < item.weightGrams) {
        errors.push({
          inventoryId: item.inventoryId ?? null,
          message: `Insufficient weight for ${inventory.productName}. Available: ${inventory.inventoryInGrams}, Requested: ${item.weightGrams}`,
        });
      }
      continue;
    }

    if (inventory.quantityOnHand < item.qty) {
      errors.push({
        inventoryId: item.inventoryId ?? null,
        message: `Insufficient stock for ${inventory.productName}. Available: ${inventory.quantityOnHand}, Requested: ${item.qty}`,
      });
    }
  }

  return {
    valid: errors.length === 0,
    errors,
    stockById,
  };
}

export async function validateCreditBalance(
  tx: CheckoutDbClient,
  businessId: string,
  customerId: string | null | undefined,
  amount: number,
): Promise<CreditValidationResult> {
  if (!customerId) {
    return {
      valid: true,
      currentBalance: 0,
      maxLimit: 0,
      remaining: 0,
    };
  }

  const credit = await tx.creditLimit.findFirst({
    where: {
      businessId,
      customerId,
    },
    select: {
      maxCreditLimit: true,
      currentBalance: true,
    },
  });

  if (!credit) {
    return {
      valid: false,
      currentBalance: 0,
      maxLimit: 0,
      remaining: 0,
      warning: "No credit limit configured for customer",
    };
  }

  const currentBalance = toNumber(credit.currentBalance);
  const maxLimit = toNumber(credit.maxCreditLimit);
  const remaining = roundCurrency(maxLimit - currentBalance);
  const valid = remaining >= amount;

  return {
    valid,
    currentBalance,
    maxLimit,
    remaining,
    warning: valid
      ? undefined
      : `Credit limit exceeded. Remaining: ${remaining.toFixed(2)}, Requested: ${amount.toFixed(2)}`,
  };
}

function getInventoryAllocationQuantityGrams(
  item: CartLineItem,
  inventory: InventoryAvailabilityResult["stockById"] extends Map<string, infer TValue>
    ? TValue
    : never,
) {
  if (item.weightGrams && item.weightGrams > 0) {
    return roundWeight(item.weightGrams);
  }

  if (inventory.convertToGrams > 0) {
    return roundWeight(inventory.convertToGrams * item.qty);
  }

  return 0;
}

async function allocateInventoryBatches(
  tx: CheckoutDbClient,
  businessId: string,
  inventoryId: string,
  quantityGrams: number,
): Promise<InventoryBatchAllocation[]> {
  if (quantityGrams <= 0) {
    return [];
  }

  const sqlClient = tx as unknown as SqlCapableClient;
  const rows = await sqlClient.$queryRaw<InventoryBatchRow[]>(
    Prisma.sql`
      SELECT id, remaining_quantity_grams, unit_cost_per_gram
      FROM inventory_batches
      WHERE business_id = ${businessId}
        AND inventory_id = ${inventoryId}
        AND remaining_quantity_grams > 0
      ORDER BY received_at ASC, created_at ASC
      FOR UPDATE
    `,
  );

  if (rows.length === 0) {
    throw new PosCheckoutError(`Missing FIFO batch inventory for item ${inventoryId}`);
  }

  const allocations: InventoryBatchAllocation[] = [];
  let remainingToAllocate = roundWeight(quantityGrams);

  for (const row of rows) {
    if (remainingToAllocate <= 0) {
      break;
    }

    const available = roundWeight(Number(row.remaining_quantity_grams));
    const allocated = roundWeight(Math.min(available, remainingToAllocate));
    if (allocated <= 0) {
      continue;
    }

    const unitCostPerGram = Number(row.unit_cost_per_gram);
    allocations.push({
      batchId: row.id,
      inventoryId,
      quantityGrams: allocated,
      unitCostPerGram,
      extendedCost: Number((allocated * unitCostPerGram).toFixed(4)),
    });

    await tx.inventoryBatch.update({
      where: { id: row.id },
      data: {
        remainingQuantityGrams: asDecimal(available - allocated, 4),
      },
    });

    remainingToAllocate = roundWeight(remainingToAllocate - allocated);
  }

  if (remainingToAllocate > 0) {
    throw new PosCheckoutError(`Insufficient FIFO batch inventory for item ${inventoryId}`);
  }

  return allocations;
}

export function createCart(params: {
  businessId: string;
  userId: string;
  mode: PosCart["mode"];
  source?: PosCart["source"];
  customerId?: string | null;
}): PosCart {
  return {
    businessId: params.businessId,
    userId: params.userId,
    mode: params.mode,
    source: params.source ?? (params.mode === "quick" ? "quick-pos" : "legacy-sales"),
    customerId: params.customerId ?? null,
    payment: { ...DEFAULT_PAYMENT },
    items: [],
    taxAmount: 0,
    fees: [],
    paymentRef: null,
    amountPaid: null,
    deliveryManagementId: null,
    deliveryAddress: null,
    deliveryPrice: 0,
  };
}

export function addItem(cart: PosCart, item: PosCartItem): PosCart {
  const existing = cart.items.find((entry) => entry.id === item.id);
  const nextItems = existing
    ? cart.items.map((entry) =>
        entry.id === item.id
          ? {
              ...entry,
              qty: entry.qty + item.qty,
              weightGrams: entry.weightGrams && item.weightGrams
                ? roundWeight(entry.weightGrams + item.weightGrams)
                : entry.weightGrams ?? item.weightGrams,
            }
          : entry,
      )
    : [...cart.items, item];

  return { ...cart, items: nextItems };
}

export function setPayment(cart: PosCart, payment: PosPayment): PosCart {
  return { ...cart, payment };
}

export function setFees(cart: PosCart, fees: PosFee[]): PosCart {
  return { ...cart, fees };
}

export function setTaxAmount(cart: PosCart, taxAmount: number): PosCart {
  return { ...cart, taxAmount };
}

export function setPaymentRef(cart: PosCart, paymentRef: string | null | undefined): PosCart {
  return { ...cart, paymentRef: paymentRef ?? null };
}

export function setAmountPaid(cart: PosCart, amountPaid: number | null | undefined): PosCart {
  return { ...cart, amountPaid: amountPaid ?? null };
}

export function setDelivery(
  cart: PosCart,
  delivery: {
    deliveryManagementId?: string | null;
    deliveryAddress?: string | null;
    deliveryPrice?: number | null;
  },
): PosCart {
  return {
    ...cart,
    deliveryManagementId: delivery.deliveryManagementId ?? null,
    deliveryAddress: delivery.deliveryAddress ?? null,
    deliveryPrice: delivery.deliveryPrice ?? 0,
  };
}

export function quote(cart: PosCart): PosQuote {
  const subtotal = cart.items.reduce((sum, item) => sum + getLineTotal(item), 0);
  const feesTotal = cart.fees.reduce((sum, fee) => sum + (fee.amount ?? 0), 0);
  const taxAmount = cart.taxAmount;
  const deliveryPrice = cart.deliveryPrice ?? 0;
  const total = roundCurrency(subtotal + feesTotal + taxAmount + deliveryPrice);

  return {
    subtotal: roundCurrency(subtotal),
    taxAmount: roundCurrency(taxAmount),
    feesTotal: roundCurrency(feesTotal),
    total,
  };
}

export async function checkout(
  cart: PosCart,
  idempotencyKey: string,
): Promise<PosCheckoutResult> {
  if (cart.items.length === 0) {
    throw new PosCheckoutError("Cart is empty");
  }

  if (!cart.payment.method) {
    throw new PosCheckoutError("Payment method required");
  }

  if (cart.mode === "full") {
    const invalidManual = cart.items.some(
      (item) => item.source !== "inventory" || !item.inventoryId,
    );
    if (invalidManual) {
      throw new PosCheckoutError("Full POS requires inventory items only");
    }
  }

  if (cart.payment.method === "credit") {
    if (!cart.customerId) {
      throw new PosCheckoutError("Credit payment requires customer");
    }
    if (!cart.payment.creditConfirmed) {
      throw new PosCheckoutError("Credit payment requires confirmation");
    }
  }

  const orderNumber = buildOrderNumber(idempotencyKey);

  try {
    return await db.$transaction(async (tx) => {
      const existingSale = await tx.sales.findFirst({
        where: {
          businessId: cart.businessId,
          orderNumber,
        },
        select: { id: true },
      });

      if (existingSale) {
        throw new PosCheckoutError("Duplicate idempotency key", 409);
      }

      const collectTax = await getCollectTaxSetting(tx, cart.businessId);
      const taxAmount = collectTax ? cart.taxAmount : 0;
      const subtotal = roundCurrency(cart.items.reduce((sum, item) => sum + getLineTotal(item), 0));
      const feeAmount = roundCurrency(cart.fees.reduce((sum, fee) => sum + (fee.amount ?? 0), 0));
      const deliveryPrice = roundCurrency(cart.deliveryPrice ?? 0);

      const inventoryCheck = await validateInventoryAvailability(tx, cart.businessId, cart.items, {
        lockRows: true,
      });
      if (!inventoryCheck.valid) {
        throw new PosCheckoutError(inventoryCheck.errors[0]?.message ?? "Insufficient stock");
      }

      let loyaltyDiscountRate = 0;
      let loyaltyDiscountAmount = 0;

      if (cart.customerId) {
        const customer = await tx.customers.findFirst({
          where: {
            id: cart.customerId,
            businessId: cart.businessId,
          },
          select: {
            id: true,
            discountRate: true,
          },
        });

        if (!customer) {
          throw new PosCheckoutError("Customer not found", 404);
        }

        loyaltyDiscountRate = toNumber(customer.discountRate);
        loyaltyDiscountAmount = roundCurrency(subtotal * loyaltyDiscountRate);
      }

      const subtotalAfterDiscount = roundCurrency(subtotal - loyaltyDiscountAmount);
      const total = roundCurrency(subtotalAfterDiscount + feeAmount + taxAmount + deliveryPrice);

      if (cart.payment.method === "credit" && cart.customerId) {
        const creditCheck = await validateCreditBalance(
          tx,
          cart.businessId,
          cart.customerId,
          total,
        );

        if (!creditCheck.valid) {
          throw new PosCheckoutError(creditCheck.warning ?? "Credit cap exceeded");
        }
      }

      const amountPaid = roundCurrency(
        cart.amountPaid ??
          (cart.payment.method === "credit" ? 0 : total),
      );
      const changeAmount = roundCurrency(
        cart.payment.method === "credit" ? 0 : Math.max(amountPaid - total, 0),
      );

      const sale = await tx.sales.create({
        data: {
          businessId: cart.businessId,
          customerId: cart.customerId,
          orderNumber,
          orderStatus: "completed",
          orderType: cart.mode === "quick" ? "quick" : "retail",
          paymentMethod: cart.payment.method,
          paymentRef: cart.paymentRef ?? null,
          subtotal: asDecimal(subtotal),
          taxAmount: asDecimal(taxAmount),
          totalAmount: asDecimal(total),
          amountPaid: asDecimal(amountPaid),
          changeAmount: asDecimal(changeAmount),
          fees: cart.fees as unknown as Prisma.InputJsonValue,
          deliveryManagementId: cart.deliveryManagementId ?? null,
          deliveryAddress: cart.deliveryAddress ?? null,
          deliveryPrice: asDecimal(deliveryPrice),
          createdBy: cart.userId,
        },
        select: { id: true, orderNumber: true },
      });

      await tx.$executeRaw`
        UPDATE sales
        SET sale_source = ${cart.source},
            checkout_version = ${CHECKOUT_VERSION}
        WHERE id = ${sale.id}::uuid
      `;

      for (const item of cart.items) {
        const inventory = item.inventoryId
          ? inventoryCheck.stockById.get(item.inventoryId)
          : null;
        const allocationQuantityGrams = inventory
          ? getInventoryAllocationQuantityGrams(item, inventory)
          : 0;
        const pricePerGram =
          item.weightGrams && item.weightGrams > 0
            ? item.pricePerGram ?? roundWeight(item.unitPrice / item.weightGrams)
            : null;

        const batchAllocations =
          item.inventoryId && allocationQuantityGrams > 0
            ? await allocateInventoryBatches(
                tx,
                cart.businessId,
                item.inventoryId,
                allocationQuantityGrams,
              )
            : [];
        if (allocationQuantityGrams > 0 && batchAllocations.length === 0) {
          throw new PosCheckoutError(`Missing FIFO allocations for item ${item.inventoryId}`);
        }
        const allocatedExtendedCost = batchAllocations.reduce(
          (sum, entry) => sum + entry.extendedCost,
          0,
        );
        const allocatedUnitCost =
          batchAllocations.length > 0 && item.qty > 0
            ? allocatedExtendedCost / item.qty
            : null;

        const saleLineItem = await tx.salesLineItem.create({
          data: {
            saleId: sale.id,
            inventoryId: item.inventoryId,
            quantity: item.qty,
            unitPrice: asDecimal(item.unitPrice),
            lineTotal: asDecimal(getLineTotal(item)),
            unitCost:
              allocatedUnitCost !== null
                ? asDecimal(allocatedUnitCost)
                : inventory
                  ? asDecimal(inventory.unitCost)
                  : undefined,
            weightSoldGrams:
              item.weightGrams && item.weightGrams > 0
                ? asDecimal(item.weightGrams, 4)
                : undefined,
            pricePerGram:
              pricePerGram && pricePerGram > 0
                ? asDecimal(pricePerGram, 4)
                : undefined,
            bulkTierApplied: item.bulkTierApplied,
            loyaltyDiscountApplied:
              item.loyaltyDiscountApplied !== undefined
                ? asDecimal(item.loyaltyDiscountApplied, 4)
                : loyaltyDiscountRate > 0
                  ? asDecimal(loyaltyDiscountRate, 4)
                  : undefined,
            originalPrice:
              item.originalPrice !== undefined
                ? asDecimal(item.originalPrice)
                : undefined,
            priceOverrideReason: item.overrideReason,
          },
          select: { id: true },
        });

        if (batchAllocations.length > 0) {
          await tx.salesLineItemAllocation.createMany({
            data: batchAllocations.map((entry) => ({
              saleId: sale.id,
              salesLineItemId: saleLineItem.id,
              inventoryId: entry.inventoryId,
              batchId: entry.batchId,
              quantityGrams: asDecimal(entry.quantityGrams, 4),
              unitCostPerGram: asDecimal(entry.unitCostPerGram, 6),
              extendedCost: asDecimal(entry.extendedCost, 4),
            })),
          });
        }

        if (!item.inventoryId) {
          continue;
        }

        if (item.weightGrams && item.weightGrams > 0) {
          await tx.inventory.update({
            where: { id: item.inventoryId },
            data: {
              inventoryInGrams: { decrement: asDecimal(item.weightGrams, 4) },
            },
          });

          await tx.inventoryLog.create({
            data: {
              inventoryId: item.inventoryId,
              transactionType: "sale",
              quantityChange: null,
              reason: `POS ${cart.mode} weighted checkout (${item.weightGrams}g)`,
              createdBy: cart.userId,
            },
          });
        } else {
          await tx.inventory.update({
            where: { id: item.inventoryId },
            data: {
              quantityOnHand: { decrement: item.qty },
              ...(allocationQuantityGrams > 0
                ? {
                    inventoryInGrams: {
                      decrement: asDecimal(allocationQuantityGrams, 4),
                    },
                  }
                : {}),
            },
          });

          await tx.inventoryLog.create({
            data: {
              inventoryId: item.inventoryId,
              transactionType: "sale",
              quantityChange: -item.qty,
              reason: `POS ${cart.mode} checkout`,
              createdBy: cart.userId,
            },
          });
        }
      }

      if (cart.customerId) {
        await tx.customers.update({
          where: { id: cart.customerId },
          data: {
            purchaseCount: { increment: 1 },
            totalPurchases: { increment: asDecimal(subtotalAfterDiscount) },
          },
        });

        try {
          await tx.$executeRaw`
            SELECT update_customer_loyalty_tier(${cart.businessId}::uuid, ${cart.customerId}::uuid)
          `;
        } catch {
          // Some environments may not have the loyalty helper yet; the sale should still complete.
        }
      }

      if (cart.payment.method === "credit" && cart.customerId) {
        await tx.creditLimit.updateMany({
          where: {
            businessId: cart.businessId,
            customerId: cart.customerId,
          },
          data: {
            currentBalance: { increment: asDecimal(total) },
          },
        });

        await tx.customers.update({
          where: { id: cart.customerId },
          data: {
            totalCreditUsed: { increment: asDecimal(total) },
          },
        });

        await tx.creditTransaction.create({
          data: {
            businessId: cart.businessId,
            customerId: cart.customerId,
            transactionType: "extension",
            amount: asDecimal(total),
            description: `POS sale ${sale.id}`,
            status: "completed",
            createdBy: cart.userId,
          },
        });
      }

      await tx.systemAuditLog.create({
        data: {
          action: "pos.checkout",
          entityType: "sales",
          entityId: sale.id,
          userId: cart.userId,
          businessId: cart.businessId,
          newValues: {
            source: cart.source,
            mode: cart.mode,
            total,
            subtotal,
            taxAmount,
            loyaltyDiscountAmount,
            idempotencyKey,
            paymentMethod: cart.payment.method,
            orderNumber: sale.orderNumber,
            itemCount: cart.items.length,
          },
        },
      });

      return {
        saleId: sale.id,
        orderNumber: sale.orderNumber,
        total,
        changeAmount,
      };
    });
  } catch (error) {
    if (error instanceof PosCheckoutError) {
      throw error;
    }

    if (error instanceof Prisma.PrismaClientKnownRequestError) {
      if (error.code === "P2002") {
        throw new PosCheckoutError("Duplicate idempotency key", 409);
      }
    }

    throw new PosCheckoutError(error instanceof Error ? error.message : "Checkout failed", 400);
  }
}

export { PosCheckoutError };
