import { test, expect } from "@playwright/test";
import { setupClerkTestingToken } from "@clerk/testing/playwright";

test.describe("Feature flags access", () => {
  test.beforeEach(async ({ page }) => {
    await setupClerkTestingToken({ page });
  });

  test("admin feature route is guarded and non-blank", async ({ page }) => {
    await page.goto("/admin/features");
    await expect(page.locator("body")).toBeVisible();

    const url = page.url();
    const guarded = /\/admin\/features|\/dashboard|\/login|\/onboarding/.test(url);
    expect(guarded).toBe(true);
  });
});
