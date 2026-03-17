import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@prisma/client", () => {
  class Decimal {
    value: number;

    constructor(value: string | number) {
      this.value = Number(value);
    }

    toNumber() {
      return this.value;
    }
  }

  class PrismaClientKnownRequestError extends Error {
    code: string;

    constructor(code: string) {
      super(`Prisma error ${code}`);
      this.code = code;
    }
  }

  return {
    Prisma: {
      Decimal,
      PrismaClientKnownRequestError,
      sql: (...args: unknown[]) => args,
      join: (values: unknown[]) => values,
    },
  };
});

vi.mock("@/lib/db", () => ({
  db: {
    $transaction: vi.fn(),
  },
}));

import {
  PosCheckoutError,
  addItem,
  checkout,
  createCart,
  quote,
  setAmountPaid,
  setDelivery,
  setFees,
  setPayment,
  setPaymentRef,
  setTaxAmount,
} from "@/lib/pos/core";
import { db } from "@/lib/db";

const mockedDb = vi.mocked(db);

function createTxBase(overrides?: Record<string, unknown>) {
  return {
    businessSettings: {
      findUnique: vi.fn().mockResolvedValue({ collectTax: true }),
    },
    sales: {
      findFirst: vi.fn().mockResolvedValue(null),
      create: vi.fn().mockResolvedValue({
        id: "sale_123",
        orderNumber: "POS-11111111-1111-4111-8111-111111111111",
      }),
    },
    salesLineItem: {
      create: vi.fn().mockResolvedValue({
        id: "line_123",
      }),
    },
    salesLineItemAllocation: {
      createMany: vi.fn().mockResolvedValue({ count: 1 }),
    },
    customers: {
      findFirst: vi.fn().mockResolvedValue(null),
      update: vi.fn().mockResolvedValue({}),
    },
    creditLimit: {
      findFirst: vi.fn().mockResolvedValue(null),
      updateMany: vi.fn().mockResolvedValue({ count: 1 }),
    },
    inventory: {
      update: vi.fn().mockResolvedValue({}),
    },
    inventoryBatch: {
      update: vi.fn().mockResolvedValue({}),
    },
    inventoryLog: {
      create: vi.fn().mockResolvedValue({}),
    },
    creditTransaction: {
      create: vi.fn().mockResolvedValue({}),
    },
    systemAuditLog: {
      create: vi.fn().mockResolvedValue({}),
    },
    $queryRaw: vi.fn().mockResolvedValue([]),
    $executeRaw: vi.fn().mockResolvedValue(undefined),
    ...overrides,
  };
}

function createBaseCart() {
  const cart = createCart({
    businessId: "11111111-1111-4111-8111-111111111111",
    userId: "user_123",
    mode: "quick",
    customerId: null,
  });

  return setPayment(
    addItem(cart, {
      id: "manual-item-1",
      inventoryId: null,
      name: "Manual Item",
      unitPrice: 10,
      qty: 2,
      source: "manual",
    }),
    {
      method: "cash",
      receipt: "none",
      creditConfirmed: false,
    },
  );
}

describe("pos core", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("merges duplicate items by id", () => {
    const cart = createCart({
      businessId: "11111111-1111-4111-8111-111111111111",
      userId: "user_123",
      mode: "quick",
      customerId: null,
    });

    const withOne = addItem(cart, {
      id: "item-1",
      inventoryId: null,
      name: "Test Item",
      unitPrice: 5,
      qty: 1,
      source: "manual",
    });

    const withMerged = addItem(withOne, {
      id: "item-1",
      inventoryId: null,
      name: "Test Item",
      unitPrice: 5,
      qty: 2,
      source: "manual",
    });

    expect(withMerged.items).toHaveLength(1);
    expect(withMerged.items[0].qty).toBe(3);
  });

  it("computes quote totals from subtotal, tax, and fees", () => {
    const cart = createBaseCart();
    const withTax = setTaxAmount(cart, 1.25);
    const withFees = setFees(withTax, [
      { type: "service", amount: 2.5 },
      { type: "other", amount: 0.25 },
    ]);

    const totals = quote(withFees);
    expect(totals.subtotal).toBe(20);
    expect(totals.taxAmount).toBe(1.25);
    expect(totals.feesTotal).toBe(2.75);
    expect(totals.total).toBe(24);
  });

  it("rejects duplicate idempotency keys with 409", async () => {
    const cart = createBaseCart();
    mockedDb.$transaction.mockImplementation(async (fn: any) => {
      const tx = createTxBase({
        sales: {
          findFirst: vi.fn().mockResolvedValue({ id: "sale-existing" }),
        },
      });
      return fn(tx);
    });

    await expect(checkout(cart, "11111111-1111-4111-8111-111111111111")).rejects.toMatchObject({
      message: "Duplicate idempotency key",
      status: 409,
    });
  });

  it("rejects stock underflow before writing sale", async () => {
    const cart = setPayment(
      addItem(
        createCart({
          businessId: "11111111-1111-4111-8111-111111111111",
          userId: "user_123",
          mode: "full",
          customerId: null,
        }),
        {
          id: "inv-item-1",
          inventoryId: "22222222-2222-4222-8222-222222222222",
          name: "Inventory Item",
          unitPrice: 15,
          qty: 3,
          source: "inventory",
        },
      ),
      {
        method: "cash",
        receipt: "none",
        creditConfirmed: false,
      },
    );

    mockedDb.$transaction.mockImplementation(async (fn: any) => {
      const tx = createTxBase({
        $queryRaw: vi.fn().mockResolvedValue([
          {
            id: "22222222-2222-4222-8222-222222222222",
            product_name: "Inventory Item",
            quantity_on_hand: 2,
            inventory_in_grams: 0,
            unit_cost: 4,
          },
        ]),
      });
      return fn(tx);
    });

    await expect(checkout(cart, "33333333-3333-4333-8333-333333333333")).rejects.toThrow(
      "Insufficient stock for Inventory Item",
    );
  });

  it("rejects credit payment when cap is exceeded", async () => {
    const cart = setPayment(
      createCart({
        businessId: "11111111-1111-4111-8111-111111111111",
        userId: "user_123",
        mode: "quick",
        customerId: "44444444-4444-4444-8444-444444444444",
      }),
      {
        method: "credit",
        receipt: "none",
        creditConfirmed: true,
      },
    );

    const withItem = addItem(cart, {
      id: "manual-item-1",
      inventoryId: null,
      name: "Manual Item",
      unitPrice: 10,
      qty: 1,
      source: "manual",
    });

    mockedDb.$transaction.mockImplementation(async (fn: any) => {
      const tx = createTxBase({
        customers: {
          findFirst: vi.fn().mockResolvedValue({
            id: "44444444-4444-4444-8444-444444444444",
            discountRate: 0,
          }),
          update: vi.fn().mockResolvedValue({}),
        },
        creditLimit: {
          findFirst: vi.fn().mockResolvedValue({
            id: "credit-1",
            maxCreditLimit: 10,
            currentBalance: 9,
          }),
        },
      });
      return fn(tx);
    });

    await expect(checkout(withItem, "55555555-5555-4555-8555-555555555555")).rejects.toMatchObject({
      status: 400,
    });
  });

  it("persists rich full-checkout metadata and weighted line items", async () => {
    let txUsed: ReturnType<typeof createTxBase> | undefined;
    const cart = setDelivery(
      setAmountPaid(
        setPaymentRef(
          setPayment(
            addItem(
              createCart({
                businessId: "11111111-1111-4111-8111-111111111111",
                userId: "user_123",
                mode: "full",
                source: "legacy-sales",
                customerId: "44444444-4444-4444-8444-444444444444",
              }),
              {
                id: "weighted-line",
                inventoryId: "22222222-2222-4222-8222-222222222222",
                name: "Weighted Item",
                unitPrice: 28,
                qty: 1,
                source: "inventory",
                weightGrams: 3.5,
                pricePerGram: 8,
                bulkTierApplied: "3.5g",
                originalPrice: 30,
                overrideReason: "Manager approved",
              },
            ),
            {
              method: "card",
              receipt: "print",
              creditConfirmed: false,
            },
          ),
          "AUTH-123",
        ),
        35,
      ),
      {
        deliveryManagementId: "66666666-6666-4666-8666-666666666666",
        deliveryAddress: "123 Main St",
        deliveryPrice: 5,
      },
    );

    mockedDb.$transaction.mockImplementation(async (fn: any) => {
      const queryRaw = vi.fn().mockImplementation(async (query: unknown) => {
        const sql = JSON.stringify(query);
        if (sql.includes("FROM inventory_batches")) {
          return [
            {
              id: "batch_123",
              remaining_quantity_grams: 5,
              unit_cost_per_gram: 4.25,
            },
          ];
        }

        return [
          {
            id: "22222222-2222-4222-8222-222222222222",
            product_name: "Weighted Item",
            quantity_on_hand: 5,
            inventory_in_grams: 10,
            unit_cost: 5,
            convert_to_grams: 1,
          },
        ];
      });

      txUsed = createTxBase({
        customers: {
          findFirst: vi.fn().mockResolvedValue({
            id: "44444444-4444-4444-8444-444444444444",
            discountRate: 0.1,
          }),
          update: vi.fn().mockResolvedValue({}),
        },
        $queryRaw: queryRaw,
      });
      return fn(txUsed);
    });

    const result = await checkout(cart, "11111111-1111-4111-8111-111111111111");

    expect(result).toEqual({
      saleId: "sale_123",
      orderNumber: "POS-11111111-1111-4111-8111-111111111111",
      total: 30.2,
      changeAmount: 4.8,
    });
    expect(txUsed?.sales.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          paymentRef: "AUTH-123",
          deliveryAddress: "123 Main St",
        }),
      }),
    );
    expect(txUsed?.$queryRaw).toHaveBeenCalledTimes(2);
    expect(txUsed?.inventory.update).toHaveBeenCalledWith({
      where: { id: "22222222-2222-4222-8222-222222222222" },
      data: {
        inventoryInGrams: { decrement: expect.any(Object) },
      },
    });
    expect(txUsed?.inventoryBatch.update).toHaveBeenCalledWith({
      where: { id: "batch_123" },
      data: {
        remainingQuantityGrams: expect.any(Object),
      },
    });
    expect(txUsed?.salesLineItem.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        saleId: "sale_123",
        inventoryId: "22222222-2222-4222-8222-222222222222",
        unitCost: expect.objectContaining({ value: 14.88 }),
      }),
      select: { id: true },
    });
    expect(txUsed?.salesLineItemAllocation.createMany).toHaveBeenCalledWith({
      data: [
        expect.objectContaining({
          saleId: "sale_123",
          salesLineItemId: "line_123",
          inventoryId: "22222222-2222-4222-8222-222222222222",
          batchId: "batch_123",
          quantityGrams: expect.any(Object),
          unitCostPerGram: expect.any(Object),
          extendedCost: expect.any(Object),
        }),
      ],
    });
    expect(txUsed?.inventoryLog.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        inventoryId: "22222222-2222-4222-8222-222222222222",
        transactionType: "sale",
        quantityChange: null,
        reason: "POS full weighted checkout (3.5g)",
      }),
    });
    expect(txUsed?.systemAuditLog.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        action: "pos.checkout",
        entityType: "sales",
        entityId: "sale_123",
        businessId: "11111111-1111-4111-8111-111111111111",
        userId: "user_123",
        newValues: expect.objectContaining({
          source: "legacy-sales",
          mode: "full",
          idempotencyKey: "11111111-1111-4111-8111-111111111111",
          paymentMethod: "card",
          orderNumber: "POS-11111111-1111-4111-8111-111111111111",
          itemCount: 1,
        }),
      }),
    });
  });

  it("throws typed error for empty carts", async () => {
    const cart = setPayment(
      createCart({
        businessId: "11111111-1111-4111-8111-111111111111",
        userId: "user_123",
        mode: "quick",
        customerId: null,
      }),
      {
        method: "cash",
        receipt: "none",
        creditConfirmed: false,
      },
    );

    await expect(checkout(cart, "66666666-6666-4666-8666-666666666666")).rejects.toBeInstanceOf(
      PosCheckoutError,
    );
  });

  it("allocates FIFO batches for unit inventory using gram conversion", async () => {
    let txUsed: ReturnType<typeof createTxBase> | undefined;
    const cart = setPayment(
      addItem(
        createCart({
          businessId: "11111111-1111-4111-8111-111111111111",
          userId: "user_123",
          mode: "full",
          customerId: null,
        }),
        {
          id: "unit-line",
          inventoryId: "77777777-7777-4777-8777-777777777777",
          name: "Pre-Roll Twin Pack",
          unitPrice: 22,
          qty: 2,
          source: "inventory",
        },
      ),
      {
        method: "cash",
        receipt: "none",
        creditConfirmed: false,
      },
    );

    mockedDb.$transaction.mockImplementation(async (fn: any) => {
      const queryRaw = vi.fn().mockImplementation(async (query: unknown) => {
        const sql = JSON.stringify(query);
        if (sql.includes("FROM inventory_batches")) {
          return [
            {
              id: "batch_unit_1",
              remaining_quantity_grams: 1,
              unit_cost_per_gram: 8,
            },
            {
              id: "batch_unit_2",
              remaining_quantity_grams: 1,
              unit_cost_per_gram: 9,
            },
          ];
        }

        return [
          {
            id: "77777777-7777-4777-8777-777777777777",
            product_name: "Pre-Roll Twin Pack",
            quantity_on_hand: 4,
            inventory_in_grams: 4,
            unit_cost: 8.5,
            convert_to_grams: 1,
          },
        ];
      });

      txUsed = createTxBase({
        $queryRaw: queryRaw,
      });
      return fn(txUsed);
    });

    const result = await checkout(cart, "77777777-7777-4777-8777-777777777778");

    expect(result).toEqual(
      expect.objectContaining({
        saleId: "sale_123",
        total: 44,
        changeAmount: 0,
      }),
    );
    expect(txUsed?.inventoryBatch.update).toHaveBeenNthCalledWith(1, {
      where: { id: "batch_unit_1" },
      data: {
        remainingQuantityGrams: expect.any(Object),
      },
    });
    expect(txUsed?.inventoryBatch.update).toHaveBeenNthCalledWith(2, {
      where: { id: "batch_unit_2" },
      data: {
        remainingQuantityGrams: expect.any(Object),
      },
    });
    expect(txUsed?.salesLineItem.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        saleId: "sale_123",
        inventoryId: "77777777-7777-4777-8777-777777777777",
        quantity: 2,
        unitCost: expect.objectContaining({ value: 8.5 }),
      }),
      select: { id: true },
    });
    expect(txUsed?.salesLineItemAllocation.createMany).toHaveBeenCalledWith({
      data: [
        expect.objectContaining({
          batchId: "batch_unit_1",
          quantityGrams: expect.any(Object),
          unitCostPerGram: expect.any(Object),
          extendedCost: expect.any(Object),
        }),
        expect.objectContaining({
          batchId: "batch_unit_2",
          quantityGrams: expect.any(Object),
          unitCostPerGram: expect.any(Object),
          extendedCost: expect.any(Object),
        }),
      ],
    });
    expect(txUsed?.inventory.update).toHaveBeenCalledWith({
      where: { id: "77777777-7777-4777-8777-777777777777" },
      data: {
        quantityOnHand: { decrement: 2 },
        inventoryInGrams: { decrement: expect.any(Object) },
      },
    });
    expect(txUsed?.inventoryLog.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        inventoryId: "77777777-7777-4777-8777-777777777777",
        transactionType: "sale",
        quantityChange: -2,
        reason: "POS full checkout",
      }),
    });
  });
});
