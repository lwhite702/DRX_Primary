import { expect, test } from "@playwright/test";

test.describe("Testsprite POS Local", () => {
  test.beforeEach(async ({ page }) => {
    await page.route("**/api/pos/bootstrap", async (route) => {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          favorites: [{ id: "p-1", name: "Cola", price: 5 }],
          recentlySold: [{ id: "p-2", name: "Juice", price: 6 }],
          creditPolicy: { enabled: true },
        }),
      });
    });

    await page.route("**/api/pos/products**", async (route) => {
      const url = new URL(route.request().url());
      const term = (url.searchParams.get("search") || "").toLowerCase();

      if (term.includes("zzzz-nonexistent-item-12345")) {
        await route.fulfill({
          status: 200,
          contentType: "application/json",
          body: JSON.stringify({ items: [] }),
        });
        return;
      }

      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          items: [{ id: "p-3", name: "Cola", price: 5, quantity_on_hand: 20 }],
        }),
      });
    });

    await page.route("**/api/pos/customers**", async (route) => {
      const url = new URL(route.request().url());
      if (url.pathname.endsWith("/quick-create")) {
        await route.fulfill({
          status: 201,
          contentType: "application/json",
          body: JSON.stringify({
            id: "c-1",
            phone: "5551234567",
            alias: "Walk In",
            remainingCredit: 100,
          }),
        });
        return;
      }

      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          items: [
            {
              id: "c-1",
              phone: "5551234567",
              alias: "Walk In",
              remainingCredit: 100,
            },
          ],
        }),
      });
    });

    await page.route("**/api/pos/checkout", async (route) => {
      await route.fulfill({
        status: 201,
        contentType: "application/json",
        body: JSON.stringify({ success: true, saleId: "sale-1" }),
      });
    });
  });

  test("TC008 (adapted): POS sale screen renders core controls", async ({
    page,
  }) => {
    await page.goto("/pos/sale");

    await expect(page.getByRole("heading", { name: "Quick POS" })).toBeVisible();
    await expect(page.getByRole("heading", { name: "Cart" })).toBeVisible();
    await expect(page.getByRole("button", { name: "Take Payment" })).toBeDisabled();
    await expect(page.getByText("No items")).toBeVisible();
  });

  test("TC009 (adapted): empty cart cannot proceed to payment", async ({ page }) => {
    await page.goto("/pos/sale");

    const takePayment = page.getByRole("button", { name: "Take Payment" });
    await expect(takePayment).toBeDisabled();
    await expect(page).toHaveURL(/\/pos\/sale/);
    await expect(page.getByText("No items")).toBeVisible();
  });

  test("TC010 (adapted): nonexistent product search shows no selectable results", async ({
    page,
  }) => {
    await page.goto("/pos/sale");

    await page.getByPlaceholder("Search products").fill("zzzz-nonexistent-item-12345");
    await page.waitForTimeout(250);

    await expect(page.getByRole("heading", { name: "Cart" })).toBeVisible();
    await expect(page.getByText("No items")).toBeVisible();
    await expect(page.getByRole("button", { name: /^Cola$/i })).toHaveCount(0);
  });

  test("TC011 (adapted): payment page requires selecting method before completing sale", async ({
    page,
  }) => {
    await page.goto("/pos/payment");
    await expect(page).toHaveURL(/\/pos\/payment/);
    await expect(page.getByText("Payment Method")).toBeVisible();
    await expect(page.getByRole("button", { name: "Complete Sale" })).toBeDisabled();
  });
});
