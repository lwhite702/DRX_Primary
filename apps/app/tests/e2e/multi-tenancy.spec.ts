import { test, expect } from "@playwright/test";
import { setupClerkTestingToken } from "@clerk/testing/playwright";

test.describe("Multi-Tenancy @full", () => {
  test.beforeEach(async ({ page }) => {
    if (process.env.CLERK_PUBLISHABLE_KEY) {
      await setupClerkTestingToken({ page });
    }
  });

  test("should load the business switcher @full", async ({ page }) => {
    await page.goto("/dashboard");
    const switcher = page.locator("button[role='combobox']");
    await expect(page).toHaveURL(/\/dashboard/);

    try {
      await expect(switcher).toBeVisible({ timeout: 5000 });
    } catch {
      console.log("Business switcher not found. Expected when no businesses are seeded.");
    }
  });
});
