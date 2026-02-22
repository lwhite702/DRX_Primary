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
  setFees,
  setPayment,
  setTaxAmount,
} from "@/lib/pos/core";
import { db } from "@/lib/db";

const mockedDb = vi.mocked(db);

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
      const tx = {
        sales: {
          findFirst: vi.fn().mockResolvedValue({ id: "sale-existing" }),
        },
      };
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
      const tx = {
        sales: {
          findFirst: vi.fn().mockResolvedValue(null),
        },
        $queryRaw: vi.fn().mockResolvedValue([
          {
            id: "22222222-2222-4222-8222-222222222222",
            quantity_on_hand: 2,
          },
        ]),
      };
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
      const tx = {
        sales: {
          findFirst: vi.fn().mockResolvedValue(null),
        },
        creditLimit: {
          findFirst: vi.fn().mockResolvedValue({
            id: "credit-1",
            maxCreditLimit: 10,
            currentBalance: 9,
          }),
        },
      };
      return fn(tx);
    });

    await expect(checkout(withItem, "55555555-5555-4555-8555-555555555555")).rejects.toMatchObject({
      message: "Credit cap exceeded",
      status: 400,
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
});
