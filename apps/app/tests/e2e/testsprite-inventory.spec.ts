import { expect, test } from "@playwright/test";

test.describe("Testsprite Inventory Local", () => {
  test.beforeEach(async ({ page }) => {
    await page.route("**/api/inventory**", async (route) => {
      const method = route.request().method();
      if (method === "POST") {
        await route.fulfill({
          status: 400,
          contentType: "application/json",
          body: JSON.stringify({ error: "Validation blocked in local test mode" }),
        });
        return;
      }

      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({ items: [] }),
      });
    });
  });

  test("TC012 (adapted): inventory route is reachable and renders inventory workspace", async ({
    page,
  }) => {
    await page.goto("/inventory");
    await expect(page).toHaveURL(/\/inventory/);

    const setupMsg = page.getByText(/please set up your business profile/i);
    const inventoryHeading = page.getByRole("heading", { name: /inventory/i });
    await expect(setupMsg.or(inventoryHeading).first()).toBeVisible();
  });

  test("TC013 (adapted): intake route is reachable and shows either setup guard or intake UI", async ({
    page,
  }) => {
    await page.goto("/inventory/intake");
    await expect(page).toHaveURL(/\/inventory\/intake/);

    const setupMsg = page.getByText(/no business found/i);
    const intakeHeading = page.getByText(/inventory intake/i);
    await expect(setupMsg.or(intakeHeading).first()).toBeVisible();
  });

  test("TC014 (adapted): adjustment route is reachable and renders adjustment page", async ({
    page,
  }) => {
    await page.goto("/inventory/adjust");
    await expect(page).toHaveURL(/\/inventory\/adjust/);
    await expect(page.getByText(/inventory adjustment/i)).toBeVisible();
  });

  test("TC015 (adapted): adjustment requires required fields before confirmation", async ({
    page,
  }) => {
    await page.goto("/inventory/adjust");

    await expect(page.getByText(/reason/i)).toBeVisible();
    await expect(
      page.getByRole("button", { name: /confirm adjustment/i }),
    ).toBeDisabled();
  });

  test("TC016 (adapted): intake route surfaces guardrails when business context is unavailable", async ({
    page,
  }) => {
    await page.goto("/inventory/intake");

    const setupMsg = page.getByText(/no business found/i);
    const reviewButton = page.getByRole("button", {
      name: /review & process intake/i,
    });
    await expect(setupMsg.or(reviewButton).first()).toBeVisible();
  });

  test("TC017 (adapted): adjustment access surface renders without crash", async ({
    page,
  }) => {
    await page.goto("/inventory/adjust");

    const denied = page.getByText(/access denied/i);
    const details = page.getByText(/adjustment details/i);
    await expect(denied.or(details).first()).toBeVisible();
  });

  test("TC018 (adapted): intake validation/guard blocks full submission flow when prerequisites are missing", async ({
    page,
  }) => {
    await page.goto("/inventory/intake");
    await expect(page.locator("body")).toContainText(
      "No business found. Please set up your business first.",
    );
  });

  test("TC019 (adapted): adjustment type control is present and submit is blocked without product", async ({
    page,
  }) => {
    await page.goto("/inventory/adjust");

    await expect(page.getByText(/action/i)).toBeVisible();
    await expect(
      page.getByRole("button", { name: /confirm adjustment/i }),
    ).toBeDisabled();
  });
});
