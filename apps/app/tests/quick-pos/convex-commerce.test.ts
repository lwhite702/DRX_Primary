import { beforeEach, expect, it, vi } from "vitest";
const mocks = vi.hoisted(() => ({ token: vi.fn(), query: vi.fn(), mutation: vi.fn(), setAuth: vi.fn() }));
vi.mock("@/lib/db", () => { throw new Error("Canonical commerce must not load Prisma"); });
vi.mock("@/lib/auth/convex-token", () => ({ getConvexAuthToken: mocks.token }));
vi.mock("convex/browser", () => ({ ConvexHttpClient: class { query = mocks.query; mutation = mocks.mutation; setAuth = mocks.setAuth; } }));
import { checkoutCanonicalCommerce, quoteCanonicalCommerce, getCanonicalCommerceSummary } from "@/app/api/pos/_lib/convex-commerce";
const input = { businessId: "business", customerId: "customer", items: [{ id: "line", inventoryId: "product", name: "Synthetic", unitPrice: 10, source: "inventory" as const, qty: 1, weightGrams: 1.25 }] };
const quote = { merchandiseSubtotalCents: 1250, discountCents: 125, subtotalCents: 1125, merchandiseTaxCents: 90,
  deliveryRevenueCents: 0, vendorDeliveryExpenseCents: 0, deliveryTaxCents: 0, totalAmountCents: 1215 };
beforeEach(() => {
  vi.resetAllMocks(); process.env.NEXT_PUBLIC_CONVEX_URL = "https://synthetic.convex.cloud";
  mocks.token.mockResolvedValue("synthetic-token");
});
it("resolves identities through bounded canonical lookups before a quote", async () => {
  mocks.query.mockResolvedValueOnce({ productIds: ["canonical-product"], customerId: "canonical-customer" }).mockResolvedValueOnce(quote);
  expect((await quoteCanonicalCommerce(input)).total).toBe(12.15);
  expect(mocks.query).toHaveBeenNthCalledWith(1, expect.anything(), { businessId: "business", productIds: ["product"], customerId: "customer" });
  expect(mocks.query).toHaveBeenNthCalledWith(2, expect.anything(), expect.objectContaining({ customerId: "canonical-customer", items: [{ productId: "canonical-product", quantityGrams: 1.25 }] }));
});
it("uses the canonical idempotency key and paid amount without a legacy sale lookup", async () => {
  mocks.query.mockResolvedValueOnce({ productIds: ["canonical-product"] }).mockResolvedValueOnce(quote);
  mocks.mutation.mockResolvedValue({ saleId: "sale", orderNumber: "WEB-key", totalAmountCents: 1215, changeAmountCents: 785 });
  expect(await checkoutCanonicalCommerce({ ...input, idempotencyKey: "key", paymentMethod: "cash", amountPaid: 20 })).toMatchObject({ total: 12.15, changeAmount: 7.85 });
  expect(mocks.mutation).toHaveBeenCalledWith(expect.anything(), expect.objectContaining({ orderNumber: "WEB-key", amountPaidCents: 2000 }));
});
it("preserves the exact requested cents from the web cart through quote and checkout", async () => {
  mocks.query.mockResolvedValueOnce({ productIds: ["canonical-product"] }).mockResolvedValueOnce(quote);
  mocks.mutation.mockResolvedValue({ saleId: "sale", orderNumber: "WEB-dollar", totalAmountCents: 2750, changeAmountCents: 0 });
  const dollarEntry = {
    ...input,
    items: [{ ...input.items[0], unitPrice: 25, weightGrams: 0.7, requestedAmountCents: 2500 }],
  };
  await checkoutCanonicalCommerce({ ...dollarEntry, idempotencyKey: "dollar", paymentMethod: "card" });
  const canonicalItem = { productId: "canonical-product", quantityGrams: 0.7, requestedAmountCents: 2500 };
  expect(mocks.query).toHaveBeenNthCalledWith(2, expect.anything(), expect.objectContaining({ items: [canonicalItem] }));
  expect(mocks.mutation).toHaveBeenCalledWith(expect.anything(), expect.objectContaining({ items: [canonicalItem] }));
});
it("shows the requested dollar amount as the checkout subtotal instead of the normal price basis", async () => {
  mocks.query.mockResolvedValueOnce({ productIds: ["canonical-product"] }).mockResolvedValueOnce({
    ...quote,
    merchandiseSubtotalCents: 1250,
    priceAdjustmentCents: 1250,
    subtotalCents: 2500,
    totalAmountCents: 2500,
    lines: [{ productId: "canonical-product", quantity: 0.5, requestedAmountCents: 2500, lineSubtotalCents: 2500 }],
  });

  const fixedAmountQuote = await quoteCanonicalCommerce({
    ...input,
    items: [{ ...input.items[0], unitPrice: 25, weightGrams: 0.5, requestedAmountCents: 2500 }],
  });

  expect(fixedAmountQuote.subtotal).toBe(25);
  expect(fixedAmountQuote.subtotalAfterDiscount).toBe(25);
  expect(fixedAmountQuote.total).toBe(25);
});
it("fails closed on foreign identities and does not attempt a sale", async () => {
  mocks.query.mockRejectedValue(new Error("FORBIDDEN: Wrong tenant"));
  await expect(checkoutCanonicalCommerce({ ...input, idempotencyKey: "key", paymentMethod: "cash" })).rejects.toThrow(/FORBIDDEN/);
  expect(mocks.mutation).not.toHaveBeenCalled();
});
it("preserves manual items and rejects excess money precision", async () => {
  mocks.query.mockResolvedValueOnce({ productIds: [] }).mockResolvedValueOnce(quote);
  const manual = { ...input, customerId: null, items: [{ id: "manual", inventoryId: null, source: "manual" as const, name: "Synthetic manual", unitPrice: 2.25, qty: 1 }] };
  await quoteCanonicalCommerce(manual);
  expect(mocks.query).toHaveBeenLastCalledWith(expect.anything(), expect.objectContaining({ manualItems: [{ lineId: "manual", name: "Synthetic manual", quantity: 1, unitPriceCents: 225 }] }));
  mocks.query.mockResolvedValue({ productIds: [] });
  await expect(quoteCanonicalCommerce({ ...manual, items: [{ ...manual.items[0], unitPrice: 1.001 }] })).rejects.toThrow(/INVALID_ARGUMENT/);
});
it("reports for canonical or explicitly mapped business with the exact period", async () => {
  mocks.query.mockResolvedValueOnce({ business: { _id: "business" } }).mockResolvedValueOnce({ count: 1 });
  await getCanonicalCommerceSummary({ businessId: "business", startAt: 100, endAt: 200 });
  expect(mocks.query).toHaveBeenLastCalledWith(expect.anything(), { startAt: 100, endAt: 200, timezone: "UTC" });
  mocks.query.mockResolvedValue({ business: { _id: "other", legacyPrismaBusinessId: "not-this" } });
  await expect(getCanonicalCommerceSummary({ businessId: "business", startAt: 100, endAt: 200 })).rejects.toThrow(/not linked/);
});

it("passes price overrides when items include an overrideReason", async () => {
  mocks.query.mockResolvedValueOnce({ productIds: ["canonical-product"], customerId: "canonical-customer" }).mockResolvedValueOnce(quote);
  const overrideInput = {
    ...input,
    items: [
      {
        ...input.items[0],
        weightGrams: undefined,
        originalPrice: 12,
        unitPrice: 8,
        overrideReason: "Manager promotional exception",
      },
    ],
  };
  await quoteCanonicalCommerce(overrideInput);
  expect(mocks.query).toHaveBeenNthCalledWith(
    2,
    expect.anything(),
    expect.objectContaining({
      priceOverrides: [
        {
          productId: "canonical-product",
          unitPriceCents: 800,
          reason: "Manager promotional exception",
        },
      ],
    }),
  );
});

it("converts price overrides to price-per-gram for fractional items with weightGrams", async () => {
  mocks.query.mockResolvedValueOnce({ productIds: ["canonical-product"], customerId: "canonical-customer" }).mockResolvedValueOnce(quote);
  const fractionalOverrideInput = {
    ...input,
    items: [
      {
        ...input.items[0],
        weightGrams: 0.57,
        originalPrice: 19.95,
        unitPrice: 20,
        overrideReason: "correction",
      },
    ],
  };
  await quoteCanonicalCommerce(fractionalOverrideInput);
  expect(mocks.query).toHaveBeenNthCalledWith(
    2,
    expect.anything(),
    expect.objectContaining({
      priceOverrides: [
        {
          productId: "canonical-product",
          unitPriceCents: 3509,
          reason: "correction",
        },
      ],
    }),
  );
});
