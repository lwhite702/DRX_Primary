import { expect, test } from "@playwright/test";

test.describe("Quick POS required flow", () => {
  test.beforeEach(async ({ page }) => {
    await page.route("**/api/pos/bootstrap", async (route) => {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          favorites: [
            {
              id: "p-1",
              name: "Favorite Item",
              price: 15,
              quantity_on_hand: 10,
            },
            {
              id: "p-2",
              name: "Favorite Item 2",
              price: 8,
              quantity_on_hand: 10,
            },
          ],
          recentlySold: [
            { id: "p-3", name: "Recent Item", price: 12, quantity_on_hand: 10 },
          ],
          creditPolicy: { enabled: true },
        }),
      });
    });

    await page.route("**/api/pos/products**", async (route) => {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          items: [
            { id: "p-4", name: "Search Item", price: 10, quantity_on_hand: 9 },
          ],
        }),
      });
    });

    await page.route("**/api/business/settings", async (route) => {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({ privacy_protocol: null }),
      });
    });

    await page.route("**/api/privacy/protexion/preferences", async (route) => {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({ manual_enabled: false }),
      });
    });

    await page.route("**/api/pos/checkout", async (route) => {
      await route.fulfill({
        status: 201,
        contentType: "application/json",
        body: JSON.stringify({ success: true, saleId: "sale-1", total: 15 }),
      });
    });

    await page.route("**/api/pos/quote", async (route) => {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          success: true,
          quote: {
            subtotal: 15,
            subtotalAfterDiscount: 15,
            loyaltyDiscountAmount: 0,
            loyaltyDiscountRate: 0,
            taxAmount: 0,
            feesTotal: 0,
            total: 15,
          },
        }),
      });
    });
  });

  test("sale -> payment -> complete -> next sale", async ({ page }) => {
    await page.goto("/pos/sale");

    const favoriteButton = page
      .getByRole("button", { name: /favorite item/i })
      .first();
    await expect(favoriteButton).toBeVisible();
    await favoriteButton.click();

    await page.getByRole("button", { name: "Continue to Payment" }).click();
    await expect(page).toHaveURL(/\/pos\/payment/);

    await page.getByRole("button", { name: "cash" }).click();
    await page.getByRole("button", { name: "none" }).click();
    await page.getByRole("button", { name: "Complete Sale" }).click();

    await expect(page).toHaveURL(/\/pos\/complete/);
    await expect(page.getByText("Sale Complete")).toBeVisible();

    await page.getByRole("button", { name: "Start Next Sale Now" }).click();
    await expect(page).toHaveURL(/\/pos\/sale/);
  });
});
