import "server-only";

import { Prisma } from "@prisma/client";
import { db } from "@/lib/db";
import { toNumber } from "@/app/api/pos/_lib/server";
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

class PosCheckoutError extends Error {
  status: number;

  constructor(message: string, status = 400) {
    super(message);
    this.status = status;
  }
}

function asDecimal(value: number) {
  return new Prisma.Decimal(value.toFixed(2));
}

function buildOrderNumber(idempotencyKey: string) {
  return `POS-${idempotencyKey}`.slice(0, 50);
}

export function createCart(params: {
  businessId: string;
  userId: string;
  mode: PosCart["mode"];
  customerId?: string | null;
}): PosCart {
  return {
    businessId: params.businessId,
    userId: params.userId,
    mode: params.mode,
    customerId: params.customerId ?? null,
    payment: { ...DEFAULT_PAYMENT },
    items: [],
    taxAmount: 0,
    fees: [],
  };
}

export function addItem(cart: PosCart, item: PosCartItem): PosCart {
  const existing = cart.items.find((entry) => entry.id === item.id);
  const nextItems = existing
    ? cart.items.map((entry) =>
        entry.id === item.id ? { ...entry, qty: entry.qty + item.qty } : entry,
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

export function quote(cart: PosCart): PosQuote {
  const subtotal = cart.items.reduce(
    (sum, item) => sum + item.unitPrice * item.qty,
    0,
  );
  const feesTotal = cart.fees.reduce(
    (sum, fee) => sum + (fee.amount ?? 0),
    0,
  );
  const taxAmount = cart.taxAmount;
  const total = Number((subtotal + feesTotal + taxAmount).toFixed(2));

  return {
    subtotal: Number(subtotal.toFixed(2)),
    taxAmount: Number(taxAmount.toFixed(2)),
    feesTotal: Number(feesTotal.toFixed(2)),
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

  const totals = quote(cart);
  const orderNumber = buildOrderNumber(idempotencyKey);

  try {
    const result = await db.$transaction(async (tx) => {
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

      const inventoryItems = cart.items.filter((item) => item.inventoryId);
      const inventoryIds = inventoryItems.map((item) => item.inventoryId!) as string[];

      if (inventoryIds.length > 0) {
        const lockedInventory = await tx.$queryRaw<
          { id: string; quantity_on_hand: number }[]
        >(
          Prisma.sql`
            SELECT id, quantity_on_hand
            FROM inventory
            WHERE business_id = ${cart.businessId}
            AND id IN (${Prisma.join(inventoryIds)})
            FOR UPDATE
          `,
        );

        const stockMap = new Map(
          lockedInventory.map((row) => [row.id, row.quantity_on_hand]),
        );

        for (const item of inventoryItems) {
          const available = stockMap.get(item.inventoryId!);
          if (available === undefined) {
            throw new PosCheckoutError("Inventory item not found", 404);
          }
          if (available - item.qty < 0) {
            throw new PosCheckoutError(`Insufficient stock for ${item.name}`);
          }
        }
      }

      if (cart.payment.method === "credit" && cart.customerId) {
        const credit = await tx.creditLimit.findFirst({
          where: {
            businessId: cart.businessId,
            customerId: cart.customerId,
          },
          select: {
            id: true,
            maxCreditLimit: true,
            currentBalance: true,
          },
        });

        if (!credit) {
          throw new PosCheckoutError("No credit limit configured for customer");
        }

        const remaining =
          toNumber(credit.maxCreditLimit) - toNumber(credit.currentBalance);

        if (remaining < totals.total) {
          throw new PosCheckoutError("Credit cap exceeded");
        }
      }

      const sale = await tx.sales.create({
        data: {
          businessId: cart.businessId,
          customerId: cart.customerId,
          orderNumber,
          orderStatus: "completed",
          orderType: cart.mode === "quick" ? "quick" : "retail",
          paymentMethod: cart.payment.method,
          subtotal: asDecimal(totals.subtotal),
          taxAmount: asDecimal(totals.taxAmount),
          totalAmount: asDecimal(totals.total),
          amountPaid: asDecimal(totals.total),
          changeAmount: asDecimal(0),
          fees: cart.fees,
          createdBy: cart.userId,
          items: {
            create: cart.items.map((item) => ({
              inventoryId: item.inventoryId,
              quantity: item.qty,
              unitPrice: asDecimal(item.unitPrice),
              lineTotal: asDecimal(item.unitPrice * item.qty),
            })),
          },
        },
        select: { id: true },
      });

      if (inventoryItems.length > 0) {
        for (const item of inventoryItems) {
          await tx.inventory.update({
            where: { id: item.inventoryId! },
            data: {
              quantityOnHand: { decrement: item.qty },
            },
          });

          await tx.inventoryLog.create({
            data: {
              inventoryId: item.inventoryId!,
              transactionType: "sale",
              quantityChange: -item.qty,
              reason: `POS ${cart.mode} checkout`,
              createdBy: cart.userId,
            },
          });
        }
      }

      if (cart.payment.method === "credit" && cart.customerId) {
        await tx.creditLimit.updateMany({
          where: {
            businessId: cart.businessId,
            customerId: cart.customerId,
          },
          data: {
            currentBalance: { increment: asDecimal(totals.total) },
          },
        });

        await tx.creditTransaction.create({
          data: {
            businessId: cart.businessId,
            customerId: cart.customerId,
            transactionType: "extension",
            amount: asDecimal(totals.total),
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
            mode: cart.mode,
            total: totals.total,
            idempotencyKey,
            paymentMethod: cart.payment.method,
          },
        },
      });

      return sale;
    });

    return { saleId: result.id, total: totals.total };
  } catch (error) {
    if (error instanceof PosCheckoutError) {
      throw error;
    }

    if (error instanceof Prisma.PrismaClientKnownRequestError) {
      if (error.code === "P2002") {
        throw new PosCheckoutError("Duplicate idempotency key", 409);
      }
    }

    throw new PosCheckoutError("Checkout failed", 400);
  }
}

export { PosCheckoutError };
