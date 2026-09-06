import { ConvexHttpClient } from "convex/browser";

import { api } from "@/convex/_generated/api";

import { getConvexAuthToken } from "@/lib/auth/convex-token";

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
  const token = await getConvexAuthToken();
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
  if (businessContext.business._id !== businessId && businessContext.business.legacyPrismaBusinessId !== businessId) {
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
  const inventoryItems = input.items.filter(
    (item): item is CanonicalCartItem & { inventoryId: string } => item.source === "inventory" && Boolean(item.inventoryId),
  );
  const identities = await client.query(api.commerceIdentity.resolveCart, {
    businessId: input.businessId, productIds: inventoryItems.map(item => item.inventoryId), customerId: input.customerId ?? undefined,
  });
  const items = inventoryItems.map((item, index) => ({ productId: identities.productIds[index], quantityGrams: item.weightGrams ?? item.qty }));
  const manualItems = input.items
    .filter((item) => item.source === "manual")
    .map((item) => ({
      lineId: item.id,
      name: item.name,
      quantity: item.qty,
      unitPriceCents: checkedCents(item.unitPrice),
    }));
  if (items.length + manualItems.length !== input.items.length) {
    throw new Error("Commerce checkout contains an invalid inventory line");
  }

  const customerId = identities.customerId;

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
    amountPaid?: number;
    idempotencyKey: string;
    paymentMethod: QuickPosPaymentMethod;
  },
) {
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
    amountPaidCents: input.paymentMethod === "credit" ? 0 : input.amountPaid === undefined ? quote.totalAmountCents : checkedCents(input.amountPaid),
    delivery: canonical.delivery,
  });
  return {
    saleId: String(result.saleId),
    orderNumber: result.orderNumber,
    total: result.totalAmountCents / 100,
    changeAmount: result.changeAmountCents / 100,
  };
}

function checkedCents(value: number) {
  const cents = Math.round(value * 100);
  if (!Number.isFinite(value) || value < 0 || !Number.isSafeInteger(cents) || Math.abs(cents - value * 100) > 1e-6) throw new Error("INVALID_ARGUMENT: Money must use up to two decimal places");
  return cents;
}
