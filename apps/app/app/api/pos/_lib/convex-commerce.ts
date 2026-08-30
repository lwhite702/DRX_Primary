import { ConvexHttpClient } from "convex/browser";

import { api } from "@/convex/_generated/api";
import type { Id } from "@/convex/_generated/dataModel";
import { auth } from "@/lib/adapters/auth/server";
import { db } from "@/lib/db";
import type { QuickPosDeliveryState, QuickPosPaymentMethod } from "@/lib/quick-pos/types";

type CanonicalCartItem = {
  id: string;
  inventoryId?: string | null;
  name: string;
  unitPrice: number;
  sku?: string | null;
  source: "inventory" | "manual";
  qty: number;
  weightGrams?: number;
  bulkTierApplied?: string;
};

type CanonicalInput = {
  businessId: string;
  customerId?: string | null;
  items: CanonicalCartItem[];
  delivery?: QuickPosDeliveryState;
};

export function shouldUseCanonicalCommerce(input: Pick<CanonicalInput, "customerId" | "items" | "delivery">) {
  return Boolean(
    input.delivery?.enabled ||
      input.customerId ||
      input.items.some(
        (item) => item.weightGrams !== undefined,
      ),
  );
}

async function authenticatedClient() {
  const url = process.env.NEXT_PUBLIC_CONVEX_URL?.trim();
  if (!url) {
    throw new Error("Canonical checkout is unavailable in this environment");
  }
  const { getToken } = await auth();
  const token = await getToken({ template: "convex" });
  if (!token) {
    throw new Error("Canonical checkout authentication is unavailable");
  }
  const client = new ConvexHttpClient(url);
  client.setAuth(token);
  return client;
}

async function assertCanonicalTenant(
  client: ConvexHttpClient,
  businessId: string,
) {
  const businessContext = await client.query(api.settings.getBusinessSettings, {});
  if (businessContext.business.legacyPrismaBusinessId !== businessId) {
    throw new Error(
      "The authenticated canonical tenant is not linked to this web business",
    );
  }
}

export async function getCanonicalCommerceSummary(input: {
  businessId: string;
  startAt: number;
  endAt: number;
}) {
  const client = await authenticatedClient();
  await assertCanonicalTenant(client, input.businessId);
  return client.query(api.reporting.getSalesAggregate, {
    startAt: input.startAt,
    endAt: input.endAt,
    timezone: "UTC",
  });
}

async function resolveCanonicalInput(input: CanonicalInput) {
  const client = await authenticatedClient();
  const [businessContext, products, customers] = await Promise.all([
    client.query(api.settings.getBusinessSettings, {}),
    client.query(api.products.listProducts, {}),
    input.customerId ? client.query(api.customers.listCustomers, {}) : [],
  ]);
  if (businessContext.business.legacyPrismaBusinessId !== input.businessId) {
    throw new Error(
      "The authenticated canonical tenant is not linked to this web business",
    );
  }
  const productsByLegacyId = new Map(
    products
      .filter((product) => product.legacyPrismaId)
      .map((product) => [product.legacyPrismaId!, product]),
  );
  const inventoryItems = input.items.filter(
    (item): item is CanonicalCartItem & { inventoryId: string } =>
      item.source === "inventory" && Boolean(item.inventoryId),
  );
  const items = inventoryItems.map((item) => {
    const product = productsByLegacyId.get(item.inventoryId);
    if (!product) {
      throw new Error(
        `Product '${item.inventoryId}' is not linked to the canonical catalog`,
      );
    }
    return {
      productId: product._id,
      quantityGrams: item.weightGrams ?? item.qty,
    };
  });
  const manualItems = input.items
    .filter((item) => item.source === "manual")
    .map((item) => ({
      lineId: item.id,
      name: item.name,
      quantity: item.qty,
      unitPriceCents: Math.round(item.unitPrice * 100),
    }));
  if (items.length + manualItems.length !== input.items.length) {
    throw new Error("Commerce checkout contains an invalid inventory line");
  }

  let customerId: Id<"customers"> | undefined;
  if (input.customerId) {
    const customer = customers.find(
      (candidate) => candidate.legacyPrismaId === input.customerId,
    );
    if (!customer) {
      throw new Error(
        "Selected customer is not synchronized to the canonical customer record",
      );
    }
    customerId = customer._id;
  }

  return {
    client,
    items,
    manualItems,
    customerId,
    delivery: input.delivery?.enabled
      ? {
          address: input.delivery.address,
          vendorFeeCents: input.delivery.vendorFeeCents,
          chargeCustomer:
            input.delivery.feeAllocation === "charge_customer",
        }
      : undefined,
  };
}

function toWebQuote(quote: {
  merchandiseSubtotalCents: number;
  discountCents: number;
  subtotalCents: number;
  merchandiseTaxCents: number;
  deliveryRevenueCents: number;
  vendorDeliveryExpenseCents: number;
  deliveryTaxCents: number;
  totalAmountCents: number;
}) {
  return {
    subtotal: quote.merchandiseSubtotalCents / 100,
    subtotalAfterDiscount: quote.subtotalCents / 100,
    loyaltyDiscountAmount: quote.discountCents / 100,
    loyaltyDiscountRate: 0,
    taxAmount:
      (quote.merchandiseTaxCents + quote.deliveryTaxCents) / 100,
    merchandiseTaxAmount: quote.merchandiseTaxCents / 100,
    deliveryTaxAmount: quote.deliveryTaxCents / 100,
    deliveryRevenue: quote.deliveryRevenueCents / 100,
    vendorDeliveryExpense: quote.vendorDeliveryExpenseCents / 100,
    feesTotal: quote.deliveryRevenueCents / 100,
    total: quote.totalAmountCents / 100,
  };
}

export async function quoteCanonicalCommerce(input: CanonicalInput) {
  const canonical = await resolveCanonicalInput(input);
  const quote = await canonical.client.query(api.checkout.quoteCheckout, {
    customerId: canonical.customerId,
    items: canonical.items,
    ...(canonical.manualItems.length
      ? { manualItems: canonical.manualItems }
      : {}),
    delivery: canonical.delivery
      ? {
          vendorFeeCents: canonical.delivery.vendorFeeCents,
          chargeCustomer: canonical.delivery.chargeCustomer,
        }
      : undefined,
  });
  return toWebQuote(quote);
}

export async function checkoutCanonicalCommerce(
  input: CanonicalInput & {
    idempotencyKey: string;
    paymentMethod: QuickPosPaymentMethod;
  },
) {
  // A retry may move here after product configuration changes. Until the
  // transitional web writer is retired, its completed sale remains authoritative
  // for that idempotency key. A failed lookup must never allow another sale.
  const existingLegacySale = await db.sales.findFirst({
    where: {
      businessId: input.businessId,
      orderNumber: `POS-${input.idempotencyKey}`.slice(0, 50),
      orderStatus: "completed",
    },
    select: { id: true, orderNumber: true, totalAmount: true, changeAmount: true },
  }).catch(() => {
    // The route exposes error.message. Never pass provider details through it.
    console.error("Checkout retry verification failed");
    throw new Error("Checkout retry verification is temporarily unavailable. Please retry.");
  });
  if (existingLegacySale) {
    return {
      saleId: existingLegacySale.id,
      orderNumber: existingLegacySale.orderNumber,
      total: Number(existingLegacySale.totalAmount ?? 0),
      changeAmount: Number(existingLegacySale.changeAmount ?? 0),
    };
  }

  const canonical = await resolveCanonicalInput(input);
  const quote = await canonical.client.query(api.checkout.quoteCheckout, {
    customerId: canonical.customerId,
    items: canonical.items,
    ...(canonical.manualItems.length
      ? { manualItems: canonical.manualItems }
      : {}),
    delivery: canonical.delivery,
  });
  const result = await canonical.client.mutation(api.checkout.processCheckout, {
    customerId: canonical.customerId,
    orderNumber: `WEB-${input.idempotencyKey}`,
    items: canonical.items,
    ...(canonical.manualItems.length
      ? { manualItems: canonical.manualItems }
      : {}),
    paymentMethod: input.paymentMethod,
    amountPaidCents: input.paymentMethod === "credit" ? 0 : quote.totalAmountCents,
    delivery: canonical.delivery,
  });
  return {
    saleId: String(result.saleId),
    orderNumber: result.orderNumber,
    total: result.totalAmountCents / 100,
    changeAmount: result.changeAmountCents / 100,
  };
}
