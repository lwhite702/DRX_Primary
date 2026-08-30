import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  query: vi.fn(),
  mutation: vi.fn(),
  setAuth: vi.fn(),
  getToken: vi.fn(),
  findLegacySale: vi.fn(),
}));

vi.mock("@/lib/db", () => ({
  db: { sales: { findFirst: mocks.findLegacySale } },
}));

vi.mock("convex/browser", () => ({
  ConvexHttpClient: vi.fn(() => ({
    query: mocks.query,
    mutation: mocks.mutation,
    setAuth: mocks.setAuth,
  })),
}));

vi.mock("@/lib/adapters/auth/server", () => ({
  auth: vi.fn(async () => ({ getToken: mocks.getToken })),
}));

import {
  checkoutCanonicalCommerce,
  getCanonicalCommerceSummary,
  quoteCanonicalCommerce,
  shouldUseCanonicalCommerce,
} from "@/app/api/pos/_lib/convex-commerce";

const input = {
  businessId: "11111111-1111-4111-8111-111111111111",
  customerId: "22222222-2222-4222-8222-222222222222",
  items: [
    {
      id: "inventory-line",
      inventoryId: "33333333-3333-4333-8333-333333333333",
      name: "Synthetic product",
      unitPrice: 10,
      sku: "CASE-COLLISION-SAFE",
      source: "inventory" as const,
      qty: 1,
      weightGrams: 1.25,
    },
  ],
};

describe("canonical web commerce bridge", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    process.env.NEXT_PUBLIC_CONVEX_URL = "https://synthetic.convex.cloud";
    mocks.getToken.mockResolvedValue("synthetic-convex-token");
    mocks.findLegacySale.mockResolvedValue(null);
  });

  it("maps the tenant, product, and customer by durable legacy IDs", async () => {
    mocks.query
      .mockResolvedValueOnce({
        business: { legacyPrismaBusinessId: input.businessId },
        settings: null,
      })
      .mockResolvedValueOnce([
        {
          _id: "canonical_product_id",
          legacyPrismaId: input.items[0].inventoryId,
        },
      ])
      .mockResolvedValueOnce([
        {
          _id: "canonical_customer_id",
          legacyPrismaId: input.customerId,
        },
      ])
      .mockResolvedValueOnce({
        merchandiseSubtotalCents: 1_250,
        discountCents: 125,
        subtotalCents: 1_125,
        merchandiseTaxCents: 90,
        deliveryRevenueCents: 0,
        vendorDeliveryExpenseCents: 0,
        deliveryTaxCents: 0,
        totalAmountCents: 1_215,
      });

    const quote = await quoteCanonicalCommerce(input);

    expect(quote.total).toBe(12.15);
    expect(mocks.query).toHaveBeenLastCalledWith(expect.anything(), {
      customerId: "canonical_customer_id",
      items: [{ productId: "canonical_product_id", quantityGrams: 1.25 }],
      delivery: undefined,
    });
  });

  it("fails closed when the authenticated canonical tenant mapping differs", async () => {
    mocks.query
      .mockResolvedValueOnce({
        business: { legacyPrismaBusinessId: "different-business" },
        settings: null,
      })
      .mockResolvedValueOnce([])
      .mockResolvedValueOnce([]);

    await expect(quoteCanonicalCommerce(input)).rejects.toThrow(
      "canonical tenant is not linked",
    );
  });

  it("keeps ordinary unsynchronized no-customer carts on the legacy path", () => {
    expect(
      shouldUseCanonicalCommerce({
        customerId: null,
        items: [
          {
            id: "legacy-line",
            inventoryId: input.items[0].inventoryId,
            name: "Legacy item",
            unitPrice: 10,
            sku: "LEGACY-SKU",
            source: "inventory",
            qty: 1,
          },
        ],
      }),
    ).toBe(false);
  });

  it("returns an existing web sale when retry routing changes to canonical", async () => {
    mocks.findLegacySale.mockResolvedValue({
      id: "original-sale",
      orderNumber: "POS-stable-key",
      totalAmount: 18.5,
      changeAmount: 1.5,
    });
    const result = await checkoutCanonicalCommerce({
      ...input,
      idempotencyKey: "stable-key",
      paymentMethod: "cash",
    });
    expect(result).toEqual({
      saleId: "original-sale",
      orderNumber: "POS-stable-key",
      total: 18.5,
      changeAmount: 1.5,
    });
    expect(mocks.findLegacySale).toHaveBeenCalledWith(
      expect.objectContaining({
        where: {
          businessId: input.businessId,
          orderNumber: "POS-stable-key",
          orderStatus: "completed",
        },
      }),
    );
    expect(mocks.query).not.toHaveBeenCalled();
    expect(mocks.mutation).not.toHaveBeenCalled();
  });

  it("cannot create a second sale when the prior-sale check is unavailable", async () => {
    mocks.findLegacySale.mockRejectedValue(
      new Error("Synthetic retry lookup unavailable"),
    );
    await expect(
      checkoutCanonicalCommerce({
        ...input,
        idempotencyKey: "stable-key",
        paymentMethod: "cash",
      }),
    ).rejects.toThrow("retry lookup unavailable");
    expect(mocks.mutation).not.toHaveBeenCalled();
  });

  it("processes a new canonical checkout after checking for a prior web sale", async () => {
    mocks.query
      .mockResolvedValueOnce({
        business: { legacyPrismaBusinessId: input.businessId },
        settings: null,
      })
      .mockResolvedValueOnce([
        {
          _id: "canonical_product_id",
          legacyPrismaId: input.items[0].inventoryId,
        },
      ])
      .mockResolvedValueOnce([
        {
          _id: "canonical_customer_id",
          legacyPrismaId: input.customerId,
        },
      ])
      .mockResolvedValueOnce({
        totalAmountCents: 1_850,
      });

    mocks.mutation.mockResolvedValueOnce({
      saleId: "sale_123",
      orderNumber: "WEB-44444444-4444-4444-8444-444444444444",
      totalAmountCents: 1_850,
      changeAmountCents: 150,
    });

    const result = await checkoutCanonicalCommerce({
      ...input,
      idempotencyKey: "44444444-4444-4444-8444-444444444444",
      paymentMethod: "cash",
    });

    expect(result).toEqual({
      saleId: "sale_123",
      orderNumber: "WEB-44444444-4444-4444-8444-444444444444",
      total: 18.5,
      changeAmount: 1.5,
    });
    expect(mocks.mutation).toHaveBeenCalled();
  });

  it("requests canonical reporting with the exact half-open UTC period", async () => {
    mocks.query
      .mockResolvedValueOnce({
        business: { legacyPrismaBusinessId: input.businessId },
        settings: null,
      })
      .mockResolvedValueOnce({ orderNumbers: [], orderCount: 0 });

    await getCanonicalCommerceSummary({
      businessId: input.businessId,
      startAt: 1_777_000_000_000,
      endAt: 1_777_086_400_000,
    });

    expect(mocks.query).toHaveBeenLastCalledWith(expect.anything(), {
      startAt: 1_777_000_000_000,
      endAt: 1_777_086_400_000,
      timezone: "UTC",
    });
  });

  it("maps validated manual lines without inventing a catalog product", async () => {
    mocks.query
      .mockResolvedValueOnce({
        business: { legacyPrismaBusinessId: input.businessId },
        settings: null,
      })
      .mockResolvedValueOnce([
        {
          _id: "canonical_product_id",
          legacyPrismaId: input.items[0].inventoryId,
        },
      ])
      .mockResolvedValueOnce({
        merchandiseSubtotalCents: 1_750,
        discountCents: 0,
        subtotalCents: 1_750,
        merchandiseTaxCents: 140,
        deliveryRevenueCents: 0,
        vendorDeliveryExpenseCents: 0,
        deliveryTaxCents: 0,
        totalAmountCents: 1_890,
      });

    await quoteCanonicalCommerce({
      businessId: input.businessId,
      customerId: null,
      items: [
        input.items[0],
        {
          id: "manual:synthetic",
          inventoryId: null,
          name: "Manual adjustment item",
          unitPrice: 2.5,
          source: "manual",
          qty: 3,
        },
      ],
    });

    expect(mocks.query).toHaveBeenLastCalledWith(expect.anything(), {
      customerId: undefined,
      items: [{ productId: "canonical_product_id", quantityGrams: 1.25 }],
      manualItems: [
        {
          lineId: "manual:synthetic",
          name: "Manual adjustment item",
          quantity: 3,
          unitPriceCents: 250,
        },
      ],
      delivery: undefined,
    });
  });
});
