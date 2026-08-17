import { test, expect } from "@playwright/test";
import { setupClerkTestingToken } from "@clerk/testing/playwright";

test.describe("Quick POS @smoke", () => {
  const hasClerkEnv = Boolean(process.env.CLERK_PUBLISHABLE_KEY);

  test.beforeEach(async ({ page }) => {
    if (hasClerkEnv) {
      await setupClerkTestingToken({ page });
    }

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

    await page.route("**/api/pos/exit/verify", async (route) => {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({ allowed: true }),
      });
    });
  });

  test("completes first sale and resets quickly @smoke", async ({ page }) => {
    if (!hasClerkEnv) {
      await page.goto("/pos/sale");
      await expect(page.locator("body")).toBeVisible();
      return;
    }
    const startedAt = Date.now();

    await page.goto("/pos/sale");
    await expect(
      page.getByRole("heading", { name: "Quick Sale" }),
    ).toBeVisible();

    await page
      .getByRole("button", { name: /Favorite Item/i })
      .first()
      .click();
    await expect(page.getByText("Favorite Item x1")).toBeVisible();

    await page.getByRole("button", { name: "Take Payment" }).click();
    await expect(page).toHaveURL(/\/pos\/payment/);

    await page.getByRole("button", { name: "cash" }).click();
    await page.getByRole("button", { name: "none" }).click();

    await page.getByRole("button", { name: "Complete Sale" }).click();
    await expect(page).toHaveURL(/\/pos\/complete/);
    await expect(page.getByText("Sale Complete")).toBeVisible();

    await expect(page).toHaveURL(/\/pos\/sale/, { timeout: 3000 });
    await expect(page.getByText("No items")).toBeVisible();

    const elapsedMs = Date.now() - startedAt;
    expect(elapsedMs).toBeLessThan(10_000);
  });

  test("requires confirmation flow to exit quick pos @smoke", async ({
    page,
  }) => {
    if (!hasClerkEnv) {
      await page.goto("/pos/sale");
      await expect(page.locator("body")).toBeVisible();
      return;
    }
    await page.goto("/pos/sale");

    await page.getByRole("button", { name: "Exit Quick Sale" }).click();
    await expect(
      page.getByText(
        "Enter the manager PIN if one is configured, then confirm to return to your workspace.",
      ),
    ).toBeVisible();

    await page.getByRole("button", { name: "Confirm Exit" }).click();
    await expect(page).toHaveURL(/\/dashboard/);
  });
});
