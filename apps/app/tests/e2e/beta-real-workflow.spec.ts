import { expect, test, type Page } from "@playwright/test";
import { setupClerkTestingToken } from "@clerk/testing/playwright";

const hasClerkTestingEnv =
  Boolean(process.env.CLERK_TESTING_TOKEN) &&
  Boolean(process.env.CLERK_SECRET_KEY) &&
  Boolean(
    process.env.CLERK_PUBLISHABLE_KEY ||
      process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY,
  );

const betaEnabled = ["1", "true", "yes"].includes(
  String(process.env.BETA_E2E_ENABLED || "").toLowerCase(),
);

const missingRequirements = [
  !hasClerkTestingEnv
    ? "Clerk testing credentials (CLERK_TESTING_TOKEN, CLERK_SECRET_KEY, CLERK_PUBLISHABLE_KEY)"
    : null,
  process.env.BYPASS_AUTH_FOR_TESTING === "true"
    ? "BYPASS_AUTH_FOR_TESTING=false"
    : null,
  process.env.NEXT_PUBLIC_BYPASS_AUTH_FOR_TESTING === "true"
    ? "NEXT_PUBLIC_BYPASS_AUTH_FOR_TESTING=false"
    : null,
  !process.env.NEXT_PUBLIC_SUPABASE_URL
    ? "NEXT_PUBLIC_SUPABASE_URL"
    : null,
  !process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
    ? "NEXT_PUBLIC_SUPABASE_ANON_KEY"
    : null,
  !process.env.DRX_PII_KEY_CURRENT_B64 ? "DRX_PII_KEY_CURRENT_B64" : null,
  !process.env.DRX_PII_HASH_KEY_B64 ? "DRX_PII_HASH_KEY_B64" : null,
].filter(Boolean);

if (betaEnabled && missingRequirements.length > 0) {
  throw new Error(
    `Real beta E2E gate is not configured: ${missingRequirements.join(", ")}`,
  );
}

const sku = process.env.BETA_E2E_PRODUCT_SKU || "DRX-BETA-E2E-001";
const customerPhone = process.env.BETA_E2E_CUSTOMER_PHONE || "5550199001";
const customerAlias = `Beta E2E ${Date.now()}`;

type ApiFetchResult<T> = {
  ok: boolean;
  status: number;
  body: T;
};

type SerializableRequestInit = {
  method?: string;
  headers?: Record<string, string>;
  body?: string;
};

async function appFetch<T>(
  page: Page,
  path: string,
  init?: SerializableRequestInit,
): Promise<ApiFetchResult<T>> {
  return page.evaluate(
    async ({ path: requestPath, init: requestInit }) => {
      const response = await fetch(requestPath, requestInit);
      const text = await response.text();
      let body: unknown = null;
      try {
        body = text ? JSON.parse(text) : null;
      } catch {
        body = text;
      }

      return {
        ok: response.ok,
        status: response.status,
        body,
      };
    },
    { path, init },
  ) as Promise<ApiFetchResult<T>>;
}

test.describe("Stable beta real workflow", () => {
  test.skip(
    !betaEnabled,
    "Set BETA_E2E_ENABLED=true and provide the required Clerk, Supabase, and PII credentials to run the real beta workflow",
  );

  test("operator can complete Quick POS checkout with seeded real data", async ({
    page,
  }) => {
    await setupClerkTestingToken({ page });

    await page.goto("/dashboard");
    await expect(page).toHaveURL(/\/dashboard(?:\?|$)/, { timeout: 20_000 });
    await expect(page.locator("body")).not.toContainText(
      /business not found|unauthorized|onboarding/i,
      { timeout: 10_000 },
    );

    const customerCreate = await appFetch<{ id?: string; error?: string }>(
      page,
      "/api/customers",
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          alias: customerAlias,
          first_name: "Beta",
          last_name: "E2E",
          phone: customerPhone,
          email: `beta-e2e-${Date.now()}@deelrx.local`,
          notes: "Created by the real beta Playwright workflow",
        }),
      },
    );
    expect(customerCreate.ok, JSON.stringify(customerCreate.body)).toBeTruthy();
    expect(customerCreate.body.id).toBeTruthy();

    const beforeProducts = await appFetch<{
      items?: Array<{
        id: string;
        name: string;
        sku: string | null;
        price: number;
        quantity_on_hand: number;
      }>;
    }>(page, `/api/pos/products?search=${encodeURIComponent(sku)}&exact=1`);
    expect(beforeProducts.ok, JSON.stringify(beforeProducts.body)).toBeTruthy();
    const seededProduct = beforeProducts.body.items?.[0];
    expect(seededProduct?.sku).toBe(sku);
    expect(seededProduct?.quantity_on_hand ?? 0).toBeGreaterThan(0);
    const quantityBefore = seededProduct!.quantity_on_hand;

    await page.goto("/pos/sale");
    await expect(
      page.getByRole("textbox", {
        name: /product search/i,
      }).or(page.getByPlaceholder(/scan sku/i)),
    ).toBeVisible({ timeout: 20_000 });

    await page.getByPlaceholder(/phone number/i).fill(customerPhone);
    await page.getByRole("button", { name: /lookup/i }).click();
    await page
      .getByRole("button", { name: new RegExp(customerAlias, "i") })
      .first()
      .click({ timeout: 15_000 });
    await expect(page.getByText(/attached:/i)).toBeVisible();

    const searchInput = page.getByPlaceholder(/scan sku/i);
    await searchInput.fill(sku);
    await searchInput.press("Enter");
    await expect(page.getByText("Beta E2E Test Flower 1g").first()).toBeVisible({
      timeout: 15_000,
    });
    await expect(page.getByText("$12.50").first()).toBeVisible();

    await page.getByRole("button", { name: /continue to payment/i }).click();
    await expect(page).toHaveURL(/\/pos\/payment(?:\?|$)/, {
      timeout: 15_000,
    });
    await page.getByRole("button", { name: /^cash$/i }).click();
    await page.getByRole("button", { name: /complete sale/i }).click();

    await expect(page).toHaveURL(/\/pos\/complete(?:\?|$)/, {
      timeout: 20_000,
    });
    await expect(page.getByText(/sale complete/i)).toBeVisible();

    const saleIdText = await page.getByText(/sale id:/i).textContent();
    const saleId = saleIdText?.match(
      /[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/i,
    )?.[0];
    expect(saleId).toBeTruthy();

    const saleDetail = await appFetch<{
      id?: string;
      orderStatus?: string | null;
      paymentMethod?: string | null;
      items?: Array<{ inventoryId?: string | null }>;
      costSummary?: { costOfGoodsSold: number };
    }>(page, `/api/sales/${saleId}`);
    expect(saleDetail.ok, JSON.stringify(saleDetail.body)).toBeTruthy();
    expect(saleDetail.body.id).toBe(saleId);
    expect(saleDetail.body.orderStatus).toBe("completed");
    expect(saleDetail.body.paymentMethod).toBe("cash");
    expect(saleDetail.body.items?.length).toBeGreaterThan(0);
    expect(saleDetail.body.costSummary?.costOfGoodsSold ?? 0).toBeGreaterThan(0);

    const afterProducts = await appFetch<{
      items?: Array<{ sku: string | null; quantity_on_hand: number }>;
    }>(page, `/api/pos/products?search=${encodeURIComponent(sku)}&exact=1`);
    expect(afterProducts.ok, JSON.stringify(afterProducts.body)).toBeTruthy();
    expect(afterProducts.body.items?.[0]?.quantity_on_hand).toBe(
      quantityBefore - 1,
    );

    const today = new Date().toISOString().slice(0, 10);
    const reconciliation = await appFetch<{
      summary?: { salesChecked: number; discrepancies: number };
      discrepancies?: unknown[];
    }>(
      page,
      `/api/reports/pos-reconciliation?from=${today}&to=${today}`,
    );
    expect(reconciliation.ok, JSON.stringify(reconciliation.body)).toBeTruthy();
    expect(reconciliation.body.summary?.salesChecked ?? 0).toBeGreaterThan(0);
    expect(reconciliation.body.summary?.discrepancies).toBe(0);
  });
});
